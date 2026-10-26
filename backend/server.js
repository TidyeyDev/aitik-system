const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const { createClient } = require("@supabase/supabase-js");
const { initRecords, registerRecordRoutes } = require("./records");

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

// Egg weight records, oldest first.
let eggRecords = [];
const eggPhotos = new Map();

// Set by initStorage() when MONGODB_URI is configured and reachable
let detectionsCol = null;
let settingsCol = null;
let eggRecordsCol = null;

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

  // ── MongoDB (egg records, settings, mating events) ────────────────────────
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    if (!supabase) {
      console.warn(
        "Neither SUPABASE_URL nor MONGODB_URI set: all data is kept in memory only",
      );
    }
    return;
  }
  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
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
    eggRecordsCol = db.collection("eggRecords");
    await eggRecordsCol.createIndex({ date: 1, createdAt: 1 });

    const eggDocs = await eggRecordsCol
      .find({}, { projection: { photo: 0 } })
      .sort({ date: 1, createdAt: 1 })
      .toArray();
    eggRecords = eggDocs.map(toEggRecord);

    const saved = await settingsCol.findOne({ _id: "tunnelUrl" });
    if (saved) tunnelUrl = saved.value;

    const records = await initRecords(db);

    if (supabase) systemStatus.storage = "supabase+mongodb";
    console.log(
      `MongoDB connected: ${eggRecords.length} egg records, ${records.events} mating events`,
    );
  } catch (err) {
    if (!supabase) {
      detectionsCol = null;
    }
    settingsCol = null;
    eggRecordsCol = null;
    console.error("MongoDB connection failed:", err.message);
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
  const doc = {
    snapshot: typeof snapshot === "string" && snapshot ? snapshot : null,
    behavior: req.body.behavior,
    confidence: req.body.confidence,
    camera: req.body.camera,
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

app.post("/eggs", async (req, res) => {
  const { error, fields } = parseEggBody(req.body);
  if (error) return res.status(400).json({ error });
  const { error: photoError, photo } = parsePhoto(req.body);
  if (photoError) return res.status(400).json({ error: photoError });

  const now = new Date().toISOString();
  const doc = { ...fields, createdAt: now };
  if (photo) Object.assign(doc, { photo, photoUpdatedAt: now });

  let record;
  if (eggRecordsCol) {
    try {
      const { insertedId } = await eggRecordsCol.insertOne(doc);
      record = toEggRecord({ _id: insertedId, ...doc });
    } catch (err) {
      console.error("Failed to save egg record:", err.message);
      return res.status(500).json({ error: "storage failed" });
    }
  } else {
    record = toEggRecord({ _id: String(Date.now()), ...doc });
    if (photo) eggPhotos.set(record.id, photo);
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

  if (eggRecordsCol) {
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
      console.error("Failed to update egg record:", err.message);
      return res.status(500).json({ error: "storage failed" });
    }
  } else if (index === -1) {
    return res.status(404).json({ error: "record not found" });
  }

  const record = { ...(eggRecords[index] ?? { id }), ...fields };
  if (photo !== undefined) {
    if (photo) record.photoUpdatedAt = photoUpdatedAt;
    else delete record.photoUpdatedAt;
    record.hasPhoto = Boolean(photo);
    if (eggRecordsCol) {
      // MongoDB holds the photo
    } else if (photo) eggPhotos.set(id, photo);
    else eggPhotos.delete(id);
  }
  if (index !== -1) eggRecords[index] = record;
  else eggRecords.push(record);
  eggRecords.sort((a, b) => a.date.localeCompare(b.date));
  res.json({ success: true, record });
});

app.delete("/eggs/:id", async (req, res) => {
  const { id } = req.params;
  const index = eggRecords.findIndex((r) => r.id === id);

  if (eggRecordsCol) {
    if (!ObjectId.isValid(id))
      return res.status(404).json({ error: "record not found" });
    try {
      const { deletedCount } = await eggRecordsCol.deleteOne({
        _id: new ObjectId(id),
      });
      if (deletedCount === 0)
        return res.status(404).json({ error: "record not found" });
    } catch (err) {
      console.error("Failed to delete egg record:", err.message);
      return res.status(500).json({ error: "storage failed" });
    }
  } else if (index === -1) {
    return res.status(404).json({ error: "record not found" });
  }

  if (index !== -1) eggRecords.splice(index, 1);
  eggPhotos.delete(id);
  res.json({ success: true });
});

app.get("/eggs/:id/photo", async (req, res) => {
  const { id } = req.params;
  let photo = eggPhotos.get(id);
  if (eggRecordsCol) {
    if (!ObjectId.isValid(id)) return res.status(404).json({ error: "photo not found" });
    try {
      const doc = await eggRecordsCol.findOne(
        { _id: new ObjectId(id) },
        { projection: { photo: 1 } },
      );
      photo = doc?.photo;
    } catch (err) {
      console.error("Failed to load egg photo:", err.message);
      return res.status(500).json({ error: "storage failed" });
    }
  }
  const match = photo && PHOTO_DATA_URL.exec(photo);
  if (!match) return res.status(404).json({ error: "photo not found" });

  res.set({
    "Content-Type": match[1],
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  res.send(Buffer.from(match[2], "base64"));
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
});
