import mongoose from "mongoose";

/* Bio max 50 words. Word check is in business logic; maxlength is a safety net. */
export const MAX_BIO_WORDS = 50;
export const MAX_BIO_CHARS = 500;

export const MAX_OFFERS = 5;

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

/* "What I Offer" card. Max 5 per profile (business logic enforce karta hai). */
const offerItemSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "", maxlength: 60 },
    description: { type: String, trim: true, default: "", maxlength: 100 },
    image: { type: String, trim: true, default: "" },
    buttonText: { type: String, trim: true, default: "Get a Quote", maxlength: 24 },
    price: { type: String, trim: true, default: "", maxlength: 40 },

    /* form = lead form kholo (offering pre-selected), url = external link, whatsapp = chat */
    action: { type: String, enum: ["form", "url", "whatsapp"], default: "form" },
    /* url ya whatsapp number (sirf digits). form ke liye khali. */
    actionValue: { type: String, trim: true, default: "", maxlength: 500 },

    enabled: { type: Boolean, default: true },
    position: { type: Number, default: 0 },
  },
  { _id: true }
);

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // unique index: findProfileByUserId fast
    },

    /* Independent public URL username (not the login username).
       unique => MongoDB index, so /username lookups are fast. */
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

    /* Blue tick next to the name. Will be gated by subscription later. */
    verifiedBadge: { type: Boolean, default: false },

    categoryTags: { type: [String], default: [] },

    links: { type: [linkSchema], default: [] },

    socialIcons: { type: [socialIconSchema], default: [] },

    /* themeId is the source of truth. accentColor/backgroundColor are
       derived from it on save (kept for older code / store). */
    theme: {
      themeId: { type: String, default: "crimson" },
      accentColor: { type: String, default: "#e11d48" },
      backgroundColor: { type: String, default: "#ffffff" },
    },

    /* "What I Offer" section. enabled false => public page par kuch nahi dikhega. */
    offers: {
      enabled: { type: Boolean, default: false },
      title: { type: String, trim: true, default: "What I Offer", maxlength: 40 },
      subtitle: {
        type: String,
        trim: true,
        default: "Explore what I do and how I can help you.",
        maxlength: 100,
      },
      items: { type: [offerItemSchema], default: [] },
    },

    /* "Let's Work Together" inquiry form. Messages Inquiry collection me jaate hain. */
    inquiry: {
      enabled: { type: Boolean, default: false },
      title: { type: String, trim: true, default: "Let's Work Together", maxlength: 60 },
      subtitle: {
        type: String,
        trim: true,
        default: "Tell me what you need. I'll get back to you.",
        maxlength: 120,
      },
    },

    /* false => draft (only owner sees it). true => live. Never goes back to draft. */
    isPublished: { type: Boolean, default: false, index: true },

    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* ---------- INDEXES (fast search) ---------- */
// published profile ko username se dhundna (public page + store)
profileSchema.index({ isPublished: 1, publicUsername: 1 });
// display name se search / sorting
profileSchema.index({ displayName: 1 });
// category tag se search
profileSchema.index({ categoryTags: 1 });
// newest published profiles
profileSchema.index({ isPublished: 1, publishedAt: -1 });

export default mongoose.models.Profile ||
  mongoose.model("Profile", profileSchema);