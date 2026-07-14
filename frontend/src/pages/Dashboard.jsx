import { useState, useEffect } from "react";
import { api, socket } from "../api/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const BEHAVIOR_COLORS = {
  Receptive: "#10b981",
  Mating: "#818cf8",
  Neutral: "#f59e0b",
  "Non-receptive": "#f43f5e",
};

const BEHAVIOR_BG = {
  Receptive: "rgba(16,185,129,0.12)",
  Mating: "rgba(129,140,248,0.12)",
  Neutral: "rgba(245,158,11,0.12)",
  "Non-receptive": "rgba(244,63,94,0.12)",
};

const duckNames = [
  "Duck 1",
  "Duck 2",
  "Duck 3",
  "Duck 4",
  "Duck 5",
  "Duck 6",
  "Duck 7",
  "Duck 8",
];

const initialDuckStates = [
  { name: "Duck 1", behavior: "Receptive" },
  { name: "Duck 2", behavior: "Mating" },
  { name: "Duck 3", behavior: "Neutral" },
  { name: "Duck 4", behavior: "Non-receptive" },
  { name: "Duck 5", behavior: "Receptive" },
  { name: "Duck 6", behavior: "Neutral" },
  { name: "Duck 7", behavior: "Neutral" },
  { name: "Duck 8", behavior: "Neutral" },
];

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {time.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </span>
  );
}

function DuckStatusGrid({ ducks }) {
  return (
    <div
      className="rounded-xl p-6"
      style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm tracking-widest uppercase">
            Duck Status
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
            8 female ducks — live behavioral state
          </p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
        >
          ● Live
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3 md:grid-cols-8 md:gap-4">
        {ducks.map((duck, i) => {
          const color = BEHAVIOR_COLORS[duck.behavior];
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{
                    background: `${color}20`,
                    border: `2px solid ${color}`,
                    boxShadow: `0 0 12px ${color}40`,
                  }}
                >
                  🦆
                </div>
                {duck.behavior === "Receptive" && (
                  <span
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
                    style={{ background: color }}
                  />
                )}
              </div>
              <div className="text-center">
                <div
                  className="text-xs font-medium"
                  style={{ color: "#e2e8f0" }}
                >
                  D{i + 1}
                </div>
                <div
                  className="text-xs text-center leading-tight"
                  style={{ color }}
                >
                  {duck.behavior === "Non-receptive"
                    ? "Non-rec"
                    : duck.behavior === "Receptive"
                      ? "Receptive"
                      : duck.behavior === "Mating"
                        ? "Mating"
                        : "Neutral"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div
        className="flex flex-wrap gap-4 mt-5 pt-4"
        style={{ borderTop: "1px solid #1a3251" }}
      >
        {Object.entries(BEHAVIOR_COLORS).map(([b, c]) => (
          <div key={b} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: c }} />
            <span className="text-xs" style={{ color: "#94a3b8" }}>
              {b}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{
        background: "#0d1b2e",
        border: `1px solid ${color}40`,
        boxShadow: `0 0 20px ${color}10`,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs tracking-widest uppercase font-medium"
          style={{ color: "#64748b" }}
        >
          {label}
        </span>
        <span className="text-xl">{icon}</span>
      </div>
      <div
        className="text-4xl font-bold"
        style={{ color, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
      <div className="text-xs" style={{ color: "#475569" }}>
        {sub}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [detections, setDetections] = useState([]);
  const [alert, setAlert] = useState(null);
  const [ducks, setDucks] = useState(initialDuckStates);

  useEffect(() => {
    api
      .get("/detections")
      .then((res) => setDetections(res.data))
      .catch(() => {});

    socket.on("new_detection", (detection) => {
      setDetections((prev) => [detection, ...prev].slice(0, 20));
    });

    socket.on("alert", (data) => {
      setAlert(data.message);
      setTimeout(() => setAlert(null), 8000);
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

  const chartData = [
    { name: "Receptive", value: counts.Receptive || 2 },
    { name: "Mating", value: counts.Mating || 1 },
    { name: "Neutral", value: counts.Neutral || 4 },
    { name: "Non-receptive", value: counts["Non-receptive"] || 1 },
  ];

  return (
    <div className="max-w-7xl mx-auto" style={{ color: "#e2e8f0" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Turentigue Farm, Morong, Rizal — Philippine Mallard Duck Monitoring
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <div
            className="text-lg font-mono font-bold"
            style={{ color: "#10b981" }}
          >
            <Clock />
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#475569" }}>
            {new Date().toLocaleDateString("en-PH", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div
          className="rounded-xl p-4 mb-6 flex items-center gap-4"
          style={{
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.4)",
          }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "#10b981", flexShrink: 0 }}
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#10b981" }}>
              Receptive duck detected!
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
              {alert}
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Female Ducks"
          value="8"
          sub="Monitored at the farm"
          color="#818cf8"
          icon="🦆"
        />
        <StatCard
          label="Receptive Now"
          value={counts.Receptive || 2}
          sub="Ready to mate"
          color="#10b981"
          icon="✦"
        />
        <StatCard
          label="Mating Events"
          value={counts.Mating || 1}
          sub="Detected today"
          color="#818cf8"
          icon="◈"
        />
        <StatCard
          label="Total Detected"
          value={detections.length || 8}
          sub="Since system start"
          color="#f59e0b"
          icon="◎"
        />
      </div>

      {/* Duck Status Grid */}
      <div className="mb-6">
        <DuckStatusGrid ducks={ducks} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Behavior Distribution Chart */}
        <div
          className="rounded-xl p-6"
          style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
        >
          <h3
            className="text-sm font-semibold tracking-widest uppercase mb-1"
            style={{ color: "#94a3b8" }}
          >
            Behavior Distribution
          </h3>
          <p className="text-xs mb-5" style={{ color: "#475569" }}>
            Detection count by category
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} layout="vertical" barSize={12}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0d1b2e",
                  border: "1px solid #1a3251",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#e2e8f0" }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={BEHAVIOR_COLORS[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Detections */}
        <div
          className="rounded-xl p-6"
          style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
        >
          <h3
            className="text-sm font-semibold tracking-widest uppercase mb-1"
            style={{ color: "#94a3b8" }}
          >
            Recent Detections
          </h3>
          <p className="text-xs mb-5" style={{ color: "#475569" }}>
            {detections.length === 0
              ? "Waiting for YOLO model output"
              : `${detections.length} events logged`}
          </p>

          {detections.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🦆</div>
              <div className="text-sm" style={{ color: "#475569" }}>
                No detections yet
              </div>
              <div className="text-xs mt-1" style={{ color: "#334155" }}>
                Deploy YOLO model to start detecting
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {detections.slice(0, 6).map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: BEHAVIOR_BG[d.behavior] }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1.5 h-8 rounded-full"
                      style={{ background: BEHAVIOR_COLORS[d.behavior] }}
                    />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {d.duck}
                      </div>
                      <div className="text-xs" style={{ color: "#64748b" }}>
                        {d.camera}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${BEHAVIOR_COLORS[d.behavior]}20`,
                        color: BEHAVIOR_COLORS[d.behavior],
                        border: `1px solid ${BEHAVIOR_COLORS[d.behavior]}40`,
                      }}
                    >
                      {d.behavior}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#475569" }}>
                      {d.confidence} ·{" "}
                      {new Date(d.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
