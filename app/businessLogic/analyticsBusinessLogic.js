import {
  findProfileByUserId,
  findProfileByUsername,
} from "@/app/databaseQueries/profileDatabaseQueries";

import {
  recordVisit,
  recordTap,
  findDailyStats,
  countVisitors,
  decodeKey,
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
  /* iPad / tablet pehle. Android par "Mobile" token na ho tabhi tablet.
     (Instagram Android UA me "Android" do baar aata hai, isliye
     "Mobile" poori string me dhundhte hain, sirf uske baad nahi.) */
  if (/ipad|tablet|kindle|silk/i.test(ua)) return "Tablet";
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return "Tablet";
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

  const device = parseDevice(userAgent);

  const source = resolveSource({
    ref: input?.ref,
    referrer: input?.referrer,
    userAgent,
    ownHost: String(host).replace(/^www\./, "").toLowerCase(),
  });

  const day = dayFormatter.format(new Date());

  if (type === "visit") {
    await recordVisit({
      profileId: profile._id,
      day,
      visitorId,
      device,
      country: parseCountry(country),
      source,
    });

    return { tracked: true };
  }

  const linkId = String(input?.linkId || "").trim().slice(0, 100);
  const linkKind = LINK_KINDS.includes(input?.linkKind) ? input.linkKind : "";

  if (!linkId || !linkKind) {
    throw createAppError("Invalid tap.", 400);
  }

  await recordTap({
    profileId: profile._id,
    day,
    visitorId,
    linkKey: `${linkKind}:${linkId}`,
    linkTitle: String(input?.linkTitle || "").trim().slice(0, 80),
  });

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

function addCounts(target, source, decode = false) {
  for (const [key, value] of Object.entries(source || {})) {
    const name = decode ? decodeKey(key) : key;
    target[name] = (target[name] || 0) + (Number(value) || 0);
  }
}

function topItems(counts, limit = 8) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export async function getAnalytics(userId, rangeParam) {
  if (!userId) {
    throw createAppError("User authentication is required.", 401);
  }

  const range = RANGE_DAYS[rangeParam] ? rangeParam : "7d";
  const days = RANGE_DAYS[range];

  const keys = buildDayKeys(days);
  const fromDay = keys[0];

  const profile = await findProfileByUserId(userId);

  let docs = [];
  let visitors = { people: 0, tappers: 0 };

  if (profile) {
    [docs, visitors] = await Promise.all([
      findDailyStats(profile._id, fromDay),
      countVisitors(profile._id, fromDay),
    ]);
  }

  /* chart: har din ek point (khali din = 0) */
  const byDay = new Map(keys.map((key) => [key, { date: key, visits: 0, taps: 0 }]));

  const devices = {};
  const countries = {};
  const sources = {};
  const links = {};
  const titles = {};

  let visits = 0;
  let taps = 0;

  /* docs day ke hisaab se sorted hain, isliye title me sabse naya jeetega */
  for (const doc of docs) {
    const point = byDay.get(doc.day);
    if (!point) continue;

    point.visits = doc.visits || 0;
    point.taps = doc.taps || 0;
    visits += point.visits;
    taps += point.taps;

    addCounts(devices, doc.devices);
    addCounts(countries, doc.countries, true);
    addCounts(sources, doc.sources, true);
    addCounts(links, doc.links, true);

    for (const [key, title] of Object.entries(doc.linkTitles || {})) {
      titles[decodeKey(key)] = title;
    }
  }

  const { people, tappers } = visitors;

  return {
    range,
    isPublished: Boolean(profile?.isPublished),

    visits,
    taps,
    people,
    tapRate: people > 0 ? Math.min(100, Math.round((tappers / people) * 100)) : 0,

    series: [...byDay.values()],

    topLinks: topItems(links).map(([key, count]) => ({
      key,
      label: titles[key] || key.slice(key.indexOf(":") + 1),
      kind: key.slice(0, key.indexOf(":")),
      count,
    })),

    devices: topItems(devices).map(([name, count]) => ({
      key: name,
      label: name,
      count,
    })),

    countries: topItems(countries).map(([code, count]) => {
      const real = code === "ZZ" ? "" : code;
      return { key: code, code: real, label: countryName(real), count };
    }),

    sources: topItems(sources).map(([name, count]) => ({
      key: name,
      label: name,
      count,
    })),
  };
}
