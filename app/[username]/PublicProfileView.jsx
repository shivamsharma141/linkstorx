"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { FaInstagram, FaFacebook, FaYoutube, FaXTwitter, FaWhatsapp, FaLinkedin, FaTelegram } from "react-icons/fa6";

import { getTheme, buildThemeVars } from "@/app/lib/theme/profileThemes";

/* =========================================================
   ORIGINAL SOCIAL MEDIA ICONS (react-icons: official brand glyphs + brand colors)
   <BrandIcon platform="instagram" size={22} />      -> brand colour me
   <BrandIcon platform="youtube" size={26} mono />   -> safed glyph (rang wale tile ke upar)
========================================================= */
const BRANDS = {
  instagram: { label: "Instagram", color: "#E4405F", Icon: FaInstagram },
  facebook: { label: "Facebook", color: "#0866FF", Icon: FaFacebook },
  youtube: { label: "YouTube", color: "#FF0000", Icon: FaYoutube },
  x: { label: "X", color: "#000000", Icon: FaXTwitter },
  whatsapp: { label: "WhatsApp", color: "#25D366", Icon: FaWhatsapp },
  linkedin: { label: "LinkedIn", color: "#0A66C2", Icon: FaLinkedin },
  telegram: { label: "Telegram", color: "#26A5E4", Icon: FaTelegram },
};

/* Instagram ka official gradient */
const IG_STOPS = [
  ["0%", "#FEDA75"],
  ["30%", "#FA7E1E"],
  ["55%", "#D62976"],
  ["80%", "#962FBF"],
  ["100%", "#4F5BD5"],
];

/* Text se platform key: "Instagram", "x", "Visit my YouTube", "fb" ... */
function brandOf(text) {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return null;

  if (t === "x" || /\btwitter\b/.test(t) || t === "x.com") return "x";
  if (/\bfb\b|messenger/.test(t)) return "facebook";
  if (/\bsnap\b/.test(t)) return "snapchat";

  for (const key of Object.keys(BRANDS)) {
    if (key === "x") continue;
    if (t.includes(key)) return key;
  }

  return null;
}

function brandColor(platform) {
  return BRANDS[platform]?.color || null;
}

function BrandIcon({ platform, size = 20, mono = false, className, title }) {
  const gradientId = useId();
  const brand = BRANDS[platform];

  if (!brand) return null;

  const Glyph = brand.Icon;
  const a11y = title ? { title } : { "aria-hidden": "true" };

  /* Inline style: project ke global "svg { fill: none; stroke: ... }" jaise CSS ko override karta hai,
     warna brand icon sirf patli halki outline dikhta hai */
  const tone = mono ? "#fff" : brand.color;
  const solid = { fill: tone, stroke: "none", color: tone };

  /* Instagram: official glyph, gradient fill (mono me safed) */
  if (platform === "instagram" && !mono) {
    return (
      <span style={{ display: "inline-flex", position: "relative" }}>
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
              {IG_STOPS.map(([offset, color]) => (
                <stop key={offset} offset={offset} stopColor={color} />
              ))}
            </linearGradient>
          </defs>
        </svg>
        <Glyph size={size} className={className} style={{ fill: `url(#${gradientId})`, stroke: "none" }} {...a11y} />
      </span>
    );
  }

  /* Snapchat: peela bhoot + kala outline (official look) */
  if (platform === "snapchat") {
    return (
      <Glyph
        size={size}
        className={className}
        style={{ fill: mono ? "#fff" : "#FFFC00", stroke: "#000", strokeWidth: 20, strokeLinejoin: "round" }}
        {...a11y}
      />
    );
  }

  return <Glyph size={size} style={solid} className={className} {...a11y} />;
}

/* =========================================================
   ANALYTICS TRACKING
   Visit + tap events /api/analytics/track par jaate hain.
   Fail hone par page par koi asar nahi padta.
========================================================= */

