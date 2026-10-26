import mongoose from "mongoose";

import { connectToDatabase } from "@/app/lib/database/mongodb";
import { getCurrentUser } from "@/app/lib/auth/auth";
import Order from "@/app/databaseModels/Order";
import PayoutRecord from "@/app/databaseModels/PayoutRecord";
import { Seller } from "@/app/databaseModels/Product";
import { decryptText } from "@/app/businessLogic/productBusinessLogic";
import { toRupees } from "@/app/lib/razorpay/settlement";

/* =========================================================
   HELPERS
========================================================= */

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/* Har function admin ko dobara verify karta hai */
async function assertAdmin() {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) throw createAppError("Forbidden.", 403);
  return admin;
}

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const iso = (d) => (d ? new Date(d).toISOString() : null);
const sumIf = (cond, val) => ({ $sum: { $cond: [cond, val, 0] } });

/* Delivered + online paid + payout baaki + kisi payout mein lock nahi */
const DELIVERED_PAID = {
  "payment.method": "razorpay",
  "payment.status": "paid",
  status: "delivered",
  "settlement.payoutStatus": "pending",
  "settlement.payoutId": null,
  "settlement.sellerNetPaise": { $gt: 0 },
};

/* Payout sirf tab, jab LinkStorx ne delivery verify kar li ho */
const ELIGIBLE = { ...DELIVERED_PAID, "settlement.adminDeliveryStatus": "verified" };

/* Seller ne delivered kiya, par admin ne abhi verify nahi kiya (ya hold pe hai) */
const NEEDS_CHECK = { ...DELIVERED_PAID, "settlement.adminDeliveryStatus": { $ne: "verified" } };

async function loadSellerMap(userIds) {
  if (!userIds.length) return new Map();
  const sellers = await Seller.find({ userId: { $in: userIds.map(oid) } }).lean();
  return new Map(sellers.map((s) => [String(s.userId), s]));
}

function emptySummary() {
  return {
    totalPaid: 0,
    paidPayouts: 0,
    paidOutOrders: 0,
    paidOutProducts: 0,
    deliveredOrders: 0,
    deliveredProducts: 0,
    deliveredAmount: 0,
    withSellerOrders: 0,
    withSellerProducts: 0,
    withSellerAmount: 0,
  };
}

/* Seller ka lifetime record: kitna paid, kitna deliver hua, kitna abhi seller ke paas hai */
async function loadSellerSummaries(sellerIds) {
  const ids = [...new Set((sellerIds || []).map(String))].filter((id) => mongoose.isValidObjectId(id));
  const out = new Map(ids.map((id) => [id, emptySummary()]));
  if (!ids.length) return out;

  const objIds = ids.map(oid);
  const delivered = { $eq: ["$status", "delivered"] };
  const notDelivered = { $not: [delivered] };
  const isPaidOut = { $eq: ["$settlement.payoutStatus", "paid"] };
  const qty = { $ifNull: ["$totalQty", 0] };
  const net = { $ifNull: ["$settlement.sellerNetPaise", 0] };

  const [orderRows, payoutRows] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          sellerId: { $in: objIds },
          "payment.method": "razorpay",
          "payment.status": "paid",
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: "$sellerId",
          deliveredOrders: sumIf(delivered, 1),
          deliveredProducts: sumIf(delivered, qty),
          deliveredNet: sumIf(delivered, net),
          withSellerOrders: sumIf(notDelivered, 1),
          withSellerProducts: sumIf(notDelivered, qty),
          withSellerNet: sumIf(notDelivered, net),
          paidOutOrders: sumIf({ $and: [delivered, isPaidOut] }, 1),
          paidOutProducts: sumIf({ $and: [delivered, isPaidOut] }, qty),
        },
      },
    ]),
    PayoutRecord.aggregate([
      { $match: { sellerId: { $in: objIds }, status: "Paid" } },
      { $group: { _id: "$sellerId", count: { $sum: 1 }, amountPaise: { $sum: "$amountPaise" } } },
    ]),
  ]);

  for (const r of orderRows) {
    const s = out.get(String(r._id));
    if (!s) continue;
    s.deliveredOrders = r.deliveredOrders || 0;
    s.deliveredProducts = r.deliveredProducts || 0;
    s.deliveredAmount = toRupees(r.deliveredNet);
    s.withSellerOrders = r.withSellerOrders || 0;
    s.withSellerProducts = r.withSellerProducts || 0;
    s.withSellerAmount = toRupees(r.withSellerNet);
    s.paidOutOrders = r.paidOutOrders || 0;
    s.paidOutProducts = r.paidOutProducts || 0;
  }
  for (const r of payoutRows) {
    const s = out.get(String(r._id));
    if (!s) continue;
    s.paidPayouts = r.count || 0;
    s.totalPaid = toRupees(r.amountPaise);
  }
  return out;
}

