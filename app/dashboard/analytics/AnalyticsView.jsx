"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  FaInstagram,
  FaFacebook,
  FaYoutube,
  FaXTwitter,
  FaWhatsapp,
  FaLinkedin,
  FaTelegram,
  FaSnapchat,
  FaTiktok,
  FaPinterest,
  FaThreads,
  FaReddit,
  FaGithub,
  FaDiscord,
  FaSpotify,
  FaTwitch,
} from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";

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
  snapchat: { label: "Snapchat", color: "#FFFC00", Icon: FaSnapchat },
  tiktok: { label: "TikTok", color: "#000000", Icon: FaTiktok },
  pinterest: { label: "Pinterest", color: "#BD081C", Icon: FaPinterest },
  threads: { label: "Threads", color: "#000000", Icon: FaThreads },
  reddit: { label: "Reddit", color: "#FF4500", Icon: FaReddit },
  github: { label: "GitHub", color: "#181717", Icon: FaGithub },
  discord: { label: "Discord", color: "#5865F2", Icon: FaDiscord },
  spotify: { label: "Spotify", color: "#1DB954", Icon: FaSpotify },
  twitch: { label: "Twitch", color: "#9146FF", Icon: FaTwitch },
  google: { label: "Google", color: "#4285F4", Icon: FcGoogle },
};

/* Instagram ka official gradient */
const IG_STOPS = [
  ["0%", "#FEDA75"],
  ["30%", "#FA7E1E"],
  ["55%", "#D62976"],
  ["80%", "#962FBF"],
  ["100%", "#4F5BD5"],
];

/* Text se platform key: "Instagram", "x", "Visit my YouTube", "fb", "t.co", "lnkd.in" ... */
function brandOf(text) {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return null;

  /* short links / aliases */
  if (t === "x" || t === "x.com" || t === "t.co" || /\btwitter\b/.test(t)) return "x";
  if (/\b(fb|fb\.com|fb\.me|messenger)\b/.test(t)) return "facebook";
  if (/\b(ig|instagr\.am)\b/.test(t)) return "instagram";
  if (/\bsnap\b/.test(t)) return "snapchat";
  if (/\byoutu\.be\b/.test(t)) return "youtube";
  if (/\bwa\.me\b/.test(t)) return "whatsapp";
  if (/\blnkd\.in\b/.test(t)) return "linkedin";
  if (/\bt\.me\b/.test(t)) return "telegram";
  if (/\bredd\.it\b/.test(t)) return "reddit";

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
  const rawId = useId();
  const gradientId = `ig${String(rawId).replace(/[^a-zA-Z0-9]/g, "")}`;
  const brand = BRANDS[platform];

  if (!brand) return null;

  const Glyph = brand.Icon;
  const a11y = title ? { title } : { "aria-hidden": "true" };

  /* Google: asli 4 rang wala "G" (apne rang khud lekar aata hai) */
  if (platform === "google") {
    return <Glyph size={size} style={{ stroke: "none" }} className={className} {...a11y} />;
  }

  const isGradient = platform === "instagram" && !mono;
  const isSnap = platform === "snapchat";

  let fill = mono ? "#fff" : brand.color;
  let stroke = "none";
  let strokeWidth = 0;

  if (isGradient) fill = `url(#${gradientId})`;

  if (isSnap) {
    fill = mono ? "#fff" : "#FFFC00";
    stroke = "#000";
    strokeWidth = 20;
  }

  return (
    <span
      className={`an-brand ${className || ""}`}
      style={{
        display: "inline-flex",
        position: "relative",
        "--bi-fill": fill,
        "--bi-stroke": stroke,
        "--bi-sw": strokeWidth,
      }}
    >
      {isGradient && (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
              {IG_STOPS.map(([offset, color]) => (
                <stop key={offset} offset={offset} stopColor={color} />
              ))}
            </linearGradient>
          </defs>
        </svg>
      )}
      <Glyph size={size} {...a11y} />
    </span>
  );
}

