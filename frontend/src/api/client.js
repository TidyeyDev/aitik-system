import axios from "axios";
import { io } from "socket.io-client";

// Fetch tunnel URL dynamically from backend
const LOCAL_BACKEND =
  "https://marina-silent-brought-identifying.trycloudflare.com";

export const api = axios.create({
  baseURL: LOCAL_BACKEND,
});

export const socket = io(LOCAL_BACKEND, {
  transports: ["websocket", "polling"],
});

export const getTunnelUrl = async () => {
  try {
    const res = await api.get("/tunnel-url");
    return res.data.url;
  } catch {
    return LOCAL_BACKEND;
  }
};

export default api;
