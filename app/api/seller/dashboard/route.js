// app/api/seller/dashboard/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/app/lib/database/mongodb.js";
import Order from "@/app/databaseModels/Order";
import { requireAuth } from "@/app/lib/auth/auth";

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

function toSkip(value) {
  return Math.max(0, parseInt(value || "0", 10) || 0);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function orderDTO(o) {
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
    })),
    totalQty: o.totalQty,
    subtotal: o.subtotal,
    currency: o.currency || "INR",
    payment: {
      method: o.payment?.method || "pay_to_seller",
      status: o.payment?.status === "paid" ? "paid" : "pending",
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
  const filter = { sellerId };

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
    ...customerBase({ sellerId }),
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
      const order = await Order.findOne({ _id: id, sellerId }).lean();
      if (!order) return json({ success: false, message: "Order not found" }, 404);
      return json({ success: true, order: orderDTO(order) });
    }

    // ---- full dashboard ----
    const rangeParam = searchParams.get("range") || "all";
    const days = ["7", "30", "90"].includes(rangeParam) ? parseInt(rangeParam, 10) : null;

    const rangeMatch = { sellerId };
    if (days) rangeMatch.createdAt = { $gte: new Date(Date.now() - days * 86400000) };

    const cancelSince = new Date(Date.now() - RECENT_CANCEL_DAYS * 86400000);

    const [statusAll, kpiAgg, customersInRange, customersPage, recentCancelled, unseen, lowStock] =
      await Promise.all([
        // all-time: status cards, pending count, "to collect"
        Order.aggregate([
          { $match: { sellerId } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              unpaid: {
                $sum: { $cond: [{ $ne: ["$payment.status", "paid"] }, "$subtotal", 0] },
              },
            },
          },
        ]),
        // selected range: orders / sales
        Order.aggregate([
          { $match: rangeMatch },
          { $group: { _id: "$status", count: { $sum: 1 }, sales: { $sum: "$subtotal" } } },
        ]),
        Order.aggregate([...customerBase(rangeMatch), { $count: "n" }]),
        fetchCustomers(sellerId, 0),
        Order.countDocuments({ sellerId, status: "cancelled", updatedAt: { $gte: cancelSince } }),
        Order.find({ sellerId, sellerSeen: false })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("orderNumber status createdAt updatedAt cancellation")
          .lean(),
        getLowStock(sellerId),
      ]);

    const statusCounts = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 };
    let toCollect = 0;
    for (const row of statusAll) {
      if (row._id in statusCounts) statusCounts[row._id] = row.count;
      // cancelled order ka paisa nahi aana
      if (row._id !== "cancelled") toCollect += row.unpaid;
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
          text: `You received a new order #${o.orderNumber}`,
          at: o.createdAt,
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
        toCollect,
        currency: "INR",
      },
      statusCounts,
      customers: customersPage.customers,
      customersHasMore: customersPage.hasMore,
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
   PATCH — status badalna YA payment received mark karna
   body: { orderId, status, reason }  ya  { orderId, paymentStatus }
   Buyer ko change isi Order document se dikhta hai (same DB record).
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

    /* ---- payment received / not received ---- */
    if (paymentStatus !== undefined && status === undefined) {
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return json({ success: false, message: "Invalid payment status" }, 400);
      }
      const updatedPay = await Order.findOneAndUpdate(
        { _id: orderId, sellerId, status: { $ne: "cancelled" } },
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

    // Atomic: sellerId + current status filter me hai -> race condition aur doosre seller ka order dono safe
    const updated = await Order.findOneAndUpdate(
      { _id: orderId, sellerId, status: { $in: allowedFrom } },
      { $set: update },
      { new: true }
    ).lean();

    if (!updated) {
      return json({ success: false, message: "This order can't be moved to that status" }, 409);
    }

    // Cancel par stock wapas (sirf un items ka jinka trackInventory on tha)
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
    }

    return json({ success: true, order: orderDTO(updated) });
  } catch (err) {
    console.error("[seller dashboard status]", err);
    return json({ success: false, message: "Could not update the order" }, 500);
  }
}