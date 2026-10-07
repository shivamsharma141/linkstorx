"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PRODUCT_CATEGORIES } from "@/app/config/productCategories";
import CartIcon from "@/app/component/cart/CartIcon";
import { addToCart } from "@/app/lib/cart/cartStorage";

/* =========================================================
   SHOP ACTION HELPERS (auth check + pending action)
   Kept in this file on purpose — no extra utility files.
========================================================= */

const PENDING_KEY = "ls_pending_action";
const PENDING_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function isLoggedIn() {
  try {
    const res = await fetch("/api/auth/me", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.authenticated);
  } catch {
    return false;
  }
}

// Only ever stores minimal, non-sensitive UI state.
function savePendingAction(action) {
  try {
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ ...action, createdAt: Date.now() })
    );
  } catch {}
}

// Read AND remove in one step, so the action can never run twice
// (React Strict Mode, refresh, back button, re-render).
function consumePendingAction() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_KEY);

    const action = JSON.parse(raw);
    if (!action || !["ADD_TO_CART", "BUY_NOW"].includes(action.type)) return null;
    if (Date.now() - action.createdAt > PENDING_TTL_MS) return null;
    return action;
  } catch {
    return null;
  }
}

function buildCartItem(product, seller, accent) {
  return {
    productId: product.id,
    sellerId: seller.username,
    publicUsername: seller.username, // seller always comes from the store, never from the logged-in user
    sellerName: seller.displayName || seller.username,
    sellerImage: seller.profileImage || "",
    productSlug: product.slug || product.id,
    name: product.name,
    image: product.images?.[0] || "",
    price: product.price,
    currency: product.currency || "INR",
    accent,
  };
}

// Add to Cart  -> item cart mein add hota hai
// Buy Now      -> item cart mein add hota hai + seedha /cart khulta hai
function runShopAction({ type, product, seller, accent, quantity = 1, router }) {
  try {
    localStorage.setItem("ls_cart_accent", accent);
  } catch {}

  const item = buildCartItem(product, seller, accent);

  if (type === "ADD_TO_CART") {
    addToCart(item, quantity);
    return "added";
  }

  if (type === "BUY_NOW") {
    addToCart(item, quantity);
    router.push("/cart");
    return "buynow";
  }

  return null;
}