/* Payout ke orders ke products (naam + quantity) */
async function loadOrderItemMap(payoutRows) {
  const ids = (payoutRows || []).flatMap((r) => (r.orderIds || []).map(String));
  if (!ids.length) return new Map();

  const docs = await Order.find({ _id: { $in: ids.map(oid) } })
    .select("totalQty items.name items.quantity")
    .lean();

  return new Map(
    docs.map((d) => [
      String(d._id),
      {
        qty: Number(d.totalQty) || 0,
        items: (d.items || []).map((i) => `${i.name} × ${i.quantity}`).join(", "),
      },
    ])
  );
}

function stageOf(o) {
  const p = o.payment || {};
  const s = o.settlement || {};

  if (o.status === "cancelled") {
    return ["refunded", "refund_pending"].includes(p.status) ? ["refunded", "Refunded"] : ["cancelled", "Cancelled"];
  }
  if (p.method !== "razorpay") return ["old", "Old order"];
  if (o.status !== "delivered") return ["transit", "With seller"];
  if (s.payoutStatus === "paid") return ["paid", "Paid"];
  if (s.payoutId) return ["locked", "Payout created"];
  if (s.adminDeliveryStatus === "verified") return ["ready", "Ready to pay"];
  if (s.adminDeliveryStatus === "issue") return ["hold", "On hold"];
  return ["check", "Needs verification"];
}

function orderRow(o, payoutByOrder) {
  const s = o.settlement || {};
  const c = o.customer || {};
  const [stage, stageLabel] = stageOf(o);
  const payout = payoutByOrder?.get(String(o._id));

  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status,
    stage,
    stageLabel,
    customerName: c.name || "",
    customerPhone: c.phone || "",
    address: [c.address, c.city, c.state].filter(Boolean).join(", ") + (c.pincode ? ` - ${c.pincode}` : ""),
    items: (o.items || []).map((i) => `${i.name} × ${i.quantity}`).join(", "),
    quantity: Number(o.totalQty) || 0,
    amount: toRupees(s.sellerNetPaise),
    customerPaid: toRupees(o.payment?.amountPaise),
    createdAt: iso(o.createdAt),
    deliveredAt: iso(s.deliveredAt),
    dueBy: iso(s.payoutDueBy),
    verifyStatus: s.adminDeliveryStatus || "unchecked",
    verifyNote: s.adminDeliveryNote || "",
    utr: payout?.utr || "",
    payoutStatus: payout?.status || "",
  };
}

/* =========================================================
   READ: delivery verification queue
========================================================= */

