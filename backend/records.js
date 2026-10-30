// Behavior events logged by hand: mating, receptive and non-receptive periods.
// MongoDB is the only copy: nothing here is kept in memory, trimmed or expired.
// Only DELETE /behavior-events/:id removes an event.

const { ObjectId } = require("mongodb");

const TYPES = ["Mating", "Receptive", "Non-receptive"];

let eventsCol = null;

// ── Shared with the egg routes ──────────────────────────────────────────────

// Raster types only: an SVG served from this origin could run script
const PHOTO_DATA_URL = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

// Optional photo field: undefined = leave as is, null = remove, string = new photo
function parsePhoto(body) {
  const { photo } = body;
  if (photo === undefined || photo === null) return { photo };
  const match = typeof photo === "string" && PHOTO_DATA_URL.exec(photo);
  if (!match) return { error: "photo must be a JPEG, PNG, WebP or GIF data URL" };
  if (Buffer.byteLength(match[2], "base64") > MAX_PHOTO_BYTES)
    return { error: "photo must be 2 MB or smaller" };
  return { photo };
}

function sendPhoto(res, photo) {
  const match = photo && PHOTO_DATA_URL.exec(photo);
  if (!match) return res.status(404).json({ error: "photo not found" });
  res.set({
    "Content-Type": match[1],
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  res.send(Buffer.from(match[2], "base64"));
}

function offlineError(res, method) {
  const verb = { GET: "Not loaded", DELETE: "Not deleted" }[method] ?? "Not saved";
  res.status(503).json({ error: `${verb} — database offline` });
}

// A lost connection surfaces as an error on the operation, not as a null collection
function storageError(req, res, err, action) {
  console.error(`Failed to ${action}:`, err.message);
  if (/^Mongo(ServerSelection|Network|NotConnected|TopologyClosed)/.test(err.name))
    return offlineError(res, req.method);
  res.status(500).json({ error: "storage failed" });
}

// ── One-time migrations ─────────────────────────────────────────────────────
// A settings marker, so an event deleted later doesn't come back on restart.
// Upserts by _id, so a migration interrupted halfway can safely run again.

async function runOnce(db, name, migrate) {
  const settings = db.collection("settings");
  if (await settings.findOne({ _id: name })) return;
  const count = await migrate();
  await settings.insertOne({ _id: name, count, at: new Date().toISOString() });
  console.log(`Migration ${name}: copied ${count} events`);
}

// Old matingEvents documents stay in place as a backup
function migrateMatingEvents(db, col) {
  return runOnce(db, "migratedMatingEvents", async () => {
    const docs = await db.collection("matingEvents").find().toArray();
    for (const doc of docs) {
      await col.updateOne(
        { _id: doc._id },
        {
          $setOnInsert: {
            ...doc,
            type: "Mating",
            startedAt: doc.occurredAt,
            endedAt: null,
            ducks: doc.females || "",
            camera: "",
            updatedAt: doc.updatedAt || doc.createdAt,
          },
        },
        { upsert: true },
      );
    }
    return docs.length;
  });
}

// Samples entered on the Detections page; the Supabase rows are left untouched
function migrateDemoDetections(db, col, supabase) {
  return runOnce(db, "migratedDemoDetections", async () => {
    const { data, error } = await supabase.from("detections").select("*").eq("source", "demo");
    if (error) throw error;
    const now = new Date().toISOString();
    for (const row of data) {
      const type = TYPES.find((t) => t.toLowerCase() === String(row.behavior).toLowerCase());
      if (!type) continue;
      const photo = PHOTO_DATA_URL.test(row.snapshot || "") ? row.snapshot : null;
      await col.updateOne(
        { sourceDetectionId: row.id },
        {
          $setOnInsert: {
            sourceDetectionId: row.id,
            type,
            startedAt: new Date(row.created_at).toISOString(),
            endedAt: null,
            ducks: "",
            camera: row.camera_id || "",
            notes: `Imported from the Detections log (confidence entered: ${Math.round(row.confidence * 100)}%)`,
            videoUrl: "",
            ...(photo && { photo, photoUpdatedAt: now }),
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true },
      );
    }
    return data.length;
  });
}

async function initRecords(db, supabase) {
  const col = db.collection("behaviorEvents");
  await col.createIndex({ startedAt: -1 });
  await migrateMatingEvents(db, col);
  if (supabase) {
    // Not fatal: the marker stays unset, so it runs again on the next start
    await migrateDemoDetections(db, col, supabase).catch((err) =>
      console.error("Demo detection migration failed:", err.message),
    );
  }
  eventsCol = col;
  return { events: await col.countDocuments() };
}

function closeRecords() {
  eventsCol = null;
}

// ── Routes ──────────────────────────────────────────────────────────────────

function fromDoc(doc) {
  const { _id, photo, ...rest } = doc;
  return { id: _id.toString(), ...rest, hasPhoto: Boolean(rest.photoUpdatedAt) };
}

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function toIso(value) {
  const date = new Date(value);
  return typeof value !== "string" || Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Returns { event } or { error }
function validateEvent(body) {
  if (!TYPES.includes(body.type)) return { error: "invalid behavior type" };

  const startedAt = toIso(body.startedAt);
  if (!startedAt) return { error: "start date and time are required" };
  let endedAt = null;
  if (body.endedAt) {
    endedAt = toIso(body.endedAt);
    if (!endedAt) return { error: "end date and time are not valid" };
    if (endedAt < startedAt) return { error: "end must be after the start" };
  }

  const videoUrl = cleanText(body.videoUrl, 2000);
  if (videoUrl) {
    let url = null;
    try {
      url = new URL(videoUrl);
    } catch {}
    if (!url || !["http:", "https:"].includes(url.protocol))
      return { error: "video link must start with http:// or https://" };
  }

  return {
    event: {
      type: body.type,
      startedAt,
      endedAt,
      ducks: cleanText(body.ducks, 120),
      camera: cleanText(body.camera, 50),
      notes: cleanText(body.notes, 500),
      videoUrl,
    },
  };
}

function registerRecordRoutes(app) {
  app.use("/behavior-events", (req, res, next) =>
    eventsCol ? next() : offlineError(res, req.method),
  );

  // Every event, no limit. Photos are fetched one at a time by the route below.
  app.get("/behavior-events", async (req, res) => {
    try {
      const docs = await eventsCol
        .find({}, { projection: { photo: 0 } })
        .sort({ startedAt: -1 })
        .toArray();
      res.json(docs.map(fromDoc));
    } catch (err) {
      storageError(req, res, err, "load behavior events");
    }
  });

  app.post("/behavior-events", async (req, res) => {
    const { event, error } = validateEvent(req.body);
    if (error) return res.status(400).json({ error });
    const { error: photoError, photo } = parsePhoto(req.body);
    if (photoError) return res.status(400).json({ error: photoError });

    const now = new Date().toISOString();
    const doc = { ...event, createdAt: now, updatedAt: now };
    if (photo) Object.assign(doc, { photo, photoUpdatedAt: now });
    try {
      const { insertedId } = await eventsCol.insertOne(doc);
      res.json({ success: true, event: fromDoc({ ...doc, _id: insertedId }) });
    } catch (err) {
      storageError(req, res, err, "save behavior event");
    }
  });

  app.put("/behavior-events/:id", async (req, res) => {
    if (!ObjectId.isValid(req.params.id))
      return res.status(404).json({ error: "event not found" });
    const { event, error } = validateEvent(req.body);
    if (error) return res.status(400).json({ error });
    const { error: photoError, photo } = parsePhoto(req.body);
    if (photoError) return res.status(400).json({ error: photoError });

    const now = new Date().toISOString();
    const update = { $set: { ...event, updatedAt: now } };
    if (photo) Object.assign(update.$set, { photo, photoUpdatedAt: now });
    if (photo === null) update.$unset = { photo: "", photoUpdatedAt: "" };
    try {
      const updated = await eventsCol.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        update,
        { returnDocument: "after", projection: { photo: 0 } },
      );
      if (!updated) return res.status(404).json({ error: "event not found" });
      res.json({ success: true, event: fromDoc(updated) });
    } catch (err) {
      storageError(req, res, err, "update behavior event");
    }
  });

  app.delete("/behavior-events/:id", async (req, res) => {
    if (!ObjectId.isValid(req.params.id))
      return res.status(404).json({ error: "event not found" });
    try {
      const { deletedCount } = await eventsCol.deleteOne({ _id: new ObjectId(req.params.id) });
      if (deletedCount === 0) return res.status(404).json({ error: "event not found" });
      res.json({ success: true });
    } catch (err) {
      storageError(req, res, err, "delete behavior event");
    }
  });

  app.get("/behavior-events/:id/photo", async (req, res) => {
    if (!ObjectId.isValid(req.params.id))
      return res.status(404).json({ error: "photo not found" });
    try {
      const doc = await eventsCol.findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { photo: 1 } },
      );
      sendPhoto(res, doc?.photo);
    } catch (err) {
      storageError(req, res, err, "load behavior event photo");
    }
  });
}

module.exports = {
  initRecords,
  closeRecords,
  registerRecordRoutes,
  parsePhoto,
  sendPhoto,
  offlineError,
  storageError,
};
