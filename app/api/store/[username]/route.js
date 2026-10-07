import { getPublicStoreController } from "@/app/api/products/productController";

export async function GET(request, context) {
  return getPublicStoreController(request, context);
}
