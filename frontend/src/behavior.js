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

// Display name, which is also the key of each page's colour maps.
export function behaviorLabel(label) {
  const key = normalizeBehavior(label);
  if (!key) return "Unknown";
  return DISPLAY_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1);
}
