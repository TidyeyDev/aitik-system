import { Link, useLocation } from "react-router-dom";

const links = [
  { path: "/", label: "Dashboard" },
  { path: "/monitor", label: "Live Monitor" },
  { path: "/detections", label: "Detections" },
  { path: "/eggs", label: "Egg Quality" },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦆</span>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">
              AI-TIK
            </h1>
            <p className="text-xs text-gray-400">
              Duck Reproductive Monitoring
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.path
                  ? "bg-green-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-xs text-gray-400">System Online</span>
        </div>
      </div>
    </nav>
  );
}
