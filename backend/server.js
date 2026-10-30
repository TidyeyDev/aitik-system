const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const { createClient } = require("@supabase/supabase-js");
const {
  initRecords,
  closeRecords,
  registerRecordRoutes,
  parsePhoto,
  sendPhoto,
  offlineError,
  storageError,
} = require("./records");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Latest detections, newest first. Mirrors storage when connected,
// otherwise it is the only copy and is lost on restart.
let detections = [];
let tunnelUrl = null;

// Egg weight records, oldest first. Mirrors MongoDB, the only copy.
let eggRecords = [];

// Set by initStorage() when MONGODB_URI is configured and reachable
let detectionsCol = null;
let settingsCol = null;
let eggRecordsCol = null;
let mongoDb = null;

// Set by initStorage() when SUPABASE_URL + SUPABASE_ANON_KEY are configured
let supabase = null;

// Only report what the backend actually knows; null means "not reported yet"
let systemStatus = {
  cameras: null,
  online: false,
  lastSeen: null,
  modelDeployed: false,
  lastDetectionAt: null,
  storage: "memory",
};

function toDetection(doc) {
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

function toEggRecord(doc) {
  const { photo, ...rest } = toDetection(doc);
  return { ...rest, hasPhoto: Boolean(rest.photoUpdatedAt) };
}

// Convert a Supabase detections row to the detection object used throughout
function rowToDetection(row) {
  return {
    id: String(row.id),
    behavior: row.behavior,
    confidence: row.confidence != null ? Number(row.confidence) : null,
    camera: row.camera_id,
    snapshot: row.snapshot ?? null,
    bbox: row.bbox ?? null,
    frame: null,
    frameId: null,
    capturedAt: null,
    timestamp: row.created_at,
    source: row.source ?? "live",
    clip: row.clip ?? null,
  };
}

const EGG_BEHAVIORS = ["Receptive", "Neutral", "Non-receptive"];

// PNS/BAFS 321:2021 duck egg size categories.
// PNS/BAFS 321:2021 Table 4 — duck shell egg weight classification
function eggSizeCategory(weight) {
  if (weight > 76)  return "Jumbo";        // >76 g
  if (weight >= 71) return "Extra Large";  // 71–75.9 g
  if (weight >= 66) return "Large";        // 66–70.9 g
  if (weight >= 61) return "Medium";       // 61–65.9 g
  if (weight >= 56) return "Small";        // 56–60.9 g
  if (weight >= 51) return "Extra Small";  // 51–55.9 g
  return "Pullet";                         // 45–50.9 g
}

async function initStorage() {
  // ── Supabase (primary detection storage) ─────────────────────────────────
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_ANON_KEY;
  if (sbUrl && sbKey) {
    try {
      supabase = createClient(sbUrl, sbKey);
      const { data, error } = await supabase
        .from("detections")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      detections = data.map(rowToDetection);
      if (detections.length > 0) {
        systemStatus.modelDeployed = true;
        systemStatus.lastDetectionAt = detections[0].timestamp;
        systemStatus.lastSeen = detections[0].timestamp;
      }
      systemStatus.storage = "supabase";
      console.log(`Supabase connected: loaded ${detections.length} detections`);
    } catch (err) {
      supabase = null;
      console.error("Supabase connection failed, using memory:", err.message);
    }
  }
}

const MONGO_RETRY_MS = 10000;

// MongoDB (egg records, settings, behavior events). Retries until it connects;
// the driver handles reconnecting after that.
async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set: egg records and behavior events are offline");
    return;
  }
  let client;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "aitik");

    // Only use MongoDB for detections when Supabase is not available
    if (!supabase) {
      detectionsCol = db.collection("detections");
      await detectionsCol.createIndex({ timestamp: -1 });
      const docs = await detectionsCol
        .find()
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();
      detections = docs.map(toDetection);
      if (detections.length > 0) {
        systemStatus.modelDeployed = true;
        systemStatus.lastDetectionAt = detections[0].timestamp;
        systemStatus.lastSeen = detections[0].timestamp;
      }
      systemStatus.storage = "mongodb";
    }

    settingsCol = db.collection("settings");
    const eggsCol = db.collection("eggRecords");
    await eggsCol.createIndex({ date: 1, createdAt: 1 });

    const eggDocs = await eggsCol
      .find({}, { projection: { photo: 0 } })
      .sort({ date: 1, createdAt: 1 })
      .toArray();
    eggRecords = eggDocs.map(toEggRecord);

    // A URL the Pi posted while we were still connecting is newer than the saved one
    const saved = await settingsCol.findOne({ _id: "tunnelUrl" });
    if (saved && !tunnelUrl) tunnelUrl = saved.value;

    const records = await initRecords(db, supabase);

    eggRecordsCol = eggsCol;
    mongoDb = db;
    if (supabase) systemStatus.storage = "supabase+mongodb";
    console.log(
      `MongoDB connected: ${eggRecords.length} egg records, ${records.events} behavior events`,
    );
  } catch (err) {
    if (!supabase) detectionsCol = null;
    settingsCol = null;
    eggRecordsCol = null;
    mongoDb = null;
    closeRecords();
    if (client) client.close().catch(() => {});
    console.error(`MongoDB connection failed, retrying in ${MONGO_RETRY_MS / 1000}s:`, err.message);
    setTimeout(connectMongo, MONGO_RETRY_MS);
  }
}

