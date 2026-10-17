import mongoose from "mongoose";

/* Bio max 150 words. Words ka check business logic mein hota hai,
   yahan maxlength sirf safety net hai (150 words < 1500 chars). */
export const MAX_BIO_WORDS = 150;
export const MAX_BIO_CHARS = 1500;

const linkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    icon: {
      type: String,
      trim: true,
      default: "",
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    position: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

const primaryButtonSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      trim: true,
      default: "",
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    position: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

const socialIconSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      required: true,
      enum: [
        "instagram",
        "youtube",
        "linkedin",
        "whatsapp",
        "x",
        "facebook",
        "telegram",
        "website",
      ],
    },

    url: {
      type: String,
      trim: true,
      default: "",
    },

    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: true,
  }
);

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    /*
     * Independent public URL username.
     * Not linked to the account/login username.
     */
    publicUsername: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    displayName: {
      type: String,
      trim: true,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_BIO_CHARS,
    },

    profileImage: {
      type: String,
      trim: true,
      default: "",
    },

    categoryTags: {
      type: [String],
      default: [],
    },

    primaryButtons: {
      type: [primaryButtonSchema],
      default: [],
    },

    links: {
      type: [linkSchema],
      default: [],
    },

    socialIcons: {
      type: [socialIconSchema],
      default: [],
    },

    theme: {
      accentColor: {
        type: String,
        default: "#2563eb",
      },
      backgroundColor: {
        type: String,
        default: "#f5f0e9",
      },
    },

    /*
     * Publish state.
     * false => draft: sirf owner preview mein dekh sakta hai.
     * true  => live: public URL (profile + store) pe sab dekh sakte hain,
     *          aur har save automatically live page update karta hai.
     * Ek baar publish hone ke baad wapas draft nahi hota.
     */
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Profile ||
  mongoose.model("Profile", profileSchema);