const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "12m", label: "12 months" },
];

const KIND_LABEL = { link: "Link", offer: "Offer", social: "Social", store: "Store" };

const VISIT_COLOR = "#2563eb";
const TAP_COLOR = "#10b981";

/* ---------- icons ---------- */
const ICONS = {
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z|M12 15a3 3 0 100-6 3 3 0 000 6z",
  pointer: "M4 4l7 17 2.5-7.5L21 11z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|M9 11a4 4 0 100-8 4 4 0 000 8z|M23 21v-2a4 4 0 00-3-3.87|M16 3.13a4 4 0 010 7.75",
  bars: "M6 20V12|M12 20V6|M18 20v-9",
  calendar: "M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z|M16 2v4|M8 2v4|M3 10h18",
  chevron: "M6 9l6 6 6-6",
  external: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6|M15 3h6v6|M10 14L21 3",
  info: "M12 22a10 10 0 100-20 10 10 0 000 20z|M12 16v-4|M12 8h.01",
  phone: "M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z|M12 18h.01",
  tablet: "M5 2h14a2 2 0 012 2v16a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2z|M12 18h.01",
  monitor: "M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z|M8 21h8|M12 17v4",
  globe: "M12 22a10 10 0 100-20 10 10 0 000 20z|M2 12h20|M12 2a15 15 0 010 20 15 15 0 010-20z",
  link: "M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5|M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5",
};

function Badge({ children, color }) {
  return (
    <span className="an-ico" style={color ? { color } : undefined}>
      {children}
    </span>
  );
}

/* original brand icon (apne rang me, bina grey tile ke) */
function platformBadge(platform) {
  return (
    <span className="an-ico an-ico-brand">
      <BrandIcon platform={platform} size={20} />
    </span>
  );
}

function sourceIcon(item) {
  const platform = brandOf(item.label);
  if (platform) return platformBadge(platform);

  const t = item.label.toLowerCase();
  if (t === "direct") return <Badge><Icon name="pointer" size={14} /></Badge>;
  return <Badge><Icon name="globe" size={14} /></Badge>;
}

function deviceIcon(item) {
  const name = item.label === "Mobile" ? "phone" : item.label === "Tablet" ? "tablet" : "monitor";
  return <Badge><Icon name={name} size={14} /></Badge>;
}

