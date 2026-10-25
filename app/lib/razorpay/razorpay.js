import crypto from "crypto";

/*
 * Razorpay helper — SERVER ONLY. Koi npm package nahi chahiye
 * (sirf fetch + Node ka crypto).
 */

const RAZORPAY_API = "https://api.razorpay.com/v1";

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw createAppError("Razorpay keys are not configured.", 500);
  }

  return { keyId, keySecret };
}

function authHeader() {
  const { keyId, keySecret } = getKeys();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

function safeEqual(a, b) {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));

  if (bufferA.length !== bufferB.length) return false;

  return crypto.timingSafeEqual(bufferA, bufferB);
}

export function getRazorpayKeyId() {
  return getKeys().keyId;
}

/* Amount hamesha server se aata hai — browser ka koi amount use nahi hota. */
export async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  const response = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.id) {
    console.error("Razorpay order creation failed:", response.status, data);
    throw createAppError("Could not start the payment. Please try again.", 502);
  }

  return data;
}

/* Checkout ke baad: HMAC_SHA256(order_id|payment_id) == signature */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const { keySecret } = getKeys();

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return safeEqual(expected, signature);
}

/*
 * Webhook: HMAC_SHA256(raw body) == x-razorpay-signature
 * secretEnvName se alag-alag webhooks (subscription / store orders) ke
 * secret alag rakh sakte ho.
 */
export function verifyWebhookSignature(rawBody, signature, secretEnvName = "RAZORPAY_WEBHOOK_SECRET") {
  const secret = process.env[secretEnvName];

  if (!secret) {
    throw createAppError(`${secretEnvName} is not configured.`, 500);
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  return safeEqual(expected, signature);
}

/* Refund: full ya partial. Payment ID Razorpay ki hoti hai (pay_xxx) */
export async function refundRazorpayPayment({ paymentId, amountPaise, notes }) {
  const response = await fetch(`${RAZORPAY_API}/payments/${paymentId}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({ amount: amountPaise, speed: "normal", notes }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.id) {
    console.error("Razorpay refund failed:", response.status, data);
    throw createAppError("Refund could not be started.", 502);
  }

  return data;
}