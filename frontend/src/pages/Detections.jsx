import { Fragment, useCallback, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@raydenui/ui";
import { api, apiErrorText, BACKEND_URL, socket } from "../api/client";
import DateRangeCalendar from "../components/DateRangeCalendar";
import SnapshotImage from "../components/SnapshotImage";
import { useTunnelUrl } from "../api/useTunnelUrl";
import {
  BEHAVIOR_HEX,
  behaviorBadgeColor,
  behaviorLabel,
  formatConfidence,
  isBehavior,
} from "../behavior";
import { dateRange, dayKey, parseDay, validDay } from "../utils/dateRange";

const behaviors = ["All", ...Object.keys(BEHAVIOR_HEX)];

const PAGE_SIZE = 100;

const plural = (n) => `${n.toLocaleString()} detection${n === 1 ? "" : "s"}`;

function formatDates(from, to) {
  if (!from) return "all dates";
  const format = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
  return from === to ? format.format(parseDay(from)) : format.formatRange(parseDay(from), parseDay(to));
}

export default function Detections() {
  const [filter, setFilter] = useState("All");
  const [searchParams, setSearchParams] = useSearchParams();
  const [detections, setDetections] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [loadState, setLoadState] = useState("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [dayCounts, setDayCounts] = useState({});
  const [version, setVersion] = useState(0); // bumped when detections arrive or are deleted
  const viewId = useRef(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const tunnelUrl = useTunnelUrl();

  // The URL holds the selected dates, so a view can be bookmarked or shared
  const a = validDay(searchParams.get("from"));
  const b = validDay(searchParams.get("to"));
  const [from, to] = a && b ? [a, b].sort() : a || b ? [a || b, a || b] : [null, null];
  const range = from ? dateRange(from, to) : {};
  const { from: rangeFrom, to: rangeTo } = range;
  const behaviorParam = filter === "All" ? undefined : filter;

  const selectDates = useCallback(
    (start, end) => {
      if (!start) return setSearchParams({});
      const [low, high] = [start, end].sort();
      setSearchParams({ from: low, to: high });
    },
    [setSearchParams],
  );

  const fetchPage = (offset, limit = PAGE_SIZE) =>
    api.get("/detections/page", {
      params: {
        from: rangeFrom,
        to: rangeTo,
        behavior: behaviorParam,
        offset,
        limit,
      },
    });

  useEffect(() => {
    let current = true;
    const view = ++viewId.current;
    setLoadState("loading");
    setMoreFailed(false);
    fetchPage(0)
      .then((res) => {
        if (!current) return;
        setDetections(res.data.rows);
        setTotal(res.data.total);
        setCounts(res.data.counts);
        setLoadState("ready");
      })
      .catch(() => {
        if (!current) return;
        setDetections([]);
        setTotal(0);
        setLoadState("error");
      });

    const inRange = (d) => {
      const time = new Date(d.timestamp).toISOString();
      return (!rangeFrom || time >= rangeFrom) && (!rangeTo || time < rangeTo);
    };

    const inView = (d) =>
      (filter === "All" || isBehavior(d.behavior, filter)) &&
      inRange(d);

    const onNew = (d) => {
      setVersion((v) => v + 1);
      if (!inRange(d)) return;
      setCounts((c) => {
        const label = behaviorLabel(d.behavior);
        return { ...c, All: (c.All ?? 0) + 1, [label]: (c[label] ?? 0) + 1 };
      });
      if (!inView(d)) return;
      setTotal((n) => n + 1);
      setDetections((prev) => (prev.some((x) => x.id === d.id) ? prev : [d, ...prev]));
    };

    // Our own deletes come back here too. Counts are re-read: the event only has the id.
    const onDeleted = ({ id }) => {
      setDetections((prev) => prev.filter((d) => d.id !== id));
      setVersion((v) => v + 1);
      fetchPage(0, 1)
        .then((res) => {
          if (!current) return;
          setTotal(res.data.total);
          setCounts(res.data.counts);
        })
        .catch(() => {});
    };

    socket.on("new_detection", onNew);
    socket.on("detection_deleted", onDeleted);

    return () => {
      current = false;
      viewId.current = view + 1;
      socket.off("new_detection", onNew);
      socket.off("detection_deleted", onDeleted);
    };
  }, [filter, rangeFrom, rangeTo]);

  // Totals for the day headers: a day can have more rows than are loaded so far
  useEffect(() => {
    let current = true;
    api
      .get("/detections/daily-counts", {
        params: {
          from: rangeFrom,
          to: rangeTo,
          behavior: behaviorParam,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      })
      .then((res) => current && setDayCounts(res.data))
      .catch(() => current && setDayCounts({}));
    return () => {
      current = false;
    };
  }, [rangeFrom, rangeTo, behaviorParam, version]);

  // A row arriving between pages shifts the offset, so overlaps are dropped by id
  const loadMore = () => {
    const view = viewId.current;
    setLoadingMore(true);
    setMoreFailed(false);
    fetchPage(detections.length)
      .then((res) => {
        if (view !== viewId.current) return; // the dates or tab changed meanwhile
        setTotal(res.data.total);
        setDetections((prev) => {
          const seen = new Set(prev.map((d) => d.id));
          return [...prev, ...res.data.rows.filter((d) => !seen.has(d.id))];
        });
      })
      .catch(() => view === viewId.current && setMoreFailed(true))
      .finally(() => setLoadingMore(false));
  };

  const exportUrl = () => {
    const params = new URLSearchParams({
      ...range,
      ...(behaviorParam && { behavior: behaviorParam }),
      tz: new Date().getTimezoneOffset(),
    });
    return `${BACKEND_URL}/detections/export.csv?${params}`;
  };

  const emptyMessage =
    loadState === "loading"
      ? "Loading detections…"
      : loadState === "error"
        ? "Couldn't load detections from the backend"
        : "No detections match these filters";

  // Rows are newest first, so a day's rows are already together
  const groups = [];
  for (const d of detections) {
    const day = dayKey(new Date(d.timestamp));
    if (groups.at(-1)?.day !== day) groups.push({ day, rows: [] });
    groups.at(-1).rows.push(d);
  }

  const handleDelete = (id) => {
    setDeletingId(id);
    setDeleteError(null);
    api
      .delete(`/detections/${id}`)
      .then(() => {
        setDetections((prev) => prev.filter((d) => d.id !== id));
        setConfirmDeleteId(null);
      })
      .catch((err) =>
        setDeleteError({ id, message: apiErrorText(err, "deleted") }),
      )
      .finally(() => setDeletingId(null));
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-h4 text-grey-900">Detections</h1>

      <DateRangeCalendar from={from} to={to} onChange={selectDates} refreshKey={version} />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by behavior">
        {behaviors.map((b) => (
          <Button
            key={b}
            size="sm"
            variant={filter === b ? "secondary" : "grey"}
            appearance={filter === b ? "solid" : "outlined"}
            aria-pressed={filter === b}
            onClick={() => setFilter(b)}
            className="h-11"
          >
            {b} ({counts[b] ?? 0})
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-body-md font-medium text-grey-900" aria-live="polite">
          Showing {formatDates(from, to)}
          {loadState === "ready" ? `: ${plural(total)}` : "…"}
        </p>
        <Button
          variant="grey"
          appearance="outlined"
          icon={<Download size={16} />}
          iconPosition="leading"
          className="h-11"
          onClick={() => window.location.assign(exportUrl())}
        >
          Export CSV
        </Button>
      </div>

      <Card shadow="md">
        <CardHeader title="Detection log" bordered />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Snapshot</TableHead>
                <TableHead>Behavior</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Camera</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-grey-500">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
              {groups.map((group) => (
                <Fragment key={group.day}>
                  <TableRow>
                    <TableCell colSpan={6} className="bg-grey-50 font-semibold text-grey-900">
                      {parseDay(group.day).toLocaleDateString(undefined, { dateStyle: "medium" })} —{" "}
                      {plural(dayCounts[group.day] ?? group.rows.length)}
                    </TableCell>
                  </TableRow>
                  {group.rows.map((d, i) => (
                <TableRow key={d.id ?? i}>
                  <TableCell>
                    {d.snapshot ? (
                      <SnapshotImage
                        snapshot={d.snapshot}
                        tunnelUrl={tunnelUrl}
                        alt={`${behaviorLabel(d.behavior)} snapshot`}
                        className="w-40 aspect-video rounded-md"
                        link
                      />
                    ) : (
                      <span className="text-grey-500">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge color={behaviorBadgeColor(d.behavior)} size="sm">
                        {behaviorLabel(d.behavior)}
                      </Badge>
                      {d.source === "recorded" && (
                        <span title={d.clip ? `Model output on recorded clip: ${d.clip}` : undefined}>
                          <Badge color="neutral" size="sm">
                            Recorded clip
                          </Badge>
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatConfidence(d.confidence)}
                  </TableCell>
                  <TableCell>{d.camera}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(d.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {confirmDeleteId === d.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-body-xs text-grey-600">Delete this log?</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(d.id)}
                          disabled={deletingId === d.id}
                          className="h-11"
                        >
                          {deletingId === d.id ? "Deleting…" : "Delete"}
                        </Button>
                        <Button
                          variant="grey"
                          appearance="outlined"
                          size="sm"
                          onClick={() => {
                            setConfirmDeleteId(null);
                            setDeleteError(null);
                          }}
                          disabled={deletingId === d.id}
                          className="h-11"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="grey"
                        appearance="outlined"
                        size="sm"
                        iconPosition="icon-only"
                        icon={<Trash2 size={16} />}
                        aria-label={`Delete ${behaviorLabel(d.behavior)} log from ${new Date(d.timestamp).toLocaleString()}`}
                        title="Delete log"
                        className="size-11"
                        onClick={() => {
                          setConfirmDeleteId(d.id);
                          setDeleteError(null);
                        }}
                      />
                    )}
                    {deleteError?.id === d.id && (
                      <div className="text-body-xs text-error-600 mt-1">{deleteError.message}</div>
                    )}
                  </TableCell>
                </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        {moreFailed && (
          <p className="px-4 pt-4 text-center text-body-sm text-error-600">Couldn't load more detections.</p>
        )}
        {detections.length < total && (
          <div className="flex items-center justify-center gap-3 p-4">
            <span className="text-body-sm text-grey-600">
              Showing {detections.length} of {total}
            </span>
            <Button
              variant="grey"
              appearance="outlined"
              className="h-11"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </Card>

    </div>
  );
}
