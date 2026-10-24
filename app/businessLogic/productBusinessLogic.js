import crypto from "crypto";
import mongoose from "mongoose";

import { getCurrentUser } from "@/app/lib/auth/auth";

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
  findSellerByUserId,
  upsertSellerByUserId,
  findSellersForAdmin,
  updateSellerById,
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
   SELLER: ENCRYPTION
========================================================= */

const POLICY_VERSION = "2026-10-v1";

/* No separate key to manage: the encryption key is derived from your
   existing JWT_SECRET (with its own salt, so it is a different key from the
   one that signs login tokens). Bank data is stored encrypted in the
   database and is only decrypted inside admin-verified server code.
   (Optional: set SELLER_DATA_KEY in .env to use a dedicated secret instead.) */
let cachedKey = null;

function getEncryptionKey() {
  if (cachedKey) return cachedKey;

  const secret = process.env.SELLER_DATA_KEY || process.env.JWT_SECRET;

  if (!secret) {
    throw createAppError("Server misconfiguration.", 500);
  }

  cachedKey = crypto.scryptSync(secret, "linkstorx-seller-data-v1", 32);
  return cachedKey;
}

function encryptText(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((b) => b.toString("base64")).join(".");
}

function decryptText(payload) {
  const [iv, tag, encrypted] = String(payload || "")
    .split(".")
    .map((p) => Buffer.from(p, "base64"));

  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/* =========================================================
   SELLER: VALIDATION + REGISTRATION
========================================================= */

export function validateSellerRegistration(data) {
  const errors = {};

  const fullName = String(data?.fullName || "").trim().replace(/\s+/g, " ");
  if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(fullName)) {
    errors.fullName = "Enter your full name (letters only, 2-80 characters).";
  }

  const email = String(data?.email || "").trim().toLowerCase();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const mobile = String(data?.mobile || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    errors.mobile = "Enter a valid 10-digit Indian mobile number.";
  }

  const holder = String(data?.bankAccountHolderName || "").trim().replace(/\s+/g, " ");
  if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(holder)) {
    errors.bankAccountHolderName = "Enter the account holder name as per your bank.";
  }

  const bankName = String(data?.bankName || "").trim().replace(/\s+/g, " ");
  if (bankName.length < 2 || bankName.length > 80) {
    errors.bankName = "Enter your bank name.";
  }

  const accountNumber = String(data?.accountNumber || "").replace(/\s/g, "");
  if (!/^\d{9,18}$/.test(accountNumber)) {
    errors.accountNumber = "Account number must be 9 to 18 digits.";
  }

  const confirm = String(data?.confirmAccountNumber || "").replace(/\s/g, "");
  if (!errors.accountNumber && confirm !== accountNumber) {
    errors.confirmAccountNumber = "Account numbers do not match.";
  }

  const ifsc = String(data?.ifsc || "").trim().toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    errors.ifsc = "Enter a valid IFSC code (e.g. HDFC0001234).";
  }

  if (data?.termsAccepted !== true) {
    errors.termsAccepted = "You must accept the fees and settlement policy.";
  }

  if (Object.keys(errors).length > 0) {
    const error = createAppError("Please fix the highlighted fields.", 400);
    error.fields = errors;
    throw error;
  }

  return { fullName, email, mobile, holder, bankName, accountNumber, ifsc };
}

export async function registerSellerForUser(userId, data) {
  if (!userId) throw createAppError("Authentication required.", 401);

  const clean = validateSellerRegistration(data);

  const existing = await findSellerByUserId(userId);

  if (existing?.sellerStatus === "verified") {
    throw createAppError(
      "Your seller account is already verified. Contact support to change bank details.",
      409
    );
  }

  // Status fields are ALWAYS set here; never taken from the client.
  await upsertSellerByUserId(userId, {
    userId,
    fullName: clean.fullName,
    email: clean.email,
    mobile: clean.mobile,
    bankAccountHolderName: clean.holder,
    bankName: clean.bankName,
    accountNumberEnc: encryptText(clean.accountNumber),
    ifscEnc: encryptText(clean.ifsc),
    accountLast4: clean.accountNumber.slice(-4),
    sellerStatus: "pending",
    bankVerificationStatus: "pending",
    termsAcceptedAt: new Date(),
    policyVersion: POLICY_VERSION,
    settlementCycleDays: 7,
    rejectionReason: "",
    verifiedAt: null,
    verifiedBy: null,
  });

  return { status: "pending" };
}

export async function getSellerStatusForUser(userId) {
  const seller = await findSellerByUserId(userId);

  return {
    status: seller?.sellerStatus || "none",
    rejectionReason: seller?.rejectionReason || "",
  };
}

async function isSellerVerified(userId) {
  const seller = await findSellerByUserId(userId);
  return seller?.sellerStatus === "verified";
}

/* Backend publish rule — frontend can never bypass this. */
async function assertCanPublish(userId) {
  if (!(await isSellerVerified(userId))) {
    throw createAppError(
      "Your seller account is not verified yet. Products stay as drafts until verification is complete.",
      403
    );
  }
}

/* =========================================================
   SELLER: ADMIN
========================================================= */

/* Re-verified here on purpose: bank data is never decrypted unless the
   current logged-in account is the allow-listed admin, no matter who calls
   this function. */
async function assertAdminCaller() {
  const admin = await getCurrentUser();

  if (!admin || !admin.isAdmin) {
    throw createAppError("Forbidden.", 403);
  }

  return admin;
}

