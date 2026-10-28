/* Shared by editor, public profile, store page and server validation. */

export const DEFAULT_THEME_ID = "crimson";

export const PROFILE_THEMES = [
  /* ---------- Light ---------- */
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
    id: "rosegold",
    name: "Rose Gold",
    vibe: "Soft & elegant",
    accent: "#b4536a",
    accent2: "#d4a373",
    onAccent: "#ffffff",
    bg: "#fff5f6",
    bgCss: "linear-gradient(160deg, #fff1f3 0%, #ffffff 50%, #fbe7e1 100%)",
    dark: false,
  },
  {
    id: "royal",
    name: "Royal Navy",
    vibe: "Corporate & sharp",
    accent: "#1e3a8a",
    accent2: "#3b82f6",
    onAccent: "#ffffff",
    bg: "#f1f5ff",
    bgCss: "linear-gradient(180deg, #eaf0ff 0%, #ffffff 50%, #dfe9ff 100%)",
    dark: false,
  },
  {
    id: "forest",
    name: "Forest",
    vibe: "Natural & grounded",
    accent: "#166534",
    accent2: "#65a30d",
    onAccent: "#ffffff",
    bg: "#f4faf0",
    bgCss: "linear-gradient(180deg, #eef8e8 0%, #ffffff 55%, #e2f1d6 100%)",
    dark: false,
  },
  {
    id: "lavender",
    name: "Lavender Pop",
    vibe: "Playful & dreamy",
    accent: "#8b5cf6",
    accent2: "#ec4899",
    onAccent: "#ffffff",
    bg: "#faf5ff",
    bgCss: "linear-gradient(135deg, #f5ecff 0%, #ffffff 50%, #ffe8f4 100%)",
    dark: false,
  },
  {
    id: "coral",
    name: "Coral Pop",
    vibe: "Energetic & youthful",
    accent: "#f43f5e",
    accent2: "#fb923c",
    onAccent: "#ffffff",
    bg: "#fff5f2",
    bgCss: "linear-gradient(135deg, #fff0ec 0%, #ffffff 50%, #ffe9d6 100%)",
    dark: false,
  },
  {
    id: "aqua",
    name: "Aqua",
    vibe: "Cool & fresh",
    accent: "#0891b2",
    accent2: "#06b6d4",
    onAccent: "#ffffff",
    bg: "#ecfeff",
    bgCss: "linear-gradient(180deg, #e3fbff 0%, #ffffff 55%, #d2f3f9 100%)",
    dark: false,
  },
  {
    id: "champagne",
    name: "Champagne",
    vibe: "Premium & warm",
    accent: "#a16207",
    accent2: "#ca8a04",
    onAccent: "#ffffff",
    bg: "#fffbeb",
    bgCss: "linear-gradient(160deg, #fff7da 0%, #ffffff 50%, #faedc4 100%)",
    dark: false,
  },
  {
    id: "mono",
    name: "Mono",
    vibe: "Minimal & timeless",
    accent: "#111827",
    accent2: "#374151",
    onAccent: "#ffffff",
    bg: "#f5f5f5",
    bgCss: "linear-gradient(180deg, #f5f5f5 0%, #ffffff 55%, #ececec 100%)",
    dark: false,
  },

  /* ---------- Dark / premium ---------- */
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
  {
    id: "noir",
    name: "Noir",
    vibe: "Black & white luxe",
    accent: "#f8fafc",
    accent2: "#cbd5e1",
    onAccent: "#0f172a",
    bg: "#09090b",
    bgCss: "radial-gradient(circle at 80% 0%, #27272a 0%, #09090b 55%), #09090b",
    dark: true,
  },
  {
    id: "aurora",
    name: "Aurora",
    vibe: "Glowing & futuristic",
    accent: "#34d399",
    accent2: "#22d3ee",
    onAccent: "#04130e",
    bg: "#07111f",
    bgCss:
      "radial-gradient(circle at 15% 0%, #0f3b4a 0%, transparent 45%), radial-gradient(circle at 90% 90%, #123a2e 0%, transparent 45%), #07111f",
    dark: true,
  },
  {
    id: "neon",
    name: "Neon Night",
    vibe: "Bold & electric",
    accent: "#f472b6",
    accent2: "#a855f7",
    onAccent: "#1a0614",
    bg: "#12081f",
    bgCss:
      "radial-gradient(circle at 10% 0%, #3b1060 0%, transparent 50%), radial-gradient(circle at 95% 100%, #5b0f3f 0%, transparent 45%), #12081f",
    dark: true,
  },
  {
    id: "ruby",
    name: "Ruby Night",
    vibe: "Deep & dramatic",
    accent: "#fb7185",
    accent2: "#f43f5e",
    onAccent: "#1f0509",
    bg: "#1a0a10",
    bgCss: "radial-gradient(circle at 20% 0%, #4a1322 0%, #1a0a10 58%), #1a0a10",
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