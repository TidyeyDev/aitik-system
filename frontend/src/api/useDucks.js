import { useEffect, useState } from "react";
import { api } from "./client";

// The duck registry (F1–F8, M1–M2) shared by Mating Events and Egg Quality.
// loadState: "loading" | "ready" | "error"
export function useDucks() {
  const [ducks, setDucks] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  useEffect(() => {
    let active = true;
    api
      .get("/ducks")
      .then((res) => {
        if (!active) return;
        setDucks(res.data);
        setLoadState("ready");
      })
      .catch(() => active && setLoadState("error"));
    return () => {
      active = false;
    };
  }, []);
  return { ducks, setDucks, loadState };
}

// "F3 · Bella" for a registry id; anything else (older free-text egg
// records such as "Duck 1") is shown as it was typed.
export function duckLabel(ducks, id) {
  const duck = ducks.find((d) => d.id === id);
  return duck ? `${duck.id} · ${duck.name}` : id || "—";
}
