import { validateCartController } from "@/app/controllers/productController";

export async function POST(request) {
  return validateCartController(request);
}
