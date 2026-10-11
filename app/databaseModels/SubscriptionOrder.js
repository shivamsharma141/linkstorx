import mongoose from "mongoose";

/* Har payment attempt ka record. Amount SERVER ne set kiya hota hai. */
const subscriptionOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["starter", "growth"],
      required: true,
    },

    amountPaise: {
      type: Number,
      required: true,
      min: 100,
    },

    currency: {
      type: String,
      default: "INR",
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    razorpayPaymentId: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["created", "paid"],
      default: "created",
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

subscriptionOrderSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default mongoose.models.SubscriptionOrder ||
  mongoose.model("SubscriptionOrder", subscriptionOrderSchema);