import crypto from "crypto";

import { ORDER_STATUSES, BUYER_CANCELLABLE } from "@/app/databaseModels/Order";
import {
  isValidId,
  findProductsByIds,
  reserveStock,
  releaseStock,
  createOrder,
  findOrderByNumber,
  listOrders,
  setOrderStatus,
  cancelOrderByBuyerAtomic,
  findOrderByRazorpayId,
  patchOrder,
  markOrderPaid,
  expireUnpaidOrders,
} from "@/app/databaseQueries/orderQueries";
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  verifyPaymentSignature,
  refundRazorpayPayment,
} from "@/app/lib/razorpay/razorpay";
import { FEE_CONFIG, toPaise, calcSettlement, payoutDueDate } from "@/app/lib/razorpay/settlement";

export class OrderError extends Error {
  constructor(message, status = 400, fields = null) {
    super(message);
    this.name = "OrderError";
    this.status = status;
    this.fields = fields;
  }
}

const MAX_LINES = 50;
const MAX_QTY = 99;

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const round2 = (n) => Math.round(n * 100) / 100;
const sameId = (a, b) => String(a) === String(b);

// Seller ko wahi orders dikhte hain jinka payment aa chuka ho (ya purane orders)
export const HIDDEN_FROM_SELLER = ["initiated", "failed"];

/* ---------- validation ---------- */

export function validateCustomer(input = {}) {
  const customer = {
    name: str(input.name, 80),
    phone: str(input.phone, 15).replace(/\s+/g, ""),
    email: str(input.email, 120).toLowerCase(),
    address: str(input.address, 300),
    city: str(input.city, 60),
    state: str(input.state, 60),
    pincode: str(input.pincode, 6),
  };
  const note = str(input.note, 500);

  const e = {};
  if (customer.name.length < 2) e.name = "Please enter your full name";
  if (!/^[6-9]\d{9}$/.test(customer.phone)) e.phone = "Enter a valid 10-digit mobile number";
  if (customer.email && !/^\S+@\S+\.\S+$/.test(customer.email)) e.email = "Enter a valid email address";
  if (customer.address.length < 8) e.address = "Please enter your full address";
  if (!customer.city) e.city = "Please enter your city";
  if (!customer.state) e.state = "Please enter your state";
  if (!/^\d{6}$/.test(customer.pincode)) e.pincode = "Enter a valid 6-digit pincode";

  if (Object.keys(e).length) throw new OrderError(Object.values(e)[0], 422, e);
  return { customer, note };
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new OrderError("Your cart is empty.", 400);
  if (items.length > MAX_LINES) throw new OrderError("Too many items in one order.", 400);

  const merged = new Map();
  for (const it of items) {
    const id = String(it?.productId || "");
    const qty = Number(it?.quantity);
    if (!isValidId(id)) throw new OrderError("Invalid product in cart.", 400);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new OrderError(`Quantity must be between 1 and ${MAX_QTY}.`, 400);
    }
    merged.set(id, Math.min(MAX_QTY, (merged.get(id) || 0) + qty));
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

const imageOf = (p) => {
  const first = Array.isArray(p.images) ? p.images[0] : p.image || p.thumbnail || "";
  return typeof first === "string" ? first : first?.url || first?.secure_url || "";
};

function newOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = crypto.randomBytes(4).toString("hex").slice(0, 5).toUpperCase();
  return `LS-${ymd}-${rand}`;
}

/* ---------- output shape ---------- */

export function serializeOrder(o) {
  const c = o.cancellation || {};
  const p = o.payment || {};
  return {
    id: o.orderNumber,
    orderNumber: o.orderNumber,
    status: o.status,
    sellerUsername: o.sellerUsername,
    items: o.items.map((i) => ({
      productId: String(i.productId),
      name: i.name,
      slug: i.slug,
      image: i.image,
      price: i.price,
      currency: i.currency,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
      deliveryCharge: i.deliveryCharge || 0,
    })),
    customer: o.customer,
    note: o.note,
    subtotal: o.subtotal,
    deliveryTotal: o.deliveryTotal || 0,
    total: o.total > 0 ? o.total : o.subtotal, // purane orders me total nahi hota
    totalQty: o.totalQty,
    currency: o.currency,
    payment: { method: p.method, status: p.status, paidAt: p.paidAt || null },
    cancellation: {
      cancelledBy: c.cancelledBy || "",
      reason: c.reason || "",
      cancelledAt: c.cancelledAt || null,
    },
    createdAt: o.createdAt,
  };
}

