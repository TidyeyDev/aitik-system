import { useEffect, useState } from "react";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input } from "@raydenui/ui";
import { plusIcon } from "@raydenui/ui/icons";
import { api } from "../api/client";

// Mating events logged by hand from the recordings. The AI detects the
// behavior; the researcher who watched the clip writes down the females.

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

function errorText(err, action) {
  return err.response?.data?.error
    ? `Not ${action}: ${err.response.data.error}`
    : `Not ${action}: couldn't reach the backend.`;
}

function EventForm({ editing, onSaved, onCancel }) {
  const [form, setForm] = useState(
    editing
      ? {
          videoUrl: editing.videoUrl,
          occurredAt: toLocalInput(editing.occurredAt),
          females: editing.females || "",
          notes: editing.notes || "",
        }
      : { videoUrl: "", occurredAt: toLocalInput(), females: "", notes: "" },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!form.videoUrl.trim() || !form.occurredAt) {
      setError("Add the video link and the date.");
      return;
    }
    const body = { ...form, videoUrl: form.videoUrl.trim(), occurredAt: new Date(form.occurredAt).toISOString() };
    setSaving(true);
    setError(null);
    (editing ? api.put(`/mating-events/${editing.id}`, body) : api.post("/mating-events", body))
      .then((res) => onSaved(res.data.event))
      .catch((err) => setError(errorText(err, "saved")))
      .finally(() => setSaving(false));
  };

  return (
    <Card shadow="md">
      <CardHeader title={editing ? "Edit mating event" : "Add mating event"} bordered />
      <CardBody className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Video link"
            type="url"
            value={form.videoUrl}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            placeholder="Paste a Google Drive or YouTube link"
            helperText="On Drive, set sharing to “Anyone with the link”."
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Date and time"
              type="datetime-local"
              value={form.occurredAt}
              onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
            />
            <Input
              label="Female duck(s)"
              value={form.females}
              maxLength={120}
              onChange={(e) => setForm({ ...form, females: e.target.value })}
              placeholder="e.g. Bella"
            />
            <Input
              label="Notes (optional)"
              value={form.notes}
              maxLength={500}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Camera 2, starts at 1:20"
            />
          </div>
          {error && <p className="text-body-sm text-error-600">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" variant="primary" disabled={saving} className="h-11">
              {saving ? "Saving…" : "Save"}
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
  const embed = embedFor(event.videoUrl);

  const remove = () => {
    setDeleting(true);
    setError(null);
    api
      .delete(`/mating-events/${event.id}`)
      .then(() => onDeleted(event.id))
      .catch((err) => setError(errorText(err, "deleted")))
      .finally(() => setDeleting(false));
  };

  return (
    <Card shadow="md" className="overflow-hidden">
      <div className="aspect-video bg-grey-900">
        {embed?.kind === "iframe" && (
          <iframe
            src={embed.src}
            title={`Mating event ${new Date(event.occurredAt).toLocaleString()}`}
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
      <CardBody className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Badge color="blue" size="sm">Mating</Badge>
            <div className="mt-2 text-body-md font-semibold text-grey-900">
              {event.females || "Female not identified"}
            </div>
            <div className="text-body-sm text-grey-600">
              {new Date(event.occurredAt).toLocaleString()}
            </div>
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
          <div className="flex items-center gap-2 pt-1">
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

export default function MatingEvents() {
  const [events, setEvents] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [formMode, setFormMode] = useState(null); // null | "new" | the event being edited

  useEffect(() => {
    api
      .get("/mating-events")
      .then((res) => {
        setEvents(res.data);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, []);

  const onSaved = (event) => {
    setEvents((prev) =>
      [...prev.filter((e) => e.id !== event.id), event].sort((a, b) =>
        b.occurredAt.localeCompare(a.occurredAt),
      ),
    );
    setFormMode(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-heading text-h4 text-grey-900">Mating Events</h1>
          <p className="text-body-md text-grey-700 mt-1">
            Recorded mating events from the enclosure cameras.
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

      {events.length === 0 ? (
        <Card shadow="md">
          <CardBody className="py-16 text-center">
            <div className="text-body-md text-grey-700">
              {loadState === "loading"
                ? "Loading events…"
                : loadState === "error"
                  ? "Couldn't load events from the backend"
                  : "No mating events yet"}
            </div>
            {loadState === "ready" && (
              <div className="text-body-sm text-grey-500 mt-1">Use “Add event” to attach a video.</div>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {events.map((e) => (
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
      )}
    </div>
  );
}
