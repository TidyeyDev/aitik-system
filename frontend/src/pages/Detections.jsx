import { useState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  Select,
  SelectOption,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@raydenui/ui";
import { plusIcon } from "@raydenui/ui/icons";
import { api, socket } from "../api/client";
import SnapshotImage from "../components/SnapshotImage";
import { useTunnelUrl } from "../api/useTunnelUrl";
import {
  BEHAVIOR_HEX,
  behaviorBadgeColor,
  behaviorLabel,
  formatConfidence,
  isBehavior,
} from "../behavior";
import { resizeImage } from "../utils/resizeImage";

const behaviors = ["All", ...Object.keys(BEHAVIOR_HEX)];

const DEMO_BEHAVIORS = ["Mating", "Receptive", "Non-receptive"];
const CAMERAS = ["cam1", "cam2", "cam3", "cam4"];

// Current local time in the format <input type="datetime-local"> expects
const nowLocal = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const newDemoForm = () => ({
  snapshot: null,
  behavior: "Mating",
  confidence: "85",
  camera: "cam3",
  time: nowLocal(),
});

const newestFirst = (a, b) => new Date(b.timestamp) - new Date(a.timestamp);

export default function Detections() {
  const [filter, setFilter] = useState("All");
  const [detections, setDetections] = useState([]);
  const [demoForm, setDemoForm] = useState(newDemoForm);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState(null);
  const dialogRef = useRef(null);
  const fileRef = useRef(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const tunnelUrl = useTunnelUrl();

  const removeDetection = (id) => setDetections((prev) => prev.filter((d) => d.id !== id));

  // The socket echoes our own demo posts, so skip ids already in the list
  const addDetection = (detection) =>
    setDetections((prev) =>
      prev.some((d) => d.id === detection.id)
        ? prev
        : [detection, ...prev].sort(newestFirst),
    );

  useEffect(() => {
    api
      .get("/detections")
      .then((res) => {
        setDetections(res.data);
      })
      .catch(() => {});

    socket.on("new_detection", addDetection);
    socket.on("detection_deleted", ({ id }) => removeDetection(id));

    return () => {
      socket.off("new_detection");
      socket.off("detection_deleted");
    };
  }, []);

  const countOf = (b) =>
    b === "All"
      ? detections.length
      : detections.filter((d) => isBehavior(d.behavior, b)).length;

  const filtered =
    filter === "All"
      ? detections
      : detections.filter((d) => isBehavior(d.behavior, filter));

  const handleDelete = (id) => {
    setDeletingId(id);
    setDeleteError(null);
    api
      .delete(`/detections/${id}`)
      .then(() => {
        removeDetection(id);
        setConfirmDeleteId(null);
      })
      .catch((err) =>
        setDeleteError({
          id,
          message: err.response?.data?.error
            ? `Not deleted: ${err.response.data.error}`
            : "Not deleted: couldn't reach the backend.",
        }),
      )
      .finally(() => setDeletingId(null));
  };

  const openDemo = () => {
    setDemoForm(newDemoForm());
    setDemoError(null);
    dialogRef.current.showModal();
  };

  const handleSnapshot = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDemoError(null);
    try {
      const snapshot = await resizeImage(file);
      setDemoForm((f) => ({ ...f, snapshot }));
    } catch {
      e.target.value = "";
      setDemoError("Couldn't read that image. Try a JPEG or PNG.");
    }
  };

  const submitDemo = (e) => {
    e.preventDefault();
    const confidence = Number(demoForm.confidence);
    if (!(confidence >= 0 && confidence <= 100))
      return setDemoError("Confidence must be between 0 and 100.");
    if (!demoForm.time) return setDemoError("Set a date and time.");
    setDemoBusy(true);
    setDemoError(null);
    api
      .post("/detect", {
        source: "demo",
        snapshot: demoForm.snapshot,
        behavior: demoForm.behavior.toLowerCase(),
        confidence: confidence / 100,
        camera: demoForm.camera,
        timestamp: new Date(demoForm.time).toISOString(),
      })
      .then((res) => {
        addDetection(res.data.detection);
        dialogRef.current.close();
      })
      .catch((err) =>
        setDemoError(
          err.response?.data?.error
            ? `Not added: ${err.response.data.error}`
            : "Not added: couldn't reach the backend.",
        ),
      )
      .finally(() => setDemoBusy(false));
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-h4 text-grey-900">Detections</h1>

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
            {b} ({countOf(b)})
          </Button>
        ))}
      </div>

      <Card shadow="md">
        <CardHeader
          title="Detection log"
          actions={
            <div className="flex items-center gap-3">
              <Badge color="neutral">{filtered.length} records</Badge>
              <Button
                variant="grey"
                appearance="outlined"
                size="sm"
                iconPosition="icon-only"
                icon={plusIcon}
                aria-label="Add demo sample"
                title="Add demo sample"
                className="size-11"
                onClick={openDemo}
              />
            </div>
          }
          bordered
        />
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
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-grey-500">
                    No detections yet — awaiting YOLO model deployment
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((d, i) => (
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
                      {d.source === "demo" && (
                        <Badge color="neutral" size="sm">
                          Demo sample
                        </Badge>
                      )}
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
            </TableBody>
          </Table>
        </div>
      </Card>

      <dialog
        ref={dialogRef}
        aria-labelledby="demo-title"
        className="m-auto w-[min(92vw,520px)] rounded-lg p-0 bg-surface backdrop:bg-black/70"
      >
        <form onSubmit={submitDemo} className="p-6 space-y-5">
          <div>
            <h2 id="demo-title" className="font-heading text-h6 text-grey-900">
              Add demo sample
            </h2>
            <p className="text-body-sm text-grey-600 mt-1">
              Shown in the log with a "Demo sample" badge. Confidence is what you
              enter here, not model output. Snapshot is optional. Not counted on the Dashboard.
            </p>
          </div>

          <div>
            <span className="block text-body-sm font-medium text-grey-700 mb-1.5">
              Snapshot image
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleSnapshot}
            />
            <div className="flex items-center gap-3">
              {demoForm.snapshot && (
                <img
                  src={demoForm.snapshot}
                  alt="Selected snapshot"
                  className="w-28 aspect-video rounded-md object-cover border border-grey-200"
                />
              )}
              <Button
                type="button"
                variant="grey"
                appearance="outlined"
                className="h-11"
                onClick={() => fileRef.current.click()}
              >
                {demoForm.snapshot ? "Replace image" : "Choose image"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Behavior class"
              value={demoForm.behavior}
              onValueChange={(behavior) => setDemoForm({ ...demoForm, behavior })}
            >
              {DEMO_BEHAVIORS.map((b) => (
                <SelectOption key={b} value={b}>
                  {b}
                </SelectOption>
              ))}
            </Select>
            <Input
              label="Confidence (%)"
              type="number"
              min="0"
              max="100"
              step="any"
              inputMode="decimal"
              value={demoForm.confidence}
              onChange={(e) => setDemoForm({ ...demoForm, confidence: e.target.value })}
            />
            <Select
              label="Camera"
              value={demoForm.camera}
              onValueChange={(camera) => setDemoForm({ ...demoForm, camera })}
            >
              {CAMERAS.map((c) => (
                <SelectOption key={c} value={c}>
                  {c}
                </SelectOption>
              ))}
            </Select>
            <Input
              label="Date and time"
              type="datetime-local"
              value={demoForm.time}
              onChange={(e) => setDemoForm({ ...demoForm, time: e.target.value })}
            />
          </div>

          {demoError && <p className="text-body-sm text-error-600">{demoError}</p>}

          <div className="flex gap-3">
            <Button type="submit" variant="primary" disabled={demoBusy} className="h-11">
              {demoBusy ? "Adding…" : "Add to log"}
            </Button>
            <Button
              type="button"
              variant="grey"
              appearance="outlined"
              className="h-11"
              onClick={() => dialogRef.current.close()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
