import mongoose from "mongoose";

const { Schema } = mongoose;

export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

// Buyer sirf in statuses mein cancel kar sakta hai (shipped ke baad nahi)
export const BUYER_CANCELLABLE = ["pending", "confirmed"];

const OrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String, default: "" },
    image: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 }, // price at the time of order
    currency: { type: String, default: "INR" },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
    trackInventory: { type: Boolean, default: false }, // needed to restore stock on cancel
  },
  { _id: false }
);

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sellerUsername: { type: String, required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    items: { type: [OrderItemSchema], validate: (v) => v.length > 0 },
    customer: { type: CustomerSchema, required: true },
    note: { type: String, default: "" },

    subtotal: { type: Number, required: true, min: 0 },
    totalQty: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR" },

    payment: {
      method: { type: String, default: "pay_to_seller" },
      status: { type: String, default: "pending" },
    },

    status: { type: String, enum: ORDER_STATUSES, default: "pending" },

    /* ---- NEW: cancellation info ---- */
    cancellation: {
      cancelledBy: { type: String, enum: ["", "buyer", "seller"], default: "" },
      reason: { type: String, default: "", maxlength: 300 },
      cancelledAt: { type: Date, default: null },
    },

    /* ---- NEW: seller ko alert dene ke liye ----
       Buyer cancel kare -> sellerSeen = false. Seller dashboard par
       "sellerSeen: false" wale orders ka badge/notification dikhao,
       seller dekh le to true kar do. */
    sellerSeen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

OrderSchema.index({ sellerId: 1, createdAt: -1 });
OrderSchema.index({ buyerId: 1, createdAt: -1 });
OrderSchema.index({ sellerId: 1, sellerSeen: 1 });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);