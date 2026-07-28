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
let systemStatus = {
  cameras: 4,
  online: true,
  lastSeen: new Date().toISOString(),
};

app.get("/", (req, res) => {
  res.json({ status: "AI-TIK Backend Running", version: "1.0.0" });
});

app.get("/detections", (req, res) => res.json(detections));

app.get("/status", (req, res) => res.json(systemStatus));

app.get("/tunnel-url", (req, res) => res.json({ url: tunnelUrl }));

app.post("/tunnel-url", (req, res) => {
  tunnelUrl = req.body.url;
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
  systemStatus.lastSeen = new Date().toISOString();
  res.json({ success: true, detection });
});

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
  socket.emit("init", { detections, systemStatus, tunnelUrl });
  socket.on("disconnect", () => console.log("Disconnected:", socket.id));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () =>
  console.log(`AI-TIK Backend running on port ${PORT}`),
);
