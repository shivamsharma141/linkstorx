"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { getTheme, buildThemeVars } from "@/app/lib/theme/profileThemes";

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

/* bg = icon square, tint = card tint + arrow color, sub = default subtitle */
const LINK_META = {
  instagram: {
    bg: "linear-gradient(135deg, #FEDA75 0%, #FA7E1E 35%, #D62976 60%, #962FBF 85%, #4F5BD5 100%)",
    tint: "#f0643c",
    sub: "Follow my journey",
  },
  youtube: { bg: "#FF0000", tint: "#FF0000", sub: "Watch my content" },
  linkedin: { bg: "#0A66C2", tint: "#0A66C2", sub: "Let's connect professionally" },
  whatsapp: { bg: "#25D366", tint: "#25D366", sub: "Let's chat" },
  x: { bg: "#000000", tint: "#475569", sub: "Follow me on X" },
  facebook: { bg: "#1877F2", tint: "#1877F2", sub: "Connect on Facebook" },
  telegram: { bg: "#229ED9", tint: "#229ED9", sub: "Message me on Telegram" },
  website: { bg: "#eef0f4", tint: "#94a3b8", sub: "Explore my work" },
};

const LINKS_PREVIEW_COUNT = 5;

const SOCIAL_PATHS = {
  youtube:
    "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",

  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",

  whatsapp:
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.198.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884",

  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",

  facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",

  telegram:
    "M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
};

const INSTAGRAM_MONO_PATH =
  "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.012-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z";

/* ---------- small stroke icons ---------- */
const ICONS = {
  link: "M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5|M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5",
  bag: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z|M3 6h18|M16 10a4 4 0 01-8 0",
  calendar: "M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z|M16 2v4|M8 2v4|M3 10h18",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2|M12 11a4 4 0 100-8 4 4 0 000 8z",
  mail: "M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z|M22 6l-10 7L2 6",
  store: "M3 9l1.5-5h15L21 9|M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0|M5 12v8h14v-8|M10 20v-5h4v5",
  share: "M18 8a3 3 0 100-6 3 3 0 000 6z|M6 15a3 3 0 100-6 3 3 0 000 6z|M18 22a3 3 0 100-6 3 3 0 000 6z|M8.6 13.5l6.8 4|M15.4 6.5l-6.8 4",
  arrow: "M5 12h14|M12 5l7 7-7 7",
  chevron: "M9 18l6-6-6-6",
  copy: "M9 9h11v11H9z|M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1",
};

function Ico({ name, size = 18, stroke = 2 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name].split("|").map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <svg
      className="pub-verified"
      viewBox="0 0 24 24"
      width="28"
      height="28"
      aria-label="Verified"
      role="img"
    >
      <path
        fill="#1d9bf0"
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.8c.67 1.31 1.91 2.2 3.34 2.2s2.67-.89 3.33-2.2c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.2-1.91 2.2-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
      />
    </svg>
  );
}

function SocialIcon({ platform, size = 22, mono = false }) {
  if (platform === "instagram") {
    if (mono) {
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="#fff">
          <path d={INSTAGRAM_MONO_PATH} />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <defs>
          <linearGradient id="ls-ig" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#FEDA75" />
            <stop offset="35%" stopColor="#FA7E1E" />
            <stop offset="60%" stopColor="#D62976" />
            <stop offset="85%" stopColor="#962FBF" />
            <stop offset="100%" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>

        <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" fill="none" stroke="url(#ls-ig)" strokeWidth="2.1" />
        <circle cx="12" cy="12" r="4.4" fill="none" stroke="url(#ls-ig)" strokeWidth="2.1" />
        <circle cx="17.1" cy="6.9" r="1.35" fill="url(#ls-ig)" />
      </svg>
    );
  }

  if (platform === "website") {
    return <Ico name="link" size={size} />;
  }

  if (!SOCIAL_PATHS[platform]) return null;

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d={SOCIAL_PATHS[platform]} />
    </svg>
  );
}

