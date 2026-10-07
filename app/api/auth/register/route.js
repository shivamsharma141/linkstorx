import { registerController } from "@/app/controllers/authController";

export async function POST(request) {
  return registerController(request);
}