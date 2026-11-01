import mongoose from "mongoose";

/* Ek event = ek visit ya ek tap. Raw IP kabhi store nahi hoti. */
const analyticsEventSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },

    type: { type: String, enum: ["visit", "tap"], required: true },

    /* Browser me saved random id. "People" isi se count hota hai. */
    visitorId: { type: String, default: "", maxlength: 64 },

    /* Sirf tap ke liye */
    linkId: { type: String, default: "", maxlength: 100 },
    linkTitle: { type: String, default: "", maxlength: 80 },
    linkKind: {
      type: String,
      enum: ["link", "offer", "social", "store", ""],
      default: "",
    },

    device: { type: String, enum: ["Mobile", "Desktop", "Tablet"], default: "Desktop" },
    country: { type: String, default: "", maxlength: 2 }, // ISO code, e.g. IN
    source: { type: String, default: "Direct", maxlength: 40 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

/* Dashboard query: ek profile ke events, date range me */
analyticsEventSchema.index({ profileId: 1, createdAt: -1 });

/* Purane events apne aap delete (400 din). Storage control me rahega. */
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });

export default mongoose.models.AnalyticsEvent ||
  mongoose.model("AnalyticsEvent", analyticsEventSchema);
