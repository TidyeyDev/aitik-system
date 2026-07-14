import { useState } from "react";

const BEHAVIOR_COLORS = {
  Receptive: "#10b981",
  Neutral: "#f59e0b",
  "Non-receptive": "#f43f5e",
};

const sizeCategory = (w) => {
  if (w >= 70) return { label: "Jumbo", color: "#818cf8" };
  if (w >= 65) return { label: "Large", color: "#10b981" };
  if (w >= 60) return { label: "Medium", color: "#f59e0b" };
  return { label: "Small", color: "#f43f5e" };
};

const initialData = [
  {
    id: 1,
    duck: "Duck 1",
    behavior: "Receptive",
    weight: 68,
    date: "2026-07-14",
  },
  {
    id: 2,
    duck: "Duck 2",
    behavior: "Non-receptive",
    weight: 61,
    date: "2026-07-14",
  },
  {
    id: 3,
    duck: "Duck 3",
    behavior: "Neutral",
    weight: 64,
    date: "2026-07-14",
  },
  {
    id: 4,
    duck: "Duck 4",
    behavior: "Receptive",
    weight: 70,
    date: "2026-07-14",
  },
  {
    id: 5,
    duck: "Duck 5",
    behavior: "Non-receptive",
    weight: 59,
    date: "2026-07-14",
  },
  {
    id: 6,
    duck: "Duck 6",
    behavior: "Neutral",
    weight: 63,
    date: "2026-07-14",
  },
  {
    id: 7,
    duck: "Duck 7",
    behavior: "Receptive",
    weight: 67,
    date: "2026-07-14",
  },
  {
    id: 8,
    duck: "Duck 8",
    behavior: "Non-receptive",
    weight: 60,
    date: "2026-07-14",
  },
];

