import { createSubscriptionOrderController } from "@/app/controllers/subscriptionController";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  return createSubscriptionOrderController(request);
}