// Pi is online if its tunnel answers; cached so dashboards don't hammer it
let lastTunnelCheck = 0;
async function getSystemStatus() {
  if (Date.now() - lastTunnelCheck > 30000) {
    lastTunnelCheck = Date.now();
    if (tunnelUrl) {
      try {
        const r = await fetch(tunnelUrl, { signal: AbortSignal.timeout(8000) });
        systemStatus.online = r.ok;
      } catch {
        systemStatus.online = false;
      }
      if (systemStatus.online) systemStatus.lastSeen = new Date().toISOString();
    } else {
      systemStatus.online = false;
    }
  }
  return systemStatus;
}

app.get("/", (req, res) => {
  res.json({ status: "AI-TIK Backend Running", version: "1.0.0" });
});

// Return all detections from Supabase when available; otherwise in-memory
app.get("/detections", async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("detections")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return res.json(data.map(rowToDetection));
    } catch (err) {
      console.error("Supabase fetch failed, returning memory cache:", err.message);
    }
  }
  res.json(detections);
});

const DETECTION_BEHAVIORS = ["Mating", "Receptive", "Neutral", "Non-receptive"];

// Query params shared by the history page and the CSV export. `to` is exclusive.
function detectionRange(query) {
  return { from: toTimestamp(query.from), to: toTimestamp(query.to) };
}

function supabaseDetections(columns, options, { from, to, behavior }) {
  let q = supabase.from("detections").select(columns, options);
  if (from) q = q.gte("created_at", from);
  if (to) q = q.lt("created_at", to);
  if (behavior) q = q.ilike("behavior", behavior);
  return q;
}

// Newest first, without Supabase.
// ponytail: filters in JS, push into the query if Supabase is ever dropped for good
async function localDetections({ from, to, behavior }) {
  const all = detectionsCol
    ? (await detectionsCol.find().sort({ timestamp: -1 }).toArray()).map(toDetection)
    : detections;
  return all.filter((d) => {
    const time = new Date(d.timestamp).toISOString();
    return (
      (!from || time >= from) &&
      (!to || time < to) &&
      (!behavior || String(d.behavior).toLowerCase() === behavior.toLowerCase())
    );
  });
}

async function detectionCounts(range) {
  const counts = {};
  await Promise.all(
    [null, ...DETECTION_BEHAVIORS].map(async (behavior) => {
      const filter = { ...range, behavior };
      let count;
      if (supabase) {
        const result = await supabaseDetections("id", { count: "exact", head: true }, filter);
        if (result.error) throw result.error;
        count = result.count;
      } else {
        count = (await localDetections(filter)).length;
      }
      counts[behavior ?? "All"] = count;
    }),
  );
  return counts;
}

function detectionBehavior(query) {
  return DETECTION_BEHAVIORS.includes(query.behavior) ? query.behavior : null;
}

