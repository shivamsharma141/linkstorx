import crypto from "crypto";

/*
 * Cashfree helper — SERVER ONLY. Koi npm package nahi chahiye
 * (sirf fetch + Node ka crypto).
 *
 * ENV:
 *   CASHFREE_APP_ID
 *   CASHFREE_SECRET_KEY
 *   CASHFREE_ENV = "sandbox" | "production"   (default: sandbox)
 */

const API_VERSION = "2023-08-01";

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function getCashfreeMode() {
  return process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
}

function getBaseUrl() {
  return getCashfreeMode() === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

function getKeys() {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!appId || !secretKey) {
    throw createAppError("Cashfree keys are not configured.", 500);
  }

  return { appId, secretKey };
}

function safeEqual(a, b) {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));

  if (bufferA.length !== bufferB.length) return false;

  return crypto.timingSafeEqual(bufferA, bufferB);
}

async function cashfreeRequest(path, { method = "GET", body } = {}) {
  const { appId, secretKey } = getKeys();

  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": API_VERSION,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => ({}));

  return { ok: response.ok, status: response.status, data };
}

/* Amount hamesha server se aata hai — browser ka koi amount use nahi hota. */
export async function createCashfreeOrder({
  orderId,
  amountPaise,
  customer,
  returnUrl,
  tags,
}) {
  const { ok, status, data } = await cashfreeRequest("/orders", {
    method: "POST",
    body: {
      order_id: orderId,
      // Cashfree rupees leta hai (Razorpay paise leta tha)
      order_amount: Number((amountPaise / 100).toFixed(2)),
      order_currency: "INR",
      customer_details: {
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
      },
      order_meta: returnUrl ? { return_url: returnUrl } : undefined,
      order_tags: tags,
    },
  });

  if (!ok || !data.payment_session_id) {
    console.error("Cashfree order creation failed:", status, data);
    throw createAppError("Could not start the payment. Please try again.", 502);
  }

  return data;
}

/* Order ki details (order_status: ACTIVE / PAID / EXPIRED) */
export async function getCashfreeOrder(orderId) {
  const { ok, status, data } = await cashfreeRequest(
    `/orders/${encodeURIComponent(orderId)}`
  );

  if (!ok) {
    console.error("Cashfree get order failed:", status, data);
    throw createAppError("Could not verify the payment. Please try again.", 502);
  }

  return data;
}

/* Us order ke saare payment attempts */
export async function getCashfreeOrderPayments(orderId) {
  const { ok, status, data } = await cashfreeRequest(
    `/orders/${encodeURIComponent(orderId)}/payments`
  );

  if (!ok || !Array.isArray(data)) {
    console.error("Cashfree get payments failed:", status, data);
    throw createAppError("Could not verify the payment. Please try again.", 502);
  }

  return data;
}

/*
 * Webhook: base64( HMAC_SHA256( timestamp + rawBody, secretKey ) )
 * Headers: x-webhook-signature, x-webhook-timestamp
 */
export function verifyWebhookSignature(rawBody, signature, timestamp) {
  const { secretKey } = getKeys();

  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");

  return safeEqual(expected, signature);
}

export function rupeesToPaise(value) {
  return Math.round(Number(value) * 100);
}