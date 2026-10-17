import { colors, shadows, fontFamily, typography } from "@raydenui/ui/preset";

// Rayden UI ships compiled CSS plus raw tokens; this maps the tokens into
// Tailwind (loaded via @config in index.css) so page classes like bg-grey-50,
// shadow-soft-xs and text-h4 exist for our own markup.
const text = (t) => [
  t.size,
  {
    lineHeight: String(t.lineHeight),
    letterSpacing: t.letterSpacing,
    fontWeight: String(t.fontWeight),
  },
];
const prefixed = (prefix, group) =>
  Object.fromEntries(
    Object.entries(group).map(([k, t]) => [`${prefix}${k}`, text(t)]),
  );

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors,
      fontFamily,
      boxShadow: Object.fromEntries(
        Object.entries(shadows.soft).map(([k, v]) => [`soft-${k}`, v]),
      ),
      fontSize: {
        ...prefixed("", typography.heading),
        ...prefixed("body-", typography.body),
        ...prefixed("caption-", typography.caption),
      },
    },
  },
  plugins: [],
};
