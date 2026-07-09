import axios from "axios";
import { io } from "socket.io-client";

const API_URL = "https://absurd-embattled-uncounted.ngrok-free.dev";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

export const socket = io(API_URL, {
  transports: ["websocket", "polling"],
});

export default api;
