import { useEffect, useRef } from "react";

// Same colors as the Live Monitor's FrameBoxOverlay (matched case-insensitively).
const COLORS = {
  neutral: "#f59e0b", // yellow
  mating: "#818cf8", // blue
  "non-receptive": "#f43f5e", // red
  receptive: "#10b981", // green
};
const FALLBACK_COLOR = "#ffffff";

function colorFor(behavior) {
  return COLORS[String(behavior || "").toLowerCase()] || FALLBACK_COLOR;
}

function draw(canvas, img, detection) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = img.clientWidth;
  const cssH = img.clientHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const { bbox, behavior, confidence } = detection || {};
  if (!bbox || !img.naturalWidth) return;
  // bbox is in pixels of the analyzed frame; the snapshot is that same frame,
  // so its natural size is the fallback when the record has no `frame`.
  const frameW = (detection.frame && detection.frame.width) || img.naturalWidth;
  const frameH = (detection.frame && detection.frame.height) || img.naturalHeight;
  const sx = cssW / frameW;
  const sy = cssH / frameH;

  // x/y are the box CENTER.
  const left = (bbox.x - bbox.width / 2) * sx;
  const top = (bbox.y - bbox.height / 2) * sy;
  const width = bbox.width * sx;
  const height = bbox.height * sy;
  const color = colorFor(behavior);

  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.strokeRect(left, top, width, height);

  // On thumbnails the label would cover the box itself.
  if (cssW < 240) return;

  const label =
    typeof confidence === "number"
      ? `${behavior} ${(confidence * 100).toFixed(0)}%`
      : String(behavior);
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.textBaseline = "top";
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

/**
 * A detection's snapshot with its bounding box drawn on a canvas overlay.
 *
 * detection       - a /detections record: { behavior, confidence, bbox, frame, snapshot }
 * snapshotBaseUrl - base URL of the Pi backend that serves /snapshots/ (the tunnel URL)
 * alt, className, style - passed to the <img>
 */
export default function SnapshotWithBox({ detection, snapshotBaseUrl, alt, className, style }) {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return undefined;
    const redraw = () => draw(canvas, img, detection);
    if (img.complete) redraw();
    img.addEventListener("load", redraw);
    const observer = new ResizeObserver(redraw);
    observer.observe(img);
    return () => {
      img.removeEventListener("load", redraw);
      observer.disconnect();
    };
  }, [detection]);

  if (!detection || !detection.snapshot) return null;
  const base = (snapshotBaseUrl || "").replace(/\/+$/, "");
  const src = /^https?:\/\//.test(detection.snapshot) ? detection.snapshot : `${base}${detection.snapshot}`;

  return (
    // className sizes the wrapper; the img and canvas fill it, so they always line up.
    <div
      className={className}
      style={{ position: "relative", display: "block", lineHeight: 0, overflow: "hidden" }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt || `${detection.behavior} on ${detection.camera}`}
        style={{ display: "block", width: "100%", height: "auto", ...style }}
      />
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
    </div>
  );
}
