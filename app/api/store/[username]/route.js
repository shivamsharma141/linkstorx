import { getPublicStoreController } from "@/app/controllers/productController";

export async function GET(request, context) {
  return getPublicStoreController(request, context);
}
