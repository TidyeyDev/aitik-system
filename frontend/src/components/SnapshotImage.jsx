import { useState } from "react";

// Relative paths ("/snapshots/...") are served by the Pi through the tunnel.
// Returns undefined while the tunnel URL is loading, null if it can't be built.
function resolveSnapshot(snapshot, tunnelUrl) {
  if (!snapshot.startsWith("/")) return snapshot;
  if (tunnelUrl === undefined) return undefined;
  return tunnelUrl ? `${tunnelUrl.replace(/\/+$/, "")}${snapshot}` : null;
}

// Old snapshots are deleted on the Pi, so a failed load shows a placeholder.
export default function SnapshotImage({ snapshot, tunnelUrl, alt, className, link }) {
  const src = resolveSnapshot(snapshot, tunnelUrl);
  const [failedSrc, setFailedSrc] = useState(null);

  if (src === undefined || src === null || failedSrc === src) {
    return (
      <div
        className={`${className} flex items-center justify-center text-xs text-center`}
        style={{ color: "#475569", background: "#0a1628" }}
      >
        {src === undefined ? "Loading…" : "Snapshot unavailable"}
      </div>
    );
  }

  const img = (
    <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} />
  );
  return link ? (
    <a href={src} target="_blank" rel="noreferrer">
      {img}
    </a>
  ) : (
    img
  );
}
