import axios from "axios";
import { io } from "socket.io-client";

export const BACKEND_URL ="https://aitik-system.onrender.com";

export const api = axios.create({
  baseURL: BACKEND_URL,
});

export const socket = io(BACKEND_URL, {
  transports: ["websocket", "polling"],
});

export const getTunnelUrl = async () => {
  try {
    const res = await api.get("/tunnel-url");
    return res.data.url;
  } catch {
    return null;
  }
};

// action: "saved", "deleted". A 503 already says what happened ("Not saved — database offline").
export const apiErrorText = (err, action) => {
  const message = err.response?.data?.error;
  if (!message) return `Not ${action}: couldn't reach the backend.`;
  return err.response.status === 503 ? message : `Not ${action}: ${message}`;
};

export default api;
