import { createOrderController, listOrdersController } from "@/app/controllers/orderController";

export const dynamic = "force-dynamic";

export async function POST(request) {
  return createOrderController(request);
}

export async function GET(request) {
  return listOrdersController(request);
}