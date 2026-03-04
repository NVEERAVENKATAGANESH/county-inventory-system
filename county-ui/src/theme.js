/**
 * theme.js — UIMS Theme System
 *
 * Two themes: dark (default) and light.
 * ThemeContext reads this to validate and persist theme choices.
 */

export const THEMES = {
  dark: {
    id: "dark",
    label: "Dark Mode",
    preview: ["#0d1520", "#1a2535", "#10b981"],
  },
  light: {
    id: "light",
    label: "Light Mode",
    preview: ["#f8fafc", "#e2e8f0", "#0ea5e9"],
  },
};

export const DEFAULT_THEME = "dark";
