"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { formatMoney } from "@/app/config/storeFeatures";
import CartIcon from "@/app/component/cart/CartIcon";
import QuantitySelector from "@/app/component/cart/QuantitySelector";
import AddToCartButton from "@/app/component/cart/AddToCartButton";
import BuyNowButton from "@/app/component/cart/BuyNowButton";

const DEFAULT_ACCENT = "#3a2b20";

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default function PublicProductView({ product, username }) {
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [copyLabel, setCopyLabel] = useState("Copy Link");
  const [accent, setAccent] = useState(
    product.accentColor || product.sellerAccentColor || DEFAULT_ACCENT
  );

  // Seller's accent: from product data if available, else the key the store page already saves
  useEffect(() => {
    if (product.accentColor || product.sellerAccentColor) return;
    try {
      const saved = localStorage.getItem("ls_cart_accent");
      if (saved) setAccent(saved);
    } catch {}
  }, [product.accentColor, product.sellerAccentColor]);

  const images = product.images || [];
  const tags = product.tags || [];
  const maxQuantity = product.stock ? Math.min(product.stock, 99) : 99;
  const categoryLabel = product.subcategory || product.category;

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ url, title: product.name });
        return;
      } catch {
        // cancelled — fall through
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopyLabel("✓ Copied!");
      setTimeout(() => setCopyLabel("Copy Link"), 2000);
    } catch {
      setCopyLabel("Could not copy");
      setTimeout(() => setCopyLabel("Copy Link"), 2000);
    }
  }

  return (
    <div className="ls-store-page ls-pd-page" style={{ "--pub-accent": accent }}>
      {/* HEADER */}
      <header className="ls-store-header ls-pd-header">
        <Link href={`/${username}/store`} className="ls-pd-back">
          <BackIcon />
          Back to Store
        </Link>

        <CartIcon accent={accent} />
      </header>

      <div className="ls-product-detail">
        {/* GALLERY */}
        <div className="ls-product-gallery">
          <div className="ls-product-gallery-main">
            {images.length > 0 ? (
              <img
                src={images[activeImage]}
                alt={product.name}
                className="ls-product-image"
              />
            ) : (
              <div className="ls-product-gallery-placeholder" aria-hidden="true" />
            )}

            {product.discountPercent > 0 && (
              <span className="ls-product-card-badge">
                {product.discountPercent}% OFF
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="ls-product-gallery-thumbs" role="list">
              {images.map((img, index) => (
                <button
                  key={img + index}
                  type="button"
                  role="listitem"
                  className={
                    index === activeImage
                      ? "ls-product-thumb ls-product-thumb-active"
                      : "ls-product-thumb"
                  }
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show image ${index + 1} of ${images.length}`}
                  aria-current={index === activeImage ? "true" : undefined}
                >
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="ls-product-info">
          {categoryLabel && (
            <span className="ls-product-category">{categoryLabel}</span>
          )}

          <h1 className="ls-product-name">{product.name}</h1>

          <div className="ls-product-price-row">
            <span className="ls-price-now ls-price-now-lg">
              {formatMoney(product.price, product.currency)}
            </span>

            {product.compareAtPrice && (
              <>
                <span className="ls-price-was">
                  {formatMoney(product.compareAtPrice, product.currency)}
                </span>
                <span className="ls-product-discount-tag">
                  {product.discountPercent}% off
                </span>
              </>
            )}
          </div>

          <p
            className={`ls-stock ${product.inStock ? "ls-stock-in" : "ls-stock-out"}`}
          >
            <span className="ls-stock-dot" aria-hidden="true" />
            {product.inStock ? "In Stock" : "Out of Stock"}
          </p>

          {product.shortDescription && (
            <p className="ls-product-short">{product.shortDescription}</p>
          )}

          {product.description && (
            <section className="ls-product-about" aria-labelledby="ls-about-h">
              <h2 id="ls-about-h" className="ls-product-about-title">
                About this product
              </h2>
              <p className="ls-product-description">{product.description}</p>
            </section>
          )}

          <div className="ls-product-buy">
            <div className="ls-product-qty-row">
              <span className="ls-product-qty-label">Quantity</span>
              <QuantitySelector
                quantity={quantity}
                onChange={setQuantity}
                max={maxQuantity}
                disabled={!product.inStock}
              />
            </div>

            <div className="ls-product-actions">
              <AddToCartButton
                product={product}
                quantity={quantity}
                disabled={!product.inStock}
                className="ls-product-actions-add"
              />

              <BuyNowButton
                product={product}
                quantity={quantity}
                disabled={!product.inStock}
                className="ls-product-actions-buy"
              />
            </div>
          </div>

          <button
            type="button"
            className="ls-product-share"
            onClick={handleShare}
          >
            <ShareIcon />
            {copyLabel === "Copy Link" ? "Share Product" : copyLabel}
          </button>

          {tags.length > 0 && (
            <div className="ls-product-tags">
              {tags.map((tag) => (
                <span key={tag} className="pub-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="pub-footer">Made with ❤ by LinkStorx</footer>
    </div>
  );
}