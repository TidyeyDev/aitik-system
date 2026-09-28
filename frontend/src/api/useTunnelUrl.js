import { useEffect, useState } from "react";
import { getTunnelUrl } from "./client";

// Current tunnel URL: undefined while loading, null if unavailable.
export function useTunnelUrl() {
  const [tunnelUrl, setTunnelUrl] = useState(undefined);
  useEffect(() => {
    let active = true;
    getTunnelUrl().then((url) => {
      if (active) setTunnelUrl(url || null);
    });
    return () => {
      active = false;
    };
  }, []);
  return tunnelUrl;
}
