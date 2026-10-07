import { NextResponse } from "next/server";

import { getCurrentUser } from "@/app/lib/auth/auth";
import {
  OrderError,
  placeOrder,
  getOrderForUser,
  listOrdersForUser,
  updateOrderStatus,
  cancelOrderByBuyer,
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

/* POST /api/orders  -> customer places an order */
export async function createOrderController(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return fail("Invalid request.", 400);
    }

    const user = await currentUserOrNull(); // optional: links the order to the buyer if logged in
    const order = await placeOrder({
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
        message: `Order confirmed! @${order.sellerUsername} will contact you shortly.`,
      },
      201
    );
  } catch (err) {
    return handleError(err, "create order error");
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
      message: `Order cancelled. @${order.sellerUsername} has been notified.`,
    });
  } catch (err) {
    return handleError(err, "cancel order error");
  }
}