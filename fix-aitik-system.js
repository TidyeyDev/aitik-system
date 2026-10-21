// Run from C:\Users\Banzon\aitik-system:   node fix-aitik-system.js
// 1. Adds the frame-boxes routes to backend/server.js (skipped if already there)
// 2. Replaces aitik-backend.onrender.com with aitik-system.onrender.com in backend/ and frontend/src/
// 3. Lists every line in LiveMonitor.jsx that still marks cam1/cam2 as recording-only
const fs = require('fs')
const path = require('path')

const ROUTES = String.raw`
// Latest boxes per camera for the Live Monitor overlay (memory only).
// bbox is Roboflow format: x/y are the box CENTER, in pixels of \`frame\`.
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

// Pi posts every analyzed frame's boxes here; an empty \`boxes\` list clears that camera
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

`

const serverPath = path.join('backend', 'server.js')
let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes("'/frame-boxes'")) {
  console.log('server.js: frame-boxes routes already present')
} else {
  const anchor = server.search(/^\/\/ Socket connection|^io\.on\('connection'/m)
  if (anchor === -1) throw new Error("server.js: no io.on('connection') found - paste ROUTES in by hand before it")
  for (const dep of ['express.json()', 'systemStatus', 'const io']) {
    if (!server.includes(dep)) console.warn(`server.js: WARNING, routes need "${dep}" which was not found`)
  }
  server = server.slice(0, anchor) + ROUTES.trimStart() + '\n' + server.slice(anchor)
  fs.writeFileSync(serverPath, server)
  console.log('server.js: frame-boxes routes added')
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p)
    return /\.(jsx?|tsx?|env.*)$/.test(e.name) || e.name.startsWith('.env') ? [p] : []
  })
}
for (const file of [...walk('backend'), ...walk(path.join('frontend', 'src')),
                    ...['frontend/.env', 'frontend/.env.production', 'frontend/.env.local'].filter(fs.existsSync)]) {
  const text = fs.readFileSync(file, 'utf8')
  if (text.includes('aitik-backend.onrender.com')) {
    fs.writeFileSync(file, text.split('aitik-backend.onrender.com').join('aitik-system.onrender.com'))
    console.log(`${file}: backend URL fixed`)
  }
}

const lm = path.join('frontend', 'src', 'pages', 'LiveMonitor.jsx')
const lines = fs.readFileSync(lm, 'utf8').split('\n')
console.log(`\n${lm}: lines to change so cam1/cam2 stream live:`)
lines.forEach((l, i) => {
  if (/recording|telegram|streamed live|FrameBoxOverlay|apiUrl/i.test(l)) console.log(`  ${i + 1}: ${l.trim()}`)
})
