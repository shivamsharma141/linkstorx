import mongoose from "mongoose";

const { Schema } = mongoose;

export const PAYOUT_STATUSES = ["Pending", "Paid", "Failed"];

const PayoutOrderSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 0 }, // seller ka hissa
    customerName: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    deliveredAt: { type: Date, default: null },
  },
  { _id: false }
);

const PayoutRecordSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sellerName: { type: String, default: "" },
    sellerUsername: { type: String, default: "" },
    sellerEmail: { type: String, default: "" },
    sellerMobile: { type: String, default: "" },

    orderIds: { type: [Schema.Types.ObjectId], ref: "Order", default: [] },
    orders: { type: [PayoutOrderSchema], default: [] },

    amountPaise: { type: Number, required: true, min: 0 },

    status: { type: String, enum: PAYOUT_STATUSES, default: "Pending", index: true },
    utr: { type: String, default: undefined },

    /* Bank snapshot (full account number kabhi save nahi hota) */
    bank: {
      holder: { type: String, default: "" },
      bankName: { type: String, default: "" },
      ifsc: { type: String, default: "" },
      last4: { type: String, default: "" },
    },

    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, default: "", maxlength: 300 },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

/* Ek UTR sirf ek payout mein use ho sakta hai */
PayoutRecordSchema.index(
  { utr: 1 },
  { unique: true, partialFilterExpression: { utr: { $type: "string" } } }
);
PayoutRecordSchema.index({ sellerId: 1, createdAt: -1 });

export default mongoose.models.PayoutRecord ||
  mongoose.model("PayoutRecord", PayoutRecordSchema);