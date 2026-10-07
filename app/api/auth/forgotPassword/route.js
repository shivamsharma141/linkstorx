import { forgotPasswordController } from "@/app/controllers/authController";

export async function POST(request) {
  return forgotPasswordController(request);
}