import { logoutController } from "@/app/controllers/authController";

export async function POST(request) {
  return logoutController(request);
}