function getVisitorId() {
  try {
    let id = localStorage.getItem("ls_vid");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("ls_vid", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function track(payload) {
  try {
    const body = JSON.stringify({ ...payload, visitorId: getVisitorId() });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics/track",
        new Blob([body], { type: "application/json" })
      );
    } else {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    /* tracking kabhi page ko nahi todega */
  }
}

const SOCIAL_META = {
  instagram: { label: "Instagram", color: "#E4405F" },
  youtube: { label: "YouTube", color: "#FF0000" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  x: { label: "X", color: "#000000" },
  facebook: { label: "Facebook", color: "#0866FF" },
  telegram: { label: "Telegram", color: "#26A5E4" },
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
  facebook: { bg: "#0866FF", tint: "#0866FF", sub: "Connect on Facebook" },
  telegram: { bg: "#26A5E4", tint: "#26A5E4", sub: "Message me on Telegram" },
  website: { bg: "#eef0f4", tint: "#94a3b8", sub: "Explore my work" },
};

const LINKS_PREVIEW_COUNT = 5;
const OFFERS_PREVIEW_COUNT = 4;

/* ---------- small stroke icons ---------- */
const ICONS = {
  link: "M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5|M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5",
  bag: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z|M3 6h18|M16 10a4 4 0 01-8 0",
  calendar: "M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z|M16 2v4|M8 2v4|M3 10h18",
  mail: "M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z|M22 6l-10 7L2 6",
  store: "M3 9l1.5-5h15L21 9|M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0|M5 12v8h14v-8|M10 20v-5h4v5",
  share: "M18 8a3 3 0 100-6 3 3 0 000 6z|M6 15a3 3 0 100-6 3 3 0 000 6z|M18 22a3 3 0 100-6 3 3 0 000 6z|M8.6 13.5l6.8 4|M15.4 6.5l-6.8 4",
  arrow: "M5 12h14|M12 5l7 7-7 7",
  chevron: "M9 18l6-6-6-6",
  copy: "M9 9h11v11H9z|M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1",
  gift: "M20 12v10H4V12|M2 7h20v5H2z|M12 22V7|M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z|M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z",
  check: "M20 6L9 17l-5-5",
  back: "M19 12H5|M12 19l-7-7 7-7",
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

/* Original brand icons (shared BrandIcon). mono = rang wale tile ke upar safed glyph */
function SocialIcon({ platform, size = 22, mono = false }) {
  if (platform === "website") {
    return <Ico name="link" size={size} />;
  }

  return <BrandIcon platform={platform} size={size} mono={mono} />;
}

function LinkBadge({ icon }) {
  const meta = LINK_META[icon];

  if (meta && icon !== "website") {
    return (
      <span className="pub-link-badge" style={{ background: meta.bg }}>
        <SocialIcon platform={icon} size={26} mono />
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

/* Offer card click: link (url / whatsapp), form (scroll + preselect), ya none */
function getOfferTarget(offer, formOn) {
  if (offer.action === "url" && /^https?:\/\/\S+$/i.test(offer.actionValue || "")) {
    return { kind: "link", href: offer.actionValue };
  }

  if (offer.action === "whatsapp" && /^\d{7,15}$/.test(offer.actionValue || "")) {
    const text = encodeURIComponent(`Hi, I'm interested in ${offer.title}`);
    return { kind: "link", href: `https://wa.me/${offer.actionValue}?text=${text}` };
  }

  if (offer.action === "form" && formOn) {
    return { kind: "form" };
  }

  return { kind: "none" };
}

const TABS = [
  { key: "links", label: "Links", icon: "link" },
  { key: "shop", label: "Shop", icon: "bag" },
  { key: "events", label: "Events", icon: "calendar" },
  { key: "contact", label: "Contact", icon: "mail" },
];

/* ---------- inquiry form ("Let's Work Together") ---------- */
function InquiryForm({ inquiry, offers, username, selected, onSelect, formRef }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [honey, setHoney] = useState(""); // bots bharte hain, humans ko dikhta nahi
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          name,
          contact,
          offering: selected,
          message,
          website: honey,
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        /* non-JSON */
      }

      if (!response.ok || !data?.success) {
        setError(data?.message || "Could not send your message. Please try again.");
        setStatus("error");
        return;
      }

      setName("");
      setContact("");
      setMessage("");
      onSelect("");
      setStatus("sent");
    } catch {
      setError("Could not send your message. Check your connection.");
      setStatus("error");
    }
  }

  return (
    <div className="pub-inq" ref={formRef} id="pub-inquiry">
      <div className="pub-inq-head">
        <span className="pub-inq-icon">
          <Ico name="mail" size={22} />
        </span>
        <div>
          <h2 className="pub-inq-title">{inquiry.title}</h2>
          {inquiry.subtitle && <p className="pub-inq-sub">{inquiry.subtitle}</p>}
        </div>
      </div>

      {status === "sent" ? (
        <div className="pub-inq-done" role="status">
          <span className="pub-inq-done-icon">
            <Ico name="check" size={22} />
          </span>
          <b>Message sent</b>
          <span>Thanks for reaching out. I'll get back to you soon.</span>
        </div>
      ) : (
        <form className="pub-inq-form" onSubmit={submit}>
          <div className="pub-inq-row">
            <input
              className="pub-inq-input"
              type="text"
              value={name}
              maxLength={80}
              required
              placeholder="Your name"
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="pub-inq-input"
              type="text"
              value={contact}
              maxLength={120}
              required
              placeholder="Email or WhatsApp"
              autoComplete="email"
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          <select
            className="pub-inq-input pub-inq-select"
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
            aria-label="What you need"
          >
            <option value="">Select what you need</option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.title}>
                {offer.title}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>

          <textarea
            className="pub-inq-input pub-inq-textarea"
            rows={3}
            value={message}
            maxLength={1000}
            placeholder="Tell me more about your requirement..."
            onChange={(e) => setMessage(e.target.value)}
          />

          {/* honeypot */}
          <input
            type="text"
            name="website"
            value={honey}
            onChange={(e) => setHoney(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="pub-inq-hp"
          />

          {error && (
            <p className="pub-inq-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="pub-cta pub-inq-submit" disabled={status === "sending"}>
            <span className="pub-cta-label">
              {status === "sending" ? "Sending…" : "Send Message"}
            </span>
            <span className="pub-cta-arrow">
              <Ico name="arrow" size={20} />
            </span>
          </button>
        </form>
      )}
    </div>
  );
}

export default function PublicProfileView({ profile, storeProducts = [] }) {
  const [activeSection, setActiveSection] = useState("links");
  const [showAllLinks, setShowAllLinks] = useState(false);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  const menuRef = useRef(null);
  const toastTimer = useRef(null);
  const formRef = useRef(null);

  /* ---------- analytics ---------- */
  const visitSent = useRef(false);

  useEffect(() => {
    if (visitSent.current) return; // dev (StrictMode) me double-fire na ho
    visitSent.current = true;

    const params = new URLSearchParams(window.location.search);

    track({
      username: profile.username,
      type: "visit",
      referrer: document.referrer,
      ref: params.get("ref") || params.get("utm_source") || "",
    });
  }, [profile.username]);

  const trackTap = (id, title, kind) =>
    track({
      username: profile.username,
      type: "tap",
      linkId: String(id),
      linkTitle: title,
      linkKind: kind,
    });

  const visibleSocials =
    profile.socialIcons?.filter(
      (social) => social.enabled && social.url && social.url.trim() !== ""
    ) || [];

  const visibleLinks =
    profile.links?.filter(
      (link) => link.enabled && link.url && link.url.trim() !== ""
    ) || [];

  const shownLinks = showAllLinks
    ? visibleLinks
    : visibleLinks.slice(0, LINKS_PREVIEW_COUNT);

  /* What I Offer + Inquiry (server pehle hi filter karke bhejta hai) */
  const offers = profile.offers || { enabled: false, items: [] };
  const inquiry = profile.inquiry || { enabled: false };

  const visibleOffers = offers.enabled
    ? (offers.items || []).filter((o) => o.enabled && o.title?.trim())
    : [];

  const shownOffers = showAllOffers
    ? visibleOffers
    : visibleOffers.slice(0, OFFERS_PREVIEW_COUNT);

  const formOn = Boolean(inquiry.enabled);

  const theme = getTheme(profile.theme);
  const themeVars = buildThemeVars(theme);

  const name = profile.displayName || profile.username;
  const storeHref = `/${profile.username}/store`;

  /* Store tabhi dikhega jab kam se kam 1 published product ho.
     storeProducts server se aata hai (sirf verified seller ke published products). */
  const hasStore = Array.isArray(storeProducts) && storeProducts.length > 0;
  const visibleTabs = TABS.filter((tab) => tab.key !== "shop" || hasStore);

  const tags = profile.categoryTags || [];

  /* Back button hamesha home page par bhejta hai */
  const HOME_HREF = "/";

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

  /* Card click -> form khulta hai: offering pre-select + scroll */
  function openFormFor(title) {
    setSelectedOffer(title);

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function renderOffer(offer) {
    const target = getOfferTarget(offer, formOn);

    const inner = (
      <>
        <span className="pub-offer-media">
          {offer.image ? (
            <img src={offer.image} alt={offer.title} loading="lazy" />
          ) : (
            <span className="pub-offer-media-empty">
              <Ico name="gift" size={26} />
            </span>
          )}
        </span>

        <span className="pub-offer-body">
          <span className="pub-offer-title">{offer.title}</span>
          {offer.description && <span className="pub-offer-desc">{offer.description}</span>}
          {offer.price && <span className="pub-offer-price">{offer.price}</span>}
        </span>

        {offer.buttonText && (
          <span className="pub-offer-btn">
            {offer.buttonText}
            <Ico name="arrow" size={15} />
          </span>
        )}
      </>
    );

    if (target.kind === "link") {
      return (
        <a
          key={offer.id}
          href={target.href}
          target="_blank"
          rel="noopener noreferrer"
          className="pub-offer"
          onClick={() => trackTap(offer.id, offer.title, "offer")}
        >
          {inner}
        </a>
      );
    }

    if (target.kind === "form") {
      return (
        <button
          key={offer.id}
          type="button"
          className="pub-offer"
          onClick={() => {
            trackTap(offer.id, offer.title, "offer");
            openFormFor(offer.title);
          }}
        >
          {inner}
        </button>
      );
    }

    return (
      <div key={offer.id} className="pub-offer pub-offer-static">
        {inner}
      </div>
    );
  }

  return (
    <div className="pub-page" style={themeVars}>
      <div className="pub-wrap">
        {/* ================= HERO (cover + profile card) ================= */}
        <div className="pub-hero">
          {/* ================= COVER ================= */}
          <div className="pub-top">
            <Link
              href={HOME_HREF}
              className="pub-round-btn pub-back-btn"
              aria-label="Go to home page"
            >
              <Ico name="back" size={19} />
            </Link>

            <div className="pub-cover">
              {profile.profileImage ? (
                <img src={profile.profileImage} alt={name} />
              ) : (
                <div className="pub-cover-placeholder" />
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

                  {/* Visit store: sirf jab store mein product ho */}
                  {hasStore && (
                    <Link
                      href={storeHref}
                      role="menuitem"
                      onClick={() => {
                        trackTap("store", "Visit My Store", "store");
                        setMenuOpen(false);
                      }}
                    >
                      <Ico name="store" size={16} />
                      Visit store
                    </Link>
                  )}
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
                    onClick={() =>
                      trackTap(
                        social.platform,
                        SOCIAL_META[social.platform]?.label || social.platform,
                        "social"
                      )
                    }
                  >
                    <SocialIcon platform={social.platform} size={24} />
                  </a>
                ))}
              </div>
            )}

            {/* Visit My Store: sirf jab store mein product ho */}
            {hasStore && (
              <Link
                href={storeHref}
                className="pub-cta"
                onClick={() => trackTap("store", "Visit My Store", "store")}
              >
                <span className="pub-cta-label">
                  <Ico name="store" size={24} stroke={1.8} />
                  Visit My Store
                </span>
                <span className="pub-cta-arrow">
                  <Ico name="arrow" size={22} />
                </span>
              </Link>
            )}
          </section>
        </div>

        {/* ================= TABS ================= */}
        <nav className="pub-nav">
          {visibleTabs.map((tab) => (
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
              {/* ---------- WHAT I OFFER ---------- */}
              {visibleOffers.length > 0 && (
                <div className="pub-block">
                  <div className="pub-section-head">
                    <div className="pub-section-headtext">
                      <h2 className="pub-section-title">{offers.title}</h2>
                      {offers.subtitle && <p className="pub-section-sub">{offers.subtitle}</p>}
                    </div>

                    {visibleOffers.length > OFFERS_PREVIEW_COUNT && (
                      <button
                        type="button"
                        className="pub-viewall"
                        onClick={() => setShowAllOffers((v) => !v)}
                      >
                        {showAllOffers ? "Show less" : "View All"}
                        {!showAllOffers && <Ico name="arrow" size={16} />}
                      </button>
                    )}
                  </div>

                  <div className="pub-offers">{shownOffers.map(renderOffer)}</div>
                </div>
              )}

              {/* ---------- MY LINKS ---------- */}
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
                        onClick={() => trackTap(link.id, link.title, "link")}
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

              {/* ---------- INQUIRY FORM ---------- */}
              {formOn && (
                <InquiryForm
                  inquiry={inquiry}
                  offers={visibleOffers}
                  username={profile.username}
                  selected={selectedOffer}
                  onSelect={setSelectedOffer}
                  formRef={formRef}
                />
              )}
            </>
          )}

          {activeSection === "shop" && hasStore && (
            <>
              <div className="pub-section-head">
                <h2 className="pub-section-title">Shop</h2>
              </div>

              <div className="pub-shop-grid">
                {storeProducts.slice(0, 8).map((product) => {
                  const imgSrc = getProductImage(product);
                  const description = getProductDescription(product);

                  return (
                    <Link
                      key={product.id}
                      href={storeHref}
                      className="pub-shop-item"
                      onClick={() => trackTap(product.id, product.name, "store")}
                    >
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
                      onClick={() =>
                        trackTap(
                          social.platform,
                          SOCIAL_META[social.platform]?.label || social.platform,
                          "social"
                        )
                      }
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