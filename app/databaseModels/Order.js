import mongoose from "mongoose";

const { Schema } = mongoose;

export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

// Buyer sirf in statuses mein cancel kar sakta hai (shipped ke baad nahi)
export const BUYER_CANCELLABLE = ["pending", "confirmed"];

/*
 * payment.status:
 *   initiated       -> order bana, customer ne abhi pay nahi kiya (seller ko nahi dikhta)
 *   paid            -> Razorpay se paisa aa gaya
 *   failed          -> payment complete nahi hui / order expire ho gaya
 *   refunded        -> cancel hone par paisa wapas
 *   refund_pending  -> refund try kiya par fail hua (admin ko dekhna hai)
 *   pending         -> purane (pay_to_seller) orders
 */
export const PAYMENT_STATES = ["initiated", "paid", "failed", "refunded", "refund_pending", "pending"];

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
    deliveryCharge: { type: Number, default: 0, min: 0 }, // is product ka delivery charge (ek baar, quantity se multiply nahi)
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

    subtotal: { type: Number, required: true, min: 0 }, // sirf items ka total
    deliveryTotal: { type: Number, default: 0, min: 0 }, // saare products ka delivery charge
    total: { type: Number, default: 0, min: 0 }, // subtotal + deliveryTotal = customer ne kitna pay kiya
    totalQty: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR" },

    /* ---- payment (customer ne kitna pay kiya, Razorpay ids) ---- */
    payment: {
      method: { type: String, default: "pay_to_seller" }, // "razorpay" (COD coming soon)
      status: { type: String, enum: PAYMENT_STATES, default: "pending" },
      amountPaise: { type: Number, default: 0 }, // customer ne kitna pay kiya (paise)
      razorpayOrderId: { type: String, default: "", index: true },
      razorpayPaymentId: { type: String, default: "" },
      paidAt: { type: Date, default: null },
      refundId: { type: String, default: "" },
      refundedAt: { type: Date, default: null },
    },

    /* ---- settlement (seller ko kitna milega) — sab paise mein ---- */
    settlement: {
      gatewayFeePaise: { type: Number, default: 0 }, // Razorpay 2%
      gstOnFeePaise: { type: Number, default: 0 }, // 18% GST on that fee
      platformFeePaise: { type: Number, default: 0 }, // LinkStorX flat commission
      sellerNetPaise: { type: Number, default: 0 }, // seller ka final hissa
      deliveredAt: { type: Date, default: null },
      payoutDueBy: { type: Date, default: null }, // deliveredAt + 7 din
      payoutStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
      paidOutAt: { type: Date, default: null },
    },

    status: { type: String, enum: ORDER_STATUSES, default: "pending" },

    cancellation: {
      cancelledBy: { type: String, enum: ["", "buyer", "seller"], default: "" },
      reason: { type: String, default: "", maxlength: 300 },
      cancelledAt: { type: Date, default: null },
    },

    /* Seller ko alert dene ke liye: naya order (paid hone par) ya buyer cancel
       -> sellerSeen = false. Seller khol le to true. */
    sellerSeen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

OrderSchema.index({ sellerId: 1, createdAt: -1 });
OrderSchema.index({ buyerId: 1, createdAt: -1 });
OrderSchema.index({ sellerId: 1, sellerSeen: 1 });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);