export default function EggQuality() {
  const [data, setData] = useState(initialData);
  const [form, setForm] = useState({
    duck: "",
    behavior: "Receptive",
    weight: "",
    date: "",
  });
  const [showForm, setShowForm] = useState(false);

  const receptive = data.filter((d) => d.behavior === "Receptive");
  const nonReceptive = data.filter((d) => d.behavior === "Non-receptive");
  const neutral = data.filter((d) => d.behavior === "Neutral");

  const avg = (arr) =>
    arr.length
      ? (arr.reduce((s, d) => s + d.weight, 0) / arr.length).toFixed(1)
      : "—";

  const handleAdd = () => {
    if (!form.duck || !form.weight || !form.date) return;
    setData([
      ...data,
      { ...form, id: data.length + 1, weight: parseFloat(form.weight) },
    ]);
    setForm({ duck: "", behavior: "Receptive", weight: "", date: "" });
    setShowForm(false);
  };

  const maxWeight = Math.max(...data.map((d) => d.weight));

  return (
    <div className="max-w-7xl mx-auto" style={{ color: "#e2e8f0" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Egg Quality</h2>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Correlation of reproductive receptivity with egg weight — Objective
            3
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: "#10b981", color: "#fff" }}
        >
          + Record Egg
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div
          className="rounded-xl p-6 mb-6"
          style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
        >
          <h3
            className="text-sm font-semibold tracking-widest uppercase mb-4"
            style={{ color: "#94a3b8" }}
          >
            New Egg Record
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#475569" }}
              >
                Duck
              </label>
              <input
                value={form.duck}
                onChange={(e) => setForm({ ...form, duck: e.target.value })}
                placeholder="e.g. Duck 1"
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: "#111827", border: "1px solid #1a3251" }}
              />
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#475569" }}
              >
                Behavior Class
              </label>
              <select
                value={form.behavior}
                onChange={(e) => setForm({ ...form, behavior: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: "#111827", border: "1px solid #1a3251" }}
              >
                <option>Receptive</option>
                <option>Neutral</option>
                <option>Non-receptive</option>
              </select>
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#475569" }}
              >
                Weight (grams)
              </label>
              <input
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                placeholder="e.g. 65"
                type="number"
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: "#111827", border: "1px solid #1a3251" }}
              />
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#475569" }}
              >
                Date
              </label>
              <input
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                type="date"
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: "#111827", border: "1px solid #1a3251" }}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAdd}
              className="px-5 py-2 rounded-lg text-sm font-medium"
              style={{ background: "#10b981", color: "#fff" }}
            >
              Save Record
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-lg text-sm font-medium"
              style={{ background: "#1a3251", color: "#94a3b8" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Average Weight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Receptive", data: receptive, color: "#10b981" },
          { label: "Neutral", data: neutral, color: "#f59e0b" },
          { label: "Non-receptive", data: nonReceptive, color: "#f43f5e" },
        ].map(({ label, data: d, color }) => (
          <div
            key={label}
            className="rounded-xl p-5"
            style={{ background: "#0d1b2e", border: `1px solid ${color}30` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: color }}
              />
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: "#64748b" }}
              >
                {label}
              </span>
            </div>
            <div className="text-4xl font-bold mb-1" style={{ color }}>
              {avg(d)}g
            </div>
            <div className="text-xs" style={{ color: "#475569" }}>
              avg weight · {d.length} eggs
            </div>
            {/* Mini bar */}
            <div
              className="mt-3 h-1 rounded-full"
              style={{ background: "#1a3251" }}
            >
              <div
                className="h-1 rounded-full"
                style={{
                  background: color,
                  width: `${(parseFloat(avg(d)) / 75) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Egg Weight Visual */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
      >
        <h3
          className="text-sm font-semibold tracking-widest uppercase mb-1"
          style={{ color: "#94a3b8" }}
        >
          Egg Weight by Duck
        </h3>
        <p className="text-xs mb-5" style={{ color: "#475569" }}>
          Visual comparison — PNS/BAFS 321:2021 size categories
        </p>
        <div className="space-y-3">
          {data.map((d, i) => {
            const color = BEHAVIOR_COLORS[d.behavior];
            const size = sizeCategory(d.weight);
            const pct = (d.weight / maxWeight) * 100;
            return (
              <div key={i} className="flex items-center gap-4">
                <div
                  className="w-16 text-xs text-right"
                  style={{ color: "#94a3b8" }}
                >
                  {d.duck}
                </div>
                <div
                  className="flex-1 h-6 rounded-lg overflow-hidden"
                  style={{ background: "#111827" }}
                >
                  <div
                    className="h-6 rounded-lg flex items-center px-2 transition-all"
                    style={{
                      width: `${pct}%`,
                      background: `${color}30`,
                      border: `1px solid ${color}50`,
                    }}
                  >
                    <span className="text-xs font-bold" style={{ color }}>
                      {d.weight}g
                    </span>
                  </div>
                </div>
                <div className="w-16 text-xs" style={{ color: size.color }}>
                  {size.label}
                </div>
                <div
                  className="w-20 text-xs text-center px-2 py-0.5 rounded-full"
                  style={{
                    background: `${color}15`,
                    color,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {d.behavior === "Non-receptive" ? "Non-rec" : d.behavior}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#0d1b2e", border: "1px solid #1a3251" }}
      >
        <div
          className="px-6 py-4"
          style={{ borderBottom: "1px solid #1a3251" }}
        >
          <h3
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#94a3b8" }}
          >
            Egg Weight Records
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #1a3251" }}>
                {["Duck", "Behavior", "Weight", "Size Category", "Date"].map(
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
              {data.map((d, i) => {
                const color = BEHAVIOR_COLORS[d.behavior];
                const size = sizeCategory(d.weight);
                return (
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
                    <td className="px-6 py-4 font-medium text-white">
                      {d.duck}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: `${color}20`,
                          color,
                          border: `1px solid ${color}40`,
                        }}
                      >
                        {d.behavior}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold" style={{ color }}>
                      {d.weight}g
                    </td>
                    <td
                      className="px-6 py-4 text-xs"
                      style={{ color: size.color }}
                    >
                      {size.label}
                    </td>
                    <td className="px-6 py-4" style={{ color: "#475569" }}>
                      {d.date}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
