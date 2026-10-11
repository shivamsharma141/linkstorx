import { connectToDatabase } from "@/app/lib/database/mongodb";
import Subscription from "@/app/databaseModels/Subscription";
import SubscriptionOrder from "@/app/databaseModels/SubscriptionOrder";
import Product from "@/app/databaseModels/Product";

/* =========================================================
   SUBSCRIPTION
========================================================= */

export async function findSubscriptionByUserId(userId) {
  await connectToDatabase();

  return Subscription.findOne({ userId });
}

/*
 * Order ko subscription me ek hi baar lagata hai.
 * Filter me `appliedOrderIds: { $ne: orderId }` hai, isliye verify + webhook
 * dono ek saath chalein to bhi din sirf ek baar badhte hain.
 */
export async function applyOrderToSubscription(userId, razorpayOrderId, data) {
  await connectToDatabase();

  try {
    const result = await Subscription.updateOne(
      { userId, appliedOrderIds: { $ne: razorpayOrderId } },
      {
        $set: {
          plan: data.plan,
          startedAt: data.startedAt,
          expiresAt: data.expiresAt,
          lastPaymentId: data.paymentId,
        },
        $push: { appliedOrderIds: razorpayOrderId },
      },
      { upsert: true }
    );

    return result.modifiedCount > 0 || result.upsertedCount > 0;
  } catch (error) {
    // E11000 = userId unique index: matlab yeh order pehle hi lag chuka hai
    if (error?.code === 11000) return false;
    throw error;
  }
}

/* =========================================================
   ORDERS
========================================================= */

export async function createSubscriptionOrderRecord(data) {
  await connectToDatabase();

  return SubscriptionOrder.create(data);
}

export async function findOrderByRazorpayOrderId(razorpayOrderId) {
  await connectToDatabase();

  return SubscriptionOrder.findOne({ razorpayOrderId });
}

/* Sirf tab update hota hai jab order abhi "paid" nahi hai (idempotent). */
export async function markOrderPaid(razorpayOrderId, paymentId) {
  await connectToDatabase();

  return SubscriptionOrder.findOneAndUpdate(
    { razorpayOrderId, status: { $ne: "paid" } },
    {
      $set: {
        status: "paid",
        razorpayPaymentId: paymentId,
        paidAt: new Date(),
      },
    },
    { new: true }
  );
}

export async function countRecentCreatedOrders(userId, since) {
  await connectToDatabase();

  return SubscriptionOrder.countDocuments({
    userId,
    status: "created",
    createdAt: { $gte: since },
  });
}

/* =========================================================
   PRODUCT COUNT (plan limit check)
========================================================= */

export async function countProductsByUserId(userId) {
  await connectToDatabase();

  return Product.countDocuments({ userId });
}

export async function deleteProductByIdForUser(userId, productId) {
  await connectToDatabase();

  return Product.deleteOne({ _id: productId, userId });
}