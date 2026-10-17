import { fontFamily, typography } from "@raydenui/ui/preset";

// Rayden UI ships compiled CSS plus raw tokens; this maps the type tokens into
// Tailwind (loaded via @config in index.css) so classes like text-h4 and
// font-heading exist for our own markup. Colours and shadows live in
// index.css @theme instead, so they compile to CSS variables that dark mode
// can swap.
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
      fontFamily,
      fontSize: {
        ...prefixed("", typography.heading),
        ...prefixed("body-", typography.body),
        ...prefixed("caption-", typography.caption),
      },
    },
  },
  plugins: [],
};
