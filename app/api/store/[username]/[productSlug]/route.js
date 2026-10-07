import { getPublicProductController } from "@/app/controllers/productController";

export async function GET(request, context) {
  return getPublicProductController(request, context);
}
