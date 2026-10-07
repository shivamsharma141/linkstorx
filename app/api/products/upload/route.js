import { uploadProductImageController } from "../../../controllers/productController";

export async function POST(request) {
  return uploadProductImageController(request);
}