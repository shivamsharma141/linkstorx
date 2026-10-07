"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getCartCount, subscribeToCart } from "@/app/lib/cart/cartStorage";

export default function CartIcon({ accent = "#2563eb" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getCartCount());

    const unsubscribe = subscribeToCart((items) => {
      setCount(items.reduce((sum, i) => sum + i.quantity, 0));
    });

    return unsubscribe;
  }, []);

  return (
    <Link
      href="/cart"
      className="ls-cart-icon"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      style={{ "--ls-cart-accent": accent }}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>

      <span>Cart</span>

      {count > 0 && <span className="ls-cart-badge">{count}</span>}
    </Link>
  );
}