export async function getToVerifyOverview() {
  await assertAdmin();
  await connectToDatabase();

  const orders = await Order.find(NEEDS_CHECK)
    .sort({ "settlement.deliveredAt": 1 })
    .limit(1000)
    .lean();

  const groups = new Map();
  for (const o of orders) {
    const key = String(o.sellerId);
    if (!groups.has(key)) groups.set(key, { sellerId: key, sellerUsername: o.sellerUsername, orders: [] });
    groups.get(key).orders.push(o);
  }

  const [sellerMap, summaries] = await Promise.all([
    loadSellerMap([...groups.keys()]),
    loadSellerSummaries([...groups.keys()]),
  ]);

  const sellers = [...groups.values()].map((g) => {
    const s = sellerMap.get(g.sellerId);
    const rows = g.orders.map((o) => orderRow(o));
    return {
      sellerId: g.sellerId,
      sellerName: s?.fullName || g.sellerUsername,
      sellerUsername: g.sellerUsername,
      email: s?.email || "",
      mobile: s?.mobile || "",
      orderCount: rows.length,
      holdCount: rows.filter((r) => r.stage === "hold").length,
      amount: toRupees(g.orders.reduce((sum, o) => sum + (o.settlement?.sellerNetPaise || 0), 0)),
      summary: summaries.get(g.sellerId) || emptySummary(),
      orders: rows,
    };
  });

  sellers.sort((a, b) => b.orderCount - a.orderCount);

  return {
    sellers,
    totalCount: orders.length,
    totalAmount: toRupees(orders.reduce((sum, o) => sum + (o.settlement?.sellerNetPaise || 0), 0)),
    truncated: orders.length >= 1000,
  };
}

/* =========================================================
   WRITE: delivery verify / problem
========================================================= */

export async function verifyDelivery(orderNumber, noteInput) {
  const admin = await assertAdmin();
  await connectToDatabase();

  const note = String(noteInput || "").trim().slice(0, 300);

  const updated = await Order.findOneAndUpdate(
    { orderNumber: String(orderNumber || ""), ...NEEDS_CHECK },
    {
      $set: {
        "settlement.adminDeliveryStatus": "verified",
        "settlement.adminDeliveryCheckedAt": new Date(),
        "settlement.adminDeliveryCheckedBy": admin.id,
        "settlement.adminDeliveryNote": note,
      },
    },
    { new: true }
  ).lean();

  if (!updated) throw createAppError("This order can't be verified (already verified or paid).", 409);
  return { orderNumber: updated.orderNumber };
}

export async function flagDeliveryIssue(orderNumber, reasonInput) {
  const admin = await assertAdmin();
  await connectToDatabase();

  const reason = String(reasonInput || "").trim().slice(0, 300);
  if (reason.length < 3) throw createAppError("Enter the problem (min 3 characters).", 400);

  const updated = await Order.findOneAndUpdate(
    { orderNumber: String(orderNumber || ""), ...NEEDS_CHECK },
    {
      $set: {
        "settlement.adminDeliveryStatus": "issue",
        "settlement.adminDeliveryCheckedAt": new Date(),
        "settlement.adminDeliveryCheckedBy": admin.id,
        "settlement.adminDeliveryNote": reason,
      },
    },
    { new: true }
  ).lean();

  if (!updated) throw createAppError("This order can't be put on hold (already paid or in a payout).", 409);
  return { orderNumber: updated.orderNumber };
}

/* =========================================================
   READ: sellers jinko paisa dena baaki hai (sirf VERIFIED orders)
========================================================= */

