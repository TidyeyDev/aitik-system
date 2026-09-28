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
import SnapshotImage from "../components/SnapshotImage";
import { useTunnelUrl } from "../api/useTunnelUrl";
import { behaviorLabel, isBehavior } from "../behavior";

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

const isToday = (timestamp) =>
  new Date(timestamp).toDateString() === new Date().toDateString();

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

const formatTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

const formatFlag = (value, yes, no, unknown = "Unknown") =>
  value === true ? yes : value === false ? no : unknown;

const flagColor = (value) =>
  value === true ? "#10b981" : value === false ? "#f43f5e" : "#64748b";

// Reads GET /status: cameras, online, lastSeen, modelDeployed, lastDetectionAt.
// Any of these may be null or missing; null renders as "—" / "Unknown".
function SystemStatusPanel({ status }) {
  const s = status ?? {};
  const items = [
    {
      label: "Farm Device",
      value: formatFlag(s.online, "Online", "Offline"),
      color: flagColor(s.online),
    },
    {
      label: "Last Seen",
      value: formatTime(s.lastSeen),
      color: "#e2e8f0",
    },
    {
      label: "YOLO Model",
      value: formatFlag(
        s.modelDeployed,
        "Deployed",
        "Not deployed",
        "Not confirmed",
      ),
      color: flagColor(s.modelDeployed),
    },
    {
      label: "Last Detection",
      value: formatTime(s.lastDetectionAt),
      color: "#e2e8f0",
    },
    {
      label: "Cameras",
      value: Number.isFinite(s.cameras) ? `${s.cameras} configured` : "—",
      color: "#e2e8f0",
    },
  ];

  return (
    <div
      className="rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-4"
      style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
    >
      {items.map((item) => (
        <div key={item.label}>
          <div
            className="text-xs tracking-widest uppercase"
            style={{ color: "#475569" }}
          >
            {item.label}
          </div>
          <div
            className="text-sm font-medium mt-1"
            style={{ color: item.color }}
          >
            {status === null ? "—" : item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function SnapshotFeed({ detections }) {
  const tunnelUrl = useTunnelUrl();
  return (
    <div
      className="rounded-xl p-6"
      style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm tracking-widest uppercase">
            Captured Snapshots
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
            Snapshot saved with each behavior detection
          </p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{ background: "#1a3251", color: "#94a3b8" }}
        >
          {detections.length} captured
        </span>
      </div>

      {detections.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-sm" style={{ color: "#475569" }}>
            No snapshots captured yet
          </div>
          <div className="text-xs mt-1" style={{ color: "#334155" }}>
            Awaiting YOLO model deployment
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {detections.slice(0, 8).map((d) => (
            <div
              key={d.id}
              className="rounded-lg overflow-hidden"
              style={{ background: "#0a1628", border: "1px solid #1a3251" }}
            >
              {d.snapshot ? (
                <SnapshotImage
                  snapshot={d.snapshot}
                  tunnelUrl={tunnelUrl}
                  alt={`${behaviorLabel(d.behavior)} snapshot from ${d.camera}`}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div
                  className="w-full h-32 flex items-center justify-center text-xs"
                  style={{ color: "#475569" }}
                >
                  No snapshot attached
                </div>
              )}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: `${BEHAVIOR_COLORS[behaviorLabel(d.behavior)]}20`,
                      color: BEHAVIOR_COLORS[behaviorLabel(d.behavior)],
                    }}
                  >
                    {behaviorLabel(d.behavior)}
                  </span>
                  <span className="text-xs" style={{ color: "#475569" }}>
                    {d.camera}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between text-xs"
                  style={{ color: "#64748b" }}
                >
                  <span>{new Date(d.timestamp).toLocaleString()}</span>
                  <span>{d.confidence ?? "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {detections.length > 8 && (
        <p className="text-xs mt-4" style={{ color: "#64748b" }}>
          Showing latest 8 of {detections.length}. See the Detections page for the full
          list.
        </p>
      )}
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
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const loadStatus = () =>
      api
        .get("/status")
        .then((res) => setStatus(res.data))
        .catch(() => setStatus(null));
    loadStatus();
    // "online" depends on elapsed time since lastSeen, so re-check periodically.
    const statusTimer = setInterval(loadStatus, 60000);
    socket.on("status", setStatus);

    api
      .get("/detections")
      .then((res) => setDetections(res.data))
      .catch(() => {});

    socket.on("new_detection", (detection) => {
      setDetections((prev) => [detection, ...prev].slice(0, 100));
    });

    socket.on("alert", (data) => {
      setAlert(data.message);
      setTimeout(() => setAlert(null), 8000);
    });

    return () => {
      socket.off("new_detection");
      clearInterval(statusTimer);
      socket.off("status", setStatus);
      socket.off("alert");
    };
  }, []);

  const counts = {
    Receptive: detections.filter((d) => isBehavior(d.behavior, "Receptive")).length,
    Mating: detections.filter((d) => isBehavior(d.behavior, "Mating")).length,
    Neutral: detections.filter((d) => isBehavior(d.behavior, "Neutral")).length,
    "Non-receptive": detections.filter((d) => isBehavior(d.behavior, "Non-receptive"))
      .length,
  };

  const chartData = Object.entries(counts).map(([name, value]) => ({
    name,
    value,
  }));

  const receptiveToday = detections.filter(
    (d) => isBehavior(d.behavior, "Receptive") && isToday(d.timestamp),
  ).length;
  const matingToday = detections.filter(
    (d) => isBehavior(d.behavior, "Mating") && isToday(d.timestamp),
  ).length;

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

      {/* System Status */}
      <div className="mb-6">
        <SystemStatusPanel status={status} />
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
              Receptive behavior detected!
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
          sub="Configured flock size"
          color="#818cf8"
          icon="🦆"
        />
        <StatCard
          label="Receptive Events"
          value={receptiveToday}
          sub="Detected today"
          color="#10b981"
          icon="✦"
        />
        <StatCard
          label="Mating Events"
          value={matingToday}
          sub="Detected today"
          color="#818cf8"
          icon="◈"
        />
        <StatCard
          label="Total Detected"
          value={detections.length}
          sub="Stored on backend (last 100)"
          color="#f59e0b"
          icon="◎"
        />
      </div>

      {/* Captured Snapshots */}
      <div className="mb-6">
        <SnapshotFeed detections={detections} />
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
          {detections.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center text-center"
              style={{ height: 180 }}
            >
              <div className="text-sm" style={{ color: "#475569" }}>
                No data yet
              </div>
              <div className="text-xs mt-1" style={{ color: "#334155" }}>
                Awaiting YOLO model deployment
              </div>
            </div>
          ) : (
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
          )}
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
                  style={{ background: BEHAVIOR_BG[behaviorLabel(d.behavior)] }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1.5 h-8 rounded-full"
                      style={{ background: BEHAVIOR_COLORS[behaviorLabel(d.behavior)] }}
                    />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {d.camera}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${BEHAVIOR_COLORS[behaviorLabel(d.behavior)]}20`,
                        color: BEHAVIOR_COLORS[behaviorLabel(d.behavior)],
                        border: `1px solid ${BEHAVIOR_COLORS[behaviorLabel(d.behavior)]}40`,
                      }}
                    >
                      {behaviorLabel(d.behavior)}
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
