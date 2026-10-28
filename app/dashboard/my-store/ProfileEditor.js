"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { PROFILE_THEMES, getTheme } from "@/app/lib/theme/profileThemes";

const SOCIAL_PLATFORMS = ["instagram","youtube","linkedin","whatsapp","x","facebook","telegram","website"];

const SOCIAL_META = {
  instagram: { label: "Instagram", color: "#D62976" },
  youtube: { label: "YouTube", color: "#FF0000" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  x: { label: "X", color: "#000000" },
  facebook: { label: "Facebook", color: "#1877F2" },
  telegram: { label: "Telegram", color: "#229ED9" },
  website: { label: "Website", color: "#374151" },
};

const TAG_SUGGESTIONS = ["Creator", "Store", "Fashion", "Fitness", "Tech", "Food", "Education", "Art"];

/* ---------- limits ---------- */
const MAX_BIO_WORDS = 50;
const MAX_BIO_CHARS = 500; // safety net, words limit pehle hit hoti hai
const MAX_SUBTITLE_CHARS = 60;

function countWords(text) {
  return (String(text || "").match(/\S+/g) || []).length;
}

/* max words ke baad ka text kaat deta hai (paste karne par bhi) */
function limitWords(text, max) {
  const re = /\S+/g;
  let count = 0;
  let match;

  while ((match = re.exec(text))) {
    count++;
    if (count === max) {
      const end = match.index + match[0].length;
      return /\S/.test(text.slice(end)) ? text.slice(0, end) : text;
    }
  }
  return text;
}

/* ---------- image upload rules ---------- */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB (original file)
const TARGET_IMAGE_BYTES = 150 * 1024; // compress target ~150KB

const SOCIAL_PATHS = {
  youtube:
    "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  whatsapp:
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.272-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  telegram:
    "M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
};

function SocialIcon({ platform, size = 18 }) {
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <defs>
          <linearGradient id="pe-ig" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#FEDA75" />
            <stop offset="35%" stopColor="#FA7E1E" />
            <stop offset="60%" stopColor="#D62976" />
            <stop offset="85%" stopColor="#962FBF" />
            <stop offset="100%" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
        <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" fill="none" stroke="url(#pe-ig)" strokeWidth="2.1" />
        <circle cx="12" cy="12" r="4.4" fill="none" stroke="url(#pe-ig)" strokeWidth="2.1" />
        <circle cx="17.1" cy="6.9" r="1.35" fill="url(#pe-ig)" />
      </svg>
    );
  }

  if (platform === "website") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5" />
        <path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5" />
      </svg>
    );
  }

  if (!SOCIAL_PATHS[platform]) return null;

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d={SOCIAL_PATHS[platform]} />
    </svg>
  );
}

/* ---------- UI icons (stroke style, no emoji) ---------- */
const UI_ICONS = {
  up: "M12 19V5|M5 12l7-7 7 7",
  down: "M12 5v14|M19 12l-7 7-7-7",
  trash: "M3 6h18|M8 6V4h8v2|M19 6l-1 14H6L5 6|M10 11v6|M14 11v6",
  copy: "M9 9h11v11H9z|M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1",
  check: "M20 6L9 17l-5-5",
  external: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6|M15 3h6v6|M10 14L21 3",
  share: "M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7|M16 6l-4-4-4 4|M12 2v13",
  plus: "M12 5v14|M5 12h14",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2|M12 11a4 4 0 100-8 4 4 0 000 8z",
  link: "M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5|M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5",
  at: "M12 16a4 4 0 100-8 4 4 0 000 8z|M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94",
  palette: "M12 2a10 10 0 100 20 2 2 0 002-2 2 2 0 00-.6-1.4 2 2 0 011.4-3.4H17a5 5 0 005-5c0-4.4-4.5-8.2-10-8.2z|M7.5 11.5h.01|M10.5 7.5h.01|M15.5 8h.01",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4|M17 8l-5-5-5 5|M12 3v12",
  phone: "M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z|M12 18h.01",
  monitor: "M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z|M8 21h8|M12 17v4",
  refresh: "M23 4v6h-6|M1 20v-6h6|M3.51 9a9 9 0 0114.85-3.36L23 10|M1 14l4.64 4.36A9 9 0 0020.49 15",
  x: "M18 6L6 18|M6 6l12 12",
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z|M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z",
  image: "M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z|M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z|M21 15l-5-5L5 21",
  camera: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z|M12 17a4 4 0 100-8 4 4 0 000 8z",
  tag: "M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8z|M7 7h.01",
  pointer: "M4 4l7 17 2.5-7.5L21 11z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z|M12 15a3 3 0 100-6 3 3 0 000 6z",
  eyeoff: "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94|M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19|M1 1l22 22",
  alert: "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 8v4|M12 16h.01",
  checkcircle: "M22 11.08V12a10 10 0 11-5.93-9.14|M22 4L12 14.01l-3-3",
  info: "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 16v-4|M12 8h.01",
  grip: "M9 6h.01|M15 6h.01|M9 12h.01|M15 12h.01|M9 18h.01|M15 18h.01",
  globe: "M12 22a10 10 0 100-20 10 10 0 000 20z|M2 12h20|M12 2a15 15 0 010 20 15 15 0 010-20z",
  layers: "M12 2L2 7l10 5 10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5",
  hash: "M4 9h16|M4 15h16|M10 3L8 21|M16 3l-2 18",
  cloud: "M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z",
  zap: "M13 2L3 14h9l-1 8 10-12h-9z",
  back: "M19 12H5|M12 19l-7-7 7-7",
  lock: "M5 11h14v10H5z|M8 11V7a4 4 0 018 0v4",
  badge: "M12 2l2.4 2 3.1-.3 1.1 2.9 2.8 1.4-.8 3 .8 3-2.8 1.4-1.1 2.9-3.1-.3L12 22l-2.4-2-3.1.3-1.1-2.9L2.6 15l.8-3-.8-3 2.8-1.4 1.1-2.9 3.1.3z|M8.5 12l2.5 2.5 4.5-5",
};

function Icon({ name, size = 16 }) {
  const d = UI_ICONS[name];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function withDefaultSocialIcons(existing) {
  const map = new Map(existing.map((icon) => [icon.platform, icon]));
  return SOCIAL_PLATFORMS.map(
    (platform) => map.get(platform) || { id: createId(), platform, url: "", enabled: false }
  );
}

function reorder(items, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((item, i) => ({ ...item, position: i }));
}

/* drag & drop: item ko from se to position par le jao */
function moveItem(items, from, to) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [picked] = next.splice(from, 1);
  next.splice(to, 0, picked);
  return next.map((item, i) => ({ ...item, position: i }));
}

function normalizeUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^(https?:|mailto:|tel:|whatsapp:)/.test(value)) return value;
  return `https://${value}`;
}

const DEVICE_SIZES = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 },
};

/* Phone preview: page notch ke NEECHE se start hota hai (px, scale se pehle).
   CSS mein .pe-statusbar height aur .pe-device-mobile .pe-scale top bhi 36px hai, dono same rakho. */
const MOBILE_NOTCH_H = 36;

const TABS = [
  { key: "profile", label: "Profile", icon: "user" },
  { key: "links", label: "Links", icon: "link" },
  { key: "social", label: "Social icons", icon: "at" },
  { key: "appearance", label: "Appearance", icon: "palette" },
];

const CONFETTI_COLORS = ["#2563eb", "#7c3aed", "#22d3ee", "#f59e0b", "#16a34a", "#ec4899"];

/* ---------- small UI building blocks ---------- */
function Toggle({ checked, onChange, label }) {
  return (
    <label className="pe-toggle" title={label}>
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="pe-toggle-slider" />
    </label>
  );
}

function RowActions({ index, total, onUp, onDown, enabled, onToggle, onDelete }) {
  return (
    <>
      <div className="pe-move">
        <button type="button" className="pe-icon-btn" onClick={() => onUp(index)} disabled={index === 0} aria-label="Move up" title="Move up"><Icon name="up" size={14} /></button>
        <button type="button" className="pe-icon-btn" onClick={() => onDown(index)} disabled={index === total - 1} aria-label="Move down" title="Move down"><Icon name="down" size={14} /></button>
      </div>
      <span className={enabled ? "pe-vis pe-vis-on" : "pe-vis"} title={enabled ? "Visible on page" : "Hidden from page"}>
        <Icon name={enabled ? "eye" : "eyeoff"} size={14} />
      </span>
      <Toggle checked={enabled} onChange={onToggle} label="Show on page" />
      <button type="button" className="pe-icon-btn pe-icon-btn-danger" onClick={onDelete} aria-label="Delete" title="Delete"><Icon name="trash" size={14} /></button>
    </>
  );
}

function SectionHead({ icon, title, hint, aside }) {
  return (
    <div className="pe-section-head">
      <span className="pe-section-icon"><Icon name={icon} size={18} /></span>
      <div className="pe-section-text">
        <h2 className="pe-section-title">{title}</h2>
        <p className="pe-section-hint">{hint}</p>
      </div>
      {aside ? <div className="pe-section-aside">{aside}</div> : null}
    </div>
  );
}

