import { trackAnalyticsController } from "@/app/controllers/analyticsController";

export async function POST(request) {
  return trackAnalyticsController(request);
}
