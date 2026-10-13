import crypto from "crypto";

import { getPlan, getPlans, getPublicPlans, PAID_PLAN_IDS } from "@/app/config/subscriptionPlans";

import {
  createRazorpayOrder,
  getRazorpayKeyId,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "@/app/lib/razorpay/razorpay";

import {
  findSubscriptionByUserId,
  applyOrderToSubscription,
  createSubscriptionOrderRecord,
  findOrderByRazorpayOrderId,
  markOrderPaid,
  countRecentCreatedOrders,
  countProductsByUserId,
  deleteProductByIdForUser,
} from "@/app/databaseQueries/subscriptionDatabaseQueries";

const DAY_MS = 24 * 60 * 60 * 1000;

export { getPublicPlans };

function createAppError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

/* =========================================================
   CURRENT PLAN
   Plan sirf database se aata hai. Expire ho gaya to Free.
========================================================= */

async function resolveUserPlan(userId) {
  const subscription = await findSubscriptionByUserId(userId);

  if (subscription && subscription.expiresAt > new Date()) {
    const plan = getPlan(subscription.plan);

    if (plan) {
      return { plan, subscription, expired: false };
    }
  }

  return {
    plan: getPlan("free"),
    subscription,
    expired: Boolean(subscription),
  };
}

function limitMessage(plan) {
  if (plan.id === "free") {
    return `You have reached the ${plan.productLimit} product limit on the Free plan. Please subscribe to a plan to add more products.`;
  }

  const hasHigherPlan = Object.values(getPlans()).some((p) => p.rank > plan.rank);

  if (hasHigherPlan) {
    return `You have reached the ${plan.productLimit} product limit on the ${plan.name} plan. Please upgrade your plan to add more products.`;
  }

  return `You have reached the ${plan.productLimit} product limit on the ${plan.name} plan.`;
}

/* Dashboard / subscription page ke liye summary (koi secret nahi). */
export async function getSubscriptionSummary(userId) {
  const { plan, subscription, expired } = await resolveUserPlan(userId);
  const used = await countProductsByUserId(userId);

  const reached = used >= plan.productLimit;

  // Expire hone par plan Free ban jata hai, isliye purana plan alag se bhejte hain
  const expiredPlan = expired && subscription ? getPlan(subscription.plan) : null;

  return {
    planId: plan.id,
    planName: plan.name,
    productLimit: plan.productLimit,
    used,
    remaining: Math.max(0, plan.productLimit - used),
    reached,
    expired,
    expiredPlanId: expiredPlan ? expiredPlan.id : null,
    expiredPlanName: expiredPlan ? expiredPlan.name : null,
    // Active ho ya expired, subscription hai to date bhejo. Free (kabhi paid nahi liya) = null
    expiresAt: subscription ? subscription.expiresAt.toISOString() : null,
    message: reached ? limitMessage(plan) : "",
  };
}

/* =========================================================
   PRODUCT LIMIT (productBusinessLogic se call hota hai)
========================================================= */

export async function assertCanAddProduct(userId) {
  const summary = await getSubscriptionSummary(userId);

  if (summary.reached) {
    throw createAppError(summary.message, 403, "PLAN_LIMIT_REACHED");
  }
}

/*
 * Race-condition guard: agar user ek saath kai requests bhej kar limit
 * paar kar le, to jo product abhi bana usse hata deta hai.
 */
export async function enforceProductLimitAfterCreate(userId, productId) {
  const { plan } = await resolveUserPlan(userId);
  const used = await countProductsByUserId(userId);

  if (used > plan.productLimit) {
    await deleteProductByIdForUser(userId, productId);

    throw createAppError(limitMessage(plan), 403, "PLAN_LIMIT_REACHED");
  }
}

/* =========================================================
   STEP 1: ORDER BANANA
========================================================= */

export async function createSubscriptionOrder(user, planId) {
  const plan = PAID_PLAN_IDS.includes(planId) ? getPlan(planId) : null;

  if (!plan) {
    throw createAppError("Invalid plan.", 400);
  }

  if (plan.pricePaise < 100) {
    throw createAppError("Plan price is not configured correctly.", 500);
  }

  const { plan: currentPlan } = await resolveUserPlan(user.id);

  if (currentPlan.rank > plan.rank) {
    throw createAppError(
      `You already have the ${currentPlan.name} plan, which is higher than ${plan.name}.`,
      400
    );
  }

  // Spam / abuse guard: 15 minute me 5 se zyada adhoori attempts nahi
  const recentAttempts = await countRecentCreatedOrders(
    user.id,
    new Date(Date.now() - 15 * 60 * 1000)
  );

  if (recentAttempts >= 5) {
    throw createAppError(
      "Too many payment attempts. Please wait a few minutes and try again.",
      429
    );
  }

  const receipt = `sub_${crypto.randomBytes(8).toString("hex")}`;

  const razorpayOrder = await createRazorpayOrder({
    amountPaise: plan.pricePaise,
    receipt,
    notes: { userId: user.id, plan: plan.id },
  });

  if (razorpayOrder.amount !== plan.pricePaise) {
    throw createAppError("Could not start the payment. Please try again.", 502);
  }

  await createSubscriptionOrderRecord({
    userId: user.id,
    plan: plan.id,
    amountPaise: plan.pricePaise,
    currency: "INR",
    razorpayOrderId: razorpayOrder.id,
    status: "created",
  });

  return {
    orderId: razorpayOrder.id,
    keyId: getRazorpayKeyId(),
    planName: plan.name,
    prefill: { name: user.username, email: user.email },
  };
}

/* =========================================================
   PAYMENT PAKKA HONE KE BAAD PLAN LAGANA
   (verify route aur webhook dono yahi use karte hain)
========================================================= */

async function applyPlanFromOrder(order) {
  const plan = getPlan(order.plan);

  if (!plan || !plan.durationDays) {
    throw createAppError("Invalid plan on order.", 500);
  }

  const now = new Date();
  const subscription = await findSubscriptionByUserId(order.userId);

  const stillActive = Boolean(subscription && subscription.expiresAt > now);
  const samePlan = stillActive && subscription.plan === plan.id;

  // Same plan renew = bacha hua time + naye din.  Upgrade / expired ke baad = aaj se naye din.
  const base = samePlan ? subscription.expiresAt : now;
  const expiresAt = new Date(base.getTime() + plan.durationDays * DAY_MS);
  const startedAt = samePlan ? subscription.startedAt : now;

  await applyOrderToSubscription(order.userId, order.razorpayOrderId, {
    plan: plan.id,
    startedAt,
    expiresAt,
    paymentId: order.razorpayPaymentId || "",
  });
}

async function finalizeOrder(order, paymentId) {
  let paidOrder = order;

  if (order.status !== "paid") {
    paidOrder =
      (await markOrderPaid(order.razorpayOrderId, paymentId)) ||
      (await findOrderByRazorpayOrderId(order.razorpayOrderId));
  }

  await applyPlanFromOrder(paidOrder);

  return paidOrder;
}

/* =========================================================
   STEP 2: BROWSER SE VERIFY (Razorpay checkout ke baad)
========================================================= */

export async function verifyPaymentForUser(userId, body) {
  const orderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";

  if (!orderId || !paymentId || !signature) {
    throw createAppError("Invalid payment details.", 400);
  }

  const order = await findOrderByRazorpayOrderId(orderId);

  // Order isi user ka hona chahiye
  if (!order || order.userId.toString() !== userId) {
    throw createAppError("Order not found.", 404);
  }

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    throw createAppError("Payment verification failed.", 400);
  }

  await finalizeOrder(order, paymentId);

  return getSubscriptionSummary(userId);
}

/* =========================================================
   STEP 3: WEBHOOK (browser band ho jaye tab bhi plan lag jaye)
========================================================= */

const HANDLED_EVENTS = ["payment.captured", "order.paid"];

export async function processWebhook(rawBody, signature) {
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    throw createAppError("Invalid signature.", 400);
  }

  let event;

  try {
    event = JSON.parse(rawBody);
  } catch {
    throw createAppError("Invalid payload.", 400);
  }

  if (!HANDLED_EVENTS.includes(event?.event)) {
    return { handled: false };
  }

  const payment = event.payload?.payment?.entity;

  if (!payment?.order_id || !payment?.id) {
    return { handled: false };
  }

  const order = await findOrderByRazorpayOrderId(payment.order_id);

  // Humara order nahi hai (kisi aur cheez ka payment) -> ignore
  if (!order) {
    return { handled: false };
  }

  if (
    payment.status !== "captured" ||
    payment.amount !== order.amountPaise ||
    payment.currency !== order.currency
  ) {
    console.error("Webhook payment mismatch for order", order.razorpayOrderId);
    return { handled: false };
  }

  await finalizeOrder(order, payment.id);

  return { handled: true };
}