"use client";

/* =========================================================
   LINKSTORX CART — localStorage-backed, guest-friendly.

   IMPORTANT: prices stored here are for DISPLAY ONLY.
   They are never treated as authoritative. Before the order
   is placed, CartView re-validates every item against
   POST /api/cart/validate, which re-fetches products from
   the database.

   Cart line = productId + size.
   Same product ke alag sizes alag lines banate hain.
   Bina size wale products ka size "" hota hai (purane carts bhi chalte hain).

   Cart item shape:
   {
     productId, size, sellerId, publicUsername, sellerName, sellerImage,
     accent, productSlug, name, image, price, currency, quantity
   }
========================================================= */

const CART_KEY = "linkstorx_cart_v1";
const CART_EVENT = "linkstorx-cart-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

/* Ek cart line ki unique key (server ke "key" jaisi hi: productId::size) */
export function cartLineKey(productId, size = "") {
  return `${productId}::${size || ""}`;
}

const sameLine = (item, productId, size) =>
  item.productId === productId && (item.size || "") === (size || "");

function readCart() {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: items }));
  } catch {
    // Storage unavailable (private mode, quota, etc.) — fail silently.
  }
}

export function getCart() {
  return readCart();
}

export function getCartCount() {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotal() {
  return readCart().reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
}

export function addToCart(item, quantity = 1) {
  const items = readCart();
  const size = String(item.size || "").trim();

  const existingIndex = items.findIndex((i) =>
    sameLine(i, item.productId, size)
  );

  if (existingIndex >= 0) {
    items[existingIndex] = {
      ...items[existingIndex],
      quantity: items[existingIndex].quantity + quantity,
    };
  } else {
    items.push({
      productId: item.productId,
      size,
      sellerId: item.sellerId || item.publicUsername,
      publicUsername: item.publicUsername,
      sellerName: item.sellerName || "",
      sellerImage: item.sellerImage || "",
      accent: item.accent || "",
      productSlug: item.productSlug,
      name: item.name,
      image: item.image || "",
      price: item.price,
      currency: item.currency || "INR",
      quantity: Math.max(1, quantity),
    });
  }

  writeCart(items);
  return items;
}

export function removeFromCart(productId, size = "") {
  const items = readCart().filter((i) => !sameLine(i, productId, size));
  writeCart(items);
  return items;
}

export function setQuantity(productId, quantity, size = "") {
  const items = readCart();

  const index = items.findIndex((i) => sameLine(i, productId, size));
  if (index < 0) return items;

  if (quantity <= 0) {
    items.splice(index, 1);
  } else {
    items[index] = { ...items[index], quantity };
  }

  writeCart(items);
  return items;
}

export function increaseQuantity(productId, size = "") {
  const items = readCart();
  const item = items.find((i) => sameLine(i, productId, size));
  if (!item) return items;
  return setQuantity(productId, item.quantity + 1, size);
}

export function decreaseQuantity(productId, size = "") {
  const items = readCart();
  const item = items.find((i) => sameLine(i, productId, size));
  if (!item) return items;
  return setQuantity(productId, item.quantity - 1, size);
}

export function clearCart() {
  writeCart([]);
  return [];
}

/* Subscribe to cart changes (same-tab custom event +
   cross-tab "storage" event). Returns an unsubscribe fn. */
export function subscribeToCart(callback) {
  if (!isBrowser()) return () => {};

  function handleCustom(event) {
    callback(event.detail || readCart());
  }

  function handleStorage(event) {
    if (event.key === CART_KEY) {
      callback(readCart());
    }
  }

  window.addEventListener(CART_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CART_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}