/* ---------- place an order (online payment) ---------- */

export async function placeOrder({ seller, items, customer, payment, buyerId = null }) {
  // COD abhi available nahi
  const method = String(payment?.method || payment || "").toLowerCase();
  if (method === "cod" || method === "pay_to_seller") {
    throw new OrderError("Cash on Delivery is coming soon. Please pay online.", 400);
  }
  if (method !== "razorpay") throw new OrderError("Please choose a payment method.", 400);

  const { customer: cleanCustomer, note } = validateCustomer(customer);
  const lines = normalizeItems(items);

  // Purane unpaid orders ka stock wapas
  try {
    await expireUnpaidOrders(FEE_CONFIG.unpaidExpiryMinutes);
  } catch (err) {
    console.error("expire unpaid orders failed:", err);
  }

  // Prices, delivery charges and seller always come from the DB, never from the browser
  const products = await findProductsByIds(lines.map((l) => l.productId));
  const byId = new Map(products.map((p) => [String(p._id), p]));

  let sellerDoc = null;
  const orderItems = [];

  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p || !p.enabled) throw new OrderError("One of the products is no longer available.", 409);
    if (!p.userId?.username) throw new OrderError("One of the products is no longer available.", 409);

    if (!sellerDoc) sellerDoc = p.userId;
    else if (!sameId(sellerDoc._id, p.userId._id)) {
      throw new OrderError("You can only order from one seller at a time.", 400);
    }

    if (p.trackInventory && (Number(p.stock) || 0) < line.quantity) {
      const left = Math.max(0, Number(p.stock) || 0);
      throw new OrderError(
        left === 0 ? `"${p.name}" is out of stock.` : `Only ${left} left for "${p.name}".`,
        409
      );
    }

    orderItems.push({
      productId: p._id,
      name: p.name,
      slug: p.slug || "",
      image: imageOf(p),
      price: Number(p.price),
      currency: p.currency || "INR",
      quantity: line.quantity,
      lineTotal: round2(Number(p.price) * line.quantity),
      // Delivery: seller ne "paid" chuna ho to hi charge; ek product ka ek hi baar
      deliveryCharge:
        p.deliveryType === "paid" ? Math.max(0, Number(p.deliveryCharge) || 0) : 0,
      trackInventory: Boolean(p.trackInventory),
    });
  }

  const claimed = str(seller, 60).toLowerCase();
  if (claimed && claimed !== sellerDoc.username.toLowerCase()) {
    throw new OrderError("Cart does not match this seller.", 400);
  }

  // Razorpay sirf INR mein
  if (orderItems.some((i) => i.currency !== "INR")) {
    throw new OrderError("Online payment is available for INR products only.", 400);
  }

  const subtotal = round2(orderItems.reduce((s, i) => s + i.lineTotal, 0));
  const deliveryTotal = round2(orderItems.reduce((s, i) => s + i.deliveryCharge, 0));
  const total = round2(subtotal + deliveryTotal); // customer yahi pay karega
  const amountPaise = toPaise(total);
  if (amountPaise < 100) throw new OrderError("Order amount is too low for online payment.", 400);

  // Fees poore paid amount (items + delivery) par lagti hain
  const fees = calcSettlement(amountPaise);

  const stock = await reserveStock(orderItems);
  if (!stock.ok) throw new OrderError("Sorry, an item just went out of stock.", 409);

  const data = {
    sellerId: sellerDoc._id,
    sellerUsername: sellerDoc.username,
    buyerId: buyerId || null,
    items: orderItems,
    customer: cleanCustomer,
    note,
    subtotal,
    deliveryTotal,
    total,
    totalQty: orderItems.reduce((s, i) => s + i.quantity, 0),
    currency: "INR",
    payment: { method: "razorpay", status: "initiated", amountPaise },
    settlement: {
      gatewayFeePaise: fees.gatewayFeePaise,
      gstOnFeePaise: fees.gstOnFeePaise,
      platformFeePaise: fees.platformFeePaise,
      sellerNetPaise: fees.sellerNetPaise,
    },
    status: "pending",
  };

  let saved = null;
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        saved = await createOrder({ ...data, orderNumber: newOrderNumber() });
        break;
      } catch (err) {
        if (err?.code === 11000 && attempt < 3) continue; // order number clash, retry
        throw err;
      }
    }

    const rp = await createRazorpayOrder({
      amountPaise,
      receipt: saved.orderNumber,
      notes: { type: "store_order", orderNumber: saved.orderNumber, seller: sellerDoc.username },
    });

    const withRp = await patchOrder(saved.orderNumber, { "payment.razorpayOrderId": rp.id });

    return {
      order: serializeOrder(withRp),
      checkout: {
        keyId: getRazorpayKeyId(),
        razorpayOrderId: rp.id,
        amountPaise,
        currency: "INR",
      },
    };
  } catch (err) {
    // Kuch fail hua: order band karo aur stock wapas
    if (saved) {
      await patchOrder(saved.orderNumber, { status: "cancelled", "payment.status": "failed" }).catch(() => {});
    }
    await releaseStock(orderItems);
    throw err;
  }
}

