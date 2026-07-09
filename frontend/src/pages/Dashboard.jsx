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
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-gray-400 text-sm mt-1">
          AI-TIK System Overview — Philippine Mallard Duck Monitoring
        </p>
      </div>

      {/* Alert */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
        <span className="text-2xl">🦆</span>
        <div>
          <p className="text-green-400 font-semibold text-sm">
            Receptive Duck Detected!
          </p>
          <p className="text-gray-400 text-xs">
            Duck 1 showing receptive behavior at Cam 1 — 08:32 AM
          </p>
        </div>
        <span className="ml-auto text-xs text-gray-500">Just now</span>
      </div>

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
          value="2"
          subtitle="Currently receptive"
          color="green"
          icon="✅"
        />
        <StatCard
          title="Mating Events"
          value="5"
          subtitle="Detected today"
          color="purple"
          icon="💕"
        />
        <StatCard
          title="System Uptime"
          value="99%"
          subtitle="Last 24 hours"
          color="yellow"
          icon="⚡"
        />
      </div>

      {/* Behavior Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Receptive", count: 2, color: "bg-green-500" },
          { label: "Mating", count: 1, color: "bg-blue-500" },
          { label: "Neutral", count: 4, color: "bg-yellow-500" },
          { label: "Non-receptive", count: 1, color: "bg-red-500" },
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
            <div className="text-xs text-gray-500">ducks</div>
          </div>
        ))}
      </div>

      {/* Recent Detections */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Recent Detections</h3>
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
              {recentDetections.map((d) => (
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
                  <td className="py-3 pr-4 text-gray-300">{d.confidence}</td>
                  <td className="py-3 pr-4 text-gray-300">{d.cam}</td>
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
