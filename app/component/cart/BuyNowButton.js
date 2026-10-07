"use client";

import { useRouter } from "next/navigation";

import { addToCart } from "@/app/lib/cart/cartStorage";

export default function BuyNowButton({
  product,
  quantity = 1,
  disabled = false,
  className = "",
}) {
  const router = useRouter();

  function handleClick() {
    if (disabled) return;

    // Item ko cart mein add karo, fir seedha cart page kholo
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

    router.push("/cart");
  }

  return (
    <button
      type="button"
      className={`ls-btn ls-btn-primary ${className}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {disabled ? "Out of Stock" : "Buy Now"}
    </button>
  );
}