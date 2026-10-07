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
      default: "INR",
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

export default mongoose.models.Product ||
  mongoose.model("Product", productSchema);
