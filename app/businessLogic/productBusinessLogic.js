import {
  findProductsByUserId,
  findProductById,
  findProductByUserAndId,
  findProductBySlugForUser,
  checkProductSlugExists,
  createProduct as dbCreateProduct,
  updateProductByUserAndId,
  deleteProductByUserAndId,
  findPublicProductsByUserId,
  findPublicProductBySlug,
  findProductsByIds,
} from "@/app/databaseQueries/productDatabaseQueries";

import { findProfileByUsername } from "@/app/databaseQueries/profileDatabaseQueries";

import {
  isValidCategory,
  isValidSubcategory,
} from "@/app/config/productCategories";

/* =========================================================
   ERROR HELPER
========================================================= */

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/* =========================================================
   SLUG HELPERS
========================================================= */

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/* Never trust a frontend-generated slug — always derive it
   from the product name and guarantee uniqueness per seller. */
export async function generateUniqueSlug(userId, name, excludeId) {
  const base = slugify(name) || "product";

  let candidate = base;
  let suffix = 2;

  // eslint-disable-next-line no-await-in-loop
  while (await checkProductSlugExists(userId, candidate, excludeId)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

/* =========================================================
   VALIDATION
========================================================= */

export function validateProduct(data) {
  const errors = {};

  const name = String(data?.name || "").trim();
  if (!name) {
    errors.name = "Product name is required.";
  } else if (name.length > 140) {
    errors.name = "Product name must be under 140 characters.";
  }

  const price = Number(data?.price);
  if (!Number.isFinite(price) || price < 0) {
    errors.price = "Enter a valid price.";
  }

  let compareAtPrice = null;
  if (
    data?.compareAtPrice !== undefined &&
    data?.compareAtPrice !== null &&
    data?.compareAtPrice !== ""
  ) {
    compareAtPrice = Number(data.compareAtPrice);
    if (!Number.isFinite(compareAtPrice) || compareAtPrice < 0) {
      errors.compareAtPrice = "Enter a valid compare-at price.";
    }
  }

  if (!isValidCategory(data?.category)) {
    errors.category = "Select a valid category.";
  } else if (
    data?.subcategory &&
    !isValidSubcategory(data.category, data.subcategory)
  ) {
    errors.subcategory = "Select a valid subcategory.";
  }

  const images = Array.isArray(data?.images) ? data.images : [];
  if (images.length > 5) {
    errors.images = "You can upload up to 5 images.";
  }

  const stock = data?.trackInventory ? Number(data?.stock) : 0;
  if (data?.trackInventory && (!Number.isFinite(stock) || stock < 0)) {
    errors.stock = "Enter a valid stock quantity.";
  }

  if (Object.keys(errors).length > 0) {
    const error = createAppError("Please fix the highlighted fields.", 400);
    error.fields = errors;
    throw error;
  }

  return { name, price, compareAtPrice };
}

/* =========================================================
   NORMALIZATION
========================================================= */

/* Accepts images either as plain URL strings (what the
   dashboard sends) or as { url } objects, and always returns
   the { url, position } shape the Product schema stores. */
function normalizeImages(rawImages) {
  return (Array.isArray(rawImages) ? rawImages : [])
    .map((img) => (typeof img === "string" ? img : img?.url))
    .filter((url) => typeof url === "string" && url.trim().startsWith("https://"))
    .slice(0, 5)
    .map((url, index) => ({
      url: url.trim(),
      position: index,
    }));
}

export function normalizeProduct(data) {
  const { name, price, compareAtPrice } = validateProduct(data);

  const images = normalizeImages(data.images);

  const tags = Array.isArray(data.tags)
    ? data.tags
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
        .slice(0, 15)
    : [];

  return {
    name,
    shortDescription: String(data.shortDescription || "").trim().slice(0, 200),
    description: String(data.description || "").trim().slice(0, 5000),
    images,
    price,
    compareAtPrice:
      compareAtPrice !== null && compareAtPrice > price ? compareAtPrice : null,
    currency: data.currency ? String(data.currency).trim() : "INR",
    sku: String(data.sku || "").trim(),
    trackInventory: Boolean(data.trackInventory),
    stock: data.trackInventory ? Math.max(0, Number(data.stock) || 0) : 0,
    category: data.category,
    subcategory: data.subcategory || "",
    tags,
    featured: Boolean(data.featured),
    enabled: data.enabled === undefined ? true : Boolean(data.enabled),
    position: typeof data.position === "number" ? data.position : 0,
  };
}

/* =========================================================
   PUBLIC MAPPER — never leak userId / internal fields
========================================================= */

function toPublicProduct(product, username) {
  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
        )
      : 0;

  return {
    id: product._id.toString(),
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    images: (product.images || [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((img) => img.url),
    price: product.price,
    compareAtPrice:
      product.compareAtPrice > product.price ? product.compareAtPrice : null,
    discountPercent,
    currency: product.currency,
    category: product.category,
    subcategory: product.subcategory,
    tags: product.tags || [],
    featured: product.featured,
    inStock: product.trackInventory ? product.stock > 0 : true,
    stock: product.trackInventory ? product.stock : null,
    sellerUsername: username,
  };
}

function toDashboardProduct(product) {
  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
        )
      : 0;

  return {
    id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    images: (product.images || [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((img) => img.url),
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    discountPercent,
    currency: product.currency,
    sku: product.sku,
    stock: product.stock,
    trackInventory: product.trackInventory,
    category: product.category,
    subcategory: product.subcategory,
    tags: product.tags || [],
    featured: product.featured,
    enabled: product.enabled,
    position: product.position,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/* =========================================================
   SELLER-FACING (DASHBOARD)
========================================================= */

export async function getProductsForDashboard(userId, filters) {
  const products = await findProductsByUserId(userId, filters);
  return products.map(toDashboardProduct);
}

export async function getProductForDashboard(userId, productId) {
  const product = await findProductByUserAndId(userId, productId);

  if (!product) {
    throw createAppError("Product not found.", 404);
  }

  return toDashboardProduct(product);
}

export async function createProductForUser(userId, data) {
  if (!userId) {
    throw createAppError("Authentication required.", 401);
  }

  const normalized = normalizeProduct(data);

  const slug = await generateUniqueSlug(userId, normalized.name);

  const product = await dbCreateProduct({
    ...normalized,
    userId,
    slug,
  });

  return toDashboardProduct(product);
}

export async function updateProductForUser(userId, productId, data) {
  if (!userId) {
    throw createAppError("Authentication required.", 401);
  }

  // Ownership check — never trust userId from the frontend.
  const existing = await findProductByUserAndId(userId, productId);

  if (!existing) {
    throw createAppError("Product not found.", 404);
  }

  /* Merge the incoming fields onto the saved product so partial
     updates (e.g. { enabled: false } or { featured: true } from
     the products list) don't fail validation. A full save from
     the editor simply overrides every field. */
  const merged = { ...toDashboardProduct(existing), ...data };

  const normalized = normalizeProduct(merged);

  let slug = existing.slug;

  if (normalized.name !== existing.name) {
    slug = await generateUniqueSlug(userId, normalized.name, productId);
  }

  const updated = await updateProductByUserAndId(userId, productId, {
    ...normalized,
    slug,
  });

  return toDashboardProduct(updated);
}

export async function deleteProductForUser(userId, productId) {
  if (!userId) {
    throw createAppError("Authentication required.", 401);
  }

  const deleted = await deleteProductByUserAndId(userId, productId);

  if (!deleted) {
    throw createAppError("Product not found.", 404);
  }

  return { deleted: true };
}

export async function setProductEnabledForUser(userId, productId, enabled) {
  const updated = await updateProductByUserAndId(userId, productId, {
    enabled: Boolean(enabled),
  });

  if (!updated) {
    throw createAppError("Product not found.", 404);
  }

  return toDashboardProduct(updated);
}

/* =========================================================
   PUBLIC (STORE / PRODUCT PAGES)

   username -> Profile -> userId -> Products
   Reuses the EXISTING Profile/username system — no new
   username system is created here.
========================================================= */

async function resolveSellerProfile(username) {
  const normalized = String(username || "").trim().toLowerCase();

  if (!normalized) {
    throw createAppError("Store not found.", 404);
  }

  const profile = await findProfileByUsername(normalized);

  if (!profile) {
    throw createAppError("Store not found.", 404);
  }

  return profile;
}

export async function getPublicStore(username) {
  const profile = await resolveSellerProfile(username);

  const products = await findPublicProductsByUserId(profile.userId);

  return {
    seller: {
      username: profile.publicUsername,
      displayName: profile.displayName,
      bio: profile.bio,
      profileImage: profile.profileImage,
      accentColor: profile.theme?.accentColor || "#2563eb",
    },
    products: products.map((p) => toPublicProduct(p, profile.publicUsername)),
  };
}

export async function getPublicProduct(username, slug) {
  const profile = await resolveSellerProfile(username);

  const product = await findPublicProductBySlug(profile.userId, slug);

  if (!product) {
    throw createAppError("Product not found.", 404);
  }

  return toPublicProduct(product, profile.publicUsername);
}

/* =========================================================
   CART / CHECKOUT RE-VALIDATION (server-side truth)

   The frontend/localStorage price is NEVER authoritative.
   This re-fetches every item fresh from the database and
   returns validated, priced line items plus a subtotal.
   Nothing here creates an order or touches payment.
========================================================= */

export async function revalidateCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { items: [], subtotal: 0, currency: "INR", hasIssues: false };
  }

  const productIds = items.map((item) => item.productId).filter(Boolean);

  const products = await findProductsByIds(productIds);
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  let subtotal = 0;
  let hasIssues = false;
  let currency = "INR";

  const validated = items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      hasIssues = true;
      return {
        productId: item.productId,
        name: item.name || "Unknown product",
        available: false,
        reason: "deleted",
        quantity: item.quantity,
      };
    }

    if (!product.enabled) {
      hasIssues = true;
      return {
        productId: item.productId,
        name: product.name,
        available: false,
        reason: "disabled",
        quantity: item.quantity,
      };
    }

    if (product.trackInventory && product.stock < item.quantity) {
      hasIssues = true;
      return {
        productId: item.productId,
        name: product.name,
        available: false,
        reason: "out_of_stock",
        availableStock: product.stock,
        quantity: item.quantity,
      };
    }

    const quantity = Math.max(1, Number(item.quantity) || 1);
    const lineSubtotal = product.price * quantity;
    subtotal += lineSubtotal;
    currency = product.currency || currency;

    return {
      productId: product._id.toString(),
      name: product.name,
      image: product.images?.[0]?.url || "",
      price: product.price,
      currency: product.currency,
      quantity,
      subtotal: lineSubtotal,
      available: true,
    };
  });

  return { items: validated, subtotal, currency, hasIssues };
}