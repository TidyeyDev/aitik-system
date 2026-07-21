import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

const cameras = [
  { id: "cam1", label: "Camera 1", position: "North" },
  { id: "cam2", label: "Camera 2", position: "South" },
  { id: "cam3", label: "Camera 3", position: "East" },
  { id: "cam4", label: "Camera 4", position: "West" },
];

function CameraFeed({ cam, tunnelUrl }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    if (!tunnelUrl || !videoRef.current) return;
    const streamUrl = `${tunnelUrl}/hls/${cam.id}/index.m3u8`;

    if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls({
        xhrSetup: (xhr) => {
          xhr.setRequestHeader("ngrok-skip-browser-warning", "true");
        },
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current.play();
        setStatus("live");
      });
      hls.on(window.Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setStatus("offline");
        }
      });
      return () => hls.destroy();
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = streamUrl;
      videoRef.current.play();
      setStatus("live");
    }
  }, [cam.id, tunnelUrl]);

  const statusColor =
    status === "live"
      ? "#10b981"
      : status === "connecting"
        ? "#f59e0b"
        : "#f43f5e";
  const statusLabel =
    status === "live"
      ? "LIVE"
      : status === "connecting"
        ? "CONNECTING"
        : "OFFLINE";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
    >
      {/* Camera Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #1a3251" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: statusColor }}
          />
          <div>
            <div className="text-sm font-medium text-white">{cam.label}</div>
            <div className="text-xs" style={{ color: "#475569" }}>
              {cam.position} angle
            </div>
          </div>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{ background: `${statusColor}20`, color: statusColor }}
        >
          ● {statusLabel}
        </span>
      </div>

      {/* Video */}
      <div
        className="relative"
        style={{ background: "#050d1a", aspectRatio: "16/9" }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          controls
        />
        {status !== "live" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl mb-2">📷</div>
            <div className="text-sm font-medium" style={{ color: statusColor }}>
              {status === "connecting"
                ? "Connecting to stream..."
                : "Stream offline"}
            </div>
            <div className="text-xs mt-1" style={{ color: "#475569" }}>
              {cam.label} — {cam.position}
            </div>
          </div>
        )}
      </div>

      {/* Camera Footer */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex gap-3 text-xs" style={{ color: "#475569" }}>
          <span>640×480</span>
          <span>15 FPS</span>
          <span>H.264</span>
        </div>
        <span className="text-xs" style={{ color: "#334155" }}>
          Turentigue Farm
        </span>
      </div>
    </div>
  );
}

export default function LiveMonitor() {
  const [tunnelUrl, setTunnelUrl] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api
      .get("/tunnel-url")
      .then((res) => {
        setTunnelUrl(res.data.url);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-7xl mx-auto" style={{ color: "#e2e8f0" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Live Monitor</h2>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Real-time camera feeds — Turentigue Farm, Morong, Rizal
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: tunnelUrl ? "#10b981" : "#f59e0b" }}
          />
          <span
            className="text-xs"
            style={{ color: tunnelUrl ? "#10b981" : "#f59e0b" }}
          >
            {tunnelUrl ? "Stream server connected" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Camera Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cameras.map((cam) => (
          <button
            key={cam.id}
            onClick={() => setSelected(selected === cam.id ? null : cam.id)}
            className="rounded-xl p-4 flex items-center gap-3 transition-all text-left"
            style={{
              background:
                selected === cam.id ? "rgba(16,185,129,0.1)" : "#0d1b2e",
              border: `1px solid ${selected === cam.id ? "#10b981" : "#1a3251"}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "#10b981" }}
            />
            <div>
              <div className="text-sm font-medium text-white">{cam.label}</div>
              <div className="text-xs" style={{ color: "#475569" }}>
                {cam.position}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Camera Grid */}
      {!tunnelUrl ? (
        <div
          className="rounded-xl p-16 text-center"
          style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
        >
          <div className="text-5xl mb-4">📡</div>
          <div className="text-lg font-medium text-white mb-2">
            Connecting to stream server
          </div>
          <div className="text-sm" style={{ color: "#475569" }}>
            Make sure the Pi is online and streaming service is running
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cameras.map((cam) => (
            <CameraFeed key={cam.id} cam={cam} tunnelUrl={tunnelUrl} />
          ))}
        </div>
      )}

      {/* System Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {[
          { label: "Recording Mode", value: "24/7 Continuous" },
          { label: "Clip Duration", value: "10 minutes" },
          { label: "Upload Channel", value: "Telegram" },
          { label: "Storage Policy", value: "Auto-delete 2hr" },
        ].map((info) => (
          <div
            key={info.label}
            className="rounded-xl p-4"
            style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
          >
            <div
              className="text-xs mb-1 tracking-widest uppercase"
              style={{ color: "#475569" }}
            >
              {info.label}
            </div>
            <div className="text-sm font-medium text-white">{info.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
