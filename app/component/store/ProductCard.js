"use client";

import Link from "next/link";

import { formatMoney } from "@/app/config/storeFeatures";
import AddToCartButton from "@/app/component/cart/AddToCartButton";

export default function ProductCard({ product }) {
  const href = `/${product.sellerUsername}/store/${product.slug}`;

  return (
    <div className="ls-product-card">
      <Link href={href} className="ls-product-card-media">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} />
        ) : (
          <div className="ls-product-card-placeholder" />
        )}

        {product.discountPercent > 0 && (
          <span className="ls-product-card-badge">
            {product.discountPercent}% OFF
          </span>
        )}

        {!product.inStock && (
          <span className="ls-product-card-oos">Out of Stock</span>
        )}
      </Link>

      <div className="ls-product-card-body">
        <Link href={href} className="ls-product-card-name">
          {product.name}
        </Link>

        <div className="ls-product-card-price">
          <span className="ls-price-now">
            {formatMoney(product.price, product.currency)}
          </span>

          {product.compareAtPrice && (
            <span className="ls-price-was">
              {formatMoney(product.compareAtPrice, product.currency)}
            </span>
          )}
        </div>

        <AddToCartButton
          product={product}
          disabled={!product.inStock}
          className="ls-product-card-add"
        />
      </div>
    </div>
  );
}
