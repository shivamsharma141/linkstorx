import { NextResponse } from "next/server";

import { getCurrentUser } from "@/app/lib/auth/auth";

import {
  getProductsForDashboard,
  getProductForDashboard,
  createProductForUser,
  updateProductForUser,
  deleteProductForUser,
  setProductEnabledForUser,
  getPublicStore,
  getPublicProduct,
  revalidateCartItems,
} from "@/app/businessLogic/productBusinessLogic";

import { uploadProductImage } from "@/app/businessLogic/uploadBusinessLogic";

/* ---------------- ERROR / AUTH HELPERS ---------------- */

function handleProductError(error) {
  const statusCode = error.statusCode || 500;

  // Real reason for unexpected (500) errors shows up in your terminal.
  if (statusCode === 500) {
    console.error("Product API error:", error);
  }

  const message =
    statusCode === 500
      ? "Something went wrong. Please try again."
      : error.message;

  return NextResponse.json(
    {
      success: false,
      message,
      fields: error.fields || undefined,
    },
    { status: statusCode }
  );
}

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, message: "Not authenticated." },
    { status: 401 }
  );
}

/* ---------------- DASHBOARD: LIST / CREATE ---------------- */

export async function listProductsController(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);

    const filters = {
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "",
      status: searchParams.get("status") || "",
    };

    const products = await getProductsForDashboard(user.id, filters);

    return NextResponse.json({ success: true, products });
  } catch (error) {
    return handleProductError(error);
  }
}

export async function createProductController(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();

    const product = await createProductForUser(user.id, body);

    return NextResponse.json({
      success: true,
      message: "Product created.",
      product,
    });
  } catch (error) {
    return handleProductError(error);
  }
}

/* ---------------- DASHBOARD: SINGLE PRODUCT ---------------- */

export async function getProductController(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const product = await getProductForDashboard(user.id, id);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return handleProductError(error);
  }
}

export async function updateProductController(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const body = await request.json();

    // Enable/disable toggle short-circuit (dashboard action).
    if (
      Object.keys(body).length === 1 &&
      typeof body.enabled === "boolean"
    ) {
      const product = await setProductEnabledForUser(
        user.id,
        id,
        body.enabled
      );

      return NextResponse.json({
        success: true,
        message: "Product updated.",
        product,
      });
    }

    // Full editor saves AND partial updates (e.g. { featured: true })
    // both go here — updateProductForUser merges onto the saved product.
    const product = await updateProductForUser(user.id, id, body);

    return NextResponse.json({
      success: true,
      message: "Product updated.",
      product,
    });
  } catch (error) {
    return handleProductError(error);
  }
}

export async function deleteProductController(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    await deleteProductForUser(user.id, id);

    return NextResponse.json({
      success: true,
      message: "Product deleted.",
    });
  } catch (error) {
    return handleProductError(error);
  }
}

/* ---------------- PRODUCT IMAGE UPLOAD ---------------- */

export async function uploadProductImageController(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedResponse();

    const formData = await request.formData();
    const file = formData.get("file");

    const secureUrl = await uploadProductImage(file);

    return NextResponse.json({ success: true, url: secureUrl });
  } catch (error) {
    return handleProductError(error);
  }
}

/* ---------------- PUBLIC: STORE / PRODUCT ---------------- */

export async function getPublicStoreController(request, { params }) {
  try {
    const { username } = await params;

    const store = await getPublicStore(username);

    return NextResponse.json({ success: true, ...store });
  } catch (error) {
    return handleProductError(error);
  }
}

export async function getPublicProductController(request, { params }) {
  try {
    const { username, productSlug } = await params;

    const product = await getPublicProduct(username, productSlug);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return handleProductError(error);
  }
}

/* ---------------- CART VALIDATION (pre-checkout) ----------------
   Re-fetches every item from the database. Prices/availability
   from the client are NEVER trusted. Does not create an order
   or touch payment — payments are disabled for this MVP. */

export async function validateCartController(request) {
  try {
    const body = await request.json();

    const result = await revalidateCartItems(body.items || []);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleProductError(error);
  }
}