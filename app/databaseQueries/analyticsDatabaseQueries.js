import mongoose from "mongoose";

import { connectToDatabase } from "@/app/lib/database/mongodb";
import AnalyticsDaily from "@/app/databaseModels/AnalyticsDaily";
import AnalyticsMonthly from "@/app/databaseModels/AnalyticsMonthly";
import AnalyticsVisitor from "@/app/databaseModels/AnalyticsVisitor";

/* Mongo map keys me "." aur "$" allowed nahi */
export function encodeKey(value) {
  return String(value).replace(/\./g, "\u2024").replace(/\$/g, "\uFF04");
}

export function decodeKey(value) {
  return String(value).replace(/\u2024/g, ".").replace(/\uFF04/g, "$");
}

/* IST ka mahina ("YYYY-MM") kisi bhi Date se */
const istDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function monthKeyOf(date) {
  return istDayFormatter.format(new Date(date)).slice(0, 7);
}

/* Do requests ek saath nayi row banayein toh unique index ek ko fail karta hai: ek baar retry */
async function upsert(model, filter, update) {
  const options = { upsert: true };

  try {
    await model.updateOne(filter, update, options);
  } catch (error) {
    if (error?.code !== 11000) throw error;
    await model.updateOne(filter, update, options);
  }
}

/*
 * Visitor document upsert karta hai aur UPDATE SE PEHLE wali haalat wapas deta hai
 * (naya visitor ho toh null). Isse pata chalta hai ki ye banda is mahine pehli baar
 * aaya ya nahi, taaki monthly "people" sirf ek baar badhe.
 */
async function touchVisitor(filter, update) {
  const options = { upsert: true, new: false };

  try {
    return await AnalyticsVisitor.findOneAndUpdate(filter, update, options).lean();
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return AnalyticsVisitor.findOneAndUpdate(filter, update, options).lean();
  }
}

export async function recordVisit({ profileId, day, visitorId, device, country, source }) {
  await connectToDatabase();

  const now = new Date();
  const month = day.slice(0, 7);

  /* Ye visitor is mahine pehli baar aaya? (visitorId na ho toh people nahi ginte) */
  let newThisMonth = false;

  if (visitorId) {
    const before = await touchVisitor(
      { profileId, visitorId },
      {
        $setOnInsert: { firstSeenAt: now },
        $set: { lastSeenAt: now },
        $inc: { visits: 1 },
      }
    );

    newThisMonth = !before || monthKeyOf(before.lastSeenAt) !== month;
  }

  const counters = {
    visits: 1,
    [`devices.${device}`]: 1,
    [`countries.${encodeKey(country || "ZZ")}`]: 1,
    [`sources.${encodeKey(source)}`]: 1,
  };

  await Promise.all([
    upsert(
      AnalyticsDaily,
      { profileId, day },
      { $inc: counters, $setOnInsert: { createdAt: now } }
    ),
    upsert(
      AnalyticsMonthly,
      { profileId, month },
      {
        $inc: newThisMonth ? { ...counters, people: 1 } : counters,
        $setOnInsert: { createdAt: now },
      }
    ),
  ]);
}

export async function recordTap({ profileId, day, visitorId, linkKey, linkTitle }) {
  await connectToDatabase();

  const now = new Date();
  const month = day.slice(0, 7);
  const key = encodeKey(linkKey);

  let newPersonThisMonth = false;
  let newTapperThisMonth = false;

  if (visitorId) {
    const before = await touchVisitor(
      { profileId, visitorId },
      {
        $setOnInsert: { firstSeenAt: now },
        $set: { lastSeenAt: now, lastTappedAt: now },
        $inc: { taps: 1 },
      }
    );

    newPersonThisMonth = !before || monthKeyOf(before.lastSeenAt) !== month;
    newTapperThisMonth =
      !before?.lastTappedAt || monthKeyOf(before.lastTappedAt) !== month;
  }

  const monthlyInc = { taps: 1, [`links.${key}`]: 1 };
  if (newPersonThisMonth) monthlyInc.people = 1;
  if (newTapperThisMonth) monthlyInc.tappers = 1;

  await Promise.all([
    upsert(
      AnalyticsDaily,
      { profileId, day },
      {
        $inc: { taps: 1, [`links.${key}`]: 1 },
        $set: { [`linkTitles.${key}`]: linkTitle },
        $setOnInsert: { createdAt: now },
      }
    ),
    upsert(
      AnalyticsMonthly,
      { profileId, month },
      {
        $inc: monthlyInc,
        $set: { [`linkTitles.${key}`]: linkTitle },
        $setOnInsert: { createdAt: now },
      }
    ),
  ]);
}

/* Dashboard (7d / 30d): range ke daily docs (max 30) */
export async function findDailyStats(profileId, fromDay) {
  await connectToDatabase();

  return AnalyticsDaily.find({ profileId, day: { $gte: fromDay } })
    .sort({ day: 1 })
    .lean();
}

/* Dashboard (12 months): monthly docs (max 12) */
export async function findMonthlyStats(profileId, fromMonth) {
  await connectToDatabase();

  return AnalyticsMonthly.find({ profileId, month: { $gte: fromMonth } })
    .sort({ month: 1 })
    .lean();
}

/* IST ke din ki shuruaat ("YYYY-MM-DD" -> Date) */
function startOfDayIST(day) {
  return new Date(`${day}T00:00:00+05:30`);
}

/*
 * Dashboard (7d / 30d): unique visitors + unique tappers.
 * Ek visitor = ek document, isliye seedha count.
 * "lastSeenAt >= range start" = us range me kam se kam ek baar aaya.
 */
export async function countVisitors(profileId, fromDay) {
  await connectToDatabase();

  const from = startOfDayIST(fromDay);
  const id = new mongoose.Types.ObjectId(String(profileId));

  const [people, tappers] = await Promise.all([
    AnalyticsVisitor.countDocuments({ profileId: id, lastSeenAt: { $gte: from } }),
    AnalyticsVisitor.countDocuments({
      profileId: id,
      lastSeenAt: { $gte: from },
      lastTappedAt: { $gte: from },
    }),
  ]);

  return { people, tappers };
}