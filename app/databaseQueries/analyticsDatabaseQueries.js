import mongoose from "mongoose";

import { connectToDatabase } from "@/app/lib/database/mongodb";
import AnalyticsDaily from "@/app/databaseModels/AnalyticsDaily";
import AnalyticsVisitor from "@/app/databaseModels/AnalyticsVisitor";

/* Mongo map keys me "." aur "$" allowed nahi */
export function encodeKey(value) {
  return String(value).replace(/\./g, "\u2024").replace(/\$/g, "\uFF04");
}

export function decodeKey(value) {
  return String(value).replace(/\u2024/g, ".").replace(/\uFF04/g, "$");
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

export async function recordVisit({ profileId, day, visitorId, device, country, source }) {
  await connectToDatabase();

  const now = new Date();

  const jobs = [
    upsert(
      AnalyticsDaily,
      { profileId, day },
      {
        $inc: {
          visits: 1,
          [`devices.${device}`]: 1,
          [`countries.${encodeKey(country || "ZZ")}`]: 1,
          [`sources.${encodeKey(source)}`]: 1,
        },
        $setOnInsert: { createdAt: new Date() },
      }
    ),
  ];

  if (visitorId) {
    jobs.push(
      upsert(
        AnalyticsVisitor,
        { profileId, visitorId },
        {
          $setOnInsert: { firstSeenAt: now },
          $set: { lastSeenAt: now },
          $inc: { visits: 1 },
        }
      )
    );
  }

  await Promise.all(jobs);
}

export async function recordTap({ profileId, day, visitorId, linkKey, linkTitle }) {
  await connectToDatabase();

  const now = new Date();

  const key = encodeKey(linkKey);

  const jobs = [
    upsert(
      AnalyticsDaily,
      { profileId, day },
      {
        $inc: { taps: 1, [`links.${key}`]: 1 },
        $set: { [`linkTitles.${key}`]: linkTitle },
        $setOnInsert: { createdAt: new Date() },
      }
    ),
  ];

  if (visitorId) {
    jobs.push(
      upsert(
        AnalyticsVisitor,
        { profileId, visitorId },
        {
          $setOnInsert: { firstSeenAt: now },
          $set: { lastSeenAt: now, lastTappedAt: now },
          $inc: { taps: 1 },
        }
      )
    );
  }

  await Promise.all(jobs);
}

/* Dashboard: range ke daily docs (max 90) */
export async function findDailyStats(profileId, fromDay) {
  await connectToDatabase();

  return AnalyticsDaily.find({ profileId, day: { $gte: fromDay } })
    .sort({ day: 1 })
    .lean();
}

/* IST ke din ki shuruaat ("YYYY-MM-DD" -> Date) */
function startOfDayIST(day) {
  return new Date(`${day}T00:00:00+05:30`);
}

/*
 * Dashboard: unique visitors + unique tappers.
 * Ek visitor = ek document, isliye seedha count (aggregate ki zarurat nahi).
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