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
};

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

function flag(code) {
  if (!/^[A-Z]{2}$/.test(code || "")) return "";
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
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
                          <span className="an-kind">{KIND_LABEL[item.kind] || item.kind}</span>
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
          />
          <BreakdownCard
            title="Countries"
            items={data?.countries || []}
            empty="No visitors yet."
            prefix={(item) => (flag(item.code) ? <span className="an-flag">{flag(item.code)}</span> : null)}
          />
          <BreakdownCard
            title="Where they came from"
            items={data?.sources || []}
            empty="No visitors yet."
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
