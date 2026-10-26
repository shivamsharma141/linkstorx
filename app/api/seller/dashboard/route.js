// app/api/seller/dashboard/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/app/lib/database/mongodb.js";
import Order from "@/app/databaseModels/Order";
import PayoutRecord from "@/app/databaseModels/PayoutRecord";
import { requireAuth } from "@/app/lib/auth/auth";
import { refundIfPaid, HIDDEN_FROM_SELLER } from "@/app/businessLogic/orderLogic";
import { FEE_CONFIG, toRupees, payoutDueDate } from "@/app/lib/razorpay/settlement";

// requireAuth redirect/throw kar sakta hai -> API me hum 401 JSON dena chahte hain
async function getCurrentUser() {
  try {
    const u = await requireAuth();
    if (!u) return null;
    const _id = u._id || u.id;
    if (!_id) return null;
    return {
      _id,
      username: u.username || "",
      name: u.name || u.username || "",
      storeName: u.storeName || u.name || u.username || "",
    };
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;
const CUSTOMER_PAGE = 5;
const SETTLEMENT_PAGE = 5;
const LOW_STOCK_LIMIT = 5;
const RECENT_CANCEL_DAYS = 7;

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid"];

// current status -> seller kin statuses par ja sakta hai
const SELLER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const json = (body, status = 200) => NextResponse.json(body, { status });

// Seller ko sirf wahi orders dikhte hain jinka payment aa chuka hai (unpaid/failed online orders hidden)
const visible = (sellerId) => ({ sellerId, "payment.status": { $nin: HIDDEN_FROM_SELLER } });

function toSkip(value) {
  return Math.max(0, parseInt(value || "0", 10) || 0);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Payout state: none | after_delivery | eligible | paid_out */
function payoutInfo(o) {
  const p = o.payment || {};
  const s = o.settlement || {};
  if (p.method !== "razorpay" || p.status !== "paid" || o.status === "cancelled") {
    return { state: "none", dueBy: null };
  }
  if (s.payoutStatus === "paid") return { state: "paid_out", dueBy: s.payoutDueBy || null };
  if (o.status === "delivered") {
    return { state: "eligible", dueBy: s.payoutDueBy || (s.deliveredAt ? payoutDueDate(s.deliveredAt) : null) };
  }
  return { state: "after_delivery", dueBy: null };
}

function orderDTO(o) {
  const s = o.settlement || {};
  const payout = payoutInfo(o);
  return {
    _id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt,
    items: (o.items || []).map((i) => ({
      name: i.name,
      image: i.image || "",
      price: i.price,
      currency: i.currency || o.currency,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
      deliveryCharge: i.deliveryCharge || 0,
    })),
    totalQty: o.totalQty,
    subtotal: o.subtotal,
    deliveryTotal: o.deliveryTotal || 0,
    total: o.total > 0 ? o.total : o.subtotal, // purane orders me total nahi hota
    currency: o.currency || "INR",
    payment: {
      method: o.payment?.method || "pay_to_seller",
      status: o.payment?.status || "pending",
      paidAt: o.payment?.paidAt || null,
    },
    settlement: {
      customerPaid: toRupees(o.payment?.amountPaise),
      gatewayFee: toRupees(s.gatewayFeePaise),
      gstOnFee: toRupees(s.gstOnFeePaise),
      platformFee: toRupees(s.platformFeePaise),
      sellerNet: toRupees(s.sellerNetPaise),
      deliveredAt: s.deliveredAt || null,
      payoutState: payout.state,
      payoutDueBy: payout.dueBy,
      paidOutAt: s.paidOutAt || null,
    },
    customer: {
      name: o.customer?.name || "",
      phone: o.customer?.phone || "",
      email: o.customer?.email || "",
      address: o.customer?.address || "",
      city: o.customer?.city || "",
      state: o.customer?.state || "",
      pincode: o.customer?.pincode || "",
    },
    note: o.note || "",
    cancellation: {
      cancelledBy: o.cancellation?.cancelledBy || "",
      reason: o.cancellation?.reason || "",
      cancelledAt: o.cancellation?.cancelledAt || null,
    },
    sellerSeen: o.sellerSeen !== false,
  };
}

/* ---------- orders list (status filter + search + 10 at a time) ---------- */
async function fetchOrders(sellerId, { skip = 0, status = "", q = "" } = {}) {
  const filter = visible(sellerId);

  if (ORDER_STATUSES.includes(status)) filter.status = status;

  const term = String(q || "").trim().slice(0, 60);
  if (term) {
    const rx = new RegExp(escapeRegex(term), "i");
    filter.$or = [{ orderNumber: rx }, { "customer.name": rx }, { "customer.phone": rx }];
    const digits = term.replace(/\D/g, "");
    if (digits.length >= 3) {
      filter.$or.push({ "customer.phone": new RegExp(escapeRegex(digits)) });
    }
  }

  const [rows, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PAGE_SIZE + 1) // +1 to know if there is more
      .lean(),
    Order.countDocuments(filter),
  ]);

  return {
    orders: rows.slice(0, PAGE_SIZE).map(orderDTO),
    hasMore: rows.length > PAGE_SIZE,
    total,
  };
}

/* ---------- customers (unique by buyerId, guests by phone) ---------- */
function customerBase(match) {
  return [
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $addFields: {
        cKey: {
          $cond: [
            { $ifNull: ["$buyerId", false] },
            { $toString: "$buyerId" },
            { $concat: ["phone:", "$customer.phone"] },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$cKey",
        name: { $first: "$customer.name" },
        phone: { $first: "$customer.phone" },
        email: { $first: "$customer.email" },
        orders: { $sum: 1 },
        spent: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$subtotal", 0] } },
        lastOrderAt: { $first: "$createdAt" },
      },
    },
  ];
}

async function fetchCustomers(sellerId, skip = 0) {
  const rows = await Order.aggregate([
    ...customerBase(visible(sellerId)),
    { $sort: { lastOrderAt: -1 } },
    { $skip: skip },
    { $limit: CUSTOMER_PAGE + 1 },
  ]);

  return {
    customers: rows.slice(0, CUSTOMER_PAGE).map((c) => ({
      key: String(c._id),
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      orders: c.orders,
      spent: c.spent,
      lastOrderAt: c.lastOrderAt,
    })),
    hasMore: rows.length > CUSTOMER_PAGE,
  };
}

/* ---------- earnings (online paid orders, cancelled/refunded count nahi hote) ---------- */
async function fetchEarnings(sellerId) {
  const net = "$settlement.sellerNetPaise";
  const isPaidOut = { $eq: ["$settlement.payoutStatus", "paid"] };
  const isDelivered = { $eq: ["$status", "delivered"] };

  const [row] = await Order.aggregate([
    {
      $match: {
        sellerId,
        "payment.method": "razorpay",
        "payment.status": "paid",
        status: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: null,
        gross: { $sum: "$payment.amountPaise" },
        gatewayFee: { $sum: "$settlement.gatewayFeePaise" },
        gstOnFee: { $sum: "$settlement.gstOnFeePaise" },
        platformFee: { $sum: "$settlement.platformFeePaise" },
        net: { $sum: net },
        paidOut: { $sum: { $cond: [isPaidOut, net, 0] } },
        eligible: { $sum: { $cond: [{ $and: [{ $not: [isPaidOut] }, isDelivered] }, net, 0] } },
      },
    },
  ]);

  const r = row || {};
  const eligible = r.eligible || 0;
  const paidOut = r.paidOut || 0;
  const total = r.net || 0;

  return {
    gross: toRupees(r.gross),
    gatewayFee: toRupees(r.gatewayFee),
    gstOnFee: toRupees(r.gstOnFee),
    platformFee: toRupees(r.platformFee),
    net: toRupees(total),
    eligible: toRupees(eligible), // delivered, payout abhi baaki
    upcoming: toRupees(Math.max(0, total - eligible - paidOut)), // paid par abhi deliver nahi hua
    paidOut: toRupees(paidOut),
  };
}

/* ---------- settlements (admin ne is seller ko kya-kya payout kiya) ---------- */
async function fetchSettlements(sellerId, skip = 0) {
  const rows = await PayoutRecord.find({ sellerId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(SETTLEMENT_PAGE + 1)
    .lean();

  const page = rows.slice(0, SETTLEMENT_PAGE);

  const ids = page
    .flatMap((r) => (r.orderIds || []).map(String))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  // sellerId filter: sirf isi seller ke orders
  const docs = ids.length
    ? await Order.find({ _id: { $in: ids }, sellerId }).select("totalQty items.name items.quantity").lean()
    : [];
  const byId = new Map(
    docs.map((d) => [
      String(d._id),
      {
        qty: Number(d.totalQty) || 0,
        items: (d.items || []).map((i) => `${i.name} × ${i.quantity}`).join(", "),
      },
    ])
  );

  return {
    settlements: page.map((r) => {
      const orders = (r.orders || []).map((o) => {
        const info = byId.get(String(o.orderId)) || { qty: 0, items: "" };
        return {
          orderNumber: o.orderNumber,
          items: info.items,
          quantity: info.qty,
          amount: toRupees(o.amountPaise),
          deliveredAt: o.deliveredAt || null,
        };
      });
      return {
        id: String(r._id),
        status: r.status, // Pending | Paid | Failed
        amount: toRupees(r.amountPaise),
        orderCount: r.orderIds?.length || 0,
        productCount: orders.reduce((sum, o) => sum + o.quantity, 0),
        utr: r.status === "Paid" ? r.utr || "" : "", // UTR sirf paid hone par dikhta hai
        createdAt: r.createdAt,
        paidAt: r.paidAt || null,
        bank: { bankName: r.bank?.bankName || "", last4: r.bank?.last4 || "" },
        orders,
      };
    }),
    hasMore: rows.length > SETTLEMENT_PAGE,
  };
}

// Low-stock products. Product model ke field names apne schema se match karo.
async function getLowStock(sellerId) {
  try {
    const { default: Product } = await import("@/app/databaseModels/Product");
    return await Product.find({
      sellerId, // ⚠️ agar tumhare Product me owner field ka naam alag hai (userId / owner) to badlo
      trackInventory: true,
      stock: { $lte: LOW_STOCK_LIMIT }, // ⚠️ stock field ka naam check karo
    })
      .select("name stock")
      .sort({ stock: 1 })
      .limit(20)
      .lean();
  } catch {
    return []; // Product model na mile to dashboard break nahi hoga
  }
}

/* =========================================================
   GET
   ========================================================= */
export async function GET(req) {
  try {
    // Auth — sellerId kabhi frontend se nahi liya jata
    const user = await getCurrentUser();
    if (!user?._id) return json({ success: false, message: "Unauthorized" }, 401);

    await connectToDatabase();
    const sellerId = new mongoose.Types.ObjectId(String(user._id));
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");

    // ---- orders list (filter / search / show more) ----
    if (section === "orders") {
      const result = await fetchOrders(sellerId, {
        skip: toSkip(searchParams.get("skip")),
        status: searchParams.get("status") || "",
        q: searchParams.get("q") || "",
      });
      return json({ success: true, ...result });
    }

    // ---- settlements show more ----
    if (section === "settlements") {
      const result = await fetchSettlements(sellerId, toSkip(searchParams.get("skip")));
      return json({ success: true, ...result });
    }

    // ---- customers show more ----
    if (section === "customers") {
      const result = await fetchCustomers(sellerId, toSkip(searchParams.get("skip")));
      return json({ success: true, ...result });
    }

    // ---- single order (sirf is seller ka) ----
    if (section === "order") {
      const id = searchParams.get("id");
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return json({ success: false, message: "Invalid order" }, 400);
      }
      const order = await Order.findOne({ _id: id, ...visible(sellerId) }).lean();
      if (!order) return json({ success: false, message: "Order not found" }, 404);
      return json({ success: true, order: orderDTO(order) });
    }

    // ---- full dashboard ----
    const rangeParam = searchParams.get("range") || "all";
    const days = ["7", "30", "90"].includes(rangeParam) ? parseInt(rangeParam, 10) : null;

    const base = visible(sellerId);
    const rangeMatch = { ...base };
    if (days) rangeMatch.createdAt = { $gte: new Date(Date.now() - days * 86400000) };

    const cancelSince = new Date(Date.now() - RECENT_CANCEL_DAYS * 86400000);

    const [
      statusAll,
      kpiAgg,
      customersInRange,
      customersPage,
      recentCancelled,
      unseen,
      lowStock,
      earnings,
      settlementsPage,
    ] = await Promise.all([
      // all-time: status cards, pending count
      Order.aggregate([{ $match: base }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      // selected range: orders / sales
      Order.aggregate([
        { $match: rangeMatch },
        { $group: { _id: "$status", count: { $sum: 1 }, sales: { $sum: "$subtotal" } } },
      ]),
      Order.aggregate([...customerBase(rangeMatch), { $count: "n" }]),
      fetchCustomers(sellerId, 0),
      Order.countDocuments({ ...base, status: "cancelled", updatedAt: { $gte: cancelSince } }),
      Order.find({ ...base, sellerSeen: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderNumber status createdAt updatedAt cancellation payment")
        .lean(),
      getLowStock(sellerId),
      fetchEarnings(sellerId),
      fetchSettlements(sellerId, 0),
    ]);

    const statusCounts = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 };
    for (const row of statusAll) {
      if (row._id in statusCounts) statusCounts[row._id] = row.count;
    }

    // sales = sirf delivered orders (cancelled kabhi count nahi hota)
    let totalOrders = 0;
    let totalSales = 0;
    for (const row of kpiAgg) {
      totalOrders += row.count;
      if (row._id === "delivered") totalSales += row.sales;
    }

    // notifications — sab real data se
    const notifications = [];
    for (const o of unseen) {
      if (o.status === "cancelled") {
        notifications.push({
          id: `c-${o._id}`,
          type: "cancelled",
          orderId: String(o._id),
          text: `${o.cancellation?.cancelledBy === "seller" ? "You" : "Customer"} cancelled order #${o.orderNumber}`,
          at: o.cancellation?.cancelledAt || o.updatedAt,
        });
      } else {
        notifications.push({
          id: `n-${o._id}`,
          type: "new_order",
          orderId: String(o._id),
          text: `You received a new order #${o.orderNumber}${o.payment?.status === "paid" ? " (paid online)" : ""}`,
          at: o.payment?.paidAt || o.createdAt,
        });
      }
    }
    if (statusCounts.pending > 0) {
      notifications.push({
        id: "pending",
        type: "pending",
        text: `${statusCounts.pending} ${statusCounts.pending === 1 ? "order is" : "orders are"} waiting for you to confirm`,
      });
    }
    for (const p of lowStock.slice(0, 2)) {
      notifications.push({
        id: `s-${p._id}`,
        type: "low_stock",
        text: `${p.name} has only ${p.stock} ${p.stock === 1 ? "item" : "items"} left`,
      });
    }

    return json({
      success: true,
      seller: {
        name: user.name || user.username || "",
        storeName: user.storeName || user.name || user.username || "",
      },
      stats: {
        totalOrders,
        totalSales,
        totalCustomers: customersInRange[0]?.n || 0,
        currency: "INR",
      },
      earnings,
      feeRates: {
        gatewayPercent: FEE_CONFIG.gatewayPercent,
        gstPercent: FEE_CONFIG.gstPercent,
        platformFee: toRupees(FEE_CONFIG.platformFeePaise),
        payoutDays: FEE_CONFIG.payoutDelayDays,
      },
      statusCounts,
      customers: customersPage.customers,
      customersHasMore: customersPage.hasMore,
      settlements: settlementsPage.settlements,
      settlementsHasMore: settlementsPage.hasMore,
      attention: {
        pending: statusCounts.pending,
        lowStock: lowStock.length,
        recentCancelled,
      },
      lowStockList: lowStock.map((p) => ({ id: String(p._id), name: p.name, stock: p.stock })),
      notifications: notifications.slice(0, 6),
    });
  } catch (err) {
    console.error("[seller dashboard]", err);
    return json({ success: false, message: "Could not load dashboard data" }, 500);
  }
}

/* =========================================================
   POST — seller ne order khol liya -> sellerSeen = true
   ========================================================= */
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user?._id) return json({ success: false, message: "Unauthorized" }, 401);

    const { orderId } = await req.json().catch(() => ({}));
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return json({ success: false, message: "Invalid order" }, 400);
    }

    await connectToDatabase();
    // sellerId filter ke bina update nahi hota -> doosre seller ka order touch nahi ho sakta
    await Order.updateOne(
      { _id: orderId, sellerId: new mongoose.Types.ObjectId(String(user._id)) },
      { $set: { sellerSeen: true } }
    );

    return json({ success: true });
  } catch (err) {
    console.error("[seller dashboard seen]", err);
    return json({ success: false }, 500);
  }
}

/* =========================================================
   PATCH — status badalna YA (sirf purane orders me) payment received mark karna
   body: { orderId, status, reason }  ya  { orderId, paymentStatus }
   ========================================================= */
export async function PATCH(req) {
  try {
    const user = await getCurrentUser();
    if (!user?._id) return json({ success: false, message: "Unauthorized" }, 401);

    const { orderId, status, reason, paymentStatus } = await req.json().catch(() => ({}));

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return json({ success: false, message: "Invalid order" }, 400);
    }

    await connectToDatabase();
    const sellerId = new mongoose.Types.ObjectId(String(user._id));

    /* ---- payment received / not received (sirf purane pay_to_seller orders) ---- */
    if (paymentStatus !== undefined && status === undefined) {
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return json({ success: false, message: "Invalid payment status" }, 400);
      }
      // Online (Razorpay) orders ka payment automatic hai -> seller badal nahi sakta
      const updatedPay = await Order.findOneAndUpdate(
        { _id: orderId, sellerId, status: { $ne: "cancelled" }, "payment.method": { $ne: "razorpay" } },
        { $set: { "payment.status": paymentStatus } },
        { new: true }
      ).lean();

      if (!updatedPay) {
        return json({ success: false, message: "Payment can't be changed for this order" }, 409);
      }
      return json({ success: true, order: orderDTO(updatedPay) });
    }

    /* ---- order status ---- */
    if (!ORDER_STATUSES.includes(status)) {
      return json({ success: false, message: "Invalid status" }, 400);
    }

    const cleanReason = String(reason || "").trim().slice(0, 300);
    if (status === "cancelled" && cleanReason.length < 3) {
      return json({ success: false, message: "Please add a reason for cancelling" }, 400);
    }

    // Sirf wahi "from" statuses jinse is target par jaana allowed hai
    const allowedFrom = Object.keys(SELLER_TRANSITIONS).filter((from) =>
      SELLER_TRANSITIONS[from].includes(status)
    );

    const update = { status };
    if (status === "cancelled") {
      update.cancellation = {
        cancelledBy: "seller",
        reason: cleanReason,
        cancelledAt: new Date(),
      };
    }
    if (status === "delivered") {
      // Delivery ke baad 7 din ke andar payout
      const now = new Date();
      update["settlement.deliveredAt"] = now;
      update["settlement.payoutDueBy"] = payoutDueDate(now);
    }

    // Atomic: sellerId + current status filter me hai -> race condition aur doosre seller ka order dono safe
    // visible() -> unpaid online order ka status seller badal nahi sakta
    const updated = await Order.findOneAndUpdate(
      { _id: orderId, ...visible(sellerId), status: { $in: allowedFrom } },
      { $set: update },
      { new: true }
    ).lean();

    if (!updated) {
      return json({ success: false, message: "This order can't be moved to that status" }, 409);
    }

    let finalOrder = updated;

    // Cancel par stock wapas + paid online order ka refund
    if (status === "cancelled") {
      try {
        const { default: Product } = await import("@/app/databaseModels/Product");
        const ops = (updated.items || [])
          .filter((i) => i.trackInventory)
          .map((i) => ({
            updateOne: {
              filter: { _id: i.productId },
              update: { $inc: { stock: i.quantity } }, // ⚠️ stock field ka naam check karo
            },
          }));
        if (ops.length) await Product.bulkWrite(ops);
      } catch (err) {
        console.error("[seller dashboard] stock restore failed", err);
      }

      finalOrder = (await refundIfPaid(updated)) || updated;
    }

    return json({ success: true, order: orderDTO(finalOrder) });
  } catch (err) {
    console.error("[seller dashboard status]", err);
    return json({ success: false, message: "Could not update the order" }, 500);
  }
}