export async function getToPayOverview() {
  await assertAdmin();
  await connectToDatabase();

  const orders = await Order.find(ELIGIBLE)
    .sort({ "settlement.deliveredAt": 1 })
    .limit(1000)
    .lean();

  const groups = new Map();
  for (const o of orders) {
    const key = String(o.sellerId);
    if (!groups.has(key)) groups.set(key, { sellerId: key, sellerUsername: o.sellerUsername, orders: [] });
    groups.get(key).orders.push(o);
  }

  const ids = [...groups.keys()].map(oid);
  const [sellers, summaries] = await Promise.all([
    ids.length ? Seller.find({ userId: { $in: ids } }).select("+accountNumberEnc +ifscEnc").lean() : [],
    loadSellerSummaries([...groups.keys()]),
  ]);
  const sellerMap = new Map(sellers.map((s) => [String(s.userId), s]));

  const now = Date.now();

  const result = [...groups.values()].map((g) => {
    const s = sellerMap.get(g.sellerId);

    let accountNumber = "";
    let ifsc = "";
    if (s) {
      try {
        accountNumber = decryptText(s.accountNumberEnc);
        ifsc = decryptText(s.ifscEnc);
      } catch {
        accountNumber = "Unable to decrypt";
        ifsc = "Unable to decrypt";
      }
    }

    const totalPaise = g.orders.reduce((sum, o) => sum + (o.settlement?.sellerNetPaise || 0), 0);
    const overdue = g.orders.filter(
      (o) => o.settlement?.payoutDueBy && new Date(o.settlement.payoutDueBy).getTime() < now
    ).length;

    return {
      sellerId: g.sellerId,
      sellerName: s?.fullName || g.sellerUsername,
      sellerUsername: g.sellerUsername,
      email: s?.email || "",
      mobile: s?.mobile || "",
      sellerStatus: s?.sellerStatus || "unknown",
      canPay: s?.sellerStatus === "verified",
      totalPaid: toRupees(s?.totalPaidOutPaise),
      bank: {
        holder: s?.bankAccountHolderName || "",
        bankName: s?.bankName || "",
        accountNumber,
        ifsc,
      },
      amount: toRupees(totalPaise),
      orderCount: g.orders.length,
      productCount: g.orders.reduce((sum, o) => sum + (Number(o.totalQty) || 0), 0),
      overdue,
      summary: summaries.get(g.sellerId) || emptySummary(),
      orders: g.orders.map((o) => ({
        orderNumber: o.orderNumber,
        customerName: o.customer?.name || "",
        customerPhone: o.customer?.phone || "",
        items: (o.items || []).map((i) => `${i.name} × ${i.quantity}`).join(", "),
        quantity: Number(o.totalQty) || 0,
        amount: toRupees(o.settlement?.sellerNetPaise),
        deliveredAt: iso(o.settlement?.deliveredAt),
        dueBy: iso(o.settlement?.payoutDueBy),
      })),
    };
  });

  result.sort((a, b) => b.amount - a.amount);

  return {
    sellers: result,
    totalToPay: toRupees(result.reduce((sum, s) => sum + Math.round(s.amount * 100), 0)),
    truncated: orders.length >= 1000,
  };
}

/* =========================================================
   READ: payout history + stats
========================================================= */

function payoutDTO(r, itemMap = new Map(), summary = null) {
  const orders = (r.orders || []).map((o) => {
    const info = itemMap.get(String(o.orderId)) || { qty: 0, items: "" };
    return {
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      items: info.items,
      quantity: info.qty,
      amount: toRupees(o.amountPaise),
      deliveredAt: iso(o.deliveredAt),
    };
  });

  return {
    id: String(r._id),
    sellerId: String(r.sellerId),
    sellerName: r.sellerName,
    sellerUsername: r.sellerUsername,
    sellerEmail: r.sellerEmail,
    sellerMobile: r.sellerMobile,
    amount: toRupees(r.amountPaise),
    orderCount: r.orderIds?.length || 0,
    productCount: orders.reduce((sum, o) => sum + o.quantity, 0),
    status: r.status,
    utr: r.utr || "",
    bank: r.bank || {},
    createdAt: iso(r.createdAt),
    paidAt: iso(r.paidAt),
    failedAt: iso(r.failedAt),
    failureReason: r.failureReason || "",
    summary,
    orders,
  };
}

export async function getPayoutHistory(status = "") {
  await assertAdmin();
  await connectToDatabase();

  const filter = ["Pending", "Paid", "Failed"].includes(status) ? { status } : {};
  const rows = await PayoutRecord.find(filter).sort({ createdAt: -1 }).limit(100).lean();

  const [itemMap, summaries] = await Promise.all([
    loadOrderItemMap(rows),
    loadSellerSummaries(rows.map((r) => r.sellerId)),
  ]);

  return rows.map((r) => payoutDTO(r, itemMap, summaries.get(String(r.sellerId)) || emptySummary()));
}

