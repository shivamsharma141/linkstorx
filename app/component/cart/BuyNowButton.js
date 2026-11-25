"use client";

import { useRouter } from "next/navigation";

import { addToCart } from "@/app/lib/cart/cartStorage";

/*
 * Size wale product par `requiresSize` true bhejo aur chuni hui `size`.
 * Size chuni na ho to cart page nahi khulta, bas `onMissingSize` chalta hai.
 */
export default function BuyNowButton({
  product,
  quantity = 1,
  size = "",
  requiresSize = false,
  onMissingSize,
  disabled = false,
  className = "",
}) {
  const router = useRouter();

  function handleClick() {
    if (disabled) return;

    if (requiresSize && !size) {
      if (onMissingSize) onMissingSize();
      return;
    }

    // Item ko cart mein add karo, fir seedha cart page kholo
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