import { verifyPaymentController } from "@/app/controllers/orderController";

export const dynamic = "force-dynamic";

export async function POST(request) {
  return verifyPaymentController(request);
}