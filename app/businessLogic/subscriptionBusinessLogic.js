import crypto from "crypto";

import { getPlan, getPlans, getPublicPlans, PAID_PLAN_IDS } from "@/app/config/subscriptionPlans";

import {
  createCashfreeOrder,
  getCashfreeMode,
  getCashfreeOrderPayments,
  verifyWebhookSignature,
  rupeesToPaise,
} from "@/app/lib/cashfree/cashfree";

import {
  findSubscriptionByUserId,
  applyOrderToSubscription,
  createSubscriptionOrderRecord,
  findOrderByCashfreeOrderId,
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

// Cashfree ko valid 10 digit phone chahiye. User ke paas phone nahi hai to placeholder.
function getCustomerPhone(user) {
  const digits = String(user.phone || user.mobile || "").replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? digits : "9999999999";
}

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

  // Cashfree order_id: letters, numbers, _ aur - (3 se 45 chars)
  const orderId = `sub_${crypto.randomBytes(8).toString("hex")}`;

  // Mobile UPI apps se wapas aane par user yaha redirect hota hai
  const returnUrl = process.env.CASHFREE_RETURN_URL
    ? `${process.env.CASHFREE_RETURN_URL}?order_id={order_id}`
    : undefined;

  const cashfreeOrder = await createCashfreeOrder({
    orderId,
    amountPaise: plan.pricePaise,
    customer: {
      id: String(user.id),
      name: user.username,
      email: user.email,
      phone: getCustomerPhone(user),
    },
    returnUrl,
    tags: { userId: String(user.id), plan: plan.id },
  });

  if (rupeesToPaise(cashfreeOrder.order_amount) !== plan.pricePaise) {
    throw createAppError("Could not start the payment. Please try again.", 502);
  }

  await createSubscriptionOrderRecord({
    userId: user.id,
    plan: plan.id,
    amountPaise: plan.pricePaise,
    currency: "INR",
    cashfreeOrderId: cashfreeOrder.order_id,
    status: "created",
  });

  return {
    orderId: cashfreeOrder.order_id,
    paymentSessionId: cashfreeOrder.payment_session_id,
    mode: getCashfreeMode(),
    planName: plan.name,
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

  await applyOrderToSubscription(order.userId, order.cashfreeOrderId, {
    plan: plan.id,
    startedAt,
    expiresAt,
    paymentId: order.cashfreePaymentId || "",
  });
}

async function finalizeOrder(order, paymentId) {
  let paidOrder = order;

  if (order.status !== "paid") {
    paidOrder =
      (await markOrderPaid(order.cashfreeOrderId, paymentId)) ||
      (await findOrderByCashfreeOrderId(order.cashfreeOrderId));
  }

  await applyPlanFromOrder(paidOrder);

  return paidOrder;
}

/* =========================================================
   STEP 2: BROWSER SE VERIFY (Cashfree checkout ke baad)
   Browser sirf order_id bhejta hai. Asli status hum Cashfree
   ke server se poochte hain — browser pe bharosa nahi.
========================================================= */

export async function verifyPaymentForUser(userId, body) {
  const orderId = typeof body?.order_id === "string" ? body.order_id : "";

  if (!orderId) {
    throw createAppError("Invalid payment details.", 400);
  }

  const order = await findOrderByCashfreeOrderId(orderId);

  // Order isi user ka hona chahiye
  if (!order || order.userId.toString() !== userId) {
    throw createAppError("Order not found.", 404);
  }

  // Already paid ho chuka (webhook pehle aa gaya) -> seedha summary
  if (order.status !== "paid") {
    const payments = await getCashfreeOrderPayments(orderId);

    const successPayment = payments.find(
      (p) =>
        p.payment_status === "SUCCESS" &&
        rupeesToPaise(p.payment_amount) === order.amountPaise &&
        (p.payment_currency || "INR") === order.currency
    );

    if (!successPayment) {
      throw createAppError("Payment is not confirmed yet.", 400);
    }

    await finalizeOrder(order, String(successPayment.cf_payment_id));
  } else {
    await finalizeOrder(order, order.cashfreePaymentId);
  }

  return getSubscriptionSummary(userId);
}

/* =========================================================
   STEP 3: WEBHOOK (browser band ho jaye tab bhi plan lag jaye)
========================================================= */

const HANDLED_EVENTS = ["PAYMENT_SUCCESS_WEBHOOK"];

export async function processWebhook(rawBody, signature, timestamp) {
  if (!signature || !timestamp || !verifyWebhookSignature(rawBody, signature, timestamp)) {
    throw createAppError("Invalid signature.", 400);
  }

  let event;

  try {
    event = JSON.parse(rawBody);
  } catch {
    throw createAppError("Invalid payload.", 400);
  }

  if (!HANDLED_EVENTS.includes(event?.type)) {
    return { handled: false };
  }

  const orderId = event.data?.order?.order_id;
  const payment = event.data?.payment;

  if (!orderId || !payment?.cf_payment_id) {
    return { handled: false };
  }

  const order = await findOrderByCashfreeOrderId(orderId);

  // Humara order nahi hai -> ignore
  if (!order) {
    return { handled: false };
  }

  if (
    payment.payment_status !== "SUCCESS" ||
    rupeesToPaise(payment.payment_amount) !== order.amountPaise ||
    (payment.payment_currency || "INR") !== order.currency
  ) {
    console.error("Webhook payment mismatch for order", order.cashfreeOrderId);
    return { handled: false };
  }

  await finalizeOrder(order, String(payment.cf_payment_id));

  return { handled: true };
}