// Detections per calendar day in the viewer's timezone: { "2026-10-29": 42, ... }
app.get("/detections/daily-counts", async (req, res) => {
  const tz = typeof req.query.tz === "string" ? req.query.tz : "UTC";
  const range = detectionRange(req.query);
  const behavior = detectionBehavior(req.query);
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  } catch {
    return res.status(400).json({ error: "invalid timezone" });
  }
  try {
    if (supabase) {
      const { data, error } = await supabase.rpc("detection_daily_counts", {
        p_tz: tz,
        p_from: range.from,
        p_to: range.to,
        p_behavior: behavior,
      });
      if (error) throw error;
      return res.json(data);
    }
    const days = {};
    const format = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    for (const d of await localDetections({ ...range, behavior })) {
      const day = format.format(new Date(d.timestamp));
      days[day] = (days[day] ?? 0) + 1;
    }
    res.json(days);
  } catch (err) {
    console.error("Failed to count detections per day:", err.message);
    res.status(500).json({ error: "storage failed" });
  }
});

// One page of history for any period; counts come with the first page.
app.get("/detections/page", async (req, res) => {
  const range = detectionRange(req.query);
  const behavior = detectionBehavior(req.query);
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 100));
  try {
    let rows, total;
    if (supabase) {
      const { data, error, count } = await supabaseDetections("*", { count: "exact" }, { ...range, behavior })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      rows = data.map(rowToDetection);
      total = count;
    } else {
      const all = await localDetections({ ...range, behavior });
      rows = all.slice(offset, offset + limit);
      total = all.length;
    }
    res.json({ rows, total, counts: offset === 0 ? await detectionCounts(range) : null });
  } catch (err) {
    console.error("Failed to load detections:", err.message);
    res.status(500).json({ error: "storage failed" });
  }
});

// Oldest first, so rows arriving during an export can't shift the pages
async function* allDetections(range) {
  if (!supabase) {
    yield* (await localDetections(range)).reverse();
    return;
  }
  const BATCH = 1000;
  for (let offset = 0; ; offset += BATCH) {
    const { data, error } = await supabaseDetections("*", {}, range)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + BATCH - 1);
    if (error) throw error;
    yield* data.map(rowToDetection);
    if (data.length < BATCH) return;
  }
}

// Leading =, +, - or @ would run as a formula when the file is opened in a spreadsheet
function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

// Pi snapshots are named by their file; photos stored inline by the detection id
function snapshotId(d) {
  if (!d.snapshot) return "";
  return d.snapshot.startsWith("data:") ? `inline-${d.id}` : d.snapshot.split("/").pop();
}

// tz = the viewer's getTimezoneOffset(), so dates match what the page shows
app.get("/detections/export.csv", async (req, res) => {
  const tz = parseInt(req.query.tz, 10) || 0;
  const start = () => {
    if (res.headersSent) return;
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="detections.csv"',
    });
    res.write("date,time,behavior,confidence,camera,snapshot_id\r\n");
  };
  try {
    const filter = { ...detectionRange(req.query), behavior: detectionBehavior(req.query) };
    for await (const d of allDetections(filter)) {
      start();
      const local = new Date(new Date(d.timestamp).getTime() - tz * 60000).toISOString();
      const cells = [local.slice(0, 10), local.slice(11, 19), d.behavior, d.confidence, d.camera, snapshotId(d)];
      res.write(cells.map(csvCell).join(",") + "\r\n");
    }
    start();
    res.end();
  } catch (err) {
    console.error("Failed to export detections:", err.message);
    // Mid-download: abort, so a cut-off file can't pass as complete
    if (res.headersSent) res.destroy();
    else res.status(500).json({ error: "storage failed" });
  }
});

function within3s(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
  ]);
}

