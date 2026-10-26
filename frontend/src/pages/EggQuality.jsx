import { useState, useEffect, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  MetricsCard,
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
import { api, BACKEND_URL } from "../api/client";
import { BEHAVIOR_HEX, behaviorBadgeColor } from "../behavior";

const EGG_BEHAVIORS = ["Receptive", "Neutral", "Non-receptive"];

// Size category is calculated by the backend (server.js eggSizeCategory);
// the page only maps the stored label to a badge colour.
const SIZE_COLORS = {
  "Extra Large": "purple",
  Large:         "success",
  Medium:        "warning",
  Small:         "error",
};

// form.photo: undefined = keep the saved photo, null = remove it, string = new data URL
const EMPTY_FORM = { duck: "", behavior: "Receptive", weight: "", date: "" };

// ?v= changes when the photo is replaced, so the browser can cache each version
const photoUrl = (d) =>
  `${BACKEND_URL}/eggs/${d.id}/photo?v=${encodeURIComponent(d.photoUpdatedAt)}`;

// Shrinks a photo to max 1280px on the long side as JPEG (~100–300 KB)
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}

export default function EggQuality() {
  const [data, setData] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const photoInputRef = useRef(null);
  const dialogRef = useRef(null);

  const editingRecord = data.find((r) => r.id === editingId);
  const previewSrc =
    typeof form.photo === "string"
      ? form.photo
      : form.photo === undefined && editingRecord?.hasPhoto
        ? photoUrl(editingRecord)
        : null;

  useEffect(() => {
    api
      .get("/eggs")
      .then((res) => {
        setData(res.data);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, []);

  const emptyMessage =
    loadState === "loading"
      ? "Loading records…"
      : loadState === "error"
        ? "Couldn't load records from the backend"
        : "No records yet";

  const avg = (arr) =>
    arr.length
      ? (arr.reduce((s, d) => s + d.weight, 0) / arr.length).toFixed(1)
      : "—";

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.duck.trim() || !form.weight || !form.date) {
      setSaveError("Fill in duck, weight and date.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const body = { ...form, weight: parseFloat(form.weight) };
    (editingId ? api.put(`/eggs/${editingId}`, body) : api.post("/eggs", body))
      .then((res) => {
        setData((prev) =>
          [...prev.filter((r) => r.id !== editingId), res.data.record].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        );
        closeForm();
      })
      .catch((err) =>
        setSaveError(
          err.response?.data?.error
            ? `Not saved: ${err.response.data.error}`
            : "Not saved: couldn't reach the backend.",
        ),
      )
      .finally(() => setSaving(false));
  };

  const closeForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setSaveError(null);
  };

  const startEdit = (d) => {
    setForm({ duck: d.duck, behavior: d.behavior, weight: String(d.weight), date: d.date });
    setEditingId(d.id);
    setSaveError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // lets the same file be picked again
    if (!file) return;
    setPhotoBusy(true);
    setSaveError(null);
    try {
      const photo = await resizeImage(file);
      setForm((f) => ({ ...f, photo }));
    } catch {
      setSaveError("Couldn't read that image. Try a JPEG or PNG photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const openPhoto = (d) => {
    setViewing(d);
    dialogRef.current.showModal();
  };

  const handleDelete = (id) => {
    setDeletingId(id);
    setDeleteError(null);
    api
      .delete(`/eggs/${id}`)
      .then(() => {
        setData((prev) => prev.filter((r) => r.id !== id));
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

  const maxWeight = Math.max(...data.map((d) => d.weight));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-heading text-h4 text-grey-900">Egg Quality</h1>
          <p className="text-body-md text-grey-700 mt-1">
            Correlation of reproductive receptivity with egg weight — Objective 3
          </p>
        </div>
        {!showForm && (
          <Button variant="primary" icon={plusIcon} iconPosition="leading" onClick={() => setShowForm(true)} className="h-11">
            Record egg
          </Button>
        )}
      </div>

      {showForm && (
        <Card shadow="md">
          <CardHeader title={editingId ? "Edit egg record" : "New egg record"} bordered />
          <CardBody className="p-6">
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Input
                  label="Duck"
                  value={form.duck}
                  onChange={(e) => setForm({ ...form, duck: e.target.value })}
                  placeholder="e.g. Duck 1"
                />
                <Select
                  label="Behavior class"
                  value={form.behavior}
                  onValueChange={(behavior) => setForm({ ...form, behavior })}
                >
                  {EGG_BEHAVIORS.map((b) => (
                    <SelectOption key={b} value={b}>
                      {b}
                    </SelectOption>
                  ))}
                </Select>
                <Input
                  label="Weight (grams)"
                  type="number"
                  inputMode="decimal"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  placeholder="e.g. 65"
                />
                <Input
                  label="Date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <span className="block text-body-sm font-medium text-grey-700 mb-1.5">
                  Photo (egg on scale)
                </span>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={handlePhotoChange}
                />
                <div className="flex flex-wrap items-center gap-3">
                  {previewSrc && (
                    <img
                      src={previewSrc}
                      alt="Egg photo preview"
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
                      onClick={() =>
                        setForm({ ...form, photo: editingRecord?.hasPhoto ? null : undefined })
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              {saveError && <p className="text-body-sm text-error-600">{saveError}</p>}
              <div className="flex gap-3">
                <Button type="submit" variant="primary" disabled={saving || photoBusy} className="h-11">
                  {saving ? "Saving…" : editingId ? "Save changes" : "Save record"}
                </Button>
                <Button
                  type="button"
                  variant="grey"
                  appearance="outlined"
                  className="h-11"
                  onClick={closeForm}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Average weight per behavior */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {EGG_BEHAVIORS.map((b) => {
          const eggs = data.filter((d) => d.behavior === b);
          return (
            <MetricsCard
              key={b}
              label={`${b} — average weight`}
              value={eggs.length ? `${avg(eggs)} g` : "—"}
              description={`${eggs.length} eggs`}
            />
          );
        })}
      </div>

      {/* Egg weight by duck */}
      <Card shadow="md">
        <CardHeader
          title="Egg weight by duck"
          subtitle="Visual comparison — PNS/BAFS 321:2021 size categories"
          bordered
        />
        <CardBody className="p-6">
          {data.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-body-md text-grey-700">{emptyMessage}</div>
              {loadState === "ready" && (
                <div className="text-body-sm text-grey-500 mt-1">
                  Use "Record egg" to add egg weight data
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((d) => {
                const color = BEHAVIOR_HEX[d.behavior] ?? "#98A2B3";
                return (
                  <div key={d.id} className="flex items-center gap-4">
                    <div className="w-20 shrink-0 text-body-sm text-grey-700 text-right truncate">
                      {d.duck}
                    </div>
                    <div className="flex-1 h-7 rounded-md bg-grey-100 overflow-hidden">
                      <div
                        className="h-7 rounded-md flex items-center px-2"
                        style={{ width: `${(d.weight / maxWeight) * 100}%`, background: color }}
                      >
                        <span className="text-body-xs font-semibold text-white">
                          {d.weight}g
                        </span>
                      </div>
                    </div>
                    <div className="w-20 shrink-0">
                      <Badge color={SIZE_COLORS[d.sizeCategory] ?? "neutral"} size="sm">
                        {d.sizeCategory ?? "—"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Records */}
      <Card shadow="md">
        <CardHeader title="Egg weight records" bordered />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Duck</TableHead>
                <TableHead>Behavior</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Size category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Photo</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}className="py-10 text-center text-grey-500">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
              {data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-grey-900">{d.duck}</TableCell>
                  <TableCell>
                    <Badge color={behaviorBadgeColor(d.behavior)} size="sm">
                      {d.behavior}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{d.weight}g</TableCell>
                  <TableCell>
                    <Badge color={SIZE_COLORS[d.sizeCategory] ?? "neutral"} size="sm">
                      {d.sizeCategory ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>{d.date}</TableCell>
                  <TableCell>
                    {d.hasPhoto ? (
                      <button
                        type="button"
                        onClick={() => openPhoto(d)}
                        aria-label={`View photo for ${d.duck} on ${d.date}`}
                        className="block size-11 overflow-hidden rounded-md border border-grey-200 cursor-zoom-in"
                      >
                        <img
                          src={photoUrl(d)}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      </button>
                    ) : (
                      <span className="text-grey-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {confirmDeleteId === d.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-body-xs text-grey-600">
                          Delete this record?
                        </span>
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
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="grey"
                          appearance="outlined"
                          size="sm"
                          iconPosition="icon-only"
                          icon={<Pencil size={16} />}
                          aria-label={`Edit record for ${d.duck} on ${d.date}`}
                          title="Edit record"
                          className="size-11"
                          onClick={() => startEdit(d)}
                        />
                        <Button
                          variant="grey"
                          appearance="outlined"
                          size="sm"
                          iconPosition="icon-only"
                          icon={<Trash2 size={16} />}
                          aria-label={`Delete record for ${d.duck} on ${d.date}`}
                          title="Delete record"
                          className="size-11"
                          onClick={() => {
                            setConfirmDeleteId(d.id);
                            setDeleteError(null);
                          }}
                        />
                      </div>
                    )}
                    {deleteError?.id === d.id && (
                      <div className="text-body-xs text-error-600 mt-1">
                        {deleteError.message}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Native dialog: Esc, focus trap and backdrop for free; click outside closes */}
      <dialog
        ref={dialogRef}
        onClose={() => setViewing(null)}
        onClick={(e) => e.target === e.currentTarget && dialogRef.current.close()}
        className="m-auto w-[min(92vw,960px)] rounded-lg p-0 bg-white backdrop:bg-black/70"
      >
        {viewing && (
          <figure>
            <img
              src={photoUrl(viewing)}
              alt={`Egg from ${viewing.duck} on the scale`}
              className="block w-full max-h-[78vh] object-contain bg-grey-900"
            />
            <figcaption className="flex items-center justify-between gap-4 p-4">
              <span className="text-body-md text-grey-900">
                <span className="font-semibold">{viewing.duck}</span> · {viewing.weight}g ·{" "}
                {viewing.date}
              </span>
              <Button
                variant="grey"
                appearance="outlined"
                size="sm"
                className="h-11"
                onClick={() => dialogRef.current.close()}
              >
                Close
              </Button>
            </figcaption>
          </figure>
        )}
      </dialog>
    </div>
  );
}
