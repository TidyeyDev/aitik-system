import { useState, useEffect } from "react";
import { api, socket } from "../api/client";

const BEHAVIOR_COLORS = {
  Receptive: "#10b981",
  Mating: "#818cf8",
  Neutral: "#f59e0b",
  "Non-receptive": "#f43f5e",
};

const behaviors = ["All", "Receptive", "Mating", "Neutral", "Non-receptive"];

export default function Detections() {
  const [filter, setFilter] = useState("All");
  const [detections, setDetections] = useState([]);

  useEffect(() => {
    api
      .get("/detections")
      .then((res) => {
        setDetections(res.data);
      })
      .catch(() => {});

    socket.on("new_detection", (detection) => {
      setDetections((prev) => [detection, ...prev].slice(0, 50));
    });

    return () => {
      socket.off("new_detection");
    };
  }, []);

  const filtered =
    filter === "All"
      ? detections
      : detections.filter((d) => d.behavior === filter);

  const counts = {
    Receptive: detections.filter((d) => d.behavior === "Receptive").length,
    Mating: detections.filter((d) => d.behavior === "Mating").length,
    Neutral: detections.filter((d) => d.behavior === "Neutral").length,
    "Non-receptive": detections.filter((d) => d.behavior === "Non-receptive")
      .length,
  };

  return (
    <div className="max-w-7xl mx-auto" style={{ color: "#e2e8f0" }}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Detections</h2>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Behavioral detection log — Objective 2. The model classifies behavior
          only; each detection is saved with a snapshot.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(counts).map(([behavior, count]) => (
          <div
            key={behavior}
            onClick={() => setFilter(behavior)}
            className="rounded-xl p-4 cursor-pointer transition-all"
            style={{
              background:
                filter === behavior
                  ? `${BEHAVIOR_COLORS[behavior]}20`
                  : "#0d1b2e",
              border: `1px solid ${filter === behavior ? BEHAVIOR_COLORS[behavior] : "#1a3251"}`,
              boxShadow:
                filter === behavior
                  ? `0 0 20px ${BEHAVIOR_COLORS[behavior]}20`
                  : "none",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: BEHAVIOR_COLORS[behavior] }}
              />
              <span className="text-xs" style={{ color: "#64748b" }}>
                {behavior}
              </span>
            </div>
            <div
              className="text-3xl font-bold"
              style={{ color: BEHAVIOR_COLORS[behavior] }}
            >
              {count}
            </div>
            <div className="text-xs mt-1" style={{ color: "#475569" }}>
              detections
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {behaviors.map((b) => (
          <button
            key={b}
            onClick={() => setFilter(b)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background:
                filter === b
                  ? b === "All"
                    ? "#1e3a5f"
                    : `${BEHAVIOR_COLORS[b]}20`
                  : "#0d1b2e",
              color:
                filter === b
                  ? b === "All"
                    ? "#e2e8f0"
                    : BEHAVIOR_COLORS[b]
                  : "#64748b",
              border: `1px solid ${filter === b ? (b === "All" ? "#1e3a5f" : BEHAVIOR_COLORS[b]) : "#1a3251"}`,
            }}
          >
            {b}
            {b !== "All" && (
              <span className="ml-2 text-xs opacity-70">{counts[b] || 0}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #1a3251" }}
        >
          <h3
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#94a3b8" }}
          >
            Detection Log
          </h3>
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{ background: "#1a3251", color: "#64748b" }}
          >
            {filtered.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #1a3251" }}>
                {[
                  "Snapshot",
                  "Behavior",
                  "Confidence",
                  "Camera",
                  "Time",
                ].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-3 text-xs tracking-widest uppercase"
                      style={{ color: "#475569" }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm"
                    style={{ color: "#475569" }}
                  >
                    No detections yet — awaiting YOLO model deployment
                  </td>
                </tr>
              )}
              {filtered.map((d, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid #0d1b2e" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#111827")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td className="px-6 py-4">
                    {d.snapshot ? (
                      <a href={d.snapshot} target="_blank" rel="noreferrer">
                        <img
                          src={d.snapshot}
                          alt={`${d.behavior} snapshot`}
                          className="w-20 h-12 object-cover rounded"
                        />
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: "#475569" }}>
                        None
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: `${BEHAVIOR_COLORS[d.behavior]}20`,
                        color: BEHAVIOR_COLORS[d.behavior],
                        border: `1px solid ${BEHAVIOR_COLORS[d.behavior]}40`,
                      }}
                    >
                      {d.behavior}
                    </span>
                  </td>
                  <td className="px-6 py-4" style={{ color: "#94a3b8" }}>
                    {d.confidence}
                  </td>
                  <td className="px-6 py-4" style={{ color: "#94a3b8" }}>
                    {d.camera}
                  </td>
                  <td className="px-6 py-4" style={{ color: "#475569" }}>
                    {new Date(d.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