app.get("/health", async (req, res) => {
  const [mongo, sb] = await Promise.allSettled([
    mongoDb ? within3s(mongoDb.command({ ping: 1 })) : Promise.reject(new Error("not connected")),
    supabase
      ? within3s(
          supabase.from("detections").select("id", { head: true }).limit(1).then(({ error }) => {
            if (error) throw error;
          }),
        )
      : Promise.reject(new Error("not connected")),
  ]);
  res.json({
    mongo: mongo.status === "fulfilled" ? "connected" : "disconnected",
    supabase: sb.status === "fulfilled" ? "ok" : "error",
  });
});

app.get("/status", async (req, res) => res.json(await getSystemStatus()));

app.get("/tunnel-url", (req, res) => res.json({ url: tunnelUrl }));

app.post("/tunnel-url", async (req, res) => {
  tunnelUrl = req.body.url;
  lastTunnelCheck = 0;
  console.log("Tunnel URL updated:", tunnelUrl);
  io.emit("tunnel_url", { url: tunnelUrl });
  if (settingsCol) {
    try {
      await settingsCol.updateOne(
        { _id: "tunnelUrl" },
        { $set: { value: tunnelUrl, updatedAt: new Date().toISOString() } },
        { upsert: true },
      );
    } catch (err) {
      console.error("Failed to save tunnel URL:", err.message);
    }
  }
  res.json({ success: true });
});

app.post("/detect", async (req, res) => {
  const { snapshot } = req.body;
  // "recorded" = model output on a pre-recorded clip (tools/run_clip.py), not a live camera.
  const source = req.body.source === "recorded" ? "recorded" : "live";
  const recorded = source !== "live";
  const doc = {
    snapshot: typeof snapshot === "string" && snapshot ? snapshot : null,
    behavior: req.body.behavior,
    confidence: req.body.confidence,
    camera: req.body.camera,
    source,
    clip: source === "recorded" && typeof req.body.clip === "string" ? req.body.clip.slice(0, 200) : null,
    bbox: toBbox(req.body.bbox),
    frame: toFrame(req.body.frame),
    frameId: toFrameId(req.body.frameId),
    capturedAt: toTimestamp(req.body.capturedAt),
    timestamp: new Date().toISOString(),
  };

  let detection;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("detections")
        .insert({
          behavior: doc.behavior,
          confidence: doc.confidence != null ? Number(doc.confidence) : null,
          camera_id: doc.camera,
          snapshot: doc.snapshot,
          bbox: doc.bbox,
          // Only sent for recorded clips, so live inserts never depend on these columns
          ...(recorded && { source: doc.source, clip: doc.clip }),
        })
        .select()
        .single();
      if (error) throw error;
      detection = rowToDetection(data);
      // Carry frame/capturedAt/frameId for this session's socket clients
      detection.frame = doc.frame;
      detection.frameId = doc.frameId;
      detection.capturedAt = doc.capturedAt;
    } catch (err) {
      console.error("Supabase insert failed:", err.message);
      return res.status(500).json({ success: false, error: "storage failed" });
    }
  } else if (detectionsCol) {
    try {
      const { insertedId } = await detectionsCol.insertOne(doc);
      detection = toDetection({ _id: insertedId, ...doc });
    } catch (err) {
      console.error("Failed to save detection:", err.message);
      return res.status(500).json({ success: false, error: "storage failed" });
    }
  } else {
    detection = { id: String(Date.now()), ...doc };
  }

  detections.unshift(detection);
  if (detections.length > 100) detections.pop();
  io.emit("new_detection", detection);
  // Recorded clips say nothing about the farm right now: no alert, no "last seen"
  if (recorded) return res.json({ success: true, detection });
  if (detection.behavior === "Receptive") {
    io.emit("alert", {
      message: `Receptive duck detected at ${detection.camera}!`,
      detection,
    });
  }
  systemStatus.modelDeployed = true;
  systemStatus.lastDetectionAt = detection.timestamp;
  systemStatus.lastSeen = detection.timestamp;
  res.json({ success: true, detection });
});

function isPositive(n) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function toFrame(frame) {
  if (!frame || !isPositive(frame.width) || !isPositive(frame.height)) return null;
  return { width: frame.width, height: frame.height };
}

