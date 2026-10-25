import { NextResponse } from "next/server";

import { getCurrentUser } from "@/app/lib/auth/auth";
import { verifyWebhookSignature } from "@/app/lib/razorpay/razorpay";
import {
  OrderError,
  placeOrder,
  getOrderForUser,
  listOrdersForUser,
  updateOrderStatus,
  cancelOrderByBuyer,
  verifyPayment,
  handleRazorpayEvent,
} from "@/app/businessLogic/orderLogic";

const ok = (body, status = 200) => NextResponse.json({ success: true, ...body }, { status });
const fail = (message, status = 400, extra = {}) =>
  NextResponse.json({ success: false, message, ...extra }, { status });

const userIdOf = (u) => (u ? String(u._id || u.id || "") : "");

function handleError(err, label) {
  if (err instanceof OrderError) return fail(err.message, err.status, err.fields ? { errors: err.fields } : {});
  console.error(`${label}:`, err);
  return fail("Something went wrong. Please try again.", 500);
}

async function currentUserOrNull() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

/* POST /api/orders  -> order banata hai (payment "initiated") + Razorpay order deta hai */
export async function createOrderController(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return fail("Invalid request.", 400);
    }

    const user = await currentUserOrNull(); // optional: links the order to the buyer if logged in
    const { order, checkout } = await placeOrder({
      seller: body.seller,
      items: body.items,
      customer: body.customer,
      payment: body.payment,
      buyerId: userIdOf(user) || null,
    });

    return ok(
      {
        orderId: order.orderNumber,
        order,
        checkout, // { keyId, razorpayOrderId, amountPaise, currency } -> browser Razorpay window ke liye
        message: "Order created. Complete the payment to confirm it.",
      },
      201
    );
  } catch (err) {
    return handleError(err, "create order error");
  }
}

/* POST /api/payments/verify -> Razorpay window ke baad browser yahan signature bhejta hai */
export async function verifyPaymentController(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const order = await verifyPayment({
      orderNumber: body.orderNumber,
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });

    return ok({
      orderId: order.orderNumber,
      order,
      message: `Payment received! @${order.sellerUsername} will contact you shortly.`,
    });
  } catch (err) {
    return handleError(err, "verify payment error");
  }
}

/* POST /api/payments/webhook -> Razorpay server-to-server (backup agar browser band ho jaye) */
export async function razorpayWebhookController(request) {
  // Signature raw body par banta hai, isliye pehle text() lo
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";

  let valid = false;
  try {
    valid = verifyWebhookSignature(rawBody, signature, "RAZORPAY_STORE_WEBHOOK_SECRET");
  } catch (err) {
    console.error("store webhook config error:", err.message);
    return fail("Webhook is not configured.", 500);
  }
  if (!valid) return fail("Invalid signature.", 400);

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return fail("Invalid payload.", 400);
  }

  try {
    await handleRazorpayEvent(event);
    return ok({});
  } catch (err) {
    // 4xx = hamari taraf se final jawab (retry bekaar), baaki par Razorpay dobara bhejega
    if (err instanceof OrderError && err.status < 500) return ok({ ignored: true });
    console.error("store webhook error:", err);
    return fail("Webhook processing failed.", 500);
  }
}

/* GET /api/orders?role=seller|buyer&status=&page=&limit= */
export async function listOrdersController(request) {
  try {
    const user = await currentUserOrNull();
    if (!user) return fail("Please log in.", 401);

    const sp = new URL(request.url).searchParams;
    const data = await listOrdersForUser({
      userId: userIdOf(user),
      role: sp.get("role") === "buyer" ? "buyer" : "seller",
      status: sp.get("status") || "",
      page: sp.get("page"),
      limit: sp.get("limit"),
    });
    return ok(data);
  } catch (err) {
    return handleError(err, "list orders error");
  }
}

/* GET /api/orders/:orderId */
export async function getOrderController(_request, orderId) {
  try {
    const user = await currentUserOrNull();
    if (!user) return fail("Please log in.", 401);

    const data = await getOrderForUser({ orderNumber: orderId, userId: userIdOf(user) });
    return ok(data);
  } catch (err) {
    return handleError(err, "get order error");
  }
}

/* PATCH /api/orders/:orderId  { status } -> seller updates status */
export async function updateOrderStatusController(request, orderId) {
  try {
    const user = await currentUserOrNull();
    if (!user) return fail("Please log in.", 401);

    const body = await request.json().catch(() => ({}));
    const order = await updateOrderStatus({
      orderNumber: orderId,
      sellerId: userIdOf(user),
      status: body.status,
    });
    return ok({ order });
  } catch (err) {
    return handleError(err, "update order error");
  }
}

/* POST /api/orders/:orderId/cancel  { reason } -> buyer cancels their own order */
export async function cancelOrderController(request, orderId) {
  try {
    const user = await currentUserOrNull();
    if (!user) return fail("Please log in.", 401);

    const body = await request.json().catch(() => ({}));
    const order = await cancelOrderByBuyer({
      orderNumber: orderId,
      buyerId: userIdOf(user),
      reason: body.reason,
    });

    return ok({
      order,
      message: `Order cancelled. @${order.sellerUsername} has been notified.${
        order.payment?.status === "refunded" ? " Your payment has been refunded." : ""
      }`,
    });
  } catch (err) {
    return handleError(err, "cancel order error");
  }
}