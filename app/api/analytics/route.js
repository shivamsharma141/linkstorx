import { getAnalyticsController } from "@/app/controllers/analyticsController";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return getAnalyticsController(request);
}
