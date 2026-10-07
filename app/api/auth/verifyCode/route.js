import { verifyCodeController } from "@/app/controllers/authController";

export async function POST(request) {
  return verifyCodeController(request);
}


