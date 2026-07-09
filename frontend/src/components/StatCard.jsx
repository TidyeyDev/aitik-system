export default function StatCard({
  title,
  value,
  subtitle,
  color = "green",
  icon,
}) {
  const colors = {
    green: "border-green-500 bg-green-500/10",
    blue: "border-blue-500 bg-blue-500/10",
    yellow: "border-yellow-500 bg-yellow-500/10",
    red: "border-red-500 bg-red-500/10",
    purple: "border-purple-500 bg-purple-500/10",
  };

  return (
    <div className={`border rounded-xl p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm font-medium">{title}</span>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
    </div>
  );
}
