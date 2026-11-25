"use client";

import { useState } from "react";

import { addToCart } from "@/app/lib/cart/cartStorage";

/*
 * Size wale product par `requiresSize` true bhejo aur chuni hui `size`.
 * Size chuni na ho to cart mein kuch add nahi hota, bas `onMissingSize` chalta hai
 * (product page wahan "Please select a size" dikhata hai).
 */
export default function AddToCartButton({
  product,
  quantity = 1,
  size = "",
  requiresSize = false,
  onMissingSize,
  disabled = false,
  className = "",
}) {
  const [justAdded, setJustAdded] = useState(false);

  function handleClick() {
    if (disabled) return;

    if (requiresSize && !size) {
      if (onMissingSize) onMissingSize();
      return;
    }

    addToCart(
      {
        productId: product.id,
        size: requiresSize ? size : "",
        sellerId: product.sellerUsername,
        publicUsername: product.sellerUsername,
        productSlug: product.slug,
        name: product.name,
        image: product.images?.[0] || "",
        price: product.price,
        currency: product.currency,
      },
      quantity
    );

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <button
      type="button"
      className={`ls-btn ls-btn-outline ${className}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {disabled ? "Out of Stock" : justAdded ? "Added ✓" : "Add to Cart"}
    </button>
  );
}