export async function getPayoutStats() {
  await assertAdmin();
  await connectToDatabase();

  const rows = await PayoutRecord.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 }, amountPaise: { $sum: "$amountPaise" } } },
  ]);

  const out = {
    Pending: { count: 0, amount: 0 },
    Paid: { count: 0, amount: 0 },
    Failed: { count: 0, amount: 0 },
  };
  for (const r of rows) {
    if (out[r._id]) out[r._id] = { count: r.count, amount: toRupees(r.amountPaise) };
  }
  return out;
}

/* =========================================================
   READ: ek seller ki poori detail + saare orders
========================================================= */

export async function getSellerDetail(sellerUserId) {
  await assertAdmin();
  await connectToDatabase();

  if (!mongoose.isValidObjectId(sellerUserId)) throw createAppError("Seller not found.", 404);
  const sellerId = oid(sellerUserId);

  const seller = await Seller.findOne({ userId: sellerId }).select("+accountNumberEnc +ifscEnc").lean();

  const net = "$settlement.sellerNetPaise";
  const delivered = { $eq: ["$status", "delivered"] };
  const verify = { $ifNull: ["$settlement.adminDeliveryStatus", "unchecked"] };
  const payStatus = { $ifNull: ["$settlement.payoutStatus", "pending"] };
  const locked = { $ne: [{ $ifNull: ["$settlement.payoutId", null] }, null] };
  const unpaid = { $eq: [payStatus, "pending"] };
  const sum = (cond) => ({ $sum: { $cond: [cond, net, 0] } });
  const count = (cond) => ({ $sum: { $cond: [cond, 1, 0] } });
  const qty = (cond) => ({ $sum: { $cond: [cond, { $ifNull: ["$totalQty", 0] }, 0] } });

  const [orders, payouts, totalsRows, paidAgg] = await Promise.all([
    Order.find({ sellerId, "payment.status": { $nin: ["initiated", "failed"] } })
      .sort({ createdAt: -1 })
      .limit(300)
      .lean(),
    PayoutRecord.find({ sellerId }).sort({ createdAt: -1 }).limit(100).lean(),
    Order.aggregate([
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
          withSeller: sum({ $not: [delivered] }),
          withSellerOrders: count({ $not: [delivered] }),
          withSellerProducts: qty({ $not: [delivered] }),
          toVerify: sum({ $and: [delivered, unpaid, { $eq: [verify, "unchecked"] }] }),
          onHold: sum({ $and: [delivered, unpaid, { $eq: [verify, "issue"] }] }),
          ready: sum({ $and: [delivered, unpaid, { $eq: [verify, "verified"] }, { $not: [locked] }] }),
          awaitingUtr: sum({ $and: [delivered, unpaid, locked] }),
          paid: sum({ $and: [delivered, { $eq: [payStatus, "paid"] }] }),
          paidOutOrders: count({ $and: [delivered, { $eq: [payStatus, "paid"] }] }),
          paidOutProducts: qty({ $and: [delivered, { $eq: [payStatus, "paid"] }] }),
          deliveredOrders: count(delivered),
          deliveredProducts: qty(delivered),
          deliveredNet: sum(delivered),
        },
      },
    ]),
    PayoutRecord.aggregate([
      { $match: { sellerId, status: "Paid" } },
      { $group: { _id: null, total: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
    ]),
  ]);

  if (!seller && orders.length === 0) throw createAppError("Seller not found.", 404);

  let accountNumber = "";
  let ifsc = "";
  if (seller) {
    try {
      accountNumber = decryptText(seller.accountNumberEnc);
      ifsc = decryptText(seller.ifscEnc);
    } catch {
      accountNumber = "Unable to decrypt";
      ifsc = "Unable to decrypt";
    }
  }

  /* order -> payout (Failed payout ke orders free ho jaate hain, isliye ignore) */
  const payoutByOrder = new Map();
  for (const p of payouts) {
    if (p.status === "Failed") continue;
    for (const id of p.orderIds || []) payoutByOrder.set(String(id), { utr: p.utr, status: p.status });
  }

  const itemMap = await loadOrderItemMap(payouts);

  const rows = orders.map((o) => orderRow(o, payoutByOrder));
  const t = totalsRows[0] || {};
  const totalPaidPaise = Math.max(Number(seller?.totalPaidOutPaise) || 0, paidAgg[0]?.total || 0);

  return {
    seller: {
      id: String(sellerId),
      name: seller?.fullName || orders[0]?.sellerUsername || "Seller",
      username: orders[0]?.sellerUsername || payouts[0]?.sellerUsername || "",
      email: seller?.email || "",
      mobile: seller?.mobile || "",
      sellerStatus: seller?.sellerStatus || "unknown",
      canPay: seller?.sellerStatus === "verified",
      lastPayoutAt: iso(seller?.lastPayoutAt),
      bank: {
        holder: seller?.bankAccountHolderName || "",
        bankName: seller?.bankName || "",
        accountNumber,
        ifsc,
      },
    },
    totals: {
      totalPaid: toRupees(totalPaidPaise),
      ready: toRupees(t.ready),
      awaitingUtr: toRupees(t.awaitingUtr),
      toVerify: toRupees(t.toVerify),
      onHold: toRupees(t.onHold),
      withSeller: toRupees(t.withSeller),
    },
    summary: {
      totalPaid: toRupees(totalPaidPaise),
      paidPayouts: paidAgg[0]?.count || 0,
      paidOutOrders: t.paidOutOrders || 0,
      paidOutProducts: t.paidOutProducts || 0,
      deliveredOrders: t.deliveredOrders || 0,
      deliveredProducts: t.deliveredProducts || 0,
      deliveredAmount: toRupees(t.deliveredNet),
      withSellerOrders: t.withSellerOrders || 0,
      withSellerProducts: t.withSellerProducts || 0,
      withSellerAmount: toRupees(t.withSeller),
    },
    needsCheck: rows.filter((r) => r.stage === "check" || r.stage === "hold"),
    orders: rows,
    payouts: payouts.map((p) => payoutDTO(p, itemMap)),
    ordersTruncated: orders.length >= 300,
  };
}

