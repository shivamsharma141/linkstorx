import {
  findProfileByUserId,
  findProfileByUsername,
} from "@/app/databaseQueries/profileDatabaseQueries";

import {
  recordVisit,
  recordTap,
  findMonthlyStats,
  decodeKey,
} from "@/app/databaseQueries/analyticsDatabaseQueries";

/* =========================================================
   CONSTANTS
========================================================= */

const TIMEZONE = "Asia/Kolkata"; // IST me din kaatenge (no DST, fixed +05:30)
const RANGE_DAYS = { "7d": 7, "30d": 30 };
const MONTH_RANGE = "12m";
const MONTHS_BACK = 12;
const LINK_KINDS = ["link", "offer", "social", "store"];

/* linkId ka format (random garbage se maps ki keys na badhein) */
const LINK_ID_PATTERN = /^[a-zA-Z0-9_-]{1,60}$/;

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

/* Priority: ?ref= / utm_source  ->  Referer header  ->  in-app browser (UA)  ->  Direct.
   Unknown source "Other" ban jaata hai (spam se maps ki keys na badhein). */
function resolveSource({ ref, referrer, userAgent, ownHost }) {
  const refParam = String(ref || "").trim().slice(0, 40);

  if (refParam) {
    return matchSource(refParam) || "Other";
  }

  const host = hostOf(referrer);

  if (host && host !== ownHost) {
    return matchSource(host) || "Other";
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
   DATE HELPERS
========================================================= */

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/* =========================================================
   TRACK (public)
========================================================= */

export async function trackEvent(input, context) {
  const {
    userAgent = "",
    country = "",
    host = "",
    viewerUserId = null,
    cookies = null,
  } = context;

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

  const device = parseDevice(userAgent);

  const source = resolveSource({
    ref: input?.ref,
    referrer: input?.referrer,
    userAgent,
    ownHost: String(host).replace(/^www\./, "").toLowerCase(),
  });

  const day = dayFormatter.format(new Date());
  const month = day.slice(0, 7);

  /* Cookie me "aakhri baar kis din aaya / tap kiya" likha hota hai (YYYY-MM-DD).
     Isi se pata chalta hai ki banda aaj / is mahine pehli baar aaya ya nahi. */
  const readDay = (name) => {
    const value = cookies?.get?.(name)?.value || "";
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  };

  if (type === "visit") {
    const cookieName = `an_v_${profile._id}`;
    const last = readDay(cookieName);

    await recordVisit({
      profileId: profile._id,
      day,
      newToday: last !== day,
      newThisMonth: !last || last.slice(0, 7) !== month,
      device,
      country: parseCountry(country),
      source,
    });

    return { tracked: true, cookie: { name: cookieName, value: day } };
  }

  const linkId = String(input?.linkId || "").trim();
  const linkKind = LINK_KINDS.includes(input?.linkKind) ? input.linkKind : "";

  if (!LINK_ID_PATTERN.test(linkId) || !linkKind) {
    throw createAppError("Invalid tap.", 400);
  }

  const tapCookie = `an_t_${profile._id}`;
  const lastTap = readDay(tapCookie);

  await recordTap({
    profileId: profile._id,
    day,
    newTapperToday: lastTap !== day,
    newTapperThisMonth: !lastTap || lastTap.slice(0, 7) !== month,
    linkKey: `${linkKind}:${linkId}`,
    linkTitle: String(input?.linkTitle || "").trim().slice(0, 80),
  });

  return { tracked: true, cookie: { name: tapCookie, value: day } };
}

/* =========================================================
   READ (owner dashboard)
========================================================= */

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

/* "YYYY-MM" ki list: pichle 12 mahine (aaj ka mahina milakar), purana pehle */
function buildMonthKeys(count) {
  const [year, month] = dayFormatter.format(new Date()).slice(0, 7).split("-").map(Number);
  const keys = [];

  for (let i = count - 1; i >= 0; i--) {
    const total = year * 12 + (month - 1) - i;
    const y = Math.floor(total / 12);
    const m = (total % 12) + 1;
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
  }

  return keys;
}

function buildResponse({
  range,
  profile,
  series,
  visits,
  taps,
  people,
  tappers,
  devices,
  countries,
  sources,
  links,
  titles,
}) {
  return {
    range,
    isPublished: Boolean(profile?.isPublished),

    visits,
    taps,
    people,
    tapRate: people > 0 ? Math.min(100, Math.round((tappers / people) * 100)) : 0,

    series,

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

/* 12 mahine: monthly docs ke top-level totals se (chart me har mahine ka ek point) */
async function getMonthlyAnalytics(profile) {
  const keys = buildMonthKeys(MONTHS_BACK);

  const docs = profile ? await findMonthlyStats(profile._id, keys[0]) : [];

  const byMonth = new Map(keys.map((key) => [key, { date: key, visits: 0, taps: 0 }]));

  const devices = {};
  const countries = {};
  const sources = {};
  const links = {};
  const titles = {};

  let visits = 0;
  let taps = 0;
  let people = 0;
  let tappers = 0;

  /* docs month ke hisaab se sorted hain, isliye title me sabse naya jeetega */
  for (const doc of docs) {
    const point = byMonth.get(doc.month);
    if (!point) continue;

    point.visits = doc.visits || 0;
    point.taps = doc.taps || 0;
    visits += point.visits;
    taps += point.taps;

    /* har mahine ke unique log jodte hain (insaan har mahine me ek baar ginta hai) */
    people += doc.people || 0;
    tappers += doc.tappers || 0;

    addCounts(devices, doc.devices);
    addCounts(countries, doc.countries, true);
    addCounts(sources, doc.sources, true);
    addCounts(links, doc.links, true);

    for (const [key, title] of Object.entries(doc.linkTitles || {})) {
      titles[decodeKey(key)] = title;
    }
  }

  return buildResponse({
    range: MONTH_RANGE,
    profile,
    series: [...byMonth.values()],
    visits,
    taps,
    people,
    tappers,
    devices,
    countries,
    sources,
    links,
    titles,
  });
}

export async function getAnalytics(userId, rangeParam) {
  if (!userId) {
    throw createAppError("User authentication is required.", 401);
  }

  const profile = await findProfileByUserId(userId);

  if (rangeParam === MONTH_RANGE) {
    return getMonthlyAnalytics(profile);
  }

  const range = RANGE_DAYS[rangeParam] ? rangeParam : "7d";
  const keys = buildDayKeys(RANGE_DAYS[range]);
  const fromDay = keys[0];

  /* range max 30 din ka hai, toh max 2 monthly docs */
  const docs = profile ? await findMonthlyStats(profile._id, fromDay.slice(0, 7)) : [];

  /* chart: har din ek point (khali din = 0) */
  const byDay = new Map(keys.map((key) => [key, { date: key, visits: 0, taps: 0 }]));

  const devices = {};
  const countries = {};
  const sources = {};
  const links = {};
  const titles = {};

  let visits = 0;
  let taps = 0;
  let people = 0;
  let tappers = 0;

  for (const doc of docs) {
    for (const [day, d] of Object.entries(doc.days || {})) {
      const point = byDay.get(day);
      if (!point) continue;

      point.visits = d.visits || 0;
      point.taps = d.taps || 0;
      visits += point.visits;
      taps += point.taps;

      /* har din ke unique log jodte hain (7d/30d me ye approx hai) */
      people += d.people || 0;
      tappers += d.tappers || 0;

      addCounts(devices, d.devices);
      addCounts(countries, d.countries, true);
      addCounts(sources, d.sources, true);
      addCounts(links, d.links, true);
    }

    /* docs month ke hisaab se sorted hain, isliye title me sabse naya jeetega */
    for (const [key, title] of Object.entries(doc.linkTitles || {})) {
      titles[decodeKey(key)] = title;
    }
  }

  return buildResponse({
    range,
    profile,
    series: [...byDay.values()],
    visits,
    taps,
    people,
    tappers,
    devices,
    countries,
    sources,
    links,
    titles,
  });
}