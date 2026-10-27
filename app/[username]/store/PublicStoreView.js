"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PRODUCT_CATEGORIES } from "@/app/config/productCategories";
import CartIcon from "@/app/component/cart/CartIcon";
import { addToCart } from "@/app/lib/cart/cartStorage";
import { getTheme, buildThemeVars } from "@/app/lib/theme/profileThemes";

/* Pehla letter capital: "premium hoodie" -> "Premium hoodie" */
function capFirst(value) {
  return String(value ?? "").replace(/^(\s*)(\S)/, (m, space, ch) => space + ch.toUpperCase());
}

/* =========================================================
   CURRENCY
========================================================= */

const CURRENCY_SYMBOL = { INR: "₹", USD: "$" };

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

/* =========================================================
   SHOP ACTION HELPERS (auth check + pending action)
========================================================= */

const PENDING_KEY = "ls_pending_action";
const PENDING_TTL_MS = 10 * 60 * 1000;

async function isLoggedIn() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.authenticated);
  } catch {
    return false;
  }
}

function savePendingAction(action) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...action, createdAt: Date.now() }));
  } catch {}
}

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
    publicUsername: seller.username,
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
   SMALL ICONS
========================================================= */
function Ico({ d, size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}
const ICO = {
  back: "M19 12H5|M12 19l-7-7 7-7",
  share: "M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7|M16 6l-4-4-4 4|M12 2v13",
  check: "M20 6L9 17l-5-5",
  cart: "M6 6h15l-1.5 9h-12z|M6 6L5 3H2|M9 20h.01|M18 20h.01",
  heart: "M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z",
  left: "M15 18l-6-6 6-6",
  right: "M9 18l6-6-6-6",
  filter: "M4 6h16|M7 12h10|M10 18h4",
  bag: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z|M3 6h18|M16 10a4 4 0 01-8 0",
  tag: "M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8z|M7 7h.01",
};

/* =========================================================
   PRODUCT CARD
========================================================= */
function ProductCard({ product, seller, accent, preview = false }) {
  const router = useRouter();

  const {
    id,
    name,
    description,
    images = [],
    price,
    compareAtPrice: mrp,
    currency = "INR",
    deliveryType = "free",
    deliveryCharge = 0,
    inStock = true,
    isDraft = false,
  } = product;

  const productHref = `/${seller.username}/store/${product.slug || id}`;

  const [imgIndex, setImgIndex] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null;

  // Image delete hone par index bahar na nikle
  const safeIndex = images.length > 0 ? Math.min(imgIndex, images.length - 1) : 0;

  function changeImage(dir, e) {
    e.preventDefault();
    e.stopPropagation();
    if (images.length < 2) return;
    setImgIndex((i) => (i + dir + images.length) % images.length);
  }

  async function handleShopAction(type) {
    if (preview || !inStock || busy) return;
    setBusy(true);

    try {
      const loggedIn = await isLoggedIn();

      if (!loggedIn) {
        const returnTo = window.location.pathname + window.location.search;
        savePendingAction({ type, productId: id, sellerUsername: seller.username, quantity: 1, returnTo });
        router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      const result = runShopAction({ type, product, seller, accent, quantity: 1, router });

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
          <img src={images[safeIndex]} alt={name} />
        ) : (
          <div className="ls-product-card-placeholder">
            <Ico d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z|M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z|M21 15l-5-5L5 21" size={34} />
          </div>
        )}

        {discount && <span className="ls-product-card-badge">{discount}% OFF</span>}

        {/* Sirf editor preview mein: ye product abhi draft hai */}
        {preview && isDraft && <span className="ls-product-card-draft">Draft</span>}

        {!inStock && <div className="ls-product-card-oos">Out of Stock</div>}

        {images.length > 1 && (
          <>
            <div className="ls-product-card-arrows">
              <button type="button" onClick={(e) => changeImage(-1, e)} aria-label="Previous image">
                <Ico d={ICO.left} size={14} />
              </button>
              <button type="button" onClick={(e) => changeImage(1, e)} aria-label="Next image">
                <Ico d={ICO.right} size={14} />
              </button>
            </div>
            <div className="ls-product-card-dots">
              {images.map((_, i) => (
                <span key={i} className={i === safeIndex ? "ls-dot-active" : ""} />
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          className={wishlisted ? "ls-product-card-wishlist ls-wishlist-active" : "ls-product-card-wishlist"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setWishlisted((w) => !w);
          }}
          aria-label="Wishlist"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill={wishlisted ? "currentColor" : "none"}
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={ICO.heart} />
          </svg>
        </button>
      </Link>

      <div className="ls-product-card-body">
        <Link href={productHref} className="ls-product-card-name">{capFirst(name)}</Link>

        {description && <p className="ls-product-card-desc">{capFirst(description)}</p>}

        <div className="ls-product-card-price">
          <span className="ls-price-now">{money(price, currency)}</span>
          {mrp && mrp > price && <span className="ls-price-was">{money(mrp, currency)}</span>}
          {discount && <span className="ls-price-off">{discount}% off</span>}
        </div>

        <p className={deliveryType === "paid" ? "ls-delivery-note" : "ls-delivery-note ls-delivery-free"}>
          {deliveryType === "paid" && deliveryCharge > 0
            ? `+ ${money(deliveryCharge, currency)} delivery`
            : "Free delivery"}
        </p>

        <div className="ls-product-card-actions">
          <button
            type="button"
            className="ls-btn ls-btn-outline ls-product-card-add"
            disabled={!inStock || busy}
            onClick={() => handleShopAction("ADD_TO_CART")}
          >
            {justAdded ? <><Ico d={ICO.check} size={13} /> Added</> : <><Ico d={ICO.cart} size={13} /> Add to Cart</>}
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
export default function PublicStoreView({ store, previewMode = false, theme }) {
  const { seller } = store;
  const router = useRouter();

  /* Live preview: product editor draft ko localStorage mein likhta hai
     (same origin), ye page usse padhkar REAL store mein merge karta hai. */
  const [draftProduct, setDraftProduct] = useState(null);

  const products = useMemo(() => {
    if (!previewMode || !draftProduct) return store.products;
    return [draftProduct, ...store.products.filter((p) => p.id !== draftProduct.id)];
  }, [store.products, previewMode, draftProduct]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [copyLabel, setCopyLabel] = useState("Share Store");
  const [sortBy, setSortBy] = useState("newest");
  const [toast, setToast] = useState("");

  const carouselRef = useRef(null);

  /* ---------- theme (default white) ---------- */
  const themeObj = useMemo(
    () => getTheme(theme || seller.theme || { accentColor: seller.accentColor }),
    [theme, seller]
  );
  const accent = themeObj.accent;
  const background = themeObj.bgCss;
  const themeVars = useMemo(() => buildThemeVars(themeObj), [themeObj]);

  // Paint <body> too, so there is no white/beige gap around the page
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = background;
    return () => {
      document.body.style.background = prev;
    };
  }, [background]);

  /* ---------- live preview (only inside the editor's iframe) ---------- */
  useEffect(() => {
    if (!previewMode) return;

    const key = new URLSearchParams(window.location.search).get("lsDraft") || "";
    if (!key.startsWith("ls_draft:")) return;

    let lastRaw = null;

    function read() {
      try {
        const raw = localStorage.getItem(key);
        if (raw === lastRaw) return;
        lastRaw = raw;

        const data = raw ? JSON.parse(raw) : null;
        const p = data?.preview;

        if (p && typeof p === "object") {
          setDraftProduct({
            ...p,
            images: Array.isArray(p.images) ? p.images : [],
            tags: Array.isArray(p.tags) ? p.tags : [],
          });
        } else {
          setDraftProduct(null);
        }
      } catch {
        setDraftProduct(null);
      }
    }

    function onStorage(event) {
      if (event.key === key || event.key === null) read();
    }

    read();
    window.addEventListener("storage", onStorage);
    const poll = setInterval(read, 800); // safety net agar storage event miss ho jaye

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(poll);
    };
  }, [previewMode]);

  /* ---------- resume pending action after login ---------- */
  useEffect(() => {
    if (previewMode) return;

    const pending = consumePendingAction();
    if (!pending) return;

    const samePlace =
      pending.sellerUsername === seller.username &&
      String(pending.returnTo || "").split("?")[0] === window.location.pathname;
    if (!samePlace) return;

    const product = products.find((p) => p.id === pending.productId);
    if (!product || product.inStock === false) {
      setToast("Sorry, that product is no longer available.");
      setTimeout(() => setToast(""), 2500);
      return;
    }

    (async () => {
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
        setToast("Added to your cart");
        setTimeout(() => setToast(""), 2500);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryCount = useMemo(() => new Set(products.map((p) => p.category)).size, [products]);

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
    const url = window.location.href.split("?")[0]; // preview params share na ho

    if (navigator.share) {
      try {
        await navigator.share({ url, title: `${seller.displayName} Store` });
        return;
      } catch {
        /* cancelled */
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Share Store"), 2000);
    } catch {
      setCopyLabel("Could not copy");
      setTimeout(() => setCopyLabel("Share Store"), 2000);
    }
  }

  const sellerName = seller.displayName || seller.username;

  /* Seller not verified => store is closed for customers, show a message.
     Editor preview (previewMode) ko ye message nahi dikhta. */
  if (store.verified === false && !previewMode) {
    return (
      <div className="ls-store-page" style={themeVars}>
        <div className="ls-store-pending">
          <h2 className="ls-store-pending-title">Please wait for verification</h2>
          <p className="ls-store-pending-text">
            Once your seller account is verified, you can preview your page. We will contact
            you soon, and your store will open within 24 hours.
          </p>
          <Link href={`/${seller.username}`} className="ls-btn ls-btn-primary">
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="ls-store-page"
      style={themeVars}
      onClickCapture={
        previewMode
          ? (e) => {
              if (e.target.closest("a")) e.preventDefault();
            }
          : undefined
      }
    >
      {/* HEADER */}
      <header className="ls-store-header">
        <div className="ls-store-seller">
          <Link href={`/${seller.username}`} className="ls-store-back" aria-label="Back to profile">
            <Ico d={ICO.back} size={18} />
          </Link>

          {seller.profileImage ? (
            <img src={seller.profileImage} alt={sellerName} className="ls-store-avatar" />
          ) : (
            <div className="ls-store-avatar ls-store-avatar-placeholder">
              {(sellerName || "?").charAt(0).toUpperCase()}
            </div>
          )}

          <div className="ls-store-seller-text">
            <h1 className="ls-store-name">{sellerName}&apos;s Store</h1>
            <Link href={`/${seller.username}`} className="ls-store-back-link">
              @{seller.username} · View profile
            </Link>
          </div>
        </div>

        <div className="ls-store-header-actions">
          <button type="button" className="ls-btn ls-btn-outline" onClick={handleShare}>
            <Ico d={copyLabel === "Copied" ? ICO.check : ICO.share} size={14} />
            {copyLabel}
          </button>

          <CartIcon accent={accent} />
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="ls-store-hero">
        <div className="ls-store-hero-content">
          <p className="ls-store-hero-eyebrow">Welcome to my store</p>
          <h2 className="ls-store-hero-title">Shop from {sellerName}&apos;s Store</h2>
          <p className="ls-store-hero-subtitle">Curated products, collections and recommendations.</p>
          <div className="ls-store-hero-stats">
            <span><Ico d={ICO.bag} size={14} /> {products.length} Products</span>
            <span className="ls-dot" />
            <span><Ico d={ICO.tag} size={14} /> {categoryCount} Categories</span>
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
            <Ico d={ICO.filter} size={16} />
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
                className={category === c.value ? "ls-chip ls-chip-active" : "ls-chip"}
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
                    Handpicked products from {sellerName}&apos;s store.
                  </p>
                </div>
                <div className="ls-carousel-nav">
                  <button type="button" className="ls-nav-btn" onClick={() => scrollCarousel(-1)} aria-label="Previous">
                    <Ico d={ICO.left} size={16} />
                  </button>
                  <button type="button" className="ls-nav-btn" onClick={() => scrollCarousel(1)} aria-label="Next">
                    <Ico d={ICO.right} size={16} />
                  </button>
                </div>
              </div>
              <div className="ls-store-carousel" ref={carouselRef}>
                {featured.map((p) => (
                  <ProductCard key={p.id} product={p} seller={seller} accent={accent} preview={previewMode} />
                ))}
              </div>
            </section>
          )}

          <section className="ls-store-section">
            <div className="ls-store-section-head">
              <div>
                <h2 className="ls-store-section-title">All Products</h2>
                <p className="ls-store-section-subtitle">
                  Explore all products from {sellerName}&apos;s store.
                </p>
              </div>
              <div className="ls-store-section-tools">
                <select className="ls-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name: A-Z</option>
                </select>
              </div>
            </div>
            <div className="ls-store-grid">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} seller={seller} accent={accent} preview={previewMode} />
              ))}
            </div>
          </section>
        </>
      )}

      <footer className="pub-footer">Made with ❤ by LinkStorx</footer>

      {toast && (
        <div role="status" className="ls-toast">
          {toast}
        </div>
      )}
    </div>
  );
}