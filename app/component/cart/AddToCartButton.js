"use client";

import { useState } from "react";

import { addToCart } from "@/app/lib/cart/cartStorage";

export default function AddToCartButton({
  product,
  quantity = 1,
  disabled = false,
  className = "",
}) {
  const [justAdded, setJustAdded] = useState(false);

  function handleClick() {
    if (disabled) return;

    addToCart(
      {
        productId: product.id,
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