/* flag emoji Windows par letters dikhate hain, isliye image */
function countryIcon(item) {
  if (!/^[A-Z]{2}$/.test(item.code || "")) {
    return <Badge><Icon name="globe" size={14} /></Badge>;
  }

  const code = item.code.toLowerCase();

  return (
    <img
      className="an-flag-img"
      src={`https://flagcdn.com/24x18/${code}.png`}
      srcSet={`https://flagcdn.com/48x36/${code}.png 2x`}
      width="24"
      height="18"
      alt=""
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

function Icon({ name, size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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

function formatDay(key, long = false) {
  /* "YYYY-MM" = mahina (12 months range), "YYYY-MM-DD" = din */
  if (String(key).length === 7) {
    return new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-US", {
      month: long ? "long" : "short",
      year: long || key.endsWith("-01") ? "numeric" : undefined,
      timeZone: "UTC",
    });
  }

  const date = new Date(`${key}T00:00:00Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(long ? { weekday: "short" } : {}),
    timeZone: "UTC",
  });
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* ---------- line chart (plain SVG, no library) ---------- */
function LineChart({ series }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = () => setWidth(el.clientWidth || 640);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const H = 260;
  const padL = 34;
  const padR = 22;
  const padT = 12;
  const padB = 32;

  const n = series.length;
  const peak = Math.max(4, ...series.map((d) => Math.max(d.visits, d.taps)));
  const step = Math.ceil(peak / 4);
  const top = step * 4;

  const innerW = Math.max(40, width - padL - padR);
  const innerH = H - padT - padB;

  const x = (i) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => padT + innerH - (v / top) * innerH;

  const ticks = [0, 1, 2, 3, 4].map((t) => t * step);
  const every = n <= 8 ? 1 : Math.ceil(n / 7);

  const line = (key) => series.map((d, i) => `${x(i)},${y(d[key])}`).join(" ");

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = e.clientX - rect.left - padL;
    const i = Math.round((rel / innerW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  const point = hover === null ? series[n - 1] : series[hover];
  const dotIndex = hover === null ? n - 1 : hover;

  return (
    <div className="an-chart" ref={wrapRef}>
      <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} style={{ width, height: H }} role="img" aria-label="Visits and taps over time">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} className="an-grid" />
            <text x={padL - 10} y={y(t) + 4} textAnchor="end" className="an-axis">
              {t}
            </text>
          </g>
        ))}

        {series.map((d, i) =>
          (n - 1 - i) % every === 0 ? (
            <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" className="an-axis">
              {formatDay(d.date)}
            </text>
          ) : null
        )}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} className="an-cursor" />
        )}

        <polyline points={line("visits")} fill="none" stroke={VISIT_COLOR} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={line("taps")} fill="none" stroke={TAP_COLOR} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        <circle cx={x(dotIndex)} cy={y(point.visits)} r="4.5" fill={VISIT_COLOR} />
        <circle cx={x(dotIndex)} cy={y(point.taps)} r="4.5" fill={TAP_COLOR} />

        <rect
          x={padL}
          y={0}
          width={innerW}
          height={H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {hover !== null && (
        <div
          className="an-tip"
          style={{
            left: Math.min(Math.max(x(hover), 70), width - 70),
          }}
        >
          <b>{formatDay(point.date, true)}</b>
          <span><i style={{ background: VISIT_COLOR }} /> Visits <em>{point.visits}</em></span>
          <span><i style={{ background: TAP_COLOR }} /> Taps <em>{point.taps}</em></span>
        </div>
      )}
    </div>
  );
}

function topLinkIcon(item) {
  const platform =
    item.kind === "social" ? item.key.split(":")[1] : brandOf(item.label);

  if (platform && brandColor(platform)) {
    return platformBadge(platform);
  }

  if (item.kind === "store") return <Badge><Icon name="globe" size={14} /></Badge>;

  return <span className="an-kind">{KIND_LABEL[item.kind] || item.kind}</span>;
}

/* ---------- breakdown list ---------- */
function BreakdownCard({ title, items, empty, prefix, className = "" }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className={`an-card ${className}`}>
      <h2 className="an-card-title">{title}</h2>

      {items.length === 0 ? (
        <p className="an-empty">{empty}</p>
      ) : (
        <ul className="an-rows">
          {items.map((item) => {
            const pct = total > 0 ? (item.count / total) * 100 : 0;

            return (
              <li key={item.key} className="an-row">
                <div className="an-row-top">
                  <span className="an-row-label">
                    {prefix ? prefix(item) : null}
                    {item.label}
                  </span>
                  <span className="an-row-num">
                    {item.count}
                    <small>{Math.round(pct)}%</small>
                  </span>
                </div>
                <span className="an-bar">
                  <i style={{ width: `${Math.max(pct, 3)}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------- main ---------- */
export default function AnalyticsView({ username, displayName, isPublished }) {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [host, setHost] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setHost(window.location.host);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    (async () => {
      try {
        const res = await fetch(`/api/analytics?range=${range}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const json = await res.json();

        if (cancelled) return;

        if (!res.ok || !json?.success) {
          setError(json?.message || "Could not load analytics.");
        } else {
          setData(json);
        }
      } catch {
        if (!cancelled) setError("Could not load analytics. Check your connection.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range, reload]);

  const visits = data?.visits ?? 0;
  const taps = data?.taps ?? 0;
  const people = data?.people ?? 0;
  const tapRate = data?.tapRate ?? 0;

  const series =
    data?.series ||
    Array.from({ length: 7 }, (_, i) => ({ date: `2000-01-0${i + 1}`, visits: 0, taps: 0 }));

  const pageUrl = username && host ? `${host}/${username}` : "";

  const stats = [
    { key: "visits", icon: "eye", tone: "rose", title: "Visits", sub: "Each time your page was opened", value: visits },
    { key: "taps", icon: "pointer", tone: "green", title: "Taps", sub: "Each tap on one of your links", value: taps },
    { key: "people", icon: "users", tone: "amber", title: "People", sub: range === "12m" ? "Each person counted once per month" : "Each person counted once", value: people },
    { key: "rate", icon: "bars", tone: "violet", title: "Visitors who tapped a link", sub: "Out of everyone who visited", value: `${tapRate}%` },
  ];

  return (
    <div className="an-page">
      <header className="an-head">
        <div>
          <h1>Analytics</h1>
          <p>See who visits your page and what they tap.</p>
        </div>

        <div className="an-head-tools">
          <div className="an-range" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                className={range === r.value ? "an-range-btn is-active" : "an-range-btn"}
                aria-pressed={range === r.value}
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {username && (
            <a
              className="an-page-chip"
              href={`/${username}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="an-avatar">{initials(displayName)}</span>
              <span className="an-chip-url">{pageUrl || `/${username}`}</span>
              <Icon name="external" size={14} />
            </a>
          )}
        </div>
      </header>

      {!isPublished && (
        <p className="an-note an-note-warn">
          <Icon name="info" size={14} />
          Your page is not published yet. Publish it to start collecting visits.
        </p>
      )}

      {error && (
        <p className="an-note an-note-error" role="alert">
          <Icon name="info" size={14} />
          {error}
          <button type="button" onClick={() => setReload((k) => k + 1)}>
            Try again
          </button>
        </p>
      )}

      <div className={loading ? "an-body an-loading" : "an-body"}>
        <div className="an-stats">
          {stats.map((s) => (
            <section key={s.key} className="an-card an-stat">
              <span className={`an-stat-icon an-tone-${s.tone}`}>
                <Icon name={s.icon} size={18} />
              </span>
              <div className="an-stat-text">
                <h2>{s.title}</h2>
                <b className="an-stat-value">{s.value}</b>
                <p>{s.sub}</p>
              </div>
            </section>
          ))}
        </div>

        <div className="an-main">
          <section className="an-card an-chart-card">
            <div className="an-card-head">
              <h2 className="an-card-title">Visits &amp; taps</h2>
              <div className="an-legend">
                <span><i style={{ background: VISIT_COLOR }} />Visits</span>
                <span><i style={{ background: TAP_COLOR }} />Taps</span>
              </div>
            </div>
            <LineChart series={series} />
          </section>

          <section className="an-card an-top">
            <h2 className="an-card-title">Top links</h2>

            {!data || data.topLinks.length === 0 ? (
              <p className="an-empty">No taps yet.</p>
            ) : (
              <ul className="an-rows">
                {data.topLinks.map((item) => {
                  const max = data.topLinks[0].count || 1;

                  return (
                    <li key={item.key} className="an-row">
                      <div className="an-row-top">
                        <span className="an-row-label">
                          {topLinkIcon(item)}
                          <span className="an-row-text">{item.label}</span>
                        </span>
                        <span className="an-row-num">{item.count}</span>
                      </div>
                      <span className="an-bar">
                        <i style={{ width: `${Math.max((item.count / max) * 100, 4)}%` }} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="an-trio">
          <BreakdownCard
            title="Devices"
            items={data?.devices || []}
            empty="No visitors yet."
            prefix={deviceIcon}
          />
          <BreakdownCard
            title="Countries"
            items={data?.countries || []}
            empty="No visitors yet."
            prefix={countryIcon}
          />
          <BreakdownCard
            title="Where they came from"
            items={data?.sources || []}
            empty="No visitors yet."
            prefix={sourceIcon}
          />
        </div>
      </div>

      <p className="an-foot">
        <Icon name="info" size={13} />
        Your own visits don&apos;t count. To test your link, use a private window.
      </p>
    </div>
  );
}