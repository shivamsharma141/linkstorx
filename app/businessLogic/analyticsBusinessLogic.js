import {
  findProfileByUserId,
  findProfileByUsername,
} from "@/app/databaseQueries/profileDatabaseQueries";

import {
  createAnalyticsEvent,
  aggregateAnalytics,
} from "@/app/databaseQueries/analyticsDatabaseQueries";

/* =========================================================
   CONSTANTS
========================================================= */

const TIMEZONE = "Asia/Kolkata"; // IST me din kaatenge (no DST, fixed +05:30)
const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 };
const LINK_KINDS = ["link", "offer", "social", "store"];

const VISITOR_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|monitor|curl|wget|python-requests|axios|node-fetch|go-http|httpclient/i;

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/* =========================================================
   PARSERS (device / country / source)
========================================================= */

function parseDevice(ua) {
  if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) return "Tablet";
  if (/mobi|iphone|ipod|android/i.test(ua)) return "Mobile";
  return "Desktop";
}

function parseCountry(code) {
  const value = String(code || "").trim().toUpperCase();
  /* XX / T1 (Tor) jaise special codes ignore */
  return /^[A-Z]{2}$/.test(value) && value !== "XX" ? value : "";
}

const SOURCE_RULES = [
  [/instagram|^ig$/, "Instagram"],
  [/facebook|^fb$|fb\.me|fb\.com|messenger/, "Facebook"],
  [/youtube|youtu\.be|^yt$/, "YouTube"],
  [/linkedin|lnkd\.in/, "LinkedIn"],
  [/whatsapp|wa\.me|^wa$/, "WhatsApp"],
  [/telegram|^t\.me$|^tg$/, "Telegram"],
  [/twitter|^x$|^x\.com$|\.x\.com$|^t\.co$/, "X"],
  [/snapchat/, "Snapchat"],
  [/pinterest/, "Pinterest"],
  [/reddit/, "Reddit"],
  [/google\.|^g\.co$/, "Google"],
  [/bing\.com/, "Bing"],
];

function matchSource(text) {
  const value = String(text || "").toLowerCase();

  for (const [pattern, label] of SOURCE_RULES) {
    if (pattern.test(value)) return label;
  }

  return null;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/* Priority: ?ref= / utm_source  ->  Referer header  ->  in-app browser (UA)  ->  Direct */
function resolveSource({ ref, referrer, userAgent, ownHost }) {
  const refParam = String(ref || "").trim().slice(0, 40);

  if (refParam) {
    return (
      matchSource(refParam) ||
      refParam.charAt(0).toUpperCase() + refParam.slice(1).toLowerCase()
    );
  }

  const host = hostOf(referrer);

  if (host && host !== ownHost) {
    return matchSource(host) || host.slice(0, 40);
  }

  /* Instagram / Facebook app ke andar ka browser referrer hata deta hai */
  if (/Instagram/i.test(userAgent)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return "Facebook";
  if (/LinkedInApp/i.test(userAgent)) return "LinkedIn";
  if (/Snapchat/i.test(userAgent)) return "Snapchat";
  if (/Twitter/i.test(userAgent)) return "X";

  return "Direct";
}

/* =========================================================
   TRACK (public)
========================================================= */

export async function trackEvent(input, context) {
  const { userAgent = "", country = "", host = "", viewerUserId = null } = context;

  /* Bots / link preview crawlers */
  if (!userAgent || BOT_PATTERN.test(userAgent)) {
    return { tracked: false };
  }

  const type = input?.type;

  if (type !== "visit" && type !== "tap") {
    throw createAppError("Invalid event.", 400);
  }

  const username = String(input?.username || "").trim().toLowerCase();

  if (!username) {
    throw createAppError("Profile not found.", 404);
  }

  const profile = await findProfileByUsername(username);

  /* Draft ya missing profile: chupchap ignore */
  if (!profile || !profile.isPublished) {
    return { tracked: false };
  }

  /* Owner ki apni visits count nahi hoti (editor preview bhi) */
  if (viewerUserId && String(profile.userId) === String(viewerUserId)) {
    return { tracked: false };
  }

  const visitorId = VISITOR_PATTERN.test(String(input?.visitorId || ""))
    ? String(input.visitorId)
    : "";

  const event = {
    profileId: profile._id,
    type,
    visitorId,
    device: parseDevice(userAgent),
    country: parseCountry(country),
    source: resolveSource({
      ref: input?.ref,
      referrer: input?.referrer,
      userAgent,
      ownHost: String(host).replace(/^www\./, "").toLowerCase(),
    }),
  };

  if (type === "tap") {
    const linkId = String(input?.linkId || "").trim().slice(0, 100);
    const linkKind = LINK_KINDS.includes(input?.linkKind) ? input.linkKind : "";

    if (!linkId || !linkKind) {
      throw createAppError("Invalid tap.", 400);
    }

    event.linkId = linkId;
    event.linkKind = linkKind;
    event.linkTitle = String(input?.linkTitle || "").trim().slice(0, 80);
  }

  await createAnalyticsEvent(event);

  return { tracked: true };
}

/* =========================================================
   READ (owner dashboard)
========================================================= */

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function buildDayKeys(days) {
  const now = Date.now();
  const keys = [];

  for (let i = days - 1; i >= 0; i--) {
    keys.push(dayFormatter.format(new Date(now - i * 86400000)));
  }

  return keys;
}

function countryName(code) {
  if (!code) return "Unknown";

  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

function countFor(rows, type) {
  return (rows || []).find((row) => row._id === type)?.count || 0;
}

export async function getAnalytics(userId, rangeParam) {
  if (!userId) {
    throw createAppError("User authentication is required.", 401);
  }

  const range = RANGE_DAYS[rangeParam] ? rangeParam : "7d";
  const days = RANGE_DAYS[range];

  const keys = buildDayKeys(days);
  const since = new Date(`${keys[0]}T00:00:00+05:30`);

  const profile = await findProfileByUserId(userId);

  const raw = profile
    ? await aggregateAnalytics(profile._id, since, TIMEZONE)
    : {};

  /* chart: har din ek point (khali din = 0) */
  const byDay = new Map(keys.map((key) => [key, { date: key, visits: 0, taps: 0 }]));

  for (const row of raw.series || []) {
    const point = byDay.get(row._id.day);
    if (!point) continue;
    if (row._id.type === "visit") point.visits = row.count;
    if (row._id.type === "tap") point.taps = row.count;
  }

  const people = countFor(raw.people, "visit");
  const tappers = countFor(raw.people, "tap");

  return {
    range,
    isPublished: Boolean(profile?.isPublished),

    visits: countFor(raw.totals, "visit"),
    taps: countFor(raw.totals, "tap"),
    people,
    tapRate: people > 0 ? Math.min(100, Math.round((tappers / people) * 100)) : 0,

    series: [...byDay.values()],

    topLinks: (raw.topLinks || []).map((row) => ({
      key: `${row._id.kind}:${row._id.id}`,
      label: row.title || row._id.id,
      kind: row._id.kind,
      count: row.count,
    })),

    devices: (raw.devices || []).map((row) => ({
      key: row._id,
      label: row._id,
      count: row.count,
    })),

    countries: (raw.countries || []).map((row) => ({
      key: row._id || "unknown",
      code: row._id || "",
      label: countryName(row._id),
      count: row.count,
    })),

    sources: (raw.sources || []).map((row) => ({
      key: row._id,
      label: row._id,
      count: row.count,
    })),
  };
}
