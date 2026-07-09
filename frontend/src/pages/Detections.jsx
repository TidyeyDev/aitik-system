import { useState } from "react";

const allDetections = [
  {
    id: 1,
    duck: "Duck 1",
    behavior: "Receptive",
    confidence: "94%",
    cam: "Cam 1",
    date: "2026-07-07",
    time: "08:32 AM",
  },
  {
    id: 2,
    duck: "Duck 2",
    behavior: "Mating",
    confidence: "89%",
    cam: "Cam 2",
    date: "2026-07-07",
    time: "08:35 AM",
  },
  {
    id: 3,
    duck: "Duck 3",
    behavior: "Neutral",
    confidence: "96%",
    cam: "Cam 3",
    date: "2026-07-07",
    time: "08:41 AM",
  },
  {
    id: 4,
    duck: "Duck 4",
    behavior: "Non-receptive",
    confidence: "91%",
    cam: "Cam 4",
    date: "2026-07-07",
    time: "08:45 AM",
  },
  {
    id: 5,
    duck: "Duck 5",
    behavior: "Receptive",
    confidence: "87%",
    cam: "Cam 1",
    date: "2026-07-07",
    time: "08:52 AM",
  },
  {
    id: 6,
    duck: "Duck 6",
    behavior: "Neutral",
    confidence: "93%",
    cam: "Cam 2",
    date: "2026-07-07",
    time: "09:01 AM",
  },
  {
    id: 7,
    duck: "Duck 7",
    behavior: "Non-receptive",
    confidence: "88%",
    cam: "Cam 3",
    date: "2026-07-07",
    time: "09:10 AM",
  },
  {
    id: 8,
    duck: "Duck 8",
    behavior: "Mating",
    confidence: "95%",
    cam: "Cam 4",
    date: "2026-07-07",
    time: "09:15 AM",
  },
];

const behaviorColors = {
  Receptive: "bg-green-500/20 text-green-400 border border-green-500/30",
  Mating: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  Neutral: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  "Non-receptive": "bg-red-500/20 text-red-400 border border-red-500/30",
};

export default function Detections() {
  const [filter, setFilter] = useState("All");
  const behaviors = ["All", "Receptive", "Mating", "Neutral", "Non-receptive"];

  const filtered =
    filter === "All"
      ? allDetections
      : allDetections.filter((d) => d.behavior === filter);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Detections</h2>
        <p className="text-gray-400 text-sm mt-1">
          Behavioral detection log — Objective 2
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Receptive",
            count: 2,
            color: "text-green-400",
            bg: "bg-green-500/10 border-green-500/30",
          },
          {
            label: "Mating",
            count: 2,
            color: "text-blue-400",
            bg: "bg-blue-500/10 border-blue-500/30",
          },
          {
            label: "Neutral",
            count: 2,
            color: "text-yellow-400",
            bg: "bg-yellow-500/10 border-yellow-500/30",
          },
          {
            label: "Non-receptive",
            count: 2,
            color: "text-red-400",
            bg: "bg-red-500/10 border-red-500/30",
          },
        ].map((b) => (
          <div key={b.label} className={`border rounded-xl p-4 ${b.bg}`}>
            <div className={`text-2xl font-bold ${b.color}`}>{b.count}</div>
            <div className="text-gray-400 text-sm">{b.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {behaviors.map((b) => (
          <button
            key={b}
            onClick={() => setFilter(b)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === b
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {/* Detections Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Detection Log</h3>
          <span className="text-gray-400 text-sm">
            {filtered.length} records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-3 pr-4">ID</th>
                <th className="text-left py-3 pr-4">Duck</th>
                <th className="text-left py-3 pr-4">Behavior</th>
                <th className="text-left py-3 pr-4">Confidence</th>
                <th className="text-left py-3 pr-4">Camera</th>
                <th className="text-left py-3 pr-4">Date</th>
                <th className="text-left py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="py-3 pr-4 text-gray-500">#{d.id}</td>
                  <td className="py-3 pr-4 text-white font-medium">{d.duck}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${behaviorColors[d.behavior]}`}
                    >
                      {d.behavior}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-300">{d.confidence}</td>
                  <td className="py-3 pr-4 text-gray-300">{d.cam}</td>
                  <td className="py-3 pr-4 text-gray-400">{d.date}</td>
                  <td className="py-3 text-gray-400">{d.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
