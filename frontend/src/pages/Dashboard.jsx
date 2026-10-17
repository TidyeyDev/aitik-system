import { useState, useEffect } from "react";
import { api, socket } from "../api/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  MetricsCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@raydenui/ui";
import { chartUpIcon, eyeIcon, heartIcon, userIcon } from "@raydenui/ui/icons";
import SnapshotImage from "../components/SnapshotImage";
import { useTunnelUrl } from "../api/useTunnelUrl";
import {
  BEHAVIOR_HEX,
  behaviorBadgeColor,
  behaviorLabel,
  formatConfidence,
  isBehavior,
} from "../behavior";

const isToday = (timestamp) =>
  new Date(timestamp).toDateString() === new Date().toDateString();

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {time.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </span>
  );
}

const formatTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

const formatFlag = (value, yes, no, unknown = "Unknown") =>
  value === true ? yes : value === false ? no : unknown;

const flagClass = (value, yesClass = "text-success-600") =>
  value === true ? yesClass : value === false ? "text-error-600" : "text-grey-500";

// MetricsCard has no icon-colour prop; these tint its icon square (the
// .size-8 box Rayden renders) from the outside.
const ICON_TONES = {
  blue: "[&_.size-8]:bg-secondary-100 [&_.size-8]:border-secondary-100 [&_.size-8]:text-secondary-600",
  green: "[&_.size-8]:bg-success-100 [&_.size-8]:border-success-100 [&_.size-8]:text-success-600",
  // Tailwind purple is not a Rayden token, so it needs its own dark shades.
  purple:
    "[&_.size-8]:bg-purple-100 [&_.size-8]:border-purple-100 [&_.size-8]:text-purple-600 dark:[&_.size-8]:bg-purple-950 dark:[&_.size-8]:border-purple-950 dark:[&_.size-8]:text-purple-300",
  orange: "[&_.size-8]:bg-warning-100 [&_.size-8]:border-warning-100 [&_.size-8]:text-warning-600",
};

function EmptyState({ title, hint }) {
  return (
    <div className="text-center py-10">
      <div className="text-body-md text-grey-700">{title}</div>
      {hint && <div className="text-body-sm text-grey-500 mt-1">{hint}</div>}
    </div>
  );
}

