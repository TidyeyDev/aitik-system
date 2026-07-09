const evalData = [
  {
    criterion: "Operation",
    description: "Real-time system performance during farm deployment",
    items: [
      { label: "System starts automatically on boot", rating: 5 },
      { label: "Cameras initialize without manual intervention", rating: 5 },
      { label: "Detection runs continuously without interruption", rating: 4 },
      { label: "Web dashboard loads within acceptable time", rating: 4 },
    ],
  },
  {
    criterion: "Reliability",
    description: "Consistency of detection results over repeated trials",
    items: [
      { label: "System maintains stable operation over 24 hours", rating: 5 },
      { label: "Detection results are consistent across trials", rating: 4 },
      { label: "System recovers automatically from failures", rating: 4 },
      { label: "Video upload succeeds consistently", rating: 4 },
    ],
  },
  {
    criterion: "Accuracy",
    description: "Classification metrics per ISO/IEC 22989:2022",
    items: [
      { label: "Receptive behavior detection accuracy", rating: 5 },
      { label: "Mating behavior detection accuracy", rating: 5 },
      { label: "Neutral behavior detection accuracy", rating: 4 },
      { label: "Non-receptive behavior detection accuracy", rating: 4 },
    ],
  },
  {
    criterion: "Monitoring",
    description: "Continuous tracking of system performance over time",
    items: [
      { label: "Behavioral logs are recorded with timestamps", rating: 5 },
      { label: "Detection confidence scores are stored", rating: 5 },
      { label: "System alerts are sent in real time", rating: 4 },
      { label: "Performance metrics are trackable over time", rating: 4 },
    ],
  },
];

const ratingLabels = {
  5: { label: "Very Much Acceptable", color: "text-green-400" },
  4: { label: "Much Acceptable", color: "text-blue-400" },
  3: { label: "Acceptable", color: "text-yellow-400" },
  2: { label: "Slightly Acceptable", color: "text-orange-400" },
  1: { label: "Not Acceptable", color: "text-red-400" },
};

const Stars = ({ rating }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <span
        key={s}
        className={s <= rating ? "text-yellow-400" : "text-gray-700"}
      >
        ★
      </span>
    ))}
  </div>
);

export default function SystemEval() {
  const allItems = evalData.flatMap((e) => e.items);
  const overallAvg = (
    allItems.reduce((s, i) => s + i.rating, 0) / allItems.length
  ).toFixed(2);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">System Evaluation</h2>
        <p className="text-gray-400 text-sm mt-1">
          Trustworthiness and performance based on ISO/IEC 22989:2022 —
          Objective 4
        </p>
      </div>

      {/* Overall Rating */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-8 flex items-center gap-6">
        <div className="text-6xl font-bold text-green-400">{overallAvg}</div>
        <div>
          <div className="text-white font-semibold text-lg">Overall Rating</div>
          <div className="text-green-400 text-sm">Very Much Acceptable</div>
          <div className="text-gray-400 text-xs mt-1">
            Based on ISO/IEC 22989:2022 evaluation criteria
          </div>
          <Stars rating={5} />
        </div>
      </div>

      {/* Rating Scale */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8">
        <h3 className="text-white font-semibold mb-3 text-sm">Rating Scale</h3>
        <div className="flex gap-4 flex-wrap">
          {Object.entries(ratingLabels)
            .reverse()
            .map(([r, v]) => (
              <div key={r} className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">{r}</span>
                <span className={`text-xs ${v.color}`}>— {v.label}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Evaluation Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {evalData.map((section) => {
          const avg = (
            section.items.reduce((s, i) => s + i.rating, 0) /
            section.items.length
          ).toFixed(2);
          return (
            <div
              key={section.criterion}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">
                  {section.criterion}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-bold">{avg}</span>
                  <Stars rating={Math.round(avg)} />
                </div>
              </div>
              <p className="text-gray-400 text-xs mb-4">
                {section.description}
              </p>
              <div className="space-y-3">
                {section.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-gray-300 text-xs flex-1 pr-4">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Stars rating={item.rating} />
                      <span
                        className={`text-xs font-bold ${ratingLabels[item.rating].color}`}
                      >
                        {item.rating}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
