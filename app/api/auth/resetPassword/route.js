import { resetPasswordController } from "@/app/controllers/authController";

export async function POST(request) {
  return resetPasswordController(request);
}