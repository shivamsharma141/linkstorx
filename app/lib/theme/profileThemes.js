/* Shared by editor, public profile, store page and server validation. */

export const DEFAULT_THEME_ID = "crimson";

export const PROFILE_THEMES = [
  {
    id: "crimson",
    name: "Crimson",
    vibe: "Bold & classic",
    accent: "#e11d48",
    accent2: "#be123c",
    onAccent: "#ffffff",
    bg: "#ffffff",
    bgCss: "#ffffff",
    dark: false,
  },
  {
    id: "ocean",
    name: "Ocean",
    vibe: "Clean & trusted",
    accent: "#2563eb",
    accent2: "#4f46e5",
    onAccent: "#ffffff",
    bg: "#f3f7ff",
    bgCss: "linear-gradient(180deg, #f3f7ff 0%, #ffffff 55%, #e8f0ff 100%)",
    dark: false,
  },
  {
    id: "emerald",
    name: "Emerald",
    vibe: "Fresh & calm",
    accent: "#059669",
    accent2: "#0d9488",
    onAccent: "#ffffff",
    bg: "#f2fcf7",
    bgCss: "linear-gradient(180deg, #f2fcf7 0%, #ffffff 55%, #e4f7ee 100%)",
    dark: false,
  },
  {
    id: "violet",
    name: "Violet",
    vibe: "Creative & modern",
    accent: "#7c3aed",
    accent2: "#c026d3",
    onAccent: "#ffffff",
    bg: "#f8f4ff",
    bgCss: "linear-gradient(180deg, #f8f4ff 0%, #ffffff 55%, #f1e8ff 100%)",
    dark: false,
  },
  {
    id: "sunset",
    name: "Sunset",
    vibe: "Warm & friendly",
    accent: "#ea580c",
    accent2: "#f59e0b",
    onAccent: "#ffffff",
    bg: "#fff8f0",
    bgCss: "linear-gradient(180deg, #fff8f0 0%, #ffffff 55%, #ffeedd 100%)",
    dark: false,
  },
  {
    id: "midnight",
    name: "Midnight Gold",
    vibe: "Dark luxury",
    accent: "#f5b942",
    accent2: "#f59e0b",
    onAccent: "#1a1405",
    bg: "#0b1020",
    bgCss: "radial-gradient(circle at 20% 0%, #1d2650 0%, #0b1020 55%), #0b1020",
    dark: true,
  },
];

export function isValidThemeId(id) {
  return PROFILE_THEMES.some((t) => t.id === id);
}

/* Accepts { themeId } or a legacy { accentColor } object. Always returns a theme. */
export function getTheme(input) {
  const byId = PROFILE_THEMES.find((t) => t.id === input?.themeId);
  if (byId) return byId;

  const accent = String(input?.accentColor || "").toLowerCase();
  return PROFILE_THEMES.find((t) => t.accent === accent) || PROFILE_THEMES[0];
}

/* CSS variables for BOTH the profile page and the store page. */
export function buildThemeVars(theme) {
  const d = theme.dark;
  const line = d ? "rgba(255,255,255,0.14)" : "#e8ecf3";

  return {
    "--pub-accent": theme.accent,
    "--pub-accent-2": theme.accent2,
    "--pub-btn-bg": `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`,
    "--pub-on-accent": theme.onAccent,
    "--pub-page-bg": theme.bg,
    "--pub-page-bg-css": theme.bgCss,
    "--pub-ink": d ? "#f4f2fa" : "#0f172a",
    "--pub-muted": d ? "#aeb6cc" : "#5b6475",
    "--pub-line": line,
    "--pub-surface": d ? "rgba(255,255,255,0.07)" : "#ffffff",
    "--pub-surface-border": line,
    "--pub-card-solid": d ? "#151b33" : "#ffffff",
    "--pub-card-bg": d ? "rgba(255,255,255,0.07)" : "#ffffff",
    "--pub-border": line,
    "--pub-field": d ? "rgba(255,255,255,0.10)" : "#ffffff",
  };
}