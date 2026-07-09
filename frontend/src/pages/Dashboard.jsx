import { useState, useEffect } from "react";
import { api, socket } from "../api/client";
import StatCard from "../components/StatCard";

const recentDetections = [
  {
    id: 1,
    duck: "Duck 1",
    behavior: "Receptive",
    confidence: "94%",
    time: "08:32 AM",
    cam: "Cam 1",
  },
  {
    id: 2,
    duck: "Duck 2",
    behavior: "Mating",
    confidence: "89%",
    time: "08:35 AM",
    cam: "Cam 2",
  },
  {
    id: 3,
    duck: "Duck 3",
    behavior: "Neutral",
    confidence: "96%",
    time: "08:41 AM",
    cam: "Cam 3",
  },
  {
    id: 4,
    duck: "Duck 4",
    behavior: "Non-receptive",
    confidence: "91%",
    time: "08:45 AM",
    cam: "Cam 4",
  },
  {
    id: 5,
    duck: "Duck 5",
    behavior: "Receptive",
    confidence: "87%",
    time: "08:52 AM",
    cam: "Cam 1",
  },
];

const behaviorColors = {
  Receptive: "bg-green-500/20 text-green-400 border border-green-500/30",
  Mating: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  Neutral: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  "Non-receptive": "bg-red-500/20 text-red-400 border border-red-500/30",
};

export default function Dashboard() {
  const [detections, setDetections] = useState([]);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    // Fetch existing detections
    api
      .get("/detections")
      .then((res) => setDetections(res.data))
      .catch(() => {});

    // Listen for real-time detections
    socket.on("new_detection", (detection) => {
      setDetections((prev) => [detection, ...prev].slice(0, 10));
    });

    // Listen for alerts
    socket.on("alert", (data) => {
      setAlert(data.message);
      setTimeout(() => setAlert(null), 10000);
    });

    return () => {
      socket.off("new_detection");
      socket.off("alert");
    };
  }, []);

  const counts = {
    Receptive: detections.filter((d) => d.behavior === "Receptive").length,
    Mating: detections.filter((d) => d.behavior === "Mating").length,
    Neutral: detections.filter((d) => d.behavior === "Neutral").length,
    "Non-receptive": detections.filter((d) => d.behavior === "Non-receptive")
      .length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-gray-400 text-sm mt-1">
          AI-TIK System Overview — Philippine Mallard Duck Monitoring
        </p>
      </div>

      {/* Alert */}
      {alert && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">🦆</span>
          <div>
            <p className="text-green-400 font-semibold text-sm">
              Receptive Duck Detected!
            </p>
            <p className="text-gray-400 text-xs">{alert}</p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Ducks"
          value="8"
          subtitle="Female ducks monitored"
          color="blue"
          icon="🦆"
        />
        <StatCard
          title="Receptive"
          value={counts.Receptive}
          subtitle="Currently receptive"
          color="green"
          icon="✅"
        />
        <StatCard
          title="Mating Events"
          value={counts.Mating}
          subtitle="Detected today"
          color="purple"
          icon="💕"
        />
        <StatCard
          title="Total Detections"
          value={detections.length}
          subtitle="Since system start"
          color="yellow"
          icon="📊"
        />
      </div>

      {/* Behavior Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Receptive",
            count: counts.Receptive,
            color: "bg-green-500",
          },
          { label: "Mating", count: counts.Mating, color: "bg-blue-500" },
          { label: "Neutral", count: counts.Neutral, color: "bg-yellow-500" },
          {
            label: "Non-receptive",
            count: counts["Non-receptive"],
            color: "bg-red-500",
          },
        ].map((b) => (
          <div
            key={b.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${b.color}`}></span>
              <span className="text-gray-400 text-sm">{b.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{b.count}</div>
            <div className="text-xs text-gray-500">detections</div>
          </div>
        ))}
      </div>

      {/* Recent Detections */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">
          Recent Detections{" "}
          {detections.length === 0 && (
            <span className="text-gray-500 text-sm font-normal">
              — waiting for data from Pi
            </span>
          )}
        </h3>
        {detections.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🦆</div>
            <div className="text-gray-400 text-sm">No detections yet</div>
            <div className="text-gray-600 text-xs mt-1">
              Deploy YOLO model on Pi to start detecting
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-3 pr-4">Duck</th>
                  <th className="text-left py-3 pr-4">Behavior</th>
                  <th className="text-left py-3 pr-4">Confidence</th>
                  <th className="text-left py-3 pr-4">Camera</th>
                  <th className="text-left py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {detections.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                  >
                    <td className="py-3 pr-4 text-white font-medium">
                      {d.duck}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${behaviorColors[d.behavior]}`}
                      >
                        {d.behavior}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-300">{d.confidence}</td>
                    <td className="py-3 pr-4 text-gray-300">{d.camera}</td>
                    <td className="py-3 text-gray-400">
                      {new Date(d.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
