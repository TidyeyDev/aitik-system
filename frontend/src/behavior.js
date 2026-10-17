// The model sends lowercase labels ("mating", "non-receptive"); the UI shows
// them capitalised. Compare and look up behaviours only through these helpers.

const DISPLAY_NAMES = {
  receptive: "Receptive",
  mating: "Mating",
  neutral: "Neutral",
  "non-receptive": "Non-receptive",
};

export function normalizeBehavior(label) {
  return typeof label === "string" ? label.trim().toLowerCase() : "";
}

export function isBehavior(label, name) {
  return normalizeBehavior(label) === normalizeBehavior(name);
}

// Rayden Badge colour per behaviour, and the matching hex for charts.
const BADGE_COLORS = {
  Receptive: "success",
  Mating: "blue",
  Neutral: "warning",
  "Non-receptive": "error",
};
export const BEHAVIOR_HEX = {
  Receptive: "#0F973D",
  Mating: "#1671D9",
  Neutral: "#F3A218",
  "Non-receptive": "#D42620",
};

// The model sends 0–1; show it as a percentage.
export function formatConfidence(value) {
  if (typeof value !== "number") return value ?? "—";
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

export function behaviorBadgeColor(label) {
  return BADGE_COLORS[behaviorLabel(label)] || "neutral";
}

// Display name, which is also the key of each page's colour maps.
export function behaviorLabel(label) {
  const key = normalizeBehavior(label);
  if (!key) return "Unknown";
  return DISPLAY_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1);
}
