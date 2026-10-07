import { loginController } from "@/app/controllers/authController";

export async function POST(request) {
  return loginController(request);
}