/* ---------- payment confirm (verify route + webhook dono yahi use karte hain) ---------- */

async function refundLatePayment(order, paymentId) {
  // Order expire/cancel ho chuka tha par customer ne pay kar diya -> paisa wapas
  try {
    const refund = await refundRazorpayPayment({
      paymentId,
      amountPaise: order.payment.amountPaise,
      notes: { orderNumber: order.orderNumber, reason: "order_expired_before_payment" },
    });
    await patchOrder(order.orderNumber, {
      "payment.status": "refunded",
      "payment.razorpayPaymentId": String(paymentId),
      "payment.refundId": refund.id,
      "payment.refundedAt": new Date(),
    });
  } catch (err) {
    console.error("late payment refund failed:", order.orderNumber, err);
    await patchOrder(order.orderNumber, {
      "payment.status": "refund_pending",
      "payment.razorpayPaymentId": String(paymentId),
    }).catch(() => {});
  }
}

export async function confirmPayment({ razorpayOrderId, paymentId }) {
  const order = await findOrderByRazorpayId(razorpayOrderId);
  if (!order) throw new OrderError("Order not found.", 404);

  if (order.payment.status === "paid") return serializeOrder(order); // already done

  const paid = await markOrderPaid(order.orderNumber, paymentId);
  if (paid) return serializeOrder(paid);

  // Shayad doosre request ne abhi hi mark kar diya
  const fresh = await findOrderByRazorpayId(razorpayOrderId);
  if (fresh?.payment?.status === "paid") return serializeOrder(fresh);

  await refundLatePayment(fresh || order, paymentId);
  throw new OrderError(
    "This order expired before the payment was confirmed. Your money will be refunded automatically.",
    409
  );
}

export async function verifyPayment({ orderNumber, razorpayOrderId, razorpayPaymentId, signature }) {
  const rpOrder = str(razorpayOrderId, 100);
  const rpPayment = str(razorpayPaymentId, 100);
  const sig = str(signature, 200);
  if (!rpOrder || !rpPayment || !sig) throw new OrderError("Invalid payment details.", 400);

  const valid = verifyPaymentSignature({ orderId: rpOrder, paymentId: rpPayment, signature: sig });
  if (!valid) throw new OrderError("Payment verification failed.", 400);

  const order = await findOrderByRazorpayId(rpOrder);
  if (!order || order.orderNumber !== String(orderNumber || "")) {
    throw new OrderError("Order not found.", 404);
  }

  return confirmPayment({ razorpayOrderId: rpOrder, paymentId: rpPayment });
}

/* Razorpay webhook events */
export async function handleRazorpayEvent(event) {
  const type = event?.event;
  if (!["payment.captured", "order.paid"].includes(type)) return { ignored: true };

  const pay = event?.payload?.payment?.entity;
  if (!pay?.id || !pay?.order_id) return { ignored: true };
  if (pay.status && pay.status !== "captured") return { ignored: true };

  // Hamare store order nahi hai (jaise subscription payment) -> ignore
  const order = await findOrderByRazorpayId(pay.order_id);
  if (!order) return { ignored: true };

  if (Number(pay.amount) !== Number(order.payment.amountPaise)) {
    console.error("Webhook amount mismatch:", order.orderNumber, pay.amount, order.payment.amountPaise);
    return { ignored: true };
  }

  await confirmPayment({ razorpayOrderId: pay.order_id, paymentId: pay.id });
  return { ok: true };
}

/* ---------- refund (cancel hone par) ---------- */

