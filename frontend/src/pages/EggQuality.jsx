import { useState } from "react";

const initialData = [
  {
    id: 1,
    duck: "Duck 1",
    behavior: "Receptive",
    weight: 68,
    date: "2026-07-07",
  },
  {
    id: 2,
    duck: "Duck 2",
    behavior: "Non-receptive",
    weight: 61,
    date: "2026-07-07",
  },
  {
    id: 3,
    duck: "Duck 3",
    behavior: "Neutral",
    weight: 64,
    date: "2026-07-07",
  },
  {
    id: 4,
    duck: "Duck 4",
    behavior: "Receptive",
    weight: 70,
    date: "2026-07-07",
  },
  {
    id: 5,
    duck: "Duck 5",
    behavior: "Non-receptive",
    weight: 59,
    date: "2026-07-07",
  },
  {
    id: 6,
    duck: "Duck 6",
    behavior: "Neutral",
    weight: 63,
    date: "2026-07-07",
  },
  {
    id: 7,
    duck: "Duck 7",
    behavior: "Receptive",
    weight: 67,
    date: "2026-07-07",
  },
  {
    id: 8,
    duck: "Duck 8",
    behavior: "Non-receptive",
    weight: 60,
    date: "2026-07-07",
  },
];

const behaviorColors = {
  Receptive: "bg-green-500/20 text-green-400 border border-green-500/30",
  Neutral: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  "Non-receptive": "bg-red-500/20 text-red-400 border border-red-500/30",
};

const sizeCategory = (w) => {
  if (w >= 70) return "Jumbo";
  if (w >= 65) return "Large";
  if (w >= 60) return "Medium";
  return "Small";
};

export default function EggQuality() {
  const [data, setData] = useState(initialData);
  const [form, setForm] = useState({
    duck: "",
    behavior: "Receptive",
    weight: "",
    date: "",
  });

  const receptive = data.filter((d) => d.behavior === "Receptive");
  const nonReceptive = data.filter((d) => d.behavior === "Non-receptive");
  const neutral = data.filter((d) => d.behavior === "Neutral");

  const avg = (arr) =>
    arr.length
      ? (arr.reduce((s, d) => s + d.weight, 0) / arr.length).toFixed(1)
      : 0;

  const handleAdd = () => {
    if (!form.duck || !form.weight || !form.date) return;
    setData([
      ...data,
      { ...form, id: data.length + 1, weight: parseFloat(form.weight) },
    ]);
    setForm({ duck: "", behavior: "Receptive", weight: "", date: "" });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Egg Quality</h2>
        <p className="text-gray-400 text-sm mt-1">
          Correlation of reproductive receptivity with egg weight — Objective 3
        </p>
      </div>

      {/* Average Weight Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
          <div className="text-green-400 text-sm mb-1">
            Receptive — Avg Weight
          </div>
          <div className="text-3xl font-bold text-white">{avg(receptive)}g</div>
          <div className="text-gray-400 text-xs mt-1">
            {receptive.length} eggs recorded
          </div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
          <div className="text-yellow-400 text-sm mb-1">
            Neutral — Avg Weight
          </div>
          <div className="text-3xl font-bold text-white">{avg(neutral)}g</div>
          <div className="text-gray-400 text-xs mt-1">
            {neutral.length} eggs recorded
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <div className="text-red-400 text-sm mb-1">
            Non-receptive — Avg Weight
          </div>
          <div className="text-3xl font-bold text-white">
            {avg(nonReceptive)}g
          </div>
          <div className="text-gray-400 text-xs mt-1">
            {nonReceptive.length} eggs recorded
          </div>
        </div>
      </div>

      {/* Add Egg Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h3 className="text-white font-semibold mb-4">Record Egg Weight</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Duck</label>
            <input
              value={form.duck}
              onChange={(e) => setForm({ ...form, duck: e.target.value })}
              placeholder="e.g. Duck 1"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">
              Behavior Class
            </label>
            <select
              value={form.behavior}
              onChange={(e) => setForm({ ...form, behavior: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            >
              <option>Receptive</option>
              <option>Neutral</option>
              <option>Non-receptive</option>
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">
              Egg Weight (grams)
            </label>
            <input
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              placeholder="e.g. 65"
              type="number"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Date</label>
            <input
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              type="date"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Record
        </button>
      </div>

      {/* Egg Data Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Egg Weight Records</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-3 pr-4">Duck</th>
                <th className="text-left py-3 pr-4">Behavior</th>
                <th className="text-left py-3 pr-4">Weight (g)</th>
                <th className="text-left py-3 pr-4">Size Category</th>
                <th className="text-left py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="py-3 pr-4 text-white font-medium">{d.duck}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${behaviorColors[d.behavior]}`}
                    >
                      {d.behavior}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-white font-bold">
                    {d.weight}g
                  </td>
                  <td className="py-3 pr-4 text-gray-300">
                    {sizeCategory(d.weight)}
                  </td>
                  <td className="py-3 text-gray-400">{d.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
