import mongoose from "mongoose";

const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    /* Owning seller. Resolved via Profile.userId — never
       trust a userId sent from the frontend. */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },

    /* Unique per-seller, backend-generated. Never trust a
       frontend-supplied slug. */
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    shortDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5000,
    },

    /* Only Cloudinary secure_url strings — never base64
       or binary data. Max 5, first image = primary. */
    images: {
      type: [productImageSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: "A product can have at most 5 images.",
      },
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    compareAtPrice: {
      type: Number,
      default: null,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["INR", "USD"],
      default: "INR",
    },

    /* free = seller adds delivery cost into the price (customer sees "Free delivery")
       paid = seller charges deliveryCharge to the customer */
    deliveryType: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
    },

    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    sku: {
      type: String,
      trim: true,
      default: "",
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    trackInventory: {
      type: Boolean,
      default: true,
    },

    category: {
      type: String,
      required: true,
    },

    subcategory: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    featured: {
      type: Boolean,
      default: false,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    position: {
      type: Number,
      default: 0,
    },

    /* draft | published | archived. `enabled` stays in sync
       (enabled === status "published") so existing queries keep working. */
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* Slug is unique per seller, not globally unique — two
   sellers can each have "black-hoodie". */
productSchema.index({ userId: 1, slug: 1 }, { unique: true });
productSchema.index({ userId: 1, enabled: 1, position: 1 });
productSchema.index({ userId: 1, category: 1 });
productSchema.index({ name: "text", description: "text", tags: "text" });

/* =========================================================
   SELLER
========================================================= */

const sellerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    mobile: { type: String, required: true, trim: true },

    bankAccountHolderName: { type: String, required: true, trim: true, maxlength: 80 },
    bankName: { type: String, required: true, trim: true, maxlength: 80 },

    /* Encrypted (AES-256-GCM). select:false => never returned by
       a normal query, only when explicitly asked with +field. */
    accountNumberEnc: { type: String, required: true, select: false },
    ifscEnc: { type: String, required: true, select: false },
    accountLast4: { type: String, required: true },

    sellerStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    bankVerificationStatus: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
    },

    termsAcceptedAt: { type: Date, required: true },
    policyVersion: { type: String, required: true },
    settlementCycleDays: { type: Number, default: 7 },

    /* LinkStorx ne is seller ko ab tak kul kitna diya (paise) */
    totalPaidOutPaise: { type: Number, default: 0 },
    lastPayoutAt: { type: Date, default: null },

    rejectionReason: { type: String, default: "" },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    /* Extra safety: even if a Seller document is ever serialised
       (res.json, props, logs) the encrypted bank fields are stripped. */
    toJSON: {
      transform(doc, ret) {
        delete ret.accountNumberEnc;
        delete ret.ifscEnc;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.accountNumberEnc;
        delete ret.ifscEnc;
        return ret;
      },
    },
  }
);

export const Seller =
  mongoose.models.Seller || mongoose.model("Seller", sellerSchema);

export default mongoose.models.Product ||
  mongoose.model("Product", productSchema);