import { getPublicProductController } from "@/app/api/products/productController";

export async function GET(request, context) {
  return getPublicProductController(request, context);
}
