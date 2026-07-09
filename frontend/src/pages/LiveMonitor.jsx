export default function LiveMonitor() {
  const cameras = [
    { id: 1, label: "Camera 1 — North", status: "online" },
    { id: 2, label: "Camera 2 — South", status: "online" },
    { id: 3, label: "Camera 3 — East", status: "online" },
    { id: 4, label: "Camera 4 — West", status: "online" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Live Monitor</h2>
        <p className="text-gray-400 text-sm mt-1">
          Real-time camera feeds — Turentigue Farm, Morong, Rizal
        </p>
      </div>

      {/* Camera Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cameras.map((cam) => (
          <div
            key={cam.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <div>
              <div className="text-white text-sm font-medium">{cam.label}</div>
              <div className="text-green-400 text-xs">Online</div>
            </div>
          </div>
        ))}
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {cameras.map((cam) => (
          <div
            key={cam.id}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-white text-sm font-medium">
                  {cam.label}
                </span>
              </div>
              <span className="text-xs text-gray-400">LIVE</span>
            </div>
            <div className="bg-gray-950 aspect-video flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-3">📷</div>
                <div className="text-gray-400 text-sm">
                  Camera feed will appear here
                </div>
                <div className="text-gray-600 text-xs mt-1">
                  Connect Pi to enable live stream
                </div>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex gap-4 text-xs text-gray-400">
                <span>1280×720</span>
                <span>15 FPS</span>
                <span>H.264</span>
              </div>
              <span className="text-xs text-gray-500">
                Last clip: 30 mins ago
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Latest Snapshots */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">System Info</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Recording Mode", value: "24/7 Continuous" },
            { label: "Clip Duration", value: "30 minutes" },
            { label: "Upload Channel", value: "Telegram" },
            { label: "Storage", value: "Auto-delete after upload" },
          ].map((info) => (
            <div key={info.label} className="bg-gray-950 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">{info.label}</div>
              <div className="text-white text-sm font-medium">{info.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
