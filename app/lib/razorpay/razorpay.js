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
  const { keyId, keySecret } = getKeys();

  const response = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
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

/* Webhook: HMAC_SHA256(raw body) == x-razorpay-signature */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw createAppError("Razorpay webhook secret is not configured.", 500);
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  return safeEqual(expected, signature);
}