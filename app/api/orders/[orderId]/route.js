import { getOrderController, updateOrderStatusController } from "@/app/controllers/orderController";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { orderId } = await params;
  return getOrderController(request, orderId);
}

export async function PATCH(request, { params }) {
  const { orderId } = await params;
  return updateOrderStatusController(request, orderId);
}