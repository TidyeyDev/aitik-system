const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

let detections = [];
let tunnelUrl = null;
// Only report what the backend actually knows; null means "not reported yet"
let systemStatus = {
  cameras: null,
  online: false,
  lastSeen: null,
  modelDeployed: false,
  lastDetectionAt: null,
};

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

app.post("/tunnel-url", (req, res) => {
  tunnelUrl = req.body.url;
  lastTunnelCheck = 0;
  console.log("Tunnel URL updated:", tunnelUrl);
  io.emit("tunnel_url", { url: tunnelUrl });
  res.json({ success: true });
});

app.post("/detect", (req, res) => {
  const detection = {
    id: detections.length + 1,
    duck: req.body.duck || "Unknown",
    behavior: req.body.behavior,
    confidence: req.body.confidence,
    camera: req.body.camera,
    timestamp: new Date().toISOString(),
  };
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
server.listen(PORT, () =>
  console.log(`AI-TIK Backend running on port ${PORT}`),
);
