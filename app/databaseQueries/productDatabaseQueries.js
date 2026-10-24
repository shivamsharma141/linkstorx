import { connectToDatabase } from "@/app/lib/database/mongodb";
import Product, { Seller } from "@/app/databaseModels/Product";

/* =========================================================
   SELLER-SCOPED QUERIES (dashboard)
========================================================= */

export async function findProductsByUserId(userId, filters = {}) {
  await connectToDatabase();

  const query = { userId };

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.status === "enabled") {
    query.enabled = true;
  } else if (filters.status === "disabled") {
    query.enabled = false;
  }

  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  return Product.find(query).sort({ position: 1, createdAt: -1 });
}

export async function findProductById(productId) {
  await connectToDatabase();

  return Product.findById(productId);
}

/* Ownership-safe lookup — always use this (never
   findProductById alone) before mutating a product. */
export async function findProductByUserAndId(userId, productId) {
  await connectToDatabase();

  return Product.findOne({ _id: productId, userId });
}

export async function findProductBySlugForUser(userId, slug) {
  await connectToDatabase();

  return Product.findOne({ userId, slug });
}

export async function checkProductSlugExists(userId, slug, excludeId) {
  await connectToDatabase();

  const query = { userId, slug };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await Product.exists(query);

  return Boolean(existing);
}

export async function createProduct(data) {
  await connectToDatabase();

  return Product.create(data);
}

export async function updateProductByUserAndId(userId, productId, data) {
  await connectToDatabase();

  return Product.findOneAndUpdate({ _id: productId, userId }, data, {
    new: true,
    runValidators: true,
  });
}

export async function deleteProductByUserAndId(userId, productId) {
  await connectToDatabase();

  return Product.findOneAndDelete({ _id: productId, userId });
}

/* =========================================================
   PUBLIC QUERIES (store / product pages)
========================================================= */

export async function findPublicProductsByUserId(userId) {
  await connectToDatabase();

  return Product.find({ userId, enabled: true }).sort({
    featured: -1,
    position: 1,
    createdAt: -1,
  });
}

export async function findPublicProductBySlug(userId, slug) {
  await connectToDatabase();

  return Product.findOne({ userId, slug, enabled: true });
}

/* Used to re-validate cart items server-side. Intentionally
   NOT filtered by enabled — the caller decides how to treat
   a disabled/deleted product. */
export async function findProductsByIds(productIds) {
  await connectToDatabase();

  return Product.find({ _id: { $in: productIds } });
}

/* =========================================================
   SELLER QUERIES
========================================================= */

export async function findSellerByUserId(userId) {
  await connectToDatabase();
  return Seller.findOne({ userId });
}

export async function upsertSellerByUserId(userId, data) {
  await connectToDatabase();

  return Seller.findOneAndUpdate({ userId }, data, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });
}

/* Admin only — explicitly pulls the encrypted fields. */
export async function findSellersForAdmin(status) {
  await connectToDatabase();

  const query = status ? { sellerStatus: status } : {};

  return Seller.find(query)
    .select("+accountNumberEnc +ifscEnc")
    .sort({ createdAt: -1 })
    .limit(200);
}

export async function updateSellerById(sellerId, data) {
  await connectToDatabase();

  return Seller.findByIdAndUpdate(sellerId, data, {
    new: true,
    runValidators: true,
  });
}