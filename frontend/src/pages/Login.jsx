import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Page-only animation and autofill styles. The page keeps its own fixed
// palette in both light and dark mode.
const PAGE_CSS = `
@keyframes login-gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes login-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(40px, -60px) scale(1.08); }
  66% { transform: translate(-30px, 30px) scale(0.95); }
}
@keyframes login-rise {
  0% { transform: translateY(0); opacity: 0; }
  10% { opacity: 0.7; }
  100% { transform: translateY(-110vh); opacity: 0; }
}
.login-bg {
  background: linear-gradient(135deg, #064e3b, #0f766e, #155e75, #1e3a8a);
  background-size: 300% 300%;
  animation: login-gradient 18s ease infinite;
}
.login-blob { animation: login-float 22s ease-in-out infinite; }
.login-bubble { animation: login-rise linear infinite; }
.login-input:-webkit-autofill {
  -webkit-text-fill-color: #fff;
  transition: background-color 9999s ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .login-bg, .login-blob, .login-bubble { animation: none; }
  .login-bubble { display: none; }
}
`;

const BLOBS = [
  { className: "bg-emerald-400/40 size-96 -top-24 -left-24", delay: "0s" },
  { className: "bg-teal-300/30 size-[28rem] top-1/3 -right-32", delay: "-7s" },
  { className: "bg-sky-400/30 size-80 -bottom-24 left-1/4", delay: "-14s" },
];

// left %, size px, duration s, delay s
const BUBBLES = [
  [8, 10, 14, 0],
  [18, 6, 11, -4],
  [30, 14, 17, -9],
  [44, 8, 13, -2],
  [57, 12, 16, -11],
  [68, 6, 12, -6],
  [79, 10, 15, -1],
  [90, 8, 13, -8],
];

const TEAM = [
  "Kimberly DC. Anievas",
  "Angel Valerie F. Ceñidoza",
  "Jebsus Mayria L. Co",
  "Nicholo Adrian A. Lauzon",
];

const inputClass =
  "login-input w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-body-md text-white placeholder:text-white/60 outline-none transition focus:border-white/70 focus:bg-white/15 focus:ring-2 focus:ring-white/30";

export default function Login() {
  const { authed, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  if (authed) return <Navigate to="/" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (login(username, password)) {
      navigate(location.state?.from || "/", { replace: true });
    } else {
      setError("Wrong username or password.");
    }
  };

  return (
    <div className="login-bg relative min-h-screen overflow-hidden flex flex-col items-center justify-center gap-6 px-4 py-8 sm:p-6">
      <style>{PAGE_CSS}</style>

      {/* Background shapes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {BLOBS.map((b) => (
          <div
            key={b.className}
            className={`login-blob absolute rounded-full blur-3xl ${b.className}`}
            style={{ animationDelay: b.delay }}
          />
        ))}
        {BUBBLES.map(([left, size, duration, delay]) => (
          <span
            key={left}
            className="login-bubble absolute -bottom-6 rounded-full border border-white/40 bg-white/10"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>

      {/* Glass card */}
      <div
        className="relative w-full max-w-md p-6 sm:p-8 text-white"
        style={{
          background: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          borderRadius: 24,
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="text-center">
            <div className="text-6xl drop-shadow-lg" aria-hidden="true">
              🦆
            </div>
            <h1 className="font-heading text-h3 font-bold text-white mt-3">AI-TIK</h1>
            <p className="text-body-sm text-white/80 mt-1">
              Duck reproductive monitoring
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="login-username" className="block text-body-sm font-medium text-white/90">
              Username
            </label>
            <input
              id="login-username"
              className={inputClass}
              autoComplete="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="block text-body-sm font-medium text-white/90">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                className={`${inputClass} pr-12`}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <p id="login-error" role="alert" className="text-body-sm text-red-200">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-white py-3 text-body-md font-semibold text-emerald-900 shadow-lg transition hover:bg-emerald-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
          >
            Sign in
          </button>
        </form>

        <div className="mt-8 border-t border-white/20 pt-6 text-center text-body-xs text-white/60 space-y-3">
          <p>
            <span className="block uppercase tracking-widest text-white/45">Adviser</span>
            <span className="text-white/75">RIO CAMILLE M. PEDROCILLO, ECE</span>
          </p>
          <div>
            <span className="block uppercase tracking-widest text-white/45">Members</span>
            <ul className="text-white/75">
              {TEAM.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
          <p className="pt-1">
            University of Rizal System – Morong Campus
            <br />
            College of Engineering | BS Electronics Engineering
          </p>
        </div>
      </div>

      <p className="relative text-center text-body-sm text-white/75 tracking-wide">
        Philippine Mallard Duck Behavioral Monitoring System
      </p>
    </div>
  );
}
