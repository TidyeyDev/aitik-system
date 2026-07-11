import { useEffect, useRef } from "react";

const API_URL = "https://absurd-embattled-uncounted.ngrok-free.dev";

const cameras = [
  { id: "cam1", label: "Camera 1 — North" },
  { id: "cam2", label: "Camera 2 — South" },
  { id: "cam3", label: "Camera 3 — East" },
  { id: "cam4", label: "Camera 4 — West" },
];

function CameraFeed({ cam }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const streamUrl = `${API_URL}/stream/${cam.id}/index.m3u8`;

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
      });
      return () => hls.destroy();
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = streamUrl;
      videoRef.current.play();
    }
  }, [cam.id]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-white text-sm font-medium">{cam.label}</span>
        </div>
        <span className="text-xs text-red-400 font-bold">● LIVE</span>
      </div>
      <div className="bg-black aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          controls
        />
      </div>
      <div className="px-4 py-2 text-xs text-gray-400 flex gap-4">
        <span>1280×720</span>
        <span>30 FPS</span>
        <span>H.264/HLS</span>
      </div>
    </div>
  );
}

export default function LiveMonitor() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Live Monitor</h2>
        <p className="text-gray-400 text-sm mt-1">
          Real-time camera feeds — Turentigue Farm, Morong, Rizal
        </p>
      </div>

      {/* Camera Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cameras.map((cam) => (
          <div
            key={cam.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <div>
              <div className="text-white text-sm font-medium">{cam.label}</div>
              <div className="text-green-400 text-xs">Streaming</div>
            </div>
          </div>
        ))}
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cameras.map((cam) => (
          <CameraFeed key={cam.id} cam={cam} />
        ))}
      </div>
    </div>
  );
}
