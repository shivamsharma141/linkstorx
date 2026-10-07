import {
  listProductsController,
  createProductController,
} from "../../controllers/productController";

export async function GET(request) {
  return listProductsController(request);
}

export async function POST(request) {
  return createProductController(request);
}
