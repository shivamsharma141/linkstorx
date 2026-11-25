"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import CartIcon from "@/app/component/cart/CartIcon";
import QuantitySelector from "@/app/component/cart/QuantitySelector";
import AddToCartButton from "@/app/component/cart/AddToCartButton";
import BuyNowButton from "@/app/component/cart/BuyNowButton";

const DEFAULT_ACCENT = "#3a2b20";

const CURRENCY_SYMBOL = { INR: "₹", USD: "$" };

const LOW_STOCK_NOTE = 5; // itne ya kam bache ho to "Only N left" dikhao

function money(value, currency) {
  const code = currency === "USD" ? "USD" : "INR";
  const amount = Number(value) || 0;

  try {
    return new Intl.NumberFormat(code === "USD" ? "en-US" : "en-IN", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${CURRENCY_SYMBOL[code]}${amount}`;
  }
}

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
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError, setSizeError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy Link");
  const [accent, setAccent] = useState(
    product.accentColor || product.sellerAccentColor || DEFAULT_ACCENT
  );

  const sizeRef = useRef(null);

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
  const sizes = product.sizes || [];
  const hasSizes = Boolean(product.hasSizes && sizes.length > 0);
  const categoryLabel = product.subcategory || product.category;

  const selectedEntry = hasSizes ? sizes.find((s) => s.label === selectedSize) : null;

  // Size wale product mein max quantity chuni hui size ke stock se tay hoti hai
  const maxQuantity = hasSizes
    ? selectedEntry
      ? Math.max(1, Math.min(selectedEntry.stock, 99))
      : 99
    : product.stock
    ? Math.min(product.stock, 99)
    : 99;

  // Size badalne par agar quantity us size ke stock se zyada ho gayi ho to kam kar do
  useEffect(() => {
    if (quantity > maxQuantity) setQuantity(maxQuantity);
  }, [maxQuantity, quantity]);

  const paidDelivery =
    product.deliveryType === "paid" && Number(product.deliveryCharge) > 0;

  function chooseSize(label) {
    setSelectedSize(label);
    setSizeError("");
  }

  function handleMissingSize() {
    setSizeError("Please select a size");
    sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

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
              {money(product.price, product.currency)}
            </span>

            {product.compareAtPrice && (
              <>
                <span className="ls-price-was">
                  {money(product.compareAtPrice, product.currency)}
                </span>
                <span className="ls-product-discount-tag">
                  {product.discountPercent}% off
                </span>
              </>
            )}
          </div>

          <p
            className={
              paidDelivery ? "ls-delivery-note" : "ls-delivery-note ls-delivery-free"
            }
          >
            {paidDelivery
              ? `+ ${money(product.deliveryCharge, product.currency)} delivery charge`
              : "Free delivery"}
          </p>

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

          {/* SIZE */}
          {hasSizes && (
            <div
              ref={sizeRef}
              className={sizeError ? "ls-size-block ls-size-block-error" : "ls-size-block"}
            >
              <div className="ls-size-head">
                <span className="ls-size-label" id="ls-size-h">
                  {selectedSize ? `Size: ${selectedSize}` : "Select size"}
                </span>
                {sizeError && (
                  <span className="ls-size-error" role="alert">
                    {sizeError}
                  </span>
                )}
              </div>

              <div className="ls-size-options" role="radiogroup" aria-labelledby="ls-size-h">
                {sizes.map((s) => {
                  const on = s.label === selectedSize;

                  return (
                    <button
                      key={s.label}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={!s.inStock}
                      title={s.inStock ? undefined : "Out of stock"}
                      className={on ? "ls-size-btn ls-size-btn-on" : "ls-size-btn"}
                      onClick={() => chooseSize(s.label)}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {selectedEntry && selectedEntry.stock <= LOW_STOCK_NOTE && (
                <p className="ls-size-low">Only {selectedEntry.stock} left in this size</p>
              )}
            </div>
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
                size={selectedSize}
                requiresSize={hasSizes}
                onMissingSize={handleMissingSize}
                disabled={!product.inStock}
                className="ls-product-actions-add"
              />

              <BuyNowButton
                product={product}
                quantity={quantity}
                size={selectedSize}
                requiresSize={hasSizes}
                onMissingSize={handleMissingSize}
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