// x and y are the box center, in pixels of the analyzed frame (as Roboflow returns them).
function toBbox(bbox) {
  if (
    !bbox ||
    typeof bbox.x !== "number" || !Number.isFinite(bbox.x) ||
    typeof bbox.y !== "number" || !Number.isFinite(bbox.y) ||
    !isPositive(bbox.width) || !isPositive(bbox.height)
  ) {
    return null;
  }
  return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
}

function toFrameId(frameId) {
  return typeof frameId === "string" && frameId.length > 0 && frameId.length <= 100
    ? frameId
    : null;
}

function toTimestamp(value) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Live boxes for the dashboard overlay.
const frameBoxes = Object.create(null);
const MAX_FRAME_BOX_CAMERAS = 32;

app.post("/frame-boxes", (req, res) => {
  const { camera } = req.body;
  if (typeof camera !== "string" || !camera || camera.length > 50) {
    return res.status(400).json({ success: false, error: "camera required" });
  }
  if (!(camera in frameBoxes) && Object.keys(frameBoxes).length >= MAX_FRAME_BOX_CAMERAS) {
    return res.status(400).json({ success: false, error: "too many cameras" });
  }
  const frame = toFrame(req.body.frame);
  const boxes = (Array.isArray(req.body.boxes) ? req.body.boxes : [])
    .slice(0, 50)
    .map((b) => ({
      behavior: b && b.behavior,
      confidence: b && b.confidence,
      bbox: toBbox(b && b.bbox),
    }))
    .filter((b) => b.bbox !== null);
  if (boxes.length > 0 && !frame) {
    return res.status(400).json({ success: false, error: "frame required with boxes" });
  }

  const payload = {
    camera,
    frameId: toFrameId(req.body.frameId),
    capturedAt: toTimestamp(req.body.capturedAt),
    receivedAt: new Date().toISOString(),
    frame,
    boxes,
  };
  frameBoxes[camera] = payload;
  io.emit("frame_boxes", payload);
  systemStatus.lastSeen = payload.receivedAt;
  res.json({ success: true });
});

// Latest boxes for one camera; an empty list if none have arrived yet
app.get("/frame-boxes/:camId", (req, res) => {
  const { camId } = req.params;
  res.json(
    frameBoxes[camId] || {
      camera: camId, frameId: null, capturedAt: null, receivedAt: null, frame: null, boxes: [],
    },
  );
});

// Egg records live only in MongoDB: no connection, no save
app.use("/eggs", (req, res, next) =>
  eggRecordsCol ? next() : offlineError(res, req.method),
);

app.get("/eggs", (req, res) => res.json(eggRecords));

// Validates an egg record body; returns { error } or { fields }
function parseEggBody(body) {
  const duck = typeof body.duck === "string" ? body.duck.trim() : "";
  const { behavior, date } = body;
  const weight = Number(body.weight);

  if (!duck) return { error: "duck is required" };
  if (!EGG_BEHAVIORS.includes(behavior)) return { error: "invalid behavior" };
  if (!Number.isFinite(weight) || weight <= 0)
    return { error: "weight must be a positive number" };
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { error: "date must be YYYY-MM-DD" };

  return {
    fields: { duck, behavior, weight, sizeCategory: eggSizeCategory(weight), date },
  };
}

app.post("/eggs", async (req, res) => {
  const { error, fields } = parseEggBody(req.body);
  if (error) return res.status(400).json({ error });
  const { error: photoError, photo } = parsePhoto(req.body);
  if (photoError) return res.status(400).json({ error: photoError });

  const now = new Date().toISOString();
  const doc = { ...fields, createdAt: now };
  if (photo) Object.assign(doc, { photo, photoUpdatedAt: now });

  let record;
  try {
    const { insertedId } = await eggRecordsCol.insertOne(doc);
    record = toEggRecord({ _id: insertedId, ...doc });
  } catch (err) {
    return storageError(req, res, err, "save egg record");
  }

  eggRecords.push(record);
  eggRecords.sort((a, b) => a.date.localeCompare(b.date));
  res.json({ success: true, record });
});