export async function refundIfPaid(order) {
  const p = order?.payment || {};
  if (p.method !== "razorpay" || p.status !== "paid" || !p.razorpayPaymentId) return null;

  try {
    const refund = await refundRazorpayPayment({
      paymentId: p.razorpayPaymentId,
      amountPaise: p.amountPaise,
      notes: { orderNumber: order.orderNumber, reason: "order_cancelled" },
    });
    return await patchOrder(order.orderNumber, {
      "payment.status": "refunded",
      "payment.refundId": refund.id,
      "payment.refundedAt": new Date(),
    });
  } catch (err) {
    console.error("refund failed:", order.orderNumber, err);
    return await patchOrder(order.orderNumber, { "payment.status": "refund_pending" });
  }
}

/* ---------- read / manage ---------- */

export async function getOrderForUser({ orderNumber, userId }) {
  const order = await findOrderByNumber(String(orderNumber || ""));
  if (!order) throw new OrderError("Order not found.", 404);

  const allowed = sameId(order.sellerId, userId) || (order.buyerId && sameId(order.buyerId, userId));
  if (!allowed) throw new OrderError("Order not found.", 404);

  return { order: serializeOrder(order), isSeller: sameId(order.sellerId, userId) };
}

export async function listOrdersForUser({ userId, role = "seller", status = "", page = 1, limit = 20 }) {
  const filter =
    role === "buyer"
      ? { buyerId: userId }
      : { sellerId: userId, "payment.status": { $nin: HIDDEN_FROM_SELLER } };
  if (ORDER_STATUSES.includes(status)) filter.status = status;

  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);

  const { orders, total } = await listOrders({ filter, page: safePage, limit: safeLimit });
  return {
    orders: orders.map(serializeOrder),
    total,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

/* ---------- seller: update status ---------- */

export async function updateOrderStatus({ orderNumber, sellerId, status }) {
  if (!ORDER_STATUSES.includes(status)) throw new OrderError("Invalid status.", 400);

  const order = await findOrderByNumber(String(orderNumber || ""));
  if (!order || !sameId(order.sellerId, sellerId)) throw new OrderError("Order not found.", 404);

  if (["cancelled", "delivered"].includes(order.status)) {
    throw new OrderError(`This order is already ${order.status}.`, 409);
  }
  if (order.status === status) return serializeOrder(order);

  if (HIDDEN_FROM_SELLER.includes(order.payment?.status)) {
    throw new OrderError("Payment for this order is not received yet.", 409);
  }

  let extra = {};
  if (status === "cancelled") {
    extra = { cancellation: { cancelledBy: "seller", reason: "", cancelledAt: new Date() } };
  }
  if (status === "delivered") {
    const now = new Date();
    extra = { "settlement.deliveredAt": now, "settlement.payoutDueBy": payoutDueDate(now) };
  }

  const updated = await setOrderStatus(order.orderNumber, status, extra);
  // null => kisi aur ne (jaise buyer) usi waqt order cancel/deliver kar diya
  if (!updated) throw new OrderError("This order was just updated. Please refresh.", 409);

  if (status === "cancelled") {
    await releaseStock(order.items);
    const refunded = await refundIfPaid(updated);
    return serializeOrder(refunded || updated);
  }

  return serializeOrder(updated);
}

/* ---------- buyer: cancel own order ---------- */

export async function cancelOrderByBuyer({ orderNumber, buyerId, reason = "" }) {
  if (!buyerId) throw new OrderError("Please log in.", 401);

  const order = await findOrderByNumber(String(orderNumber || ""));
  // order kisi aur ka ho ya guest order ho -> "not found" (info leak nahi)
  if (!order || !order.buyerId || !sameId(order.buyerId, buyerId)) {
    throw new OrderError("Order not found.", 404);
  }

  if (order.status === "cancelled") throw new OrderError("This order is already cancelled.", 409);
  if (!BUYER_CANCELLABLE.includes(order.status)) {
    throw new OrderError(
      `This order is already ${order.status} and can't be cancelled now. Please contact the seller.`,
      409
    );
  }

  const updated = await cancelOrderByBuyerAtomic({
    orderNumber: order.orderNumber,
    buyerId,
    reason: str(reason, 300),
    allowedStatuses: BUYER_CANCELLABLE,
  });
  if (!updated) {
    throw new OrderError("This order can't be cancelled anymore. Please refresh the page.", 409);
  }

  // DB mein cancel ho gaya -> ab stock wapas + paid hai to refund
  await releaseStock(order.items);
  const refunded = await refundIfPaid(updated);

  return serializeOrder(refunded || updated);
}