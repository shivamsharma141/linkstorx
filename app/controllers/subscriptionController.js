import { NextResponse } from "next/server";

import { getCurrentUser } from "@/app/lib/auth/auth";

import {
  createSubscriptionOrder,
  verifyPaymentForUser,
  processWebhook,
} from "@/app/businessLogic/subscriptionBusinessLogic";

const NO_STORE = { "Cache-Control": "no-store" };

function jsonResponse(body, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function handleError(error) {
  const statusCode = error.statusCode || 500;

  if (statusCode === 500) {
    console.error("Subscription API error:", error);
  }

  return jsonResponse(
    {
      success: false,
      message:
        statusCode === 500 ? "Something went wrong. Please try again." : error.message,
      code: error.code || undefined,
    },
    statusCode
  );
}

function unauthorizedResponse() {
  return jsonResponse({ success: false, message: "Not authenticated." }, 401);
}

/* Same-origin check (CSRF defence in depth; cookie bhi SameSite=Lax hai). */
function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

  return Boolean(host) && originHost === host;
}

/* ---------------- POST /api/subscription/create-order ---------------- */

export async function createSubscriptionOrderController(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!isSameOrigin(request)) {
      return jsonResponse({ success: false, message: "Forbidden." }, 403);
    }

    const body = await request.json().catch(() => ({}));

    // Browser se SIRF plan ka naam liya jata hai. Price kabhi nahi.
    const order = await createSubscriptionOrder(user, body?.plan);

    return jsonResponse({ success: true, ...order });
  } catch (error) {
    return handleError(error);
  }
}

/* ---------------- POST /api/subscription/verify ---------------- */

export async function verifySubscriptionPaymentController(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    if (!isSameOrigin(request)) {
      return jsonResponse({ success: false, message: "Forbidden." }, 403);
    }

    const body = await request.json().catch(() => ({}));

    const summary = await verifyPaymentForUser(user.id, body);

    return jsonResponse({ success: true, summary });
  } catch (error) {
    return handleError(error);
  }
}

/* ---------------- POST /api/subscription/webhook ----------------
   Login nahi hota — Razorpay ke signature se verify hota hai.
   Raw body chahiye, isliye request.text() use hota hai. */

export async function subscriptionWebhookController(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    await processWebhook(rawBody, signature);

    return jsonResponse({ success: true });
  } catch (error) {
    return handleError(error);
  }
}