/* =========================================================
   WRITE: create payout (sirf VERIFIED orders lock hote hain)
========================================================= */

export async function createPayout(sellerId) {
  const admin = await assertAdmin();
  await connectToDatabase();

  if (!mongoose.isValidObjectId(sellerId)) throw createAppError("Seller not found.", 404);

  const seller = await Seller.findOne({ userId: sellerId }).select("+accountNumberEnc +ifscEnc");
  if (!seller) throw createAppError("Seller not found.", 404);
  if (seller.sellerStatus !== "verified") {
    throw createAppError("This seller is not verified. Payout is not allowed.", 409);
  }

  const payoutId = new mongoose.Types.ObjectId();

  const claim = await Order.updateMany(
    { ...ELIGIBLE, sellerId: oid(sellerId) },
    { $set: { "settlement.payoutId": payoutId } }
  );

  if (!claim.modifiedCount) {
    throw createAppError("No verified orders are ready for this seller.", 409);
  }

  try {
    const orders = await Order.find({ "settlement.payoutId": payoutId }).lean();
    const amountPaise = orders.reduce((sum, o) => sum + (o.settlement?.sellerNetPaise || 0), 0);

    let ifsc = "";
    try {
      ifsc = decryptText(seller.ifscEnc);
    } catch {
      throw createAppError("Could not read the seller's bank details.", 500);
    }

    await PayoutRecord.create({
      _id: payoutId,
      sellerId: seller.userId,
      sellerName: seller.fullName,
      sellerUsername: orders[0]?.sellerUsername || "",
      sellerEmail: seller.email,
      sellerMobile: seller.mobile,
      orderIds: orders.map((o) => o._id),
      orders: orders.map((o) => ({
        orderId: o._id,
        orderNumber: o.orderNumber,
        amountPaise: o.settlement?.sellerNetPaise || 0,
        customerName: o.customer?.name || "",
        customerPhone: o.customer?.phone || "",
        deliveredAt: o.settlement?.deliveredAt || null,
      })),
      amountPaise,
      status: "Pending",
      bank: {
        holder: seller.bankAccountHolderName,
        bankName: seller.bankName,
        ifsc,
        last4: seller.accountLast4,
      },
      createdBy: admin.id,
    });

    return { id: String(payoutId), amount: toRupees(amountPaise), orderCount: orders.length, sellerName: seller.fullName };
  } catch (error) {
    await Order.updateMany({ "settlement.payoutId": payoutId }, { $set: { "settlement.payoutId": null } });
    throw error;
  }
}

