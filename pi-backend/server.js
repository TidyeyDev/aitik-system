const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

app.use(cors())
app.use(express.json())

const path = require('path')

// Serve HLS stream files
app.use('/hls', express.static('/tmp/hls', {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'no-cache')
  }
}))

// Serve detection snapshots saved by inference/detect_behaviors.py
app.use('/snapshots', express.static('/home/pi/aitik/detections', {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'no-cache')
  }
}))

// Proxy HLS streams from MediaMTX
app.use('/stream', createProxyMiddleware({
  target: 'http://localhost:8888',
  changeOrigin: true,
  pathRewrite: { '^/stream': '' }
}))

// Store detections in memory
let detections = []
// Only report what the backend actually knows; null means "not reported yet"
let systemStatus = {
  cameras: null,
  online: false,
  lastSeen: null,
  modelDeployed: false,
  lastDetectionAt: null
}

// Pi is online if its tunnel answers; cached so dashboards don't hammer it
let lastTunnelCheck = 0
async function getSystemStatus() {
  if (Date.now() - lastTunnelCheck > 30000) {
    lastTunnelCheck = Date.now()
    if (tunnelUrl) {
      try {
        const r = await fetch(tunnelUrl, { signal: AbortSignal.timeout(8000) })
        systemStatus.online = r.ok
      } catch {
        systemStatus.online = false
      }
      if (systemStatus.online) systemStatus.lastSeen = new Date().toISOString()
    } else {
      systemStatus.online = false
    }
  }
  return systemStatus
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'AI-TIK Backend Running', version: '1.0.0' })
})

// Get all detections
app.get('/detections', (req, res) => {
  res.json(detections)
})

// Get system status
app.get('/status', async (req, res) => {
  res.json(await getSystemStatus())
})

// Pi posts detection results here
app.post('/detect', (req, res) => {
  const detection = {
    id: detections.length + 1,
    duck: req.body.duck || 'Unknown',
    behavior: req.body.behavior,
    confidence: req.body.confidence,
    camera: req.body.camera,
    timestamp: new Date().toISOString()
  }

  detections.unshift(detection)
  if (detections.length > 100) detections.pop()

  // Send real-time update to dashboard
  io.emit('new_detection', detection)

  // Send alert if receptive
  if (detection.behavior === 'Receptive') {
    io.emit('alert', {
      message: `Receptive duck detected at ${detection.camera}!`,
      detection
    })
  }

  systemStatus.modelDeployed = true
  systemStatus.lastDetectionAt = detection.timestamp
  systemStatus.lastSeen = detection.timestamp
  res.json({ success: true, detection })
})

// Latest boxes per camera for the Live Monitor overlay (memory only).
// bbox is Roboflow format: x/y are the box CENTER, in pixels of `frame`.
const frameBoxes = Object.create(null) // no prototype, so any camera name is a safe key
const MAX_FRAME_BOX_CAMERAS = 32

const isNum = (n) => typeof n === 'number' && Number.isFinite(n)
const isPositive = (n) => isNum(n) && n > 0

function toFrame(frame) {
  if (!frame || !isPositive(frame.width) || !isPositive(frame.height)) return null
  return { width: frame.width, height: frame.height }
}

function toBbox(bbox) {
  if (!bbox || !isNum(bbox.x) || !isNum(bbox.y)) return null
  if (!isPositive(bbox.width) || !isPositive(bbox.height)) return null
  return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height }
}

// Pi posts every analyzed frame's boxes here; an empty `boxes` list clears that camera
app.post('/frame-boxes', (req, res) => {
  const { camera } = req.body
  if (typeof camera !== 'string' || !camera || camera.length > 50) {
    return res.status(400).json({ success: false, error: 'camera required' })
  }
  if (!(camera in frameBoxes) && Object.keys(frameBoxes).length >= MAX_FRAME_BOX_CAMERAS) {
    return res.status(400).json({ success: false, error: 'too many cameras' })
  }
  const frame = toFrame(req.body.frame)
  const boxes = (Array.isArray(req.body.boxes) ? req.body.boxes : [])
    .slice(0, 50)
    .map((b) => ({
      behavior: b && typeof b.behavior === 'string' ? b.behavior : 'unknown',
      confidence: b && isNum(b.confidence) ? b.confidence : null,
      bbox: toBbox(b && b.bbox)
    }))
    .filter((b) => b.bbox)
  if (boxes.length > 0 && !frame) {
    return res.status(400).json({ success: false, error: 'frame required with boxes' })
  }

  const payload = {
    camera,
    frameId: typeof req.body.frameId === 'string' ? req.body.frameId.slice(0, 100) : null,
    capturedAt: typeof req.body.capturedAt === 'string' ? req.body.capturedAt.slice(0, 40) : null,
    receivedAt: new Date().toISOString(),
    frame,
    boxes
  }
  frameBoxes[camera] = payload
  io.emit('frame_boxes', payload)
  systemStatus.lastSeen = payload.receivedAt
  res.json({ success: true })
})

// Latest boxes for one camera; an empty list if none have arrived yet
app.get('/frame-boxes/:camId', (req, res) => {
  const { camId } = req.params
  res.json(frameBoxes[camId] || {
    camera: camId, frameId: null, capturedAt: null, receivedAt: null, frame: null, boxes: []
  })
})

// Socket connection
io.on('connection', async (socket) => {
  console.log('Dashboard connected:', socket.id)
  socket.emit('init', { detections, systemStatus: await getSystemStatus() })

  socket.on('disconnect', () => {
    console.log('Dashboard disconnected:', socket.id)
  })
})

const PORT = 8080
server.listen(PORT, () => {
  console.log(`AI-TIK Backend running on port ${PORT}`)
})

// Store tunnel URL
let tunnelUrl = null

// Pi posts its tunnel URL here
app.post('/tunnel-url', (req, res) => {
  tunnelUrl = req.body.url
  lastTunnelCheck = 0
  console.log('Tunnel URL updated:', tunnelUrl)
  io.emit('tunnel_url', { url: tunnelUrl })
  res.json({ success: true })
})

// Get current tunnel URL
app.get('/tunnel-url', (req, res) => {
  res.json({ url: tunnelUrl })
})
