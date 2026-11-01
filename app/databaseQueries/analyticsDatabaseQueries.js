import mongoose from "mongoose";

import { connectToDatabase } from "@/app/lib/database/mongodb";
import AnalyticsEvent from "@/app/databaseModels/AnalyticsEvent";

export async function createAnalyticsEvent(data) {
  await connectToDatabase();

  return AnalyticsEvent.create(data);
}

function breakdown(field) {
  return [
    { $match: { type: "visit" } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ];
}

/* Ek hi query me saare numbers */
export async function aggregateAnalytics(profileId, since, timezone) {
  await connectToDatabase();

  const [result] = await AnalyticsEvent.aggregate([
    {
      $match: {
        profileId: new mongoose.Types.ObjectId(String(profileId)),
        createdAt: { $gte: since },
      },
    },
    {
      $facet: {
        /* visits / taps total */
        totals: [{ $group: { _id: "$type", count: { $sum: 1 } } }],

        /* distinct visitors: visit karne wale aur tap karne wale */
        people: [
          { $match: { visitorId: { $ne: "" } } },
          { $group: { _id: { type: "$type", v: "$visitorId" } } },
          { $group: { _id: "$_id.type", count: { $sum: 1 } } },
        ],

        /* din ke hisaab se */
        series: [
          {
            $group: {
              _id: {
                day: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone },
                },
                type: "$type",
              },
              count: { $sum: 1 },
            },
          },
        ],

        topLinks: [
          { $match: { type: "tap" } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: { kind: "$linkKind", id: "$linkId" },
              title: { $first: "$linkTitle" },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ],

        devices: breakdown("device"),
        countries: breakdown("country"),
        sources: breakdown("source"),
      },
    },
  ]);

  return result || {};
}