/* =========================================================
   WRITE: mark paid (UTR 2 baar confirm) + seller ka total paid update
========================================================= */

const normUtr = (v) => String(v || "").trim().toUpperCase().replace(/\s+/g, "");

export async function markPayoutPaid(payoutId, utrInput, utrConfirmInput) {
  const admin = await assertAdmin();
  await connectToDatabase();

  if (!mongoose.isValidObjectId(payoutId)) throw createAppError("Payout not found.", 404);

  const utr = normUtr(utrInput);
  const utrConfirm = normUtr(utrConfirmInput);

  if (!utr || !utrConfirm) {
    throw createAppError("Enter the UTR in both boxes.", 400);
  }
  if (utr !== utrConfirm) {
    throw createAppError("The two UTR numbers do not match. Check the bank receipt and enter the same UTR in both boxes.", 400);
  }
  if (!/^[A-Z0-9]{8,30}$/.test(utr)) {
    throw createAppError("Enter a valid UTR (8-30 letters/numbers).", 400);
  }

  let record;
  try {
    record = await PayoutRecord.findOneAndUpdate(
      { _id: payoutId, status: "Pending" },
      { $set: { status: "Paid", utr, paidAt: new Date(), updatedBy: admin.id } },
      { new: true }
    );
  } catch (error) {
    if (error?.code === 11000) throw createAppError("This UTR is already used for another payout.", 409);
    throw error;
  }

  if (!record) throw createAppError("This payout is not pending anymore.", 409);

  await Order.updateMany(
    { "settlement.payoutId": record._id },
    { $set: { "settlement.payoutStatus": "paid", "settlement.paidOutAt": record.paidAt } }
  );

  /* Seller pe save: LinkStorx ne ab tak is seller ko kul kitna diya */
  await Seller.updateOne(
    { userId: record.sellerId },
    { $inc: { totalPaidOutPaise: record.amountPaise }, $set: { lastPayoutAt: record.paidAt } }
  );

  return { amount: toRupees(record.amountPaise), sellerName: record.sellerName, utr };
}

/* =========================================================
   WRITE: mark failed (orders wapas To Pay mein)
========================================================= */

export async function markPayoutFailed(payoutId, reasonInput) {
  const admin = await assertAdmin();
  await connectToDatabase();

  if (!mongoose.isValidObjectId(payoutId)) throw createAppError("Payout not found.", 404);

  const reason = String(reasonInput || "").trim().slice(0, 300);
  if (reason.length < 3) throw createAppError("Enter the reason for failure (min 3 characters).", 400);

  const record = await PayoutRecord.findOneAndUpdate(
    { _id: payoutId, status: "Pending" },
    { $set: { status: "Failed", failedAt: new Date(), failureReason: reason, updatedBy: admin.id } },
    { new: true }
  );

  if (!record) throw createAppError("This payout is not pending anymore.", 409);

  await Order.updateMany({ "settlement.payoutId": record._id }, { $set: { "settlement.payoutId": null } });

  return { sellerName: record.sellerName };
}