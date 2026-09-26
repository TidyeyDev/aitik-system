const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

// Latest detections, newest first. Mirrors MongoDB when connected,
// otherwise it is the only copy and is lost on restart.
let detections = [];
let tunnelUrl = null;

// Egg weight records, oldest first. Same persistence rules as detections.
let eggRecords = [];

// Set by initStorage() when MONGODB_URI is configured and reachable
let detectionsCol = null;
let settingsCol = null;
let eggRecordsCol = null;

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

const EGG_BEHAVIORS = ["Receptive", "Neutral", "Non-receptive"];

// PNS/BAFS 321:2021 size categories. Single source of truth: the frontend
// displays the stored sizeCategory rather than recalculating it.
function eggSizeCategory(weight) {
  if (weight >= 70) return "Jumbo";
  if (weight >= 65) return "Large";
  if (weight >= 60) return "Medium";
  return "Small";
}

async function initStorage() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("MONGODB_URI not set: detections and egg records are kept in memory only");
    return;
  }
  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "aitik");
    detectionsCol = db.collection("detections");
    settingsCol = db.collection("settings");
    eggRecordsCol = db.collection("eggRecords");
    await detectionsCol.createIndex({ timestamp: -1 });
    await eggRecordsCol.createIndex({ date: 1, createdAt: 1 });

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

    const eggDocs = await eggRecordsCol
      .find()
      .sort({ date: 1, createdAt: 1 })
      .toArray();
    eggRecords = eggDocs.map(toDetection);

    const saved = await settingsCol.findOne({ _id: "tunnelUrl" });
    if (saved) tunnelUrl = saved.value;

    systemStatus.storage = "mongodb";
    console.log(
      `MongoDB connected: loaded ${detections.length} detections, ${eggRecords.length} egg records`,
    );
  } catch (err) {
    detectionsCol = null;
    settingsCol = null;
    eggRecordsCol = null;
    console.error("MongoDB connection failed, using memory:", err.message);
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

app.get("/detections", (req, res) => res.json(detections));

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
    // URL/path to the frame hosted elsewhere; image data is never stored here
    snapshot: typeof snapshot === "string" && snapshot ? snapshot : null,
    behavior: req.body.behavior,
    confidence: req.body.confidence,
    camera: req.body.camera,
    timestamp: new Date().toISOString(),
  };

  let detection;
  if (detectionsCol) {
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

app.get("/eggs", (req, res) => res.json(eggRecords));

app.post("/eggs", async (req, res) => {
  const duck = typeof req.body.duck === "string" ? req.body.duck.trim() : "";
  const { behavior, date } = req.body;
  const weight = Number(req.body.weight);

  if (!duck) return res.status(400).json({ error: "duck is required" });
  if (!EGG_BEHAVIORS.includes(behavior))
    return res.status(400).json({ error: "invalid behavior" });
  if (!Number.isFinite(weight) || weight <= 0)
    return res.status(400).json({ error: "weight must be a positive number" });
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });

  const doc = {
    duck,
    behavior,
    weight,
    sizeCategory: eggSizeCategory(weight),
    date,
    createdAt: new Date().toISOString(),
  };

  let record;
  if (eggRecordsCol) {
    try {
      const { insertedId } = await eggRecordsCol.insertOne(doc);
      record = toDetection({ _id: insertedId, ...doc });
    } catch (err) {
      console.error("Failed to save egg record:", err.message);
      return res.status(500).json({ error: "storage failed" });
    }
  } else {
    record = { id: String(Date.now()), ...doc };
  }

  eggRecords.push(record);
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
  res.json({ success: true });
});

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
