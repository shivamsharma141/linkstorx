import mongoose from "mongoose";

/* Ek user = ek subscription document (current plan). */
const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    plan: {
      type: String,
      enum: ["starter", "growth"],
      required: true,
    },

    startedAt: {
      type: Date,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    lastPaymentId: {
      type: String,
      default: "",
    },

    /* Jo orders is subscription me lag chuke hain — taaki same payment
       do baar (verify + webhook) apply hokar din double na kar de. */
    appliedOrderIds: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);