app.put("/eggs/:id", async (req, res) => {
  const { id } = req.params;
  const { error, fields } = parseEggBody(req.body);
  if (error) return res.status(400).json({ error });
  const { error: photoError, photo } = parsePhoto(req.body);
  if (photoError) return res.status(400).json({ error: photoError });

  const index = eggRecords.findIndex((r) => r.id === id);
  const photoUpdatedAt = photo ? new Date().toISOString() : undefined;

  if (!ObjectId.isValid(id))
    return res.status(404).json({ error: "record not found" });
  const update = { $set: { ...fields } };
  if (photo) Object.assign(update.$set, { photo, photoUpdatedAt });
  if (photo === null) update.$unset = { photo: "", photoUpdatedAt: "" };
  try {
    const { matchedCount } = await eggRecordsCol.updateOne(
      { _id: new ObjectId(id) },
      update,
    );
    if (matchedCount === 0)
      return res.status(404).json({ error: "record not found" });
  } catch (err) {
    return storageError(req, res, err, "update egg record");
  }

  const record = { ...(eggRecords[index] ?? { id }), ...fields };
  if (photo !== undefined) {
    if (photo) record.photoUpdatedAt = photoUpdatedAt;
    else delete record.photoUpdatedAt;
    record.hasPhoto = Boolean(photo);
  }
  if (index !== -1) eggRecords[index] = record;
  else eggRecords.push(record);
  eggRecords.sort((a, b) => a.date.localeCompare(b.date));
  res.json({ success: true, record });
});

app.delete("/detections/:id", async (req, res) => {
  const { id } = req.params;
  const index = detections.findIndex((d) => d.id === id);

  if (supabase) {
    try {
      // .select() returns the deleted rows; none back means RLS blocked it or no such id
      const { data, error } = await supabase.from("detections").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data.length)
        return res.status(404).json({
          error: "not deleted: record not found or Supabase has no delete policy",
        });
    } catch (err) {
      console.error("Failed to delete detection:", err.message);
      return res.status(500).json({ error: "storage failed" });
    }
  } else if (detectionsCol) {
    if (!ObjectId.isValid(id)) return res.status(404).json({ error: "record not found" });
    try {
      const { deletedCount } = await detectionsCol.deleteOne({ _id: new ObjectId(id) });
      if (deletedCount === 0) return res.status(404).json({ error: "record not found" });
    } catch (err) {
      console.error("Failed to delete detection:", err.message);
      return res.status(500).json({ error: "storage failed" });
    }
  } else if (index === -1) {
    return res.status(404).json({ error: "record not found" });
  }

  if (index !== -1) detections.splice(index, 1);
  io.emit("detection_deleted", { id });
  res.json({ success: true });
});

app.delete("/eggs/:id", async (req, res) => {
  const { id } = req.params;
  const index = eggRecords.findIndex((r) => r.id === id);

  if (!ObjectId.isValid(id))
    return res.status(404).json({ error: "record not found" });
  try {
    const { deletedCount } = await eggRecordsCol.deleteOne({
      _id: new ObjectId(id),
    });
    if (deletedCount === 0)
      return res.status(404).json({ error: "record not found" });
  } catch (err) {
    return storageError(req, res, err, "delete egg record");
  }

  if (index !== -1) eggRecords.splice(index, 1);
  res.json({ success: true });
});

app.get("/eggs/:id/photo", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(404).json({ error: "photo not found" });
  try {
    const doc = await eggRecordsCol.findOne(
      { _id: new ObjectId(id) },
      { projection: { photo: 1 } },
    );
    sendPhoto(res, doc?.photo);
  } catch (err) {
    storageError(req, res, err, "load egg photo");
  }
});

registerRecordRoutes(app);

io.on("connection", async (socket) => {
  console.log("Dashboard connected:", socket.id);
  socket.emit("init", {
    detections,
    systemStatus: await getSystemStatus(),
    tunnelUrl,
  });
  socket.on("disconnect", () => console.log("Disconnected:", socket.id));
});

const PORT = process.env.PORT || 8080;
initStorage().then(() => {
  server.listen(PORT, () =>
    console.log(`AI-TIK Backend running on port ${PORT}`),
  );
  connectMongo();
});
