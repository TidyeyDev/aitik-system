import { ThemeProvider as RaydenThemeProvider, useTheme } from "@raydenui/ui";

// Rayden's provider stores the choice in localStorage and puts .dark/.light
// on <html>; this pins AI-TIK's defaults. index.html reads the same key to
// apply the stored choice before React loads, so dark mode doesn't flash.
const THEME_STORAGE_KEY = "aitik-theme";

export function ThemeProvider({ children }) {
  return (
    <RaydenThemeProvider
      defaultTheme="light"
      disableSystemTheme
      storageKey={THEME_STORAGE_KEY}
    >
      {children}
    </RaydenThemeProvider>
  );
}

export { useTheme };
