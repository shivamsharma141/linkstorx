import { cancelOrderController } from "@/app/controllers/orderController";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const { orderId } = await params;
  return cancelOrderController(request, orderId);
}