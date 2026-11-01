import mongoose from "mongoose";

/*
 * Ek profile ka ek din = ek document (events nahi, sirf counters).
 * 1 lakh visits bhi hon toh bhi din ka doc ek hi rehta hai.
 *
 * devices / countries / sources / links = { naam: count } maps ($inc se badhte hain)
 * linkTitles = { linkKey: latest title }
 * Map keys me "." ya "$" nahi ho sakta, isliye queries file encode karti hai.
 */
const analyticsDailySchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },

    /* IST ka din, "YYYY-MM-DD" */
    day: { type: String, required: true },

    visits: { type: Number, default: 0 },
    taps: { type: Number, default: 0 },

    devices: { type: mongoose.Schema.Types.Mixed, default: {} },
    countries: { type: mongoose.Schema.Types.Mixed, default: {} },
    sources: { type: mongoose.Schema.Types.Mixed, default: {} },
    links: { type: mongoose.Schema.Types.Mixed, default: {} },
    linkTitles: { type: mongoose.Schema.Types.Mixed, default: {} },

    createdAt: { type: Date, default: Date.now },
  },
  { minimize: false }
);

/* upsert + dashboard range query dono isi se */
analyticsDailySchema.index({ profileId: 1, day: 1 }, { unique: true });

/* 90 din baad apne aap delete */
analyticsDailySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.models.AnalyticsDaily ||
  mongoose.model("AnalyticsDaily", analyticsDailySchema);