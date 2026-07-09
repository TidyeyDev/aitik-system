import axios from "axios";
import { io } from "socket.io-client";

const API_URL = "https://covered-foo-immediate-ash.trycloudflare.com";

export const api = axios.create({
  baseURL: API_URL,
});

export const socket = io(API_URL, {
  transports: ["websocket", "polling"],
});

export default api;
