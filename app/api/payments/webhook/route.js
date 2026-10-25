import { razorpayWebhookController } from "@/app/controllers/orderController";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // crypto + raw body ke liye

export async function POST(request) {
  return razorpayWebhookController(request);
}