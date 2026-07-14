import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const links = [
  { path: "/", label: "Dashboard" },
  { path: "/monitor", label: "Live Monitor" },
  { path: "/detections", label: "Detections" },
  { path: "/eggs", label: "Egg Quality" },
];

export default function Navbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{ background: "#0d1b2e", borderBottom: "1px solid #1a3251" }}>
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦆</span>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">
              AI-TIK
            </h1>
            <p className="text-xs" style={{ color: "#475569" }}>
              Duck Reproductive Monitoring
            </p>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background:
                  location.pathname === link.path ? "#10b981" : "transparent",
                color: location.pathname === link.path ? "#fff" : "#64748b",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs" style={{ color: "#64748b" }}>
              System Online
            </span>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ background: "#1a3251" }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="md:hidden px-4 pb-4"
          style={{ borderTop: "1px solid #1a3251" }}
        >
          <div className="pt-3 space-y-1">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background:
                    location.pathname === link.path
                      ? "rgba(16,185,129,0.15)"
                      : "transparent",
                  color:
                    location.pathname === link.path ? "#10b981" : "#94a3b8",
                  border: `1px solid ${location.pathname === link.path ? "#10b981" : "transparent"}`,
                }}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-2 px-4 py-3">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs" style={{ color: "#64748b" }}>
                System Online
              </span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
