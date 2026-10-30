import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LiveMonitor from "./pages/LiveMonitor";
import Detections from "./pages/Detections";
import EggQuality from "./pages/EggQuality";
import BehaviorHistory from "./pages/BehaviorHistory";
import OfflineBanner from "./components/OfflineBanner";
import AboutUs from "./pages/AboutUs";

function ProtectedLayout() {
  const { authed } = useAuth();
  const location = useLocation();
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <div className="min-h-screen bg-grey-50 lg:flex">
      <Navbar />
      <main className="flex-1 min-w-0 px-4 pt-4 sm:px-6 sm:pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-6">
        <div className="max-w-7xl mx-auto">
          <OfflineBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/monitor" element={<LiveMonitor />} />
              <Route path="/detections" element={<Detections />} />
              <Route path="/behavior" element={<BehaviorHistory />} />
              <Route path="/mating" element={<Navigate to="/behavior" replace />} />
              <Route path="/eggs" element={<EggQuality />} />
              <Route path="/about" element={<AboutUs />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