function EmptyState({ icon, title, text, actionLabel, onAction }) {
  return (
    <div className="pe-empty">
      <span className="pe-empty-icon"><Icon name={icon} size={22} /></span>
      <p className="pe-empty-title">{title}</p>
      <p className="pe-empty-text">{text}</p>
      {onAction && (
        <button type="button" className="pe-btn pe-btn-brand" onClick={onAction}>
          <Icon name="plus" size={15} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function ProfileEditor({ initialProfile, backHref = "/dashboard" }) {
  const [profile, setProfile] = useState(() => ({
    username: initialProfile.username || initialProfile.suggestedUsername || "",
    displayName: initialProfile.displayName || "",
    bio: limitWords(initialProfile.bio || "", MAX_BIO_WORDS),
    profileImage: initialProfile.profileImage || "",
    verifiedBadge: Boolean(initialProfile.verifiedBadge),
    categoryTags: initialProfile.categoryTags || [],
    primaryButtons: initialProfile.primaryButtons || [],
    links: (initialProfile.links || []).map((l) => ({ ...l, subtitle: l.subtitle || "" })),
    socialIcons: withDefaultSocialIcons(initialProfile.socialIcons || []),
    theme: { themeId: getTheme(initialProfile.theme).id },
  }));

  const [activeTab, setActiveTab] = useState("profile");
  const [previewMode, setPreviewMode] = useState("mobile");
  const [tagInput, setTagInput] = useState("");
  const [saveStatus, setSaveStatus] = useState(initialProfile.exists ? "saved" : "idle");
  const [usernameStatus, setUsernameStatus] = useState(initialProfile.exists ? "available" : "idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photoOver, setPhotoOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);

  /* ---------- publish state (sirf publish, unpublish nahi) ---------- */
  const [isPublished, setIsPublished] = useState(Boolean(initialProfile.isPublished));
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [showPublishModal, setShowPublishModal] = useState(false);

  /* ---------- toast + confetti ---------- */
  const [toast, setToast] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const toastTimer = useRef(null);

  /* ---------- drag & drop ---------- */
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const saveTimer = useRef(null);
  const usernameTimer = useRef(null);
  const isFirstRender = useRef(true);
  const lastCheckedUsername = useRef(initialProfile.username || initialProfile.suggestedUsername || "");

  /* latest profile + in-flight save, so publish can flush pending changes */
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const savePromise = useRef(null);

  /* ---------- preview sizing ---------- */
  const stageRef = useRef(null);
  const [stageWidth, setStageWidth] = useState(320);
  const [vh, setVh] = useState(800);
  const [now, setNow] = useState("");

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const calc = () => setStageWidth(el.clientWidth || 320);
    calc();
    const observer = new ResizeObserver(calc);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  const device = DEVICE_SIZES[previewMode];

  const maxPhoneW = stageWidth >= 640 ? 340 : 300;
  const byHeight = Math.round((vh * 0.8 * device.width) / device.height);

  const screenW = Math.max(
    previewMode === "mobile"
      ? Math.min(maxPhoneW, stageWidth - 24, Math.max(byHeight, 200))
      : stageWidth - 2,
    120
  );
  const scale = screenW / device.width;
  const screenH = Math.round(device.height * scale);

  const notchH = previewMode === "mobile" ? MOBILE_NOTCH_H : 0;
  const frameH = Math.max(1, Math.round((screenH - notchH) / scale));

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  /* Server se publish state sync */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store", credentials: "same-origin" });
        const data = await res.json();

        if (!cancelled && res.ok && data?.success && data.profile?.isPublished) {
          setIsPublished(true);
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const publicUrl = useMemo(() => `${baseUrl}/${profile.username || "your-username"}`, [baseUrl, profile.username]);
  const shortUrl = publicUrl.replace(/^https?:\/\//, "");

  const canPreview =
    baseUrl && profile.username && usernameStatus !== "invalid" && usernameStatus !== "taken";

  const canPublish =
    Boolean(baseUrl) &&
    Boolean(profile.username) &&
    !["invalid", "taken", "checking"].includes(usernameStatus);

  /* ---------- toast / confetti helpers ---------- */
  function showToast(message, type = "ok") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  function launchConfetti() {
    const pieces = Array.from({ length: 44 }, (_, i) => ({
      id: i,
      left: Math.round(Math.random() * 100),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      dx: Math.round((Math.random() - 0.5) * 240),
      rot: Math.round(360 + Math.random() * 720),
      delay: Math.round(Math.random() * 350),
    }));
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 3200);
  }

  /* ---------- profile strength ---------- */
  const activeLinks = profile.links.filter((l) => l.enabled && l.url.trim()).length;
  const activeButtons = profile.primaryButtons.filter((b) => b.enabled && b.url.trim()).length;
  const activeSocials = profile.socialIcons.filter((s) => s.enabled && s.url.trim()).length;

  const bioWords = countWords(profile.bio);
  const bioLeft = MAX_BIO_WORDS - bioWords;
  const bioPercent = Math.min(100, Math.round((bioWords / MAX_BIO_WORDS) * 100));

  const checklist = [
    { key: "photo", label: "Add a profile photo", done: Boolean(profile.profileImage), tab: "profile" },
    { key: "name", label: "Add your display name", done: Boolean(profile.displayName.trim()), tab: "profile" },
    { key: "bio", label: "Write a short bio", done: profile.bio.trim().length >= 20, tab: "profile" },
    { key: "tags", label: "Add what you do", done: profile.categoryTags.length > 0, tab: "profile" },
    { key: "button", label: "Add a primary button", done: activeButtons > 0, tab: "profile" },
    { key: "link", label: "Add your first link", done: activeLinks > 0, tab: "links" },
    { key: "social", label: "Connect a social icon", done: activeSocials > 0, tab: "social" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const strength = Math.round((doneCount / checklist.length) * 100);
  const nextStep = checklist.find((c) => !c.done);

  /* ---------- username check ---------- */
  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);

    const username = profile.username.trim().toLowerCase();

    if (!username) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }
    if (username.length < 3) {
      setUsernameStatus("invalid");
      setUsernameMessage("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus("invalid");
      setUsernameMessage("Only letters, numbers and underscores allowed.");
      return;
    }
    if (username === lastCheckedUsername.current) {
      setUsernameStatus("available");
      setUsernameMessage("Username available");
      return;
    }

    setUsernameStatus("checking");

    usernameTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/profile/check-username?username=${encodeURIComponent(username)}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setUsernameStatus("invalid");
          setUsernameMessage(data.message || "Could not check username.");
          return;
        }
        if (data.available) {
          setUsernameStatus("available");
          setUsernameMessage("Username available");
        } else {
          setUsernameStatus("taken");
          setUsernameMessage("This username is already taken.");
        }
      } catch {
        setUsernameStatus("invalid");
        setUsernameMessage("Could not check username.");
      }
    }, 500);

    return () => clearTimeout(usernameTimer.current);
  }, [profile.username]);

  /* ---------- save (shared by autosave + publish) ---------- */
  async function doSave() {
    setSaveStatus("saving");

    try {
      const current = profileRef.current;

      const payload = {
        ...current,
        bio: limitWords(current.bio, MAX_BIO_WORDS),
        theme: { themeId: current.theme.themeId },
        links: current.links.map((link, index) => ({ ...link, url: normalizeUrl(link.url), position: index })),
        primaryButtons: current.primaryButtons.map((button, index) => ({ ...button, url: normalizeUrl(button.url), position: index })),
        socialIcons: current.socialIcons.map((social) => ({ ...social, url: normalizeUrl(social.url) })),
      };

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setSaveStatus("error");
        return false;
      }

      lastCheckedUsername.current = data.profile.username;
      setSaveStatus("saved");
      setPreviewLoading(true);
      setPreviewKey((key) => key + 1);
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    }
  }

  async function saveNow() {
    if (saveTimer.current) clearTimeout(saveTimer.current);

    if (savePromise.current) {
      try {
        await savePromise.current;
      } catch {
        /* ignore */
      }
    }

    const promise = doSave();
    savePromise.current = promise;

    const ok = await promise;

    if (savePromise.current === promise) {
      savePromise.current = null;
    }

    return ok;
  }

  /* ---------- autosave ---------- */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!profile.username || ["invalid", "taken", "checking"].includes(usernameStatus)) return;

    setSaveStatus("pending");
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      saveNow();
    }, 700);

    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, usernameStatus]);

  /* ---------- publish ---------- */
  async function handlePublish() {
    if (publishing) return;

    if (!canPublish) {
      setShowPublishModal(false);
      setActiveTab("profile");
      setPublishError("Choose a valid username before publishing.");
      showToast("Choose a valid username first.", "error");
      return;
    }

    setPublishing(true);
    setPublishError("");

    try {
      const saved = await saveNow();

      if (!saved) {
        setPublishError("Could not save your changes. Please try again.");
        return;
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setPublishError(data.message || "Could not publish your page.");
        return;
      }

      setIsPublished(true);
      setShowPublishModal(false);
      setPreviewLoading(true);
      setPreviewKey((key) => key + 1);
      launchConfetti();
      showToast("Published. Your page is live.");
    } catch {
      setPublishError("Could not publish your page. Please check your connection.");
    } finally {
      setPublishing(false);
    }
  }

  function openPublishModal() {
    setPublishError("");
    setShowPublishModal(true);
  }

  function closePublishModal() {
    if (publishing) return;
    setShowPublishModal(false);
  }

  useEffect(() => {
    if (!showPublishModal) return;

    function onKey(e) {
      if (e.key === "Escape" && !publishing) setShowPublishModal(false);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPublishModal, publishing]);

  /* ---------- field helpers ---------- */
  function updateField(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  function updateTheme(themeId) {
    setProfile((prev) => ({ ...prev, theme: { themeId } }));
  }

  function handleBioChange(e) {
    updateField("bio", limitWords(e.target.value, MAX_BIO_WORDS));
  }

  function addTag(value = tagInput) {
    const clean = String(value).trim();
    if (!clean || profile.categoryTags.length >= 5) return;
    if (!profile.categoryTags.includes(clean)) {
      updateField("categoryTags", [...profile.categoryTags, clean]);
    }
    setTagInput("");
  }

  function removeTag(tag) {
    updateField("categoryTags", profile.categoryTags.filter((item) => item !== tag));
  }

  /*
   * Image -> WebP, 100-150KB.
   * Fail hone par null return hota hai.
   */
  async function shrinkImage(file) {
    try {
      const bitmap = await createImageBitmap(file);
      const base = file.name.replace(/\.[^.]+$/, "") || "image";

      const toBlob = (canvas, type, q) =>
        new Promise((resolve) => canvas.toBlob(resolve, type, q));

      let maxSide = 1000;
      let type = "image/webp";
      let blob = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
        canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        let quality = 0.85;
        blob = await toBlob(canvas, type, quality);

        if (type === "image/webp" && (!blob || blob.type !== "image/webp")) {
          type = "image/jpeg";
          blob = await toBlob(canvas, type, quality);
        }

        while (blob && blob.size > TARGET_IMAGE_BYTES && quality > 0.4) {
          quality = Math.round((quality - 0.07) * 100) / 100;
          blob = await toBlob(canvas, type, quality);
        }

        if (blob && blob.size <= TARGET_IMAGE_BYTES) break;

        maxSide = Math.round(maxSide * 0.85);
      }

      bitmap.close?.();

      if (!blob) return null;

      const ext = type === "image/webp" ? "webp" : "jpg";
      return new File([blob], `${base}.${ext}`, { type });
    } catch {
      return null;
    }
  }

  /* file input aur drag-drop dono yahi use karte hain */
  async function processImageFile(original) {
    if (!original) return;

    if (!ALLOWED_IMAGE_TYPES.includes(original.type)) {
      showToast("Only JPG, PNG and WEBP images are allowed.", "error");
      return;
    }

    if (original.size > MAX_UPLOAD_BYTES) {
      showToast("Image must be smaller than 5MB.", "error");
      return;
    }

    setUploading(true);
    try {
      const file = await shrinkImage(original);

      if (!file) {
        showToast("Could not process this image. Try another one.", "error");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", { method: "POST", body: formData });

      let data = null;
      try {
        data = await response.json();
      } catch {
        /* server returned non-JSON */
      }

      if (!response.ok || !data?.success) {
        showToast(data?.message || `Upload failed (server error ${response.status}).`, "error");
        return;
      }

      updateField("profileImage", data.url);
      showToast("Photo uploaded.");
    } catch {
      showToast("Upload failed. Check your connection and try again.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleImageChange(event) {
    const input = event.target;
    const original = input.files?.[0];
    await processImageFile(original);
    input.value = "";
  }

  function handlePhotoDrop(e) {
    e.preventDefault();
    setPhotoOver(false);
    if (uploading) return;
    processImageFile(e.dataTransfer.files?.[0]);
  }

  /* ---------- drag & drop reorder ---------- */
  function endDrag() {
    dragRef.current = null;
    setDragging(null);
    setDragOver(null);
  }

  function gripProps(type, index) {
    return {
      draggable: true,
      onDragStart: (e) => {
        dragRef.current = { type, index };
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
        const card = e.currentTarget.closest("[data-drag-card]");
        if (card) e.dataTransfer.setDragImage(card, 20, 20);
        setDragging(`${type}:${index}`);
      },
      onDragEnd: endDrag,
    };
  }

  function dropProps(type, index) {
    return {
      "data-drag-card": true,
      onDragOver: (e) => {
        if (dragRef.current?.type !== type) return;
        e.preventDefault();
        setDragOver(`${type}:${index}`);
      },
      onDrop: (e) => {
        e.preventDefault();
        const drag = dragRef.current;
        if (!drag || drag.type !== type) return;

        const field = type === "link" ? "links" : "primaryButtons";
        setProfile((prev) => ({ ...prev, [field]: moveItem(prev[field], drag.index, index) }));
        endDrag();
      },
    };
  }

  function dragClass(base, type, index) {
    const key = `${type}:${index}`;
    return [base, dragging === key ? "pe-dragging" : "", dragOver === key && dragging !== key ? "pe-drop-over" : ""]
      .filter(Boolean)
      .join(" ");
  }

  /* buttons */
  function addButton() {
    updateField("primaryButtons", [
      ...profile.primaryButtons,
      { id: createId(), label: "New button", url: "", enabled: true, position: profile.primaryButtons.length },
    ]);
  }
  const updateButton = (id, patch) =>
    updateField("primaryButtons", profile.primaryButtons.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const deleteButton = (id) =>
    updateField("primaryButtons", profile.primaryButtons.filter((b) => b.id !== id));
  const moveButton = (index, dir) =>
    updateField("primaryButtons", reorder(profile.primaryButtons, index, dir));

  /* links */
  function addLink(platform = null) {
    const meta = platform ? SOCIAL_META[platform] : null;
    updateField("links", [
      ...profile.links,
      {
        id: createId(),
        title: meta ? meta.label : "New link",
        subtitle: "",
        url: "",
        icon: platform || "",
        enabled: true,
        position: profile.links.length,
      },
    ]);
  }
  const updateLink = (id, patch) =>
    updateField("links", profile.links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const deleteLink = (id) => updateField("links", profile.links.filter((l) => l.id !== id));
  const moveLink = (index, dir) => updateField("links", reorder(profile.links, index, dir));

  /* social icons */
  function updateSocialIcon(platform, patch) {
    updateField(
      "socialIcons",
      profile.socialIcons.map((icon) => {
        if (icon.platform !== platform) return icon;
        const next = { ...icon, ...patch };
        if (patch.url !== undefined) {
          next.enabled = String(patch.url).trim() ? true : false;
        }
        return next;
      })
    );
  }

  /* Copy / Share: page publish nahi hai toh popup */
  async function handleCopyLink() {
    if (!isPublished) {
      openPublishModal();
      return;
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      showToast("Link copied.");
    } catch {
      setCopied(false);
      showToast("Could not copy the link.", "error");
    }
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleShare() {
    if (!isPublished) {
      openPublishModal();
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ url: publicUrl, title: profile.displayName || profile.username });
      } catch {
        /* cancelled */
      }
    } else {
      handleCopyLink();
    }
  }

  function reloadPreview() {
    setPreviewLoading(true);
    setPreviewKey((k) => k + 1);
  }

  function switchMode(mode) {
    if (mode === previewMode) return;
    setPreviewLoading(true);
    setPreviewMode(mode);
  }

  const fullName = (profile.displayName || profile.username || "there").trim();

  const statusLabel = {
    saving: "Saving…",
    saved: "All changes saved",
    error: "Save failed",
    pending: "Editing…",
  }[saveStatus];

  const tabCount = {
    profile: activeButtons || null,
    links: profile.links.length || null,
    social: activeSocials || null,
    appearance: null,
  };

  const tabIndex = Math.max(0, TABS.findIndex((t) => t.key === activeTab));

  const availableSuggestions = TAG_SUGGESTIONS.filter((t) => !profile.categoryTags.includes(t)).slice(0, 5);

  return (
    <div className={`pe-wrapper pe-wrapper-${previewMode}`}>
      <Link href={backHref} className="pe-backlink pe-backlink-top">
        <Icon name="back" size={15} />
        Back
      </Link>

      {/* ============ LEFT ============ */}
      <div className="pe-main">
        <header className="pe-greet">
          <div className="pe-greet-left">
            <div>
              <Link href={backHref} className="pe-backlink pe-backlink-inline">
                <Icon name="back" size={15} />
                Back
              </Link>
              <h1>Hi, <span>{fullName}</span></h1>
              <p>
                {isPublished
                  ? "Your page is live. Every change you make updates it automatically."
                  : "Build your page here. Changes save automatically and only you can see them until you publish."}
              </p>
            </div>
          </div>

          <div className="pe-greet-right">
            <span className={`pe-pill pe-pill-light pe-pill-${saveStatus}`}>
              <Icon name={saveStatus === "error" ? "alert" : saveStatus === "saved" ? "cloud" : "refresh"} size={13} />
              {statusLabel || "Ready"}
            </span>
          </div>
        </header>

        {/* ---------- PUBLISH BAR ---------- */}
        <section className={isPublished ? "pe-publish-bar pe-publish-bar-live" : "pe-publish-bar"}>
          <div className="pe-publish-bar-text">
            <b>{isPublished ? "Your page is live" : "Your page is not live yet"}</b>
            <span>
              {publishError
                ? publishError
                : isPublished
                ? "Anyone with your link can see your page and store."
                : "Only you can see this page. Publish to make your page and store public."}
            </span>
          </div>

          <div className="pe-publish-bar-actions">
            {isPublished ? (
              canPreview && (
                <a className="pe-btn pe-btn-outline" href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <Icon name="external" size={15} />
                  View live page
                </a>
              )
            ) : (
              <button
                type="button"
                className="pe-btn pe-btn-publish"
                onClick={handlePublish}
                disabled={publishing}
              >
                <Icon name="globe" size={15} />
                {publishing ? "Publishing…" : "Publish page"}
              </button>
            )}
          </div>
        </section>

        {/* ---------- HERO ---------- */}
        <section className="pe-hero">
          <div className="pe-hero-grid">
            <div className="pe-hero-left">
              <p className="pe-hero-label"><Icon name="globe" size={13} /> Your public link</p>
              <p className={isPublished ? "pe-hero-url" : "pe-hero-url pe-hero-url-draft"}>{shortUrl}</p>

              <div className="pe-hero-actions">
                <button
                  type="button"
                  className={[
                    "pe-hero-btn pe-hero-btn-solid",
                    !isPublished ? "pe-locked" : "",
                    copied ? "pe-copied" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={handleCopyLink}
                >
                  <Icon name={!isPublished ? "lock" : copied ? "check" : "copy"} size={15} />
                  {copied ? "Link copied" : "Copy link"}
                </button>

                <button
                  type="button"
                  className={isPublished ? "pe-hero-btn" : "pe-hero-btn pe-locked"}
                  onClick={handleShare}
                >
                  <Icon name={isPublished ? "share" : "lock"} size={15} />
                  Share
                </button>

                {canPreview &&
                  (isPublished ? (
                    <a className="pe-hero-btn" href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <Icon name="external" size={15} />
                      Open page
                    </a>
                  ) : (
                    <button type="button" className="pe-hero-btn pe-locked" onClick={openPublishModal}>
                      <Icon name="lock" size={15} />
                      Open page
                    </button>
                  ))}
              </div>
            </div>

            <div className="pe-hero-stats">
              <div className="pe-stat">
                <span className="pe-stat-icon"><Icon name="link" size={15} /></span>
                <b>{activeLinks}</b>
                <small>Live links</small>
              </div>
              <div className="pe-stat">
                <span className="pe-stat-icon"><Icon name="pointer" size={15} /></span>
                <b>{activeButtons}</b>
                <small>Buttons</small>
              </div>
              <div className="pe-stat">
                <span className="pe-stat-icon"><Icon name="at" size={15} /></span>
                <b>{activeSocials}</b>
                <small>Socials</small>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- PROFILE STRENGTH ---------- */}
        <section className="pe-strength">
          <div className={strength === 100 ? "pe-ring pe-ring-full" : "pe-ring"} style={{ "--p": strength }}>
            <span>{strength}%</span>
          </div>

          <div className="pe-strength-body">
            <p className="pe-strength-title">
              {strength === 100 ? "Your page is complete" : "Make your page stand out"}
            </p>
            <p className="pe-strength-text">
              {strength === 100
                ? "Everything is filled in. Share your link and start getting visits."
                : `${doneCount} of ${checklist.length} steps done. Next: ${nextStep.label.toLowerCase()}.`}
            </p>

            <div className="pe-checklist">
              {checklist.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={item.done ? "pe-check pe-check-done" : "pe-check"}
                  onClick={() => setActiveTab(item.tab)}
                  title={item.label}
                >
                  <Icon name={item.done ? "checkcircle" : "plus"} size={13} />
                  {item.label.replace(/^Add (a |your )?|^Write a |^Connect a /, "")}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- EDITOR ---------- */}
        <section className="pe-card pe-editor">
          <div className="pe-tabs" role="tablist">
            <span className={`pe-tab-indicator pe-tab-at-${tabIndex}`} />
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={activeTab === tab.key ? "pe-tab pe-tab-active" : "pe-tab"}
                onClick={() => setActiveTab(tab.key)}
                title={tab.label}
              >
                <Icon name={tab.icon} size={15} />
                <span className="pe-tab-label">{tab.label}</span>
                {tabCount[tab.key] ? <em className="pe-tab-count">{tabCount[tab.key]}</em> : null}
              </button>
            ))}
          </div>

          {/* ---------- PROFILE ---------- */}
          {activeTab === "profile" && (
            <div className="pe-panel" key="tab-profile">
              <section className="pe-section">
                <SectionHead
                  icon="user"
                  title="Profile information"
                  hint="These details are visible on your page."
                />

                <div
                  className={photoOver ? "pe-photo-row pe-photo-row-over" : "pe-photo-row"}
                  onDragOver={(e) => {
                    if (e.dataTransfer?.types?.includes("Files")) {
                      e.preventDefault();
                      setPhotoOver(true);
                    }
                  }}
                  onDragLeave={() => setPhotoOver(false)}
                  onDrop={handlePhotoDrop}
                >
                  <div className="pe-photo-wrap">
                    <div className="pe-photo-preview">
                      {profile.profileImage ? (
                        <img src={profile.profileImage} alt="Profile" />
                      ) : (
                        <div className="pe-photo-placeholder">
                          <Icon name="image" size={26} />
                          <span>No photo</span>
                        </div>
                      )}
                      {uploading && <div className="pe-photo-loading"><i className="pe-spin" /></div>}
                    </div>
                    <label className="pe-photo-cam" title="Change photo">
                      <Icon name="camera" size={14} />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        disabled={uploading}
                        hidden
                      />
                    </label>
                  </div>

                  <div className="pe-photo-info">
                    <p className="pe-photo-title">Cover photo</p>
                    <div className="pe-photo-btns">
                      <label className="pe-btn pe-btn-outline">
                        <Icon name="upload" size={15} />
                        {uploading ? "Uploading…" : profile.profileImage ? "Change photo" : "Upload photo"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageChange}
                          disabled={uploading}
                          hidden
                        />
                      </label>
                      {profile.profileImage && (
                        <button type="button" className="pe-btn pe-btn-ghost-danger" onClick={() => updateField("profileImage", "")}>
                          <Icon name="trash" size={14} />
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="pe-hint"><Icon name="info" size={12} /> Shown at the top of your page. Drag a photo here or upload. JPG, PNG or WEBP, up to 5 MB.</p>
                  </div>
                </div>

                <div className="pe-grid-2">
                  <label className="pe-field">
                    <span className="pe-label">Display name</span>
                    <div className="pe-input-icon">
                      <Icon name="user" size={15} />
                      <input type="text" value={profile.displayName} maxLength={60} placeholder="Your name or brand"
                        onChange={(e) => updateField("displayName", e.target.value)} />
                    </div>
                  </label>

                  <label className="pe-field">
                    <span className="pe-label">Username (URL)</span>
                    <div className={`pe-username-row pe-ur-${usernameStatus}`}>
                      <span className="pe-username-prefix">{baseUrl.replace(/^https?:\/\//, "")}/</span>
                      <input
                        type="text"
                        value={profile.username}
                        placeholder="your-username"
                        onChange={(e) =>
                          updateField("username", e.target.value.toLowerCase().replace(/\s+/g, ""))
                        }
                      />
                      <span className={`pe-username-icon pe-status-${usernameStatus}`}>
                        {usernameStatus === "checking" && <i className="pe-spin pe-spin-sm" />}
                        {usernameStatus === "available" && <Icon name="checkcircle" size={16} />}
                        {(usernameStatus === "taken" || usernameStatus === "invalid") && <Icon name="alert" size={16} />}
                      </span>
                    </div>
                    {usernameMessage && (
                      <span className={`pe-username-status pe-status-${usernameStatus}`}>
                        {usernameStatus === "checking" ? "Checking…" : usernameMessage}
                      </span>
                    )}
                  </label>
                </div>

                <label className="pe-field pe-bio-box">
                  <span className="pe-label">Bio</span>
                  <textarea
                    value={profile.bio}
                    maxLength={MAX_BIO_CHARS}
                    rows={3}
                    placeholder="Tell visitors who you are and what you do."
                    onChange={handleBioChange}
                  />
                  <div className="pe-bio-meter">
                    <span
                      className={
                        bioLeft <= 0
                          ? "pe-bio-ring pe-bio-ring-full"
                          : bioLeft <= 10
                          ? "pe-bio-ring pe-bio-ring-warn"
                          : "pe-bio-ring"
                      }
                      style={{ "--p": bioPercent }}
                    />
                    <span className={bioLeft <= 0 ? "pe-bio-left pe-bio-left-full" : "pe-bio-left"}>
                      <b>{bioWords}</b> / {MAX_BIO_WORDS} words
                      {bioLeft <= 0 ? " (limit reached)" : ""}
                    </span>
                  </div>
                </label>
              </section>

              <section className="pe-section">
                <SectionHead
                  icon="badge"
                  title="Badges"
                  hint="Small highlights shown next to your name."
                />

                <div className="pe-opt">
                  <div className="pe-opt-text">
                    <b>Verified badge</b>
                    <span>Show a blue tick next to your name.</span>
                  </div>
                  <Toggle
                    checked={profile.verifiedBadge}
                    onChange={(v) => updateField("verifiedBadge", v)}
                    label="Verified badge"
                  />
                </div>
              </section>

              <section className="pe-section">
                <SectionHead
                  icon="tag"
                  title="What you do"
                  hint="Add up to 5 short labels. They show under your name like: WEB DEVELOPER | CREATOR"
                  aside={<span className="pe-counter">{profile.categoryTags.length}/5</span>}
                />

                <div className="pe-tags">
                  {profile.categoryTags.map((tag) => (
                    <span key={tag} className="pe-tag">
                      <Icon name="hash" size={12} />
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                        <Icon name="x" size={12} />
                      </button>
                    </span>
                  ))}

                  {profile.categoryTags.length < 5 && (
                    <input
                      className="pe-tag-input"
                      value={tagInput}
                      placeholder="+ Type what you do, press Enter"
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      onBlur={() => addTag()}
                    />
                  )}
                </div>

                {profile.categoryTags.length < 5 && availableSuggestions.length > 0 && (
                  <div className="pe-tag-suggest">
                    {availableSuggestions.map((tag) => (
                      <button key={tag} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addTag(tag)}>
                        + {tag}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="pe-section">
                <SectionHead
                  icon="pointer"
                  title="Extra buttons"
                  hint="Shown below the “Visit My Store” button. Drag the handle to reorder."
                />

                {profile.primaryButtons.length === 0 && (
                  <EmptyState
                    icon="pointer"
                    title="No extra buttons yet"
                    text="Add another call to action, like “Book a call” or “Join my community”."
                    actionLabel="Add your first button"
                    onAction={addButton}
                  />
                )}

                {profile.primaryButtons.map((button, index) => (
                  <div
                    key={button.id}
                    className={dragClass(
                      button.enabled ? "pe-row pe-button-editor-row" : "pe-row pe-button-editor-row pe-off",
                      "button",
                      index
                    )}
                    {...dropProps("button", index)}
                  >
                    <span className="pe-grip" title="Drag to reorder" {...gripProps("button", index)}>
                      <Icon name="grip" size={16} />
                    </span>
                    <span className="pe-row-badge"><Icon name="pointer" size={15} /></span>
                    <input className="pe-row-input" value={button.label} placeholder="Button label"
                      onChange={(e) => updateButton(button.id, { label: e.target.value })} />
                    <input className="pe-row-input" value={button.url} placeholder="https://"
                      onChange={(e) => updateButton(button.id, { url: e.target.value })} />
                    <RowActions
                      index={index}
                      total={profile.primaryButtons.length}
                      onUp={(i) => moveButton(i, -1)}
                      onDown={(i) => moveButton(i, 1)}
                      enabled={button.enabled}
                      onToggle={(v) => updateButton(button.id, { enabled: v })}
                      onDelete={() => deleteButton(button.id)}
                    />
                  </div>
                ))}

                {profile.primaryButtons.length > 0 && (
                  <button type="button" className="pe-btn pe-btn-outline" onClick={addButton}>
                    <Icon name="plus" size={15} />
                    Add button
                  </button>
                )}
              </section>
            </div>
          )}

          {/* ---------- LINKS ---------- */}
          {activeTab === "links" && (
            <div className="pe-panel" key="tab-links">
              <section className="pe-section">
                <SectionHead
                  icon="link"
                  title="Links"
                  hint="Add any link, or quickly add a social profile. Drag the handle to reorder."
                  aside={<span className="pe-counter">{profile.links.length} total</span>}
                />

                <p className="pe-quick-title"><Icon name="zap" size={13} /> Quick add</p>
                <div className="pe-quick">
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <button key={platform} type="button" className="pe-quick-btn" onClick={() => addLink(platform)}>
                      <span style={{ color: SOCIAL_META[platform].color }} className="pe-quick-icon">
                        <SocialIcon platform={platform} size={16} />
                      </span>
                      {SOCIAL_META[platform].label}
                      <Icon name="plus" size={12} />
                    </button>
                  ))}
                </div>

                {profile.links.length === 0 && (
                  <EmptyState
                    icon="link"
                    title="No links yet"
                    text="Pick a platform above, or add a custom link to your store, portfolio or latest video."
                    actionLabel="Add a custom link"
                    onAction={() => addLink()}
                  />
                )}

                <div className="pe-links-list">
                  {profile.links.map((link, index) => {
                    const isPlatform = SOCIAL_PLATFORMS.includes(link.icon);
                    const missingUrl = !link.url.trim();
                    return (
                      <div
                        key={link.id}
                        className={dragClass(link.enabled ? "pe-link-card" : "pe-link-card pe-off", "link", index)}
                        {...dropProps("link", index)}
                      >
                        <span className="pe-grip" title="Drag to reorder" {...gripProps("link", index)}>
                          <Icon name="grip" size={16} />
                        </span>

                        <span
                          className="pe-link-badge"
                          style={isPlatform ? { color: SOCIAL_META[link.icon].color } : undefined}
                        >
                          {isPlatform ? (
                            <SocialIcon platform={link.icon} size={20} />
                          ) : link.icon ? (
                            <span className="pe-link-badge-text">{link.icon}</span>
                          ) : (
                            <Icon name="link" size={18} />
                          )}
                        </span>

                        <div className="pe-link-fields">
                          <div className="pe-link-field-title">
                            <input className="pe-row-input" value={link.title} placeholder="Title"
                              onChange={(e) => updateLink(link.id, { title: e.target.value })} />
                          </div>
                          <div className="pe-link-field-url">
                            <input className="pe-row-input" value={link.url} placeholder="https://"
                              onChange={(e) => updateLink(link.id, { url: e.target.value })} />
                          </div>
                          <div className="pe-link-field-title">
                            <input className="pe-row-input" value={link.subtitle || ""} maxLength={MAX_SUBTITLE_CHARS}
                              placeholder="Subtitle (optional)"
                              onChange={(e) => updateLink(link.id, { subtitle: e.target.value })} />
                          </div>
                          <select
                            className="pe-row-input pe-select"
                            value={isPlatform ? link.icon : ""}
                            onChange={(e) => updateLink(link.id, { icon: e.target.value })}
                            aria-label="Icon"
                          >
                            <option value="">{link.icon && !isPlatform ? `Custom (${link.icon})` : "Default icon"}</option>
                            {SOCIAL_PLATFORMS.map((p) => (
                              <option key={p} value={p}>{SOCIAL_META[p].label}</option>
                            ))}
                          </select>

                          {missingUrl && link.enabled && (
                            <span className="pe-warn"><Icon name="alert" size={12} /> Add a URL, otherwise this link stays hidden.</span>
                          )}
                        </div>

                        <div className="pe-link-actions">
                          {!missingUrl && (
                            <a className="pe-icon-btn" href={normalizeUrl(link.url)} target="_blank" rel="noopener noreferrer" title="Test link" aria-label="Test link">
                              <Icon name="external" size={14} />
                            </a>
                          )}
                          <RowActions
                            index={index}
                            total={profile.links.length}
                            onUp={(i) => moveLink(i, -1)}
                            onDown={(i) => moveLink(i, 1)}
                            enabled={link.enabled}
                            onToggle={(v) => updateLink(link.id, { enabled: v })}
                            onDelete={() => deleteLink(link.id)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {profile.links.length > 0 && (
                  <button type="button" className="pe-btn pe-btn-outline" onClick={() => addLink()}>
                    <Icon name="plus" size={15} />
                    Add link
                  </button>
                )}
              </section>
            </div>
          )}

          {/* ---------- SOCIAL ---------- */}
          {activeTab === "social" && (
            <div className="pe-panel" key="tab-social">
              <section className="pe-section">
                <SectionHead
                  icon="at"
                  title="Social icons"
                  hint="Add a profile URL to show its icon on your public page."
                  aside={<span className="pe-counter">{activeSocials}/{SOCIAL_PLATFORMS.length} live</span>}
                />

                <div className="pe-social-list">
                  {profile.socialIcons.map((icon) => {
                    const meta = SOCIAL_META[icon.platform];
                    const hasUrl = icon.url.trim() !== "";

                    return (
                      <div key={icon.platform} className={hasUrl && icon.enabled ? "pe-social-editor pe-social-live" : "pe-social-editor"}>
                        <span className="pe-social-badge" style={{ color: meta.color }}>
                          <SocialIcon platform={icon.platform} />
                        </span>
                        <span className="pe-social-label">{meta.label}</span>
                        <input className="pe-row-input" value={icon.url} placeholder={`${meta.label} profile URL`}
                          onChange={(e) => updateSocialIcon(icon.platform, { url: e.target.value })} />
                        {hasUrl ? (
                          <Toggle checked={icon.enabled} label="Show on page"
                            onChange={(v) => updateSocialIcon(icon.platform, { enabled: v })} />
                        ) : (
                          <span className="pe-social-hint"><Icon name="eyeoff" size={13} /></span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="pe-tip"><Icon name="sparkle" size={14} /> Icons appear on your page in the same order as this list.</p>
              </section>
            </div>
          )}

          {/* ---------- APPEARANCE ---------- */}
          {activeTab === "appearance" && (
            <div className="pe-panel" key="tab-appearance">
              <section className="pe-section">
                <SectionHead
                  icon="layers"
                  title="Theme"
                  hint="Each theme sets your page background, button style and accent color. It also applies to your store."
                  aside={<span className="pe-counter">{PROFILE_THEMES.length} themes</span>}
                />

                <div className="pe-themes">
                  {PROFILE_THEMES.map((t) => {
                    const active = profile.theme.themeId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={active ? "pe-theme pe-theme-active" : "pe-theme"}
                        onClick={() => updateTheme(t.id)}
                      >
                        <span className="pe-theme-art" style={{ background: t.bgCss }}>
                          <i
                            className="pe-theme-avatar"
                            style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})` }}
                          />
                          <i
                            className="pe-theme-line"
                            style={{ background: t.dark ? "rgba(255,255,255,0.35)" : "#cbd5e1" }}
                          />
                          <b
                            className="pe-theme-btn"
                            style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})` }}
                          />
                          {active && (
                            <span className="pe-theme-check"><Icon name="check" size={11} /></span>
                          )}
                        </span>
                        <span className="pe-theme-name">{t.name}</span>
                        <span className="pe-theme-vibe">{t.vibe}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="pe-tip"><Icon name="sparkle" size={14} /> Changes show up instantly in the live preview.</p>
              </section>
            </div>
          )}
        </section>
      </div>

      {/* ============ RIGHT: LIVE PREVIEW ============ */}
      <aside className="pe-side">
        <div className="pe-side-inner">
          <div className="pe-side-head">
            <div className="pe-side-title">
              <div>
                <h2>Your page right now</h2>
                <p>Updates automatically as you edit.</p>
                {!isPublished && (
                  <span className="pe-draft-badge">
                    <Icon name="eyeoff" size={11} />
                    Draft preview, not live
                  </span>
                )}
              </div>
            </div>

            <div className="pe-side-tools">
              <button type="button" className="pe-icon-btn pe-icon-btn-spin" onClick={reloadPreview} aria-label="Reload preview" title="Reload preview">
                <Icon name="refresh" size={14} />
              </button>
              {canPreview &&
                (isPublished ? (
                  <a className="pe-icon-btn" href={publicUrl} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab" title="Open in new tab">
                    <Icon name="external" size={14} />
                  </a>
                ) : (
                  <button type="button" className="pe-icon-btn pe-locked" onClick={openPublishModal} aria-label="Publish to open page" title="Publish to open page">
                    <Icon name="lock" size={14} />
                  </button>
                ))}
            </div>
          </div>

          <div className="pe-seg" role="tablist">
            <span className={previewMode === "mobile" ? "pe-seg-pill" : "pe-seg-pill pe-seg-pill-desktop"} />
            <button type="button" className={previewMode === "mobile" ? "pe-seg-active" : ""} onClick={() => switchMode("mobile")}>
              <Icon name="phone" size={14} /> Mobile
            </button>
            <button type="button" className={previewMode === "desktop" ? "pe-seg-active" : ""} onClick={() => switchMode("desktop")}>
              <Icon name="monitor" size={14} /> Desktop
            </button>
          </div>

          <div className="pe-stage" ref={stageRef}>
            <div
              className={`pe-device pe-device-${previewMode}`}
              style={{ width: previewMode === "mobile" ? screenW + 24 : screenW + 2 }}
            >
              {previewMode === "desktop" && (
                <div className="pe-browser-bar">
                  <span className="pe-dots"><i /><i /><i /></span>
                  <span className="pe-url"><Icon name="globe" size={11} />{shortUrl}</span>
                </div>
              )}

              {previewMode === "mobile" && <span className="pe-notch" />}

              <div className="pe-screen" style={{ width: screenW, height: screenH }}>
                {previewMode === "mobile" && (
                  <div className="pe-statusbar" aria-hidden="true">
                    <span className="pe-status-time">{now}</span>
                    <span className="pe-status-icons">
                      <svg viewBox="0 0 18 12" width="16" height="11" fill="currentColor">
                        <rect x="0" y="8" width="3" height="4" rx="1" />
                        <rect x="5" y="5" width="3" height="7" rx="1" />
                        <rect x="10" y="2" width="3" height="10" rx="1" />
                        <rect x="15" y="0" width="3" height="12" rx="1" />
                      </svg>
                      <svg viewBox="0 0 26 12" width="24" height="11" fill="none">
                        <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity=".4" />
                        <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
                        <rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" />
                      </svg>
                    </span>
                  </div>
                )}

                {canPreview ? (
                  <>
                    {previewLoading && (
                      <div className="pe-preview-msg">
                        <i className="pe-spin" />
                        Loading preview…
                      </div>
                    )}

                    <div
                      className="pe-scale"
                      style={{ width: device.width, height: frameH, transform: `scale(${scale})` }}
                    >
                      <iframe
                        key={`${previewKey}-${previewMode}`}
                        src={publicUrl}
                        title="Live profile preview"
                        className="pe-iframe"
                        style={{ width: device.width, height: frameH }}
                        onLoad={(e) => {
                          setPreviewLoading(false);
                          try {
                            const doc = e.target.contentDocument;
                            if (doc && !doc.getElementById("pe-hide-scrollbar")) {
                              const style = doc.createElement("style");
                              style.id = "pe-hide-scrollbar";
                              style.textContent =
                                "html{scrollbar-width:none}::-webkit-scrollbar{width:0;height:0}";
                              doc.head.appendChild(style);
                            }
                          } catch {
                            /* cross-origin: ignore */
                          }
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="pe-preview-msg">
                    <Icon name="eye" size={22} />
                    Choose a valid username to see your live preview.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ============ PUBLISH REQUIRED POPUP ============ */}
      {showPublishModal && (
        <div className="pe-modal-overlay" onClick={closePublishModal} role="presentation">
          <div
            className="pe-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pe-publish-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="pe-modal-icon"><Icon name="lock" size={24} /></span>

            <h3 id="pe-publish-modal-title">Publish your page first</h3>
            <p>Your page is not live yet. Publish it to open and share your link.</p>

            {publishError && (
              <p className="pe-modal-error">{publishError}</p>
            )}

            <div className="pe-modal-actions">
              <button type="button" className="pe-btn pe-btn-outline" onClick={closePublishModal} disabled={publishing}>
                Cancel
              </button>
              <button type="button" className="pe-btn pe-btn-publish" onClick={handlePublish} disabled={publishing}>
                <Icon name="globe" size={15} />
                {publishing ? "Publishing…" : "Publish now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ TOAST ============ */}
      {toast && (
        <div role="status" className={`pe-toast pe-toast-${toast.type}`}>
          <Icon name={toast.type === "error" ? "alert" : "checkcircle"} size={16} />
          {toast.message}
        </div>
      )}

      {/* ============ CONFETTI ============ */}
      {confetti.length > 0 && (
        <div className="pe-confetti" aria-hidden="true">
          {confetti.map((p) => (
            <i
              key={p.id}
              style={{
                left: `${p.left}%`,
                background: p.color,
                animationDelay: `${p.delay}ms`,
                "--dx": `${p.dx}px`,
                "--rot": `${p.rot}deg`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}