// Reads GET /status: cameras, online, lastSeen, modelDeployed, lastDetectionAt.
// Any of these may be null or missing; null renders as "—" / "Unknown".
function SystemStatusPanel({ status }) {
  const s = status ?? {};
  const items = [
    {
      label: "Farm Device",
      value: formatFlag(s.online, "Online", "Offline"),
      className: flagClass(s.online),
    },
    { label: "Last Seen", value: formatTime(s.lastSeen) },
    {
      label: "YOLO Model",
      value: formatFlag(s.modelDeployed, "Deployed", "Not deployed", "Not confirmed"),
      className: flagClass(s.modelDeployed, "text-secondary-600"),
    },
    { label: "Last Detection", value: formatTime(s.lastDetectionAt) },
    {
      label: "Cameras",
      value: Number.isFinite(s.cameras) ? `${s.cameras} configured` : "—",
    },
  ];

  return (
    <Card shadow="md" className="border-l-4 border-l-secondary-500">
      <CardHeader title="System status" bordered />
      <CardBody className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-6">
        {items.map((item) => (
          <div key={item.label}>
            <div className="text-body-xs text-grey-500">{item.label}</div>
            <div
              className={`text-body-sm font-medium mt-1 ${item.className ?? "text-grey-800"}`}
            >
              {status === null ? "—" : item.value}
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function SnapshotFeed({ detections }) {
  const tunnelUrl = useTunnelUrl();
  return (
    <Card shadow="md">
      <CardHeader
        title="Captured snapshots"
        subtitle="Snapshot saved with each behavior detection"
        actions={<Badge color="neutral">{detections.length} captured</Badge>}
        bordered
      />
      <CardBody className="p-6">
        {detections.length === 0 ? (
          <EmptyState
            title="No snapshots captured yet"
            hint="Awaiting YOLO model deployment"
          />
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {detections.slice(0, 8).map((d) => (
              <div
                key={d.id}
                className="rounded-lg overflow-hidden border border-grey-200 bg-surface"
              >
                {d.snapshot ? (
                  <SnapshotImage
                    snapshot={d.snapshot}
                    tunnelUrl={tunnelUrl}
                    alt={`${behaviorLabel(d.behavior)} snapshot from ${d.camera}`}
                    className="w-full aspect-video bg-grey-100"
                  />
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center text-body-xs text-grey-500 bg-grey-100">
                    No snapshot attached
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <Badge color={behaviorBadgeColor(d.behavior)} size="sm">
                      {behaviorLabel(d.behavior)}
                    </Badge>
                    <span className="text-body-xs text-grey-500">{d.camera}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 text-body-xs text-grey-500">
                    <span>{new Date(d.timestamp).toLocaleString()}</span>
                    <span>{formatConfidence(d.confidence)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {detections.length > 8 && (
          <p className="text-body-xs text-grey-500 mt-4">
            Showing latest 8 of {detections.length}. See the Detections page for the
            full list.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

export default function Dashboard() {
  const [detections, setDetections] = useState([]);
  const [alert, setAlert] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const loadStatus = () =>
      api
        .get("/status")
        .then((res) => setStatus(res.data))
        .catch(() => setStatus(null));
    loadStatus();
    // "online" depends on elapsed time since lastSeen, so re-check periodically.
    const statusTimer = setInterval(loadStatus, 60000);
    socket.on("status", setStatus);

    api
      .get("/detections")
      .then((res) => setDetections(res.data))
      .catch(() => {});

    socket.on("new_detection", (detection) => {
      setDetections((prev) => [detection, ...prev].slice(0, 100));
    });

    socket.on("alert", (data) => {
      setAlert(data.message);
      setTimeout(() => setAlert(null), 8000);
    });

    return () => {
      socket.off("new_detection");
      clearInterval(statusTimer);
      socket.off("status", setStatus);
      socket.off("alert");
    };
  }, []);

  const chartData = Object.keys(BEHAVIOR_HEX).map((name) => ({
    name,
    value: detections.filter((d) => isBehavior(d.behavior, name)).length,
  }));

  const receptiveToday = detections.filter(
    (d) => isBehavior(d.behavior, "Receptive") && isToday(d.timestamp),
  ).length;
  const matingToday = detections.filter(
    (d) => isBehavior(d.behavior, "Mating") && isToday(d.timestamp),
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-heading text-h4 text-grey-900">Dashboard</h1>
          <p className="text-body-md text-grey-700 mt-1">
            Lauzon Residence, Cardona, Rizal — Philippine Mallard Duck Monitoring
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <div className="font-heading text-h6 text-grey-900">
            <Clock />
          </div>
          <div className="text-body-xs text-grey-500 mt-0.5">
            {new Date().toLocaleDateString("en-PH", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      {alert && (
        <Alert
          state="success"
          title="Receptive behavior detected"
          description={alert}
          onClose={() => setAlert(null)}
        />
      )}

      <SystemStatusPanel status={status} />

      {/* Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <MetricsCard
          label="Female ducks"
          value="8"
          icon={userIcon}
          className={ICON_TONES.blue}
          description="Configured flock size"
        />
        <MetricsCard
          label="Receptive events"
          value={receptiveToday}
          icon={heartIcon}
          className={ICON_TONES.green}
          description="Detected today"
        />
        <MetricsCard
          label="Mating events"
          value={matingToday}
          icon={chartUpIcon}
          className={ICON_TONES.purple}
          description="Detected today"
        />
        <MetricsCard
          label="Total detected"
          value={detections.length}
          icon={eyeIcon}
          className={ICON_TONES.orange}
          description="Stored on backend (last 100)"
        />
      </div>

      <SnapshotFeed detections={detections} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Behavior Distribution */}
        <Card shadow="md">
          <CardHeader
            title="Behavior distribution"
            subtitle="Detection count by category"
            bordered
          />
          <CardBody className="p-6">
            {detections.length === 0 ? (
              <EmptyState title="No data yet" hint="Awaiting YOLO model deployment" />
            ) : (
              // currentColor lets the axis text and hover band follow the theme.
              <div className="text-grey-600">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} layout="vertical" barSize={14}>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fill: "currentColor", fontSize: 13 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-grey-200)",
                        color: "var(--color-grey-800)",
                        borderRadius: 8,
                      }}
                      cursor={{ fill: "currentColor", fillOpacity: 0.08 }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={BEHAVIOR_HEX[entry.name]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Detections */}
        <Card shadow="md">
          <CardHeader
            title="Recent detections"
            subtitle={
              detections.length === 0
                ? "Waiting for YOLO model output"
                : `${detections.length} events logged`
            }
            bordered
          />
          {detections.length === 0 ? (
            <CardBody className="p-6">
              <EmptyState
                title="No detections yet"
                hint="Deploy YOLO model to start detecting"
              />
            </CardBody>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Behavior</TableHead>
                    <TableHead>Camera</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detections.slice(0, 6).map((d, i) => (
                    <TableRow key={d.id ?? i}>
                      <TableCell>
                        <Badge color={behaviorBadgeColor(d.behavior)} size="sm">
                          {behaviorLabel(d.behavior)}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.camera}</TableCell>
                      <TableCell>{formatConfidence(d.confidence)}</TableCell>
                      <TableCell>{new Date(d.timestamp).toLocaleTimeString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