function LinkBadge({ icon }) {
  const meta = LINK_META[icon];

  if (meta && icon !== "website") {
    return (
      <span className="pub-link-badge" style={{ background: meta.bg }}>
        <SocialIcon platform={icon} size={26} mono={icon === "instagram"} />
      </span>
    );
  }

  if (icon && !meta) {
    return <span className="pub-link-badge pub-link-badge-plain pub-link-emoji">{icon}</span>;
  }

  return (
    <span className="pub-link-badge pub-link-badge-plain">
      <Ico name="link" size={24} />
    </span>
  );
}

function normalizeUrl(url) {
  const value = String(url || "").trim();

  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("whatsapp:")
  ) {
    return value;
  }

  return `https://${value}`;
}

function getProductImage(product) {
  if (!product) return null;

  const direct =
    product.image ||
    product.imageUrl ||
    product.imageURL ||
    product.thumbnail ||
    product.thumbnailUrl ||
    product.photo ||
    product.photoUrl ||
    product.picture ||
    product.coverImage ||
    product.mainImage ||
    null;

  if (direct) return direct;

  const arrays = [product.images, product.photos, product.pictures, product.gallery, product.media];

  for (const arr of arrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        return first.url || first.src || first.image || null;
      }
    }
  }

  return null;
}

function getProductDescription(product) {
  if (!product) return null;

  return (
    product.description ||
    product.shortDescription ||
    product.desc ||
    product.summary ||
    product.subtitle ||
    product.tagline ||
    null
  );
}

const TABS = [
  { key: "links", label: "Links", icon: "link" },
  { key: "shop", label: "Shop", icon: "bag" },
  { key: "events", label: "Events", icon: "calendar" },
  { key: "about", label: "About", icon: "user" },
  { key: "contact", label: "Contact", icon: "mail" },
];

