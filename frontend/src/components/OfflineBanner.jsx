import { useEffect, useState } from "react";
import { api } from "../api/client";

const CHECK_EVERY_MS = 30000;

function offlineMessage(health) {
  if (!health) return "Can't reach the backend. Records won't be saved until it's back.";
  if (health.mongo !== "connected")
    return "Database offline. Behavior events and egg records can't be saved right now.";
  if (health.supabase !== "ok") return "Detection database offline. New detections may not be saved.";
  return null;
}

export default function OfflineBanner() {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const check = () =>
      api
        .get("/health")
        .then((res) => setMessage(offlineMessage(res.data)))
        .catch(() => setMessage(offlineMessage(null)));
    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, []);

  if (!message) return null;
  return (
    // Literal colors: dark mode inverts the theme's error scale and text-white
    <div role="alert" className="mb-4 rounded-md bg-[#BA110B] px-4 py-2 text-body-sm font-medium text-[#FFFFFF]">
      {message}
    </div>
  );
}
