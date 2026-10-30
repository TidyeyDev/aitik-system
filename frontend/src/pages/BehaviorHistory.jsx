import { useEffect, useRef, useState } from "react";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input, Select, SelectOption } from "@raydenui/ui";
import { plusIcon } from "@raydenui/ui/icons";
import { api, apiErrorText, BACKEND_URL } from "../api/client";
import { behaviorBadgeColor } from "../behavior";
import { dateRange, isValidRange } from "../utils/dateRange";
import { resizeImage } from "../utils/resizeImage";

// Behavior periods logged by hand from the recordings. The AI detects the
// behavior; the researcher who watched the clip writes down the rest.

const TYPES = ["Mating", "Receptive", "Non-receptive"];

// datetime-local wants local "YYYY-MM-DDTHH:mm"
function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Players for links that allow embedding; anything else gets an "Open" link.
function embedFor(url) {
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (drive) return { kind: "iframe", src: `https://drive.google.com/file/d/${drive[1]}/preview` };
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  if (/\.(mp4|webm|mov)(\?|#|$)/i.test(url)) return { kind: "video", src: url };
  return null;
}

// ?v= changes when the photo is replaced, so the browser can cache each version
const photoUrl = (e) =>
  `${BACKEND_URL}/behavior-events/${e.id}/photo?v=${encodeURIComponent(e.photoUpdatedAt)}`;

function formatPeriod(event) {
  const start = new Date(event.startedAt);
  if (!event.endedAt) return start.toLocaleString();
  const end = new Date(event.endedAt);
  const sameDay = start.toDateString() === end.toDateString();
  return `${start.toLocaleString()} – ${sameDay ? end.toLocaleTimeString() : end.toLocaleString()}`;
}

function EventForm({ editing, onSaved, onCancel }) {
  // form.photo: undefined = keep the saved photo, null = remove it, string = new data URL
  const [form, setForm] = useState(
    editing
      ? {
          type: editing.type,
          startedAt: toLocalInput(editing.startedAt),
          endedAt: editing.endedAt ? toLocalInput(editing.endedAt) : "",
          ducks: editing.ducks || "",
          camera: editing.camera || "",
          notes: editing.notes || "",
          videoUrl: editing.videoUrl || "",
        }
      : { type: "Mating", startedAt: toLocalInput(), endedAt: "", ducks: "", camera: "", notes: "", videoUrl: "" },
  );
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState(null);
  const photoInputRef = useRef(null);

  const previewSrc =
    typeof form.photo === "string"
      ? form.photo
      : form.photo === undefined && editing?.hasPhoto
        ? photoUrl(editing)
        : null;

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // lets the same file be picked again
    if (!file) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const photo = await resizeImage(file);
      setForm((f) => ({ ...f, photo }));
    } catch {
      setError("Couldn't read that image. Try a JPEG or PNG photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.startedAt) {
      setError("Add the start date and time.");
      return;
    }
    if (form.endedAt && new Date(form.endedAt) < new Date(form.startedAt)) {
      setError("The end can't be before the start.");
      return;
    }
    const body = {
      ...form,
      videoUrl: form.videoUrl.trim(),
      startedAt: new Date(form.startedAt).toISOString(),
      endedAt: form.endedAt ? new Date(form.endedAt).toISOString() : null,
    };
    setSaving(true);
    setError(null);
    (editing ? api.put(`/behavior-events/${editing.id}`, body) : api.post("/behavior-events", body))
      .then((res) => onSaved(res.data.event))
      .catch((err) => setError(apiErrorText(err, "saved")))
      .finally(() => setSaving(false));
  };

  return (
    <Card shadow="md">
      <CardHeader title={editing ? "Edit behavior event" : "Add behavior event"} bordered />
      <CardBody className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Behavior"
              value={form.type}
              onValueChange={(type) => setForm({ ...form, type })}
            >
              {TYPES.map((t) => (
                <SelectOption key={t} value={t}>
                  {t}
                </SelectOption>
              ))}
            </Select>
            <Input
              label="Started"
              type="datetime-local"
              value={form.startedAt}
              onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
            />
            <Input
              label="Ended (optional)"
              type="datetime-local"
              value={form.endedAt}
              onChange={(e) => setForm({ ...form, endedAt: e.target.value })}
            />
            <Input
              label="Duck(s)"
              value={form.ducks}
              maxLength={120}
              onChange={(e) => setForm({ ...form, ducks: e.target.value })}
              placeholder="e.g. Bella"
            />
            <Input
              label="Camera"
              value={form.camera}
              maxLength={50}
              onChange={(e) => setForm({ ...form, camera: e.target.value })}
              placeholder="e.g. cam3"
            />
            <Input
              label="Notes (optional)"
              value={form.notes}
              maxLength={500}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. starts at 1:20"
            />
          </div>
          <Input
            label="Video link (optional)"
            type="url"
            value={form.videoUrl}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            placeholder="Paste a Google Drive or YouTube link"
            helperText="On Drive, set sharing to “Anyone with the link”."
          />
          <div>
            <span className="block text-body-sm font-medium text-grey-700 mb-1.5">
              Photo (optional)
            </span>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handlePhotoChange}
            />
            <div className="flex flex-wrap items-center gap-3">
              {previewSrc && (
                <img
                  src={previewSrc}
                  alt="Selected photo"
                  className="size-20 rounded-md object-cover border border-grey-200"
                />
              )}
              <Button
                type="button"
                variant="grey"
                appearance="outlined"
                className="h-11"
                disabled={photoBusy}
                onClick={() => photoInputRef.current.click()}
              >
                {photoBusy ? "Processing…" : previewSrc ? "Replace" : "Add photo"}
              </Button>
              {previewSrc && (
                <Button
                  type="button"
                  variant="grey"
                  appearance="outlined"
                  className="h-11"
                  onClick={() => setForm({ ...form, photo: editing?.hasPhoto ? null : undefined })}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
          {error && <p className="text-body-sm text-error-600">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" variant="primary" disabled={saving || photoBusy} className="h-11">
              {saving ? "Saving…" : editing ? "Save changes" : "Save event"}
            </Button>
            <Button type="button" variant="grey" appearance="outlined" className="h-11" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function EventCard({ event, onEdit, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const embed = event.videoUrl ? embedFor(event.videoUrl) : null;

  const remove = () => {
    setDeleting(true);
    setError(null);
    api
      .delete(`/behavior-events/${event.id}`)
      .then(() => onDeleted(event.id))
      .catch((err) => setError(apiErrorText(err, "deleted")))
      .finally(() => setDeleting(false));
  };

  return (
    <Card shadow="md" className="overflow-hidden">
      {event.videoUrl && (
        <div className="aspect-video bg-grey-900">
          {embed?.kind === "iframe" && (
            <iframe
              src={embed.src}
              title={`${event.type} event ${new Date(event.startedAt).toLocaleString()}`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="w-full h-full"
            />
          )}
          {embed?.kind === "video" && (
            <video src={event.videoUrl} controls preload="metadata" className="w-full h-full" />
          )}
          {!embed && (
            <a
              href={event.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-full items-center justify-center gap-2 text-body-md text-white"
            >
              Open video <ExternalLink size={16} />
            </a>
          )}
        </div>
      )}
      {event.hasPhoto && (
        <a href={photoUrl(event)} target="_blank" rel="noreferrer" className="block">
          <img
            src={photoUrl(event)}
            alt={`${event.type} event photo`}
            loading="lazy"
            className="w-full aspect-video object-cover bg-grey-100"
          />
        </a>
      )}
      <CardBody className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Badge color={behaviorBadgeColor(event.type)} size="sm">{event.type}</Badge>
            <div className="mt-2 text-body-md font-semibold text-grey-900">
              {event.ducks || "Duck not identified"}
            </div>
            <div className="text-body-sm text-grey-600">{formatPeriod(event)}</div>
            {event.camera && <div className="text-body-sm text-grey-600">{event.camera}</div>}
          </div>
          {!confirming && (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="grey"
                appearance="outlined"
                size="sm"
                iconPosition="icon-only"
                icon={<Pencil size={16} />}
                aria-label="Edit event"
                title="Edit"
                className="size-11"
                onClick={onEdit}
              />
              <Button
                variant="grey"
                appearance="outlined"
                size="sm"
                iconPosition="icon-only"
                icon={<Trash2 size={16} />}
                aria-label="Delete event"
                title="Delete"
                className="size-11"
                onClick={() => setConfirming(true)}
              />
            </div>
          )}
        </div>
        {event.notes && <p className="text-body-sm text-grey-700">{event.notes}</p>}
        {confirming && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-body-xs text-grey-600">Delete this event?</span>
            <Button variant="destructive" size="sm" className="h-11" disabled={deleting} onClick={remove}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
            <Button variant="grey" appearance="outlined" size="sm" className="h-11" disabled={deleting} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        )}
        {error && <p className="text-body-xs text-error-600">{error}</p>}
      </CardBody>
    </Card>
  );
}

export default function BehaviorHistory() {
  const [events, setEvents] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState(null);
  const [formMode, setFormMode] = useState(null); // null | "new" | the event being edited
  const [typeFilter, setTypeFilter] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    api
      .get("/behavior-events")
      .then((res) => {
        setEvents(res.data);
        setLoadState("ready");
      })
      .catch((err) => {
        setLoadError(err.response?.data?.error ?? "Couldn't load events from the backend");
        setLoadState("error");
      });
  }, []);

  const onSaved = (event) => {
    setEvents((prev) =>
      [...prev.filter((e) => e.id !== event.id), event].sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt),
      ),
    );
    setFormMode(null);
  };

  const rangeOk = isValidRange(from, to);
  const range = rangeOk ? dateRange(from, to) : {};
  const inPeriod = events.filter(
    (e) => (!range.from || e.startedAt >= range.from) && (!range.to || e.startedAt < range.to),
  );
  const countOf = (type) =>
    type === "All" ? inPeriod.length : inPeriod.filter((e) => e.type === type).length;
  const shown = typeFilter === "All" ? inPeriod : inPeriod.filter((e) => e.type === typeFilter);

  // Newest first already, so a date's events stay together
  const groups = [];
  for (const event of shown) {
    const day = new Date(event.startedAt).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (groups.at(-1)?.day !== day) groups.push({ day, events: [] });
    groups.at(-1).events.push(event);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-heading text-h4 text-grey-900">Behavior History</h1>
          <p className="text-body-md text-grey-700 mt-1">
            Mating, receptive and non-receptive periods logged by hand.
          </p>
        </div>
        {!formMode && (
          <Button variant="primary" icon={plusIcon} iconPosition="leading" onClick={() => setFormMode("new")} className="h-11">
            Add event
          </Button>
        )}
      </div>

      {formMode && (
        <EventForm
          key={formMode === "new" ? "new" : formMode.id}
          editing={formMode === "new" ? null : formMode}
          onSaved={onSaved}
          onCancel={() => setFormMode(null)}
        />
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="grid grid-cols-2 gap-4 w-full sm:w-auto">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by behavior">
          {["All", ...TYPES].map((t) => (
            <Button
              key={t}
              size="sm"
              variant={typeFilter === t ? "secondary" : "grey"}
              appearance={typeFilter === t ? "solid" : "outlined"}
              aria-pressed={typeFilter === t}
              onClick={() => setTypeFilter(t)}
              className="h-11"
            >
              {t} ({countOf(t)})
            </Button>
          ))}
        </div>
      </div>
      {!rangeOk && <p className="text-body-sm text-error-600">“From” must be on or before “To”.</p>}

      {groups.length === 0 ? (
        <Card shadow="md">
          <CardBody className="py-16 text-center">
            <div className="text-body-md text-grey-700">
              {loadState === "loading"
                ? "Loading events…"
                : loadState === "error"
                  ? loadError
                  : events.length === 0
                    ? "No behavior events yet"
                    : "No events match these filters"}
            </div>
            {loadState === "ready" && events.length === 0 && (
              <div className="text-body-sm text-grey-500 mt-1">Use “Add event” to log one.</div>
            )}
          </CardBody>
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.day} className="space-y-3">
            <h2 className="font-heading text-h6 text-grey-900">{group.day}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-6">
              {group.events.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  onEdit={() => {
                    setFormMode(e);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onDeleted={(id) => setEvents((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