export default function PublicProfileView({ profile, storeProducts = [] }) {
  const [activeSection, setActiveSection] = useState("links");
  const [showAllLinks, setShowAllLinks] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  const menuRef = useRef(null);
  const toastTimer = useRef(null);

  const visibleSocials =
    profile.socialIcons?.filter(
      (social) => social.enabled && social.url && social.url.trim() !== ""
    ) || [];

  const visibleButtons =
    profile.primaryButtons?.filter(
      (button) => button.enabled && button.label && button.label.trim() !== ""
    ) || [];

  const visibleLinks =
    profile.links?.filter(
      (link) => link.enabled && link.url && link.url.trim() !== ""
    ) || [];

  const shownLinks = showAllLinks
    ? visibleLinks
    : visibleLinks.slice(0, LINKS_PREVIEW_COUNT);

  const theme = getTheme(profile.theme);
  const themeVars = buildThemeVars(theme);

  const name = profile.displayName || profile.username;
  const storeHref = `/${profile.username}/store`;

  const tags = profile.categoryTags || [];
  const pill = profile.availableForWork;
  const showPill = Boolean(pill?.enabled && pill?.text?.trim());

  /* Paint <body> too, so no other background shows around the page */
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = theme.bgCss;
    return () => {
      document.body.style.background = prev;
    };
  }, [theme.bgCss]);

  /* Close 3-dot menu on outside click / Escape */
  useEffect(() => {
    if (!menuOpen) return;

    function onDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    function onKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function flash(message) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
  }

  async function copyLink() {
    setMenuOpen(false);

    try {
      await navigator.clipboard.writeText(window.location.href.split("?")[0]);
      flash("Link copied");
    } catch {
      flash("Could not copy the link");
    }
  }

  async function shareProfile() {
    const url = window.location.href.split("?")[0];

    if (navigator.share) {
      try {
        await navigator.share({ url, title: name });
      } catch {
        /* cancelled */
      }
      return;
    }

    copyLink();
  }

  return (
    <div className="pub-page" style={themeVars}>
      <div className="pub-wrap">
        {/* ================= HERO (cover + profile card) ================= */}
        <div className="pub-hero">
          {/* ================= COVER ================= */}
          <div className="pub-top">
            <div className="pub-cover">
              {profile.profileImage ? (
                <img src={profile.profileImage} alt={name} />
              ) : (
                <div className="pub-cover-placeholder" />
              )}

              {profile.signatureImage && (
                <div className="pub-signature">
                  <img src={profile.signatureImage} alt="" />
                </div>
              )}
            </div>

            <div className="pub-cover-actions" ref={menuRef}>
              <button
                type="button"
                className="pub-round-btn"
                onClick={shareProfile}
                aria-label="Share"
              >
                <Ico name="share" size={19} />
              </button>

              <button
                type="button"
                className="pub-round-btn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More options"
                aria-expanded={menuOpen}
              >
                <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              {menuOpen && (
                <div className="pub-menu" role="menu">
                  <button type="button" role="menuitem" onClick={copyLink}>
                    <Ico name="copy" size={16} />
                    Copy link
                  </button>
                  <Link href={storeHref} role="menuitem" onClick={() => setMenuOpen(false)}>
                    <Ico name="store" size={16} />
                    Visit store
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* ================= PROFILE CARD ================= */}
          <section className="pub-card">
            <p className="pub-eyebrow">Welcome to my website</p>

            <div className="pub-name-row">
              <h1 className="pub-name">
                <span>{name}</span>
                {profile.verifiedBadge && <VerifiedBadge />}
              </h1>

              {showPill && (
                <span className="pub-pill">
                  <i />
                  {pill.text}
                </span>
              )}
            </div>

            {tags.length > 0 && (
              <p className="pub-tagline">
                {tags.map((tag, i) => (
                  <span key={tag} className="pub-tagline-item">
                    <span>{tag}</span>
                    {i < tags.length - 1 && <span className="pub-tagline-sep">|</span>}
                  </span>
                ))}
              </p>
            )}

            {profile.bio && <p className="pub-bio">{profile.bio}</p>}

            {visibleSocials.length > 0 && (
              <div className="pub-socials">
                {visibleSocials.map((social) => (
                  <a
                    key={social.platform}
                    href={normalizeUrl(social.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pub-social"
                    title={SOCIAL_META[social.platform]?.label || social.platform}
                    style={{ color: SOCIAL_META[social.platform]?.color || "#333" }}
                  >
                    <SocialIcon platform={social.platform} size={24} />
                  </a>
                ))}
              </div>
            )}

            <Link href={storeHref} className="pub-cta">
              <span className="pub-cta-label">
                <Ico name="store" size={24} stroke={1.8} />
                Visit My Store
              </span>
              <span className="pub-cta-arrow">
                <Ico name="arrow" size={22} />
              </span>
            </Link>

            {visibleButtons.map((button) => {
              const href = normalizeUrl(button.url);

              const inner = (
                <>
                  <span className="pub-cta-label">{button.label}</span>
                  <span className="pub-cta-arrow">
                    <Ico name="arrow" size={22} />
                  </span>
                </>
              );

              return href ? (
                <a
                  key={button.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pub-cta"
                >
                  {inner}
                </a>
              ) : (
                <div key={button.id} className="pub-cta">
                  {inner}
                </div>
              );
            })}
          </section>
        </div>

        {/* ================= TABS ================= */}
        <nav className="pub-nav">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={
                activeSection === tab.key
                  ? "pub-nav-item pub-nav-item-active"
                  : "pub-nav-item"
              }
              onClick={() => setActiveSection(tab.key)}
            >
              <Ico name={tab.icon} size={19} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* ================= SECTIONS ================= */}
        <div className="pub-section">
          {activeSection === "links" && (
            <>
              <div className="pub-section-head">
                <h2 className="pub-section-title">My Links</h2>

                {visibleLinks.length > LINKS_PREVIEW_COUNT && (
                  <button
                    type="button"
                    className="pub-viewall"
                    onClick={() => setShowAllLinks((v) => !v)}
                  >
                    {showAllLinks ? "Show less" : "View All"}
                    {!showAllLinks && <Ico name="arrow" size={16} />}
                  </button>
                )}
              </div>

              {visibleLinks.length === 0 ? (
                <p className="pub-empty">No links yet.</p>
              ) : (
                <div className="pub-links">
                  {shownLinks.map((link) => {
                    const meta = LINK_META[link.icon];
                    const subtitle = link.subtitle?.trim() || meta?.sub || "";

                    return (
                      <a
                        key={link.id}
                        href={normalizeUrl(link.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pub-link"
                        style={{ "--lk": meta?.tint || "#94a3b8" }}
                      >
                        <LinkBadge icon={link.icon} />

                        <span className="pub-link-text">
                          <span className="pub-link-title">{link.title}</span>
                          {subtitle && <span className="pub-link-sub">{subtitle}</span>}
                        </span>

                        <span className="pub-link-chevron">
                          <Ico name="chevron" size={18} />
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeSection === "shop" && (
            <>
              <div className="pub-section-head">
                <h2 className="pub-section-title">Shop</h2>
              </div>

              {storeProducts.length === 0 ? (
                <p className="pub-empty">No products yet.</p>
              ) : (
                <div className="pub-shop-grid">
                  {storeProducts.slice(0, 8).map((product) => {
                    const imgSrc = getProductImage(product);
                    const description = getProductDescription(product);

                    return (
                      <Link key={product.id} href={storeHref} className="pub-shop-item">
                        <div className="pub-shop-item-media">
                          {imgSrc ? (
                            <img src={imgSrc} alt={product.name} />
                          ) : (
                            <div className="pub-shop-item-placeholder" />
                          )}
                        </div>

                        <div className="pub-shop-item-body">
                          <span className="pub-shop-item-name">{product.name}</span>

                          {description && (
                            <span className="pub-shop-item-desc">{description}</span>
                          )}

                          <div className="pub-shop-item-footer">
                            {product.price != null && (
                              <span className="pub-shop-item-price">₹{product.price}</span>
                            )}

                            <span className="pub-shop-buy-btn">Buy Now</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeSection === "events" && (
            <>
              <div className="pub-section-head">
                <h2 className="pub-section-title">Upcoming Events</h2>
              </div>
              <p className="pub-empty">Events coming soon.</p>
            </>
          )}

          {activeSection === "about" && (
            <>
              <div className="pub-section-head">
                <h2 className="pub-section-title">About</h2>
              </div>
              <p className="pub-empty">{profile.bio || "No bio yet."}</p>
            </>
          )}

          {activeSection === "contact" && (
            <>
              <div className="pub-section-head">
                <h2 className="pub-section-title">Contact</h2>
              </div>

              {visibleSocials.length > 0 ? (
                <div className="pub-contact-list">
                  {visibleSocials.map((social) => (
                    <a
                      key={social.platform}
                      href={normalizeUrl(social.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pub-contact-item"
                    >
                      <span style={{ color: SOCIAL_META[social.platform]?.color }}>
                        <SocialIcon platform={social.platform} size={22} />
                      </span>

                      <span>{SOCIAL_META[social.platform]?.label}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="pub-empty">No contact details yet.</p>
              )}
            </>
          )}
        </div>

        <footer className="pub-foot">
          Made with
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#ef2b4f" aria-label="love">
            <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 4.5 6.4 4.5c2 0 3.7 1.1 5.6 3.2 1.9-2.1 3.6-3.2 5.6-3.2 3.7 0 5.5 3.9 4 7.3C19.5 16.4 12 21 12 21z" />
          </svg>
          by <b>LinkStorx</b>
        </footer>
      </div>

      {toast && (
        <div role="status" className="pub-toast">
          {toast}
        </div>
      )}
    </div>
  );
}