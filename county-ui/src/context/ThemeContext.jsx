/**
 * context/ThemeContext.jsx
 *
 * Single source of truth for dark/light mode.
 * Persists to localStorage under "uims-theme".
 * Applies "theme-dark" or "theme-light" class to <html>.
 *
 * Usage:
 *   const { theme, setTheme } = useTheme();
 *   theme === "dark" | "light"
 */
import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_THEME } from "../theme.js";

const ThemeContext = createContext({ theme: DEFAULT_THEME, setTheme: () => {} });

function resolveTheme() {
  const saved = localStorage.getItem("uims-theme");
  // Migrate old multi-theme values (slate/graphite/ocean) → dark
  if (saved === "light") return "light";
  if (saved === "dark")  return "dark";
  return DEFAULT_THEME; // anything else (slate/graphite/ocean/null) → dark
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(resolveTheme);

  function setTheme(id) {
    if (id !== "dark" && id !== "light") return;
    setThemeState(id);
    localStorage.setItem("uims-theme", id);
  }

  // Apply theme class to <html> so CSS vars cascade everywhere
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light", "theme-slate", "theme-graphite", "theme-ocean");
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
