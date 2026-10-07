import {
  getProductController,
  updateProductController,
  deleteProductController,
} from "../../../controllers/productController";

export async function GET(request, context) {
  return getProductController(request, context);
}

export async function PATCH(request, context) {
  return updateProductController(request, context);
}

export async function DELETE(request, context) {
  return deleteProductController(request, context);
}
