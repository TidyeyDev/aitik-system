import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import LiveMonitor from "./pages/LiveMonitor";
import Detections from "./pages/Detections";
import EggQuality from "./pages/EggQuality";

export default function App() {
  return (
    <BrowserRouter>
      <div
        className="min-h-screen text-white"
        style={{ background: "#050d1a" }}
      >
        <Navbar />
        <main className="p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/monitor" element={<LiveMonitor />} />
            <Route path="/detections" element={<Detections />} />
            <Route path="/eggs" element={<EggQuality />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
