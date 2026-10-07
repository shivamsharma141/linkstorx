import mongoose from "mongoose";

import { connectToDatabase } from "@/app/lib/database/mongodb";
import Order from "@/app/databaseModels/Order";
import Product from "@/app/databaseModels/Product";

export const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

/* ---------- products ---------- */

export async function findProductsByIds(ids) {
  await connectToDatabase();
  return Product.find({ _id: { $in: ids } })
    .populate({ path: "userId", select: "username" })
    .lean();
}

/**
 * Atomically reduces stock for tracked products.
 * If any line fails, everything already reduced is put back.
 */
export async function reserveStock(lines) {
  await connectToDatabase();
  const done = [];

  for (const line of lines) {
    if (!line.trackInventory) continue;

    const res = await Product.updateOne(
      { _id: line.productId, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } }
    );

    if (res.modifiedCount !== 1) {
      await releaseStock(done);
      return { ok: false, productId: String(line.productId) };
    }
    done.push(line);
  }
  return { ok: true, reserved: done };
}

export async function releaseStock(lines) {
  await connectToDatabase();
  for (const line of lines) {
    if (!line.trackInventory) continue;
    await Product.updateOne({ _id: line.productId }, { $inc: { stock: line.quantity } });
  }
}

/* ---------- orders ---------- */

export async function createOrder(data) {
  await connectToDatabase();
  const doc = await Order.create(data);
  return doc.toObject();
}

export async function findOrderByNumber(orderNumber) {
  await connectToDatabase();
  return Order.findOne({ orderNumber }).lean();
}

export async function listOrders({ filter, page = 1, limit = 20 }) {
  await connectToDatabase();
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);
  return { orders, total };
}

/**
 * Seller status change.
 * Sirf tab update hota hai jab order abhi cancelled/delivered nahi hai
 * (isse double stock-release aur buyer-cancel ke saath race se bachte hain).
 * Returns null agar condition match nahi hui.
 */
export async function setOrderStatus(orderNumber, status, extra = {}) {
  await connectToDatabase();
  return Order.findOneAndUpdate(
    { orderNumber, status: { $nin: ["cancelled", "delivered"] } },
    { $set: { status, ...extra } },
    { new: true }
  ).lean();
}

/**
 * Buyer cancel — ATOMIC.
 * Ek hi query mein check + update: order isi buyer ka ho AUR status
 * abhi bhi cancel-able ho. Agar seller ne beech mein "shipped" kar diya
 * to null return hoga aur kuch update nahi hoga.
 * sellerSeen=false  ->  seller ke dashboard par alert/badge.
 */
export async function cancelOrderByBuyerAtomic({ orderNumber, buyerId, reason, allowedStatuses }) {
  await connectToDatabase();
  return Order.findOneAndUpdate(
    { orderNumber, buyerId, status: { $in: allowedStatuses } },
    {
      $set: {
        status: "cancelled",
        "cancellation.cancelledBy": "buyer",
        "cancellation.reason": reason,
        "cancellation.cancelledAt": new Date(),
        sellerSeen: false,
      },
    },
    { new: true }
  ).lean();
}