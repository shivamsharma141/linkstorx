"use client";

import { useEffect, useRef, useState } from "react";

const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
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

const SOCIAL_COLOR = {
  instagram: "#D62976",
  youtube: "#FF0000",
  linkedin: "#0A66C2",
  whatsapp: "#25D366",
  x: "#111827",
  facebook: "#1877F2",
  telegram: "#229ED9",
};

/* "Instagram" / "X" / "Visit my YouTube" -> platform key (ya null) */
function platformOf(text) {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return null;
  if (t === "x" || /\btwitter\b/.test(t)) return "x";
  for (const key of ["instagram", "youtube", "linkedin", "whatsapp", "facebook", "telegram"]) {
    if (t.includes(key)) return key;
  }
  if (/\bfb\b|messenger/.test(t)) return "facebook";
  return null;
}

function SocialMark({ platform, size = 15 }) {
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="an-ig" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#FEDA75" />
            <stop offset="35%" stopColor="#FA7E1E" />
            <stop offset="60%" stopColor="#D62976" />
            <stop offset="85%" stopColor="#962FBF" />
            <stop offset="100%" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
        <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" fill="none" stroke="url(#an-ig)" strokeWidth="2.3" />
        <circle cx="12" cy="12" r="4.4" fill="none" stroke="url(#an-ig)" strokeWidth="2.3" />
        <circle cx="17.1" cy="6.9" r="1.4" fill="url(#an-ig)" />
      </svg>
    );
  }

  if (!SOCIAL_PATHS[platform]) return null;

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d={SOCIAL_PATHS[platform]} />
    </svg>
  );
}

function Badge({ children, color }) {
  return (
    <span className="an-ico" style={color ? { color } : undefined}>
      {children}
    </span>
  );
}

function platformBadge(platform) {
  return (
    <Badge color={SOCIAL_COLOR[platform]}>
      <SocialMark platform={platform} size={15} />
    </Badge>
  );
}

function sourceIcon(item) {
  const platform = platformOf(item.label);
  if (platform) return platformBadge(platform);

  const t = item.label.toLowerCase();
  if (t === "google") return <Badge color="#4285F4"><b className="an-ico-g">G</b></Badge>;
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
    item.kind === "social" ? item.key.split(":")[1] : platformOf(item.label);

  if (platform && SOCIAL_PATHS[platform] || platform === "instagram") {
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
    { key: "people", icon: "users", tone: "amber", title: "People", sub: "Each person counted once", value: people },
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
          <label className="an-select">
            <Icon name="calendar" size={15} />
            <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <Icon name="chevron" size={15} />
          </label>

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
