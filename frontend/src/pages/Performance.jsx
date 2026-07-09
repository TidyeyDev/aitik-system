import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const metricsData = [
  {
    model: "YOLOv8",
    accuracy: 98.2,
    precision: 97.8,
    recall: 96.5,
    f1: 97.1,
    mcc: 96.8,
  },
  {
    model: "YOLOv5",
    accuracy: 95.4,
    precision: 94.2,
    recall: 93.8,
    f1: 94.0,
    mcc: 93.5,
  },
  {
    model: "MobileNetSSD",
    accuracy: 91.7,
    precision: 90.5,
    recall: 89.3,
    f1: 89.9,
    mcc: 89.1,
  },
];

const confusionData = {
  labels: ["Receptive", "Mating", "Neutral", "Non-receptive"],
  matrix: [
    [45, 2, 1, 0],
    [1, 38, 2, 1],
    [0, 1, 52, 2],
    [1, 0, 2, 41],
  ],
};

const cellColor = (val, max) => {
  const intensity = val / max;
  if (intensity > 0.7) return "bg-green-600 text-white";
  if (intensity > 0.1) return "bg-green-900/50 text-green-300";
  return "bg-gray-800 text-gray-400";
};

export default function Performance() {
  const maxVal = Math.max(...confusionData.matrix.flat());

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Performance</h2>
        <p className="text-gray-400 text-sm mt-1">
          Model detection metrics — Objective 2 (Accuracy, Precision, Recall,
          F1, MCC)
        </p>
      </div>

      {/* Best Model Banner */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-8 flex items-center gap-3">
        <span className="text-2xl">🏆</span>
        <div>
          <p className="text-green-400 font-semibold text-sm">
            Best Performing Model: YOLOv8
          </p>
          <p className="text-gray-400 text-xs">
            98.2% accuracy — recommended for deployment
          </p>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h3 className="text-white font-semibold mb-4">Model Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-3 pr-4">Model</th>
                <th className="text-left py-3 pr-4">Accuracy</th>
                <th className="text-left py-3 pr-4">Precision</th>
                <th className="text-left py-3 pr-4">Recall</th>
                <th className="text-left py-3 pr-4">F1 Score</th>
                <th className="text-left py-3">MCC</th>
              </tr>
            </thead>
            <tbody>
              {metricsData.map((m, i) => (
                <tr
                  key={m.model}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="text-yellow-400">🏆</span>}
                      <span className="text-white font-medium">{m.model}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-green-400 font-bold">
                    {m.accuracy}%
                  </td>
                  <td className="py-3 pr-4 text-blue-400">{m.precision}%</td>
                  <td className="py-3 pr-4 text-yellow-400">{m.recall}%</td>
                  <td className="py-3 pr-4 text-purple-400">{m.f1}%</td>
                  <td className="py-3 text-red-400">{m.mcc}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h3 className="text-white font-semibold mb-6">
          Metrics Comparison Chart
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metricsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="model" stroke="#9CA3AF" />
            <YAxis domain={[85, 100]} stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#fff" }}
            />
            <Legend />
            <Bar
              dataKey="accuracy"
              name="Accuracy"
              fill="#22C55E"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="precision"
              name="Precision"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="recall"
              name="Recall"
              fill="#EAB308"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="f1"
              name="F1 Score"
              fill="#A855F7"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Confusion Matrix */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-2">
          Confusion Matrix — YOLOv8
        </h3>
        <p className="text-gray-400 text-xs mb-6">
          Rows = Actual, Columns = Predicted
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm mx-auto">
            <thead>
              <tr>
                <th className="p-2 text-gray-500 text-xs">
                  Actual / Predicted
                </th>
                {confusionData.labels.map((l) => (
                  <th key={l} className="p-2 text-gray-400 text-xs font-medium">
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {confusionData.matrix.map((row, i) => (
                <tr key={i}>
                  <td className="p-2 text-gray-400 text-xs font-medium pr-4">
                    {confusionData.labels[i]}
                  </td>
                  {row.map((val, j) => (
                    <td
                      key={j}
                      className={`p-3 text-center font-bold rounded-lg m-1 ${cellColor(val, maxVal)}`}
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