export async function getSellersForAdmin(status) {
  await assertAdminCaller();

  const allowed = ["pending", "verified", "rejected"];
  const sellers = await findSellersForAdmin(allowed.includes(status) ? status : "");

  return sellers.map((s) => {
    let accountNumber = "";
    let ifsc = "";

    try {
      accountNumber = decryptText(s.accountNumberEnc);
      ifsc = decryptText(s.ifscEnc);
    } catch (error) {
      console.error("Seller decrypt failed for", s._id.toString(), error.message);
      accountNumber = "Unable to decrypt";
      ifsc = "Unable to decrypt";
    }

    return {
      id: s._id.toString(),
      fullName: s.fullName,
      email: s.email,
      mobile: s.mobile,
      bankAccountHolderName: s.bankAccountHolderName,
      bankName: s.bankName,
      accountNumber,
      ifsc,
      sellerStatus: s.sellerStatus,
      bankVerificationStatus: s.bankVerificationStatus,
      rejectionReason: s.rejectionReason,
      termsAcceptedAt: s.termsAcceptedAt?.toISOString() || null,
      createdAt: s.createdAt?.toISOString() || null,
    };
  });
}

export async function reviewSellerByAdmin(_adminId, sellerId, decision, reason) {
  // adminId passed by the caller is ignored; the verified admin is used.
  const admin = await assertAdminCaller();
  const adminId = admin.id;

  if (!mongoose.isValidObjectId(sellerId)) {
    throw createAppError("Seller not found.", 404);
  }

  let update;

  if (decision === "verify") {
    update = {
      sellerStatus: "verified",
      bankVerificationStatus: "verified",
      rejectionReason: "",
      verifiedAt: new Date(),
      verifiedBy: adminId,
    };
  } else if (decision === "reject") {
    const cleanReason = String(reason || "").trim().slice(0, 300);

    if (cleanReason.length < 5) {
      throw createAppError("Enter a rejection reason (min 5 characters).", 400);
    }

    update = {
      sellerStatus: "rejected",
      bankVerificationStatus: "failed",
      rejectionReason: cleanReason,
      verifiedAt: null,
      verifiedBy: null,
    };
  } else {
    throw createAppError("Invalid decision.", 400);
  }

  const updated = await updateSellerById(sellerId, update);
  if (!updated) throw createAppError("Seller not found.", 404);

  return { status: updated.sellerStatus };
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

const ALLOWED_CURRENCIES = ["INR", "USD"];

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

  const currency = String(data?.currency || "INR").trim().toUpperCase();
  if (!ALLOWED_CURRENCIES.includes(currency)) {
    errors.currency = "Select INR or USD.";
  }

  /* Delivery: free or paid. If paid, the amount is required. */
  const deliveryType = data?.deliveryType === "paid" ? "paid" : "free";
  let deliveryCharge = 0;

  if (deliveryType === "paid") {
    deliveryCharge = Number(data?.deliveryCharge);
    if (!Number.isFinite(deliveryCharge) || deliveryCharge <= 0) {
      errors.deliveryCharge = "Enter the delivery charge you want to take.";
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

  return { name, price, compareAtPrice, currency, deliveryType, deliveryCharge };
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
  const { name, price, compareAtPrice, currency, deliveryType, deliveryCharge } =
    validateProduct(data);

  const images = normalizeImages(data.images);

  const tags = Array.isArray(data.tags)
    ? data.tags
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
        .slice(0, 15)
    : [];

   const normalizedStatus =
    data.status === "archived"
      ? "archived"
      : data.enabled === true
      ? "published"
      : "draft";
  const normalizedEnabled = normalizedStatus === "published";

  return {
    name,
    shortDescription: String(data.shortDescription || "").trim().slice(0, 200),
    description: String(data.description || "").trim().slice(0, 5000),
    images,
    price,
    compareAtPrice:
      compareAtPrice !== null && compareAtPrice > price ? compareAtPrice : null,
    currency,
    deliveryType,
    deliveryCharge: deliveryType === "paid" ? deliveryCharge : 0,
    sku: String(data.sku || "").trim(),
    trackInventory: Boolean(data.trackInventory),
    stock: data.trackInventory ? Math.max(0, Number(data.stock) || 0) : 0,
    category: data.category,
    subcategory: data.subcategory || "",
    tags,
    featured: Boolean(data.featured),
    enabled: normalizedEnabled,
    status: normalizedStatus,
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
    deliveryType: product.deliveryType || "free",
    deliveryCharge: product.deliveryType === "paid" ? product.deliveryCharge : 0,
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
    deliveryType: product.deliveryType || "free",
    deliveryCharge: product.deliveryCharge || 0,
    sku: product.sku,
    stock: product.stock,
    trackInventory: product.trackInventory,
    category: product.category,
    subcategory: product.subcategory,
    tags: product.tags || [],
    featured: product.featured,
    enabled: product.enabled,
    status: product.status,
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

  if (normalized.enabled) await assertCanPublish(userId);

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

  if (normalized.enabled && !existing.enabled) await assertCanPublish(userId);

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
  if (enabled) await assertCanPublish(userId);

  const updated = await updateProductByUserAndId(userId, productId, {
    enabled: Boolean(enabled),
    status: enabled ? "published" : "draft",
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

  const verified = await isSellerVerified(profile.userId);
  const products = verified ? await findPublicProductsByUserId(profile.userId) : [];

  return {
    verified,
    seller: {
      username: profile.publicUsername,
      displayName: profile.displayName,
      bio: profile.bio,
      profileImage: profile.profileImage,
      accentColor: profile.theme?.accentColor || "#2563eb",
      backgroundColor: profile.theme?.backgroundColor || "#ffffff",
    },
    products: products.map((p) => toPublicProduct(p, profile.publicUsername)),
  };
}

export async function getPublicProduct(username, slug) {
  const profile = await resolveSellerProfile(username);

  if (!(await isSellerVerified(profile.userId))) {
    throw createAppError("Product not found.", 404);
  }

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