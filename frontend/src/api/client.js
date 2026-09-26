import axios from "axios";
import { io } from "socket.io-client";

const BACKEND_URL = "https://aitik-system.onrender.com";

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

export default api;
