import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Card, CardHeader } from "@raydenui/ui";
import { api, socket } from "../api/client";
import FrameBoxOverlay from "../components/FrameBoxOverlay";

// "live" cameras are streamed over HLS; "recording" cameras only record on
// the Pi and upload clips to Telegram, so they have no stream to play.
const cameras = [
  { id: "cam1", label: "Camera 1", position: "North", mode: "recording" },
  { id: "cam2", label: "Camera 2", position: "South", mode: "recording" },
  { id: "cam3", label: "Camera 3", position: "East", mode: "live" },
  { id: "cam4", label: "Camera 4", position: "West", mode: "live" },
];

const STATUS_BADGE = {
  live: { color: "success", label: "Live" },
  connecting: { color: "warning", label: "Connecting" },
  offline: { color: "error", label: "Offline" },
  recording: { color: "blue", label: "Recording" },
};

function CameraCard({ cam, status, footer, children }) {
  const badge = STATUS_BADGE[status];
  return (
    <Card shadow="md">
      <CardHeader
        title={cam.label}
        subtitle={`${cam.position} angle`}
        actions={<Badge color={badge.color}>{badge.label}</Badge>}
        bordered
      />
      <div className="relative bg-grey-900" style={{ aspectRatio: "16/9" }}>
        {children}
      </div>
      <div className="flex items-center justify-between px-6 py-3 text-body-xs text-grey-500">
        <div className="flex gap-3">{footer}</div>
        <span>Turentigue Farm</span>
      </div>
    </Card>
  );
}

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

  return (
    <CameraCard
      cam={cam}
      status={status}
      footer={
        <>
          <span>640×480</span>
          <span>15 FPS</span>
          <span>H.264</span>
        </>
      }
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        muted
        playsInline
        controls
      />
      {status === "live" && (
        <FrameBoxOverlay
          camId={cam.id}
          videoRef={videoRef}
          socket={socket}
          apiUrl={api.defaults.baseURL}
        />
      )}
      {status !== "live" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <div className="text-body-md font-medium text-white">
            {status === "connecting" ? "Connecting to stream…" : "Stream offline"}
          </div>
          <div className="text-body-xs text-grey-400 mt-1">
            {cam.label} — {cam.position}
          </div>
        </div>
      )}
    </CameraCard>
  );
}

function RecordingTile({ cam }) {
  return (
    <CameraCard
      cam={cam}
      status="recording"
      footer={
        <>
          <span>10-min clips</span>
          <span>Telegram</span>
        </>
      }
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
        <div className="text-body-md font-medium text-white">
          Recording — clips sent via Telegram
        </div>
        <div className="text-body-xs text-grey-400 mt-1">
          {cam.label} — {cam.position} · not streamed live
        </div>
      </div>
    </CameraCard>
  );
}

export default function LiveMonitor() {
  const [tunnelUrl, setTunnelUrl] = useState(null);

  useEffect(() => {
    api
      .get("/tunnel-url")
      .then((res) => {
        setTunnelUrl(res.data.url);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-heading text-h4 text-grey-900">Live Monitor</h1>
          <p className="text-body-md text-grey-700 mt-1">
            Real-time camera feeds — Turentigue Farm, Morong, Rizal
          </p>
        </div>
        <Badge color={tunnelUrl ? "success" : "warning"} size="lg">
          {tunnelUrl ? "Stream server connected" : "Connecting…"}
        </Badge>
      </div>

      {/* Recording tiles don't depend on the stream server, so the grid
          renders straight away; live feeds wait in their "connecting" state
          until the tunnel URL arrives. */}
      {!tunnelUrl && (
        <Alert
          state="information"
          title="Connecting to stream server"
          description="Make sure the Pi is online and the streaming service is running."
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cameras.map((cam) =>
          cam.mode === "live" ? (
            <CameraFeed key={cam.id} cam={cam} tunnelUrl={tunnelUrl} />
          ) : (
            <RecordingTile key={cam.id} cam={cam} />
          ),
        )}
      </div>

      <Card shadow="md">
        <CardHeader title="Recording setup" bordered />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6">
          {[
            { label: "Recording mode", value: "24/7 continuous" },
            { label: "Clip duration", value: "10 minutes" },
            { label: "Upload channel", value: "Telegram" },
            { label: "Storage policy", value: "Auto-delete after 2 hr" },
          ].map((info) => (
            <div key={info.label}>
              <div className="text-body-xs text-grey-500">{info.label}</div>
              <div className="text-body-sm font-medium text-grey-800 mt-1">
                {info.value}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