/* =========================================================
   PRODUCT CARD
========================================================= */
function ProductCard({ product, seller, accent }) {
  const router = useRouter();

  const {
    id,
    name,
    description,
    images = [],
    price,
    mrp,
    inStock = true,
  } = product;

  // Real product page route: /[username]/store/[productSlug]
  const productHref = `/${seller.username}/store/${product.slug || id}`;

  const [imgIndex, setImgIndex] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  const discount =
    mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null;

  function changeImage(dir, e) {
    e.preventDefault();
    e.stopPropagation();
    if (images.length < 2) return;
    setImgIndex((i) => (i + dir + images.length) % images.length);
  }

  async function handleShopAction(type) {
    if (!inStock || busy) return;
    setBusy(true);

    try {
      const loggedIn = await isLoggedIn();

      // Not logged in → remember the intent + where to come back, then go to login
      if (!loggedIn) {
        const returnTo = window.location.pathname + window.location.search;

        savePendingAction({
          type,
          productId: id,
          sellerUsername: seller.username,
          quantity: 1,
          returnTo,
        });

        router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      // Logged in → run immediately
      const result = runShopAction({
        type,
        product,
        seller,
        accent,
        quantity: 1,
        router,
      });

      if (result === "added") {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1500);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ls-product-card">
      <Link href={productHref} className="ls-product-card-media">
        {images.length > 0 ? (
          <img src={images[imgIndex]} alt={name} />
        ) : (
          <div className="ls-product-card-placeholder">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        {discount && (
          <span className="ls-product-card-badge">{discount}% OFF</span>
        )}

        {!inStock && <div className="ls-product-card-oos">Out of Stock</div>}

        {images.length > 1 && (
          <>
            <div className="ls-product-card-arrows">
              <button
                type="button"
                onClick={(e) => changeImage(-1, e)}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => changeImage(1, e)}
                aria-label="Next image"
              >
                ›
              </button>
            </div>
            <div className="ls-product-card-dots">
              {images.map((_, i) => (
                <span key={i} className={i === imgIndex ? "ls-dot-active" : ""} />
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          className={
            wishlisted
              ? "ls-product-card-wishlist ls-wishlist-active"
              : "ls-product-card-wishlist"
          }
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setWishlisted((w) => !w);
          }}
          aria-label="Wishlist"
        >
          {wishlisted ? "♥" : "♡"}
        </button>
      </Link>

      <div className="ls-product-card-body">
        <Link href={productHref} className="ls-product-card-name">
          {name}
        </Link>

        {description && (
          <p className="ls-product-card-desc">{description}</p>
        )}

        <div className="ls-product-card-price">
          <span className="ls-price-now">₹{price}</span>
          {mrp && mrp > price && <span className="ls-price-was">₹{mrp}</span>}
          {discount && <span className="ls-price-off">{discount}% off</span>}
        </div>

        <div className="ls-product-card-actions">
          <button
            type="button"
            className="ls-btn ls-btn-outline ls-product-card-add"
            disabled={!inStock || busy}
            onClick={() => handleShopAction("ADD_TO_CART")}
          >
            {justAdded ? "Added ✓" : "Add to Cart"}
          </button>
          <button
            type="button"
            className="ls-btn ls-btn-primary ls-product-card-add"
            disabled={!inStock || busy}
            onClick={() => handleShopAction("BUY_NOW")}
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN STORE VIEW
========================================================= */
export default function PublicStoreView({ store }) {
  const { seller, products } = store;
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [copyLabel, setCopyLabel] = useState("Share Store");
  const [sortBy, setSortBy] = useState("newest");
  const [toast, setToast] = useState("");

  const carouselRef = useRef(null);
  const accent = seller.accentColor || "#3a2b20";

  /* ---------- resume pending action after login ---------- */
  useEffect(() => {
    const pending = consumePendingAction(); // removed immediately → cannot run twice
    if (!pending) return;

    // Only resume on the same seller's store and the same page it started from
    const samePlace =
      pending.sellerUsername === seller.username &&
      String(pending.returnTo || "").split("?")[0] === window.location.pathname;
    if (!samePlace) return;

    // Use fresh product data from the server, not a stale client copy
    const product = products.find((p) => p.id === pending.productId);
    if (!product || product.inStock === false) {
      setToast("Sorry, that product is no longer available.");
      setTimeout(() => setToast(""), 2500);
      return;
    }

    (async () => {
      // Only continue if the user is actually logged in now
      if (!(await isLoggedIn())) return;

      const result = runShopAction({
        type: pending.type,
        product,
        seller,
        accent,
        quantity: pending.quantity || 1,
        router,
      });

      if (result === "added") {
        setToast("Added to your cart ✓");
        setTimeout(() => setToast(""), 2500);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryCount = useMemo(
    () => new Set(products.map((p) => p.category)).size,
    [products]
  );

  const availableCategories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return PRODUCT_CATEGORIES.filter((c) => set.has(c.value));
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (category && p.category !== category) return false;

      if (search) {
        const q = search.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q));

        if (!matches) return false;
      }

      return true;
    });

    switch (sortBy) {
      case "price-low":
        return [...list].sort((a, b) => a.price - b.price);
      case "price-high":
        return [...list].sort((a, b) => b.price - a.price);
      case "name":
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list;
    }
  }, [products, search, category, sortBy]);

  const featured = filtered.filter((p) => p.featured);

  function scrollCarousel(dir) {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.firstChild?.offsetWidth || 260;
    el.scrollBy({ left: dir * (cardWidth + 18), behavior: "smooth" });
  }

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ url, title: `${seller.displayName} Store` });
        return;
      } catch {
        // cancelled — fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopyLabel("✓ Copied!");
      setTimeout(() => setCopyLabel("Share Store"), 2000);
    } catch {
      setCopyLabel("Could not copy");
      setTimeout(() => setCopyLabel("Share Store"), 2000);
    }
  }

  return (
    <div className="ls-store-page" style={{ "--pub-accent": accent }}>
      {/* HEADER */}
      <header className="ls-store-header">
        <div className="ls-store-seller">
          {seller.profileImage ? (
            <img
              src={seller.profileImage}
              alt={seller.displayName}
              className="ls-store-avatar"
            />
          ) : (
            <div className="ls-store-avatar ls-store-avatar-placeholder">
              {(seller.displayName || seller.username || "?")
                .charAt(0)
                .toUpperCase()}
            </div>
          )}

          <div>
            <h1 className="ls-store-name">
              {seller.displayName || seller.username}&apos;s Store
            </h1>
            <Link href={`/${seller.username}`} className="ls-store-back-link">
              @{seller.username} · View Profile →
            </Link>
          </div>
        </div>

        <div className="ls-store-header-actions">
          <button type="button" className="ls-btn ls-btn-outline" onClick={handleShare}>
            {copyLabel}
          </button>

          <CartIcon accent={accent} />
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="ls-store-hero">
        <div className="ls-store-hero-content">
          <p className="ls-store-hero-eyebrow">Welcome to my store</p>
          <h2 className="ls-store-hero-title">
            Shop from {seller.displayName || seller.username}&apos;s Store
          </h2>
          <p className="ls-store-hero-subtitle">
            Curated products, collections and recommendations.
          </p>
          <div className="ls-store-hero-stats">
            <span>{products.length} Products</span>
            <span className="ls-dot" />
            <span>{categoryCount} Categories</span>
          </div>
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="ls-store-toolbar">
        <div className="ls-store-search-row">
          <input
            className="ls-store-search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="ls-store-filter-btn" aria-label="Filters">
            ⚙
          </button>
        </div>

        {availableCategories.length > 0 && (
          <div className="ls-store-categories">
            <button
              type="button"
              className={category === "" ? "ls-chip ls-chip-active" : "ls-chip"}
              onClick={() => setCategory("")}
            >
              All
            </button>

            {availableCategories.map((c) => (
              <button
                key={c.value}
                type="button"
                className={
                  category === c.value ? "ls-chip ls-chip-active" : "ls-chip"
                }
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <p className="ls-store-empty">This store has no products yet.</p>
      ) : filtered.length === 0 ? (
        <p className="ls-store-empty">No products match your search.</p>
      ) : (
        <>
          {featured.length > 0 && !search && !category && (
            <section className="ls-store-section">
              <div className="ls-store-section-head">
                <div>
                  <h2 className="ls-store-section-title">Featured Products</h2>
                  <p className="ls-store-section-subtitle">
                    Handpicked products from {seller.displayName || seller.username}&apos;s store.
                  </p>
                </div>
                <div className="ls-carousel-nav">
                  <button
                    type="button"
                    className="ls-nav-btn"
                    onClick={() => scrollCarousel(-1)}
                    aria-label="Previous"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="ls-nav-btn"
                    onClick={() => scrollCarousel(1)}
                    aria-label="Next"
                  >
                    ›
                  </button>
                </div>
              </div>
              <div className="ls-store-carousel" ref={carouselRef}>
                {featured.map((p) => (
                  <ProductCard key={p.id} product={p} seller={seller} accent={accent} />
                ))}
              </div>
            </section>
          )}

          <section className="ls-store-section">
            <div className="ls-store-section-head">
              <div>
                <h2 className="ls-store-section-title">All Products</h2>
                <p className="ls-store-section-subtitle">
                  Explore all products from {seller.displayName || seller.username}&apos;s store.
                </p>
              </div>
              <div className="ls-store-section-tools">
                <select
                  className="ls-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name: A-Z</option>
                </select>
              </div>
            </div>
            <div className="ls-store-grid">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} seller={seller} accent={accent} />
              ))}
            </div>
          </section>
        </>
      )}

      <footer className="pub-footer">Made with ❤ by LinkStorx</footer>

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: accent,
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 999,
            fontSize: 14,
            zIndex: 50,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}