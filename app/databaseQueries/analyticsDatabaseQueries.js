import { connectToDatabase } from "@/app/lib/database/mongodb";
import AnalyticsMonthly from "@/app/databaseModels/AnalyticsMonthly";

/* Mongo map keys me "." aur "$" allowed nahi */
export function encodeKey(value) {
  return String(value).replace(/\./g, "\u2024").replace(/\$/g, "\uFF04");
}

export function decodeKey(value) {
  return String(value).replace(/\u2024/g, ".").replace(/\uFF04/g, "$");
}

/* Do requests ek saath nayi row banayein toh unique index ek ko fail karta hai: ek baar retry */
async function upsertMonth(filter, update) {
  const options = { upsert: true };

  try {
    await AnalyticsMonthly.updateOne(filter, update, options);
  } catch (error) {
    if (error?.code !== 11000) throw error;
    await AnalyticsMonthly.updateOne(filter, update, options);
  }
}

/*
 * Counters 2 jagah badhte hain: mahine ke total me, aur us din ke andar (days.<din>.*).
 * newThisMonth / newToday cookie se aate hain (controller dekho), DB me visitor row nahi.
 */
export async function recordVisit({
  profileId,
  day,
  newThisMonth,
  newToday,
  device,
  country,
  source,
}) {
  await connectToDatabase();

  const now = new Date();
  const month = day.slice(0, 7);

  const counters = (prefix) => ({
    [`${prefix}visits`]: 1,
    [`${prefix}devices.${device}`]: 1,
    [`${prefix}countries.${encodeKey(country || "ZZ")}`]: 1,
    [`${prefix}sources.${encodeKey(source)}`]: 1,
  });

  const inc = { ...counters(""), ...counters(`days.${day}.`) };

  if (newThisMonth) inc.people = 1;
  if (newToday) inc[`days.${day}.people`] = 1;

  await upsertMonth(
    { profileId, month },
    { $inc: inc, $setOnInsert: { createdAt: now } }
  );
}

export async function recordTap({
  profileId,
  day,
  newTapperThisMonth,
  newTapperToday,
  linkKey,
  linkTitle,
}) {
  await connectToDatabase();

  const now = new Date();
  const month = day.slice(0, 7);
  const key = encodeKey(linkKey);

  const inc = {
    taps: 1,
    [`links.${key}`]: 1,
    [`days.${day}.taps`]: 1,
    [`days.${day}.links.${key}`]: 1,
  };

  if (newTapperThisMonth) inc.tappers = 1;
  if (newTapperToday) inc[`days.${day}.tappers`] = 1;

  await upsertMonth(
    { profileId, month },
    {
      $inc: inc,
      $set: { [`linkTitles.${key}`]: linkTitle },
      $setOnInsert: { createdAt: now },
    }
  );
}

/* Dashboard: fromMonth ("YYYY-MM") se aaj tak ke monthly docs
   (7d/30d ke liye max 2, 12m ke liye max 12) */
export async function findMonthlyStats(profileId, fromMonth) {
  await connectToDatabase();

  return AnalyticsMonthly.find({ profileId, month: { $gte: fromMonth } })
    .sort({ month: 1 })
    .lean();
}