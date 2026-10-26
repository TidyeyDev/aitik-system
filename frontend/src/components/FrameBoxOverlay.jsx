import { useEffect, useRef, useState } from "react";
import { BEHAVIOR_HEX } from "../behavior";

// Box colors by behavior (matched case-insensitively).
// Same colors as the badges and charts (behavior.js BEHAVIOR_HEX).
const COLORS = {
  mating: BEHAVIOR_HEX.Mating, // blue
  receptive: BEHAVIOR_HEX.Receptive, // green
  "non-receptive": BEHAVIOR_HEX["Non-receptive"], // red
  neutral: BEHAVIOR_HEX.Neutral, // amber
};
const FALLBACK_COLOR = "#ffffff";

// The Pi analyzes each camera about every 24s; drop boxes that have not been
// refreshed for a few cycles (e.g. the detector stopped) instead of leaving
// them frozen on the video.
const STALE_MS = 75_000;

function colorFor(behavior) {
  return COLORS[String(behavior || "").toLowerCase()] || FALLBACK_COLOR;
}

// Where the video picture actually sits inside the <video> element, in CSS
// pixels: object-fit "contain" letterboxes it, "cover" crops it.
function contentRect(video, fit, fallbackAspect) {
  const w = video.clientWidth;
  const h = video.clientHeight;
  const aspect =
    video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : fallbackAspect;
  if (!aspect || fit === "fill") return { x: 0, y: 0, width: w, height: h };
  const wider = w / h > aspect;
  const useHeight = fit === "cover" ? !wider : wider;
  if (useHeight) {
    const width = h * aspect;
    return { x: (w - width) / 2, y: 0, width, height: h };
  }
  const height = w / aspect;
  return { x: 0, y: (h - height) / 2, width: w, height };
}

function draw(canvas, video, data, fit) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = video.clientWidth;
  const cssH = video.clientHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  if (!data || !data.frame || !data.boxes || data.boxes.length === 0) return;

  const { frame } = data;
  const rect = contentRect(video, fit, frame.width / frame.height);
  const sx = rect.width / frame.width;
  const sy = rect.height / frame.height;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, cssW, cssH);
  ctx.clip();
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.lineWidth = 2;

  for (const { behavior, confidence, bbox } of data.boxes) {
    if (!bbox) continue;
    // bbox is Roboflow format: x/y are the box CENTER, in frame pixels.
    const left = rect.x + (bbox.x - bbox.width / 2) * sx;
    const top = rect.y + (bbox.y - bbox.height / 2) * sy;
    const width = bbox.width * sx;
    const height = bbox.height * sy;
    const color = colorFor(behavior);

    ctx.strokeStyle = color;
    ctx.strokeRect(left, top, width, height);

    const label =
      typeof confidence === "number"
        ? `${behavior} ${(confidence * 100).toFixed(0)}%`
        : String(behavior);
    const padX = 4;
    const labelH = 16;
    const labelW = ctx.measureText(label).width + padX * 2;
    // Above the box, or inside its top edge when there is no room above.
    const labelX = Math.min(Math.max(left, 0), Math.max(cssW - labelW, 0));
    const labelY = top - labelH >= 0 ? top - labelH : Math.max(top, 0);
    ctx.fillStyle = color;
    ctx.fillRect(labelX, labelY, labelW, labelH);
    ctx.fillStyle = "#000000";
    ctx.fillText(label, labelX + padX, labelY + 2);
  }
  ctx.restore();
}

/**
 * Canvas overlay that draws the detector's latest boxes for one camera on top
 * of its video. Render it as a sibling of the <video>, inside a parent with
 * `position: relative`.
 *
 * camId    - camera name as the Pi sends it (e.g. "cam3")
 * videoRef - ref to the <video> element the HLS player attaches to
 * socket   - the page's Socket.io client
 * apiUrl   - backend base URL, used once on mount for GET /frame-boxes/:camId
 * fit      - the video's CSS object-fit: "contain" (default), "cover" or "fill"
 */
export default function FrameBoxOverlay({ camId, videoRef, socket, apiUrl, fit = "contain" }) {
  const canvasRef = useRef(null);
  const [data, setData] = useState(null);

  // Latest boxes so the overlay is filled right away, not after the next event.
  useEffect(() => {
    if (!apiUrl || !camId) return undefined;
    let cancelled = false;
    fetch(`${apiUrl}/frame-boxes/${encodeURIComponent(camId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((latest) => {
        if (cancelled || !latest || !latest.receivedAt) return;
        if (Date.now() - new Date(latest.receivedAt).getTime() > STALE_MS) return;
        setData((current) => current || latest);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiUrl, camId]);

  // Live updates; an empty `boxes` list from the Pi clears the overlay.
  useEffect(() => {
    if (!socket) return undefined;
    const onFrameBoxes = (payload) => {
      if (payload && payload.camera === camId) setData(payload);
    };
    socket.on("frame_boxes", onFrameBoxes);
    return () => socket.off("frame_boxes", onFrameBoxes);
  }, [socket, camId]);

  useEffect(() => {
    if (!data) return undefined;
    const timer = setTimeout(() => setData(null), STALE_MS);
    return () => clearTimeout(timer);
  }, [data]);

  // Redraw on new boxes and whenever the video's size or resolution changes.
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return undefined;
    const redraw = () => draw(canvas, video, data, fit);
    redraw();
    const observer = new ResizeObserver(redraw);
    observer.observe(video);
    video.addEventListener("loadedmetadata", redraw);
    video.addEventListener("resize", redraw);
    return () => {
      observer.disconnect();
      video.removeEventListener("loadedmetadata", redraw);
      video.removeEventListener("resize", redraw);
    };
  }, [data, fit, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
