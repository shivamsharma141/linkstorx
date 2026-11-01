import mongoose from "mongoose";

/* Public form se aaya message. Seller ke Inbox me dikhega. */
const inquirySchema = new mongoose.Schema(
  {
    /* Seller (profile owner). Server khud resolve karta hai, frontend se nahi aata. */
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: { type: String, required: true, trim: true, maxlength: 80 },

    contact: { type: String, required: true, trim: true, maxlength: 120 },
    contactType: { type: String, enum: ["email", "phone"], required: true },

    /* Jo offering visitor ne select ki (ya "Other") */
    offering: { type: String, trim: true, default: "", maxlength: 80 },

    message: { type: String, trim: true, default: "", maxlength: 1000 },

    status: { type: String, enum: ["unread", "read"], default: "unread" },

    /* HMAC hash, raw IP store nahi hoti. Sirf rate limit ke liye. */
    ipHash: { type: String, required: true },
  },
  { timestamps: true }
);

/* Inbox: seller ke messages, newest first (+ unread filter) */
inquirySchema.index({ sellerId: 1, createdAt: -1 });
inquirySchema.index({ sellerId: 1, status: 1, createdAt: -1 });

/* Rate limit lookup */
inquirySchema.index({ ipHash: 1, createdAt: -1 });

export default mongoose.models.Inquiry ||
  mongoose.model("Inquiry", inquirySchema);