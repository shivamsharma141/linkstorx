import mongoose from "mongoose";

/*
 * "People" (unique visitors) ke liye.
 * Ek profile + ek visitor = HAMESHA sirf ek document.
 * Wahi banda kal, parso, ya 50 baar aaye -> wahi document update hota hai.
 * Last activity ke 30 din baad document apne aap delete
 * (uska hisaab AnalyticsMonthly me pehle hi jama ho chuka hota hai).
 */
const analyticsVisitorSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },

    visitorId: { type: String, required: true, maxlength: 64 },

    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },

    /* last baar kab kisi link par tap kiya (tap rate ke liye) */
    lastTappedAt: { type: Date, default: null },

    visits: { type: Number, default: 0 },
    taps: { type: Number, default: 0 },
  },
  { versionKey: false }
);

/* Duplicate kabhi nahi banega + upsert isi se fast */
analyticsVisitorSchema.index({ profileId: 1, visitorId: 1 }, { unique: true });

/* Dashboard: range me active visitors */
analyticsVisitorSchema.index({ profileId: 1, lastSeenAt: -1 });

/* Last activity ke 30 din baad auto delete */
analyticsVisitorSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.models.AnalyticsVisitor ||
  mongoose.model("AnalyticsVisitor", analyticsVisitorSchema);