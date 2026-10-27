import mongoose from "mongoose";

/* Bio max 50 words. Word check is in business logic; maxlength is a safety net. */
export const MAX_BIO_WORDS = 50;
export const MAX_BIO_CHARS = 500;

const linkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: "", maxlength: 60 },
    url: { type: String, required: true, trim: true },
    icon: { type: String, trim: true, default: "" },
    enabled: { type: Boolean, default: true },
    position: { type: Number, default: 0 },
  },
  { _id: true }
);

const primaryButtonSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, trim: true, default: "" },
    enabled: { type: Boolean, default: true },
    position: { type: Number, default: 0 },
  },
  { _id: true }
);

const socialIconSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      required: true,
      enum: ["instagram", "youtube", "linkedin", "whatsapp", "x", "facebook", "telegram", "website"],
    },
    url: { type: String, trim: true, default: "" },
    enabled: { type: Boolean, default: true },
  },
  { _id: true }
);

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    /* Independent public URL username (not the login username). */
    publicUsername: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    displayName: { type: String, trim: true, default: "" },

    bio: { type: String, trim: true, default: "", maxlength: MAX_BIO_CHARS },

    profileImage: { type: String, trim: true, default: "" },

    /* Handwritten signature shown on the cover photo (optional). */
    signatureImage: { type: String, trim: true, default: "" },

    /* Blue tick next to the name. Will be gated by subscription later. */
    verifiedBadge: { type: Boolean, default: false },

    availableForWork: {
      enabled: { type: Boolean, default: false },
      text: { type: String, trim: true, default: "Available for work", maxlength: 30 },
    },

    categoryTags: { type: [String], default: [] },

    primaryButtons: { type: [primaryButtonSchema], default: [] },

    links: { type: [linkSchema], default: [] },

    socialIcons: { type: [socialIconSchema], default: [] },

    /* themeId is the source of truth. accentColor/backgroundColor are
       derived from it on save (kept for older code / store). */
    theme: {
      themeId: { type: String, default: "crimson" },
      accentColor: { type: String, default: "#e11d48" },
      backgroundColor: { type: String, default: "#ffffff" },
    },

    /* false => draft (only owner sees it). true => live. Never goes back to draft. */
    isPublished: { type: Boolean, default: false, index: true },

    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Profile ||
  mongoose.model("Profile", profileSchema);