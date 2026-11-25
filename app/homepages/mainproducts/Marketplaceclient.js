"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PRODUCT_CATEGORIES } from "@/app/config/productCategories";
import { formatMoney } from "@/app/config/storeFeatures";
import { addToCart } from "@/app/lib/cart/cartStorage";

import "./mainproduct.css";

/* =====================================================================
   CONSTANTS
   ===================================================================== */

const API_URL = "/api/marketplace/products";
const PENDING_KEY = "ls_pending_action";
const PENDING_TTL_MS = 10 * 60 * 1000;
const DEFAULT_ACCENT = "#3a2b20";
const PAGE_SIZE = 15;

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name A–Z" },
  { value: "featured", label: "Featured" },
];

const PRICES = [
  { value: "0-500", label: "Under ₹500" },
  { value: "500-1000", label: "₹500 – ₹1,000" },
  { value: "1000-2500", label: "₹1,000 – ₹2,500" },
  { value: "2500-", label: "Above ₹2,500" },
];

/* ---------------------------------------------------------------------
   CATEGORY IMAGES  ->  yahan sirf apne image ke path badalne hain.
   Images ko  public/categories/  folder me rakho
   (Next.js me "/categories/fashion.png" = public/categories/fashion.png)

   Har row: [category value se match hone wala regex, image path]
   Agar PRODUCT_CATEGORIES ke item me `image` field ho to wo sabse pehle use hoga.
   --------------------------------------------------------------------- */
const ALL_CATEGORY_IMAGE = "/categories/all.png";
const FALLBACK_CATEGORY_IMAGE = "/categories/others.png";

const CATEGORY_IMAGES = [
  [/fashion|cloth/, "/categories/fashion.png"],
  [/beauty|personal/, "/categories/beauty.png"],
  [/electron/, "/categories/electronics.png"],
  [/home|living/, "/categories/home.png"],
  [/grocery|food/, "/categories/grocery.png"],
  [/sport|fitness/, "/categories/sports.png"],
  [/book|station/, "/categories/books.png"],
  [/toy|kid/, "/categories/toys.png"],
  [/auto|vehicle/, "/categories/automotive.png"],
  [/hand|craft/, "/categories/handmade.png"],
  [/gift|life/, "/categories/gifts.png"],
];

/* ---------------------------------------------------------------------
   ICONS (sirf UI ke liye; category icons hata diye gaye hain)
   --------------------------------------------------------------------- */
const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const ICON_SEARCH = "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4";
const ICON_LEFT = "M15 18l-6-6 6-6";
const ICON_RIGHT = "M9 18l6-6-6-6";
const ICON_DOWN = "M6 9l6 6 6-6";
const ICON_BAG = "M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0";
const ICON_STORE = "M4 9l1.5-5h13L20 9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M5 12v8h14v-8";
const ICON_CART = "M3 4h2l.4 2M7 13h10l3-7H6.4M7 13l-1.6-7M7 13l-1.6 7h11.2";
const ICON_BOLT = "M13 3L5 14h6l-1 7 8-11h-6z";
const ICON_IMAGES = "M5 7h14v12H5zM8 4h11v3M9 15l3-3 4 4";
const ICON_GRID = "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z";

/* =====================================================================
   HELPERS
   ===================================================================== */

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

function consumePendingActionFor(pathname) {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const action = JSON.parse(raw);
    if (String(action?.returnTo || "").split("?")[0] !== pathname) return null;
    sessionStorage.removeItem(PENDING_KEY);
    if (!["ADD_TO_CART", "BUY_NOW"].includes(action.type)) return null;
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

async function fetchProducts(params) {
  const res = await fetch(`${API_URL}?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || "failed");
  return data;
}

function discountOf(p) {
  const price = Number(p.price);
  const was = Number(p.mrp);
  return was > price ? Math.round(((was - price) / was) * 100) : 0;
}

const isOutOfStock = (p) => p.inStock === false;

function categoryImage(category) {
  if (category.image) return category.image;
  const value = String(category.value).toLowerCase();
  const hit = CATEGORY_IMAGES.find(([re]) => re.test(value));
  return hit ? hit[1] : FALLBACK_CATEGORY_IMAGE;
}

/* =====================================================================
   SMALL COMPONENTS
   ===================================================================== */

function IconPath({ d, ...props }) {
  return (
    <svg {...iconProps} {...props}>
      <path d={d} />
    </svg>
  );
}

/* Category tile: image dikhata hai, image na mile to grid icon fallback */
function CategoryTile({ src, label, active, onSelect }) {
  const [broken, setBroken] = useState(false);

  return (
    <button
      type="button"
      className={active ? "mp-cat mp-cat-on" : "mp-cat"}
      aria-pressed={active}
      onClick={onSelect}
    >
      <span className="mp-cat-tile">
        {broken ? (
          <IconPath d={ICON_GRID} className="mp-cat-fallback" />
        ) : (
          <img src={src} alt="" loading="lazy" draggable="false" onError={() => setBroken(true)} />
        )}
      </span>
      <span className="mp-cat-label">{label}</span>
    </button>
  );
}

/* Category strip: left + right buttons, edge fade, active item auto-center */
function CategoryBar({ category, onSelect }) {
  const trackRef = useRef(null);
  const [edge, setEdge] = useState({ left: false, right: true });

  const updateEdge = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdge({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  const scrollByDir = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 200), behavior: "smooth" });
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateEdge();
    el.addEventListener("scroll", updateEdge, { passive: true });
    window.addEventListener("resize", updateEdge);
    return () => {
      el.removeEventListener("scroll", updateEdge);
      window.removeEventListener("resize", updateEdge);
    };
  }, [updateEdge]);

  useEffect(() => {
    const active = trackRef.current?.querySelector('[aria-pressed="true"]');
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [category]);

  return (
    <div className="mp-cats-row">
      <button
        type="button"
        className="mp-cat-nav"
        aria-label="Scroll categories left"
        onClick={() => scrollByDir(-1)}
        disabled={!edge.left}
      >
        <IconPath d={ICON_LEFT} />
      </button>

      <div className="mp-cats-view" data-left={edge.left} data-right={edge.right}>
        <nav className="mp-cats" aria-label="Categories" ref={trackRef}>
          <CategoryTile
            src={ALL_CATEGORY_IMAGE}
            label="All"
            active={!category}
            onSelect={() => onSelect("")}
          />
          {PRODUCT_CATEGORIES.map((c) => (
            <CategoryTile
              key={c.value}
              src={categoryImage(c)}
              label={c.label}
              active={category === c.value}
              onSelect={() => onSelect(c.value)}
            />
          ))}
        </nav>
      </div>

      <button
        type="button"
        className="mp-cat-nav"
        aria-label="Scroll categories right"
        onClick={() => scrollByDir(1)}
        disabled={!edge.right}
      >
        <IconPath d={ICON_RIGHT} />
      </button>
    </div>
  );
}

function ProductCard({ product, onAdd, onBuy }) {
  const images = product.images?.length ? product.images : [];
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const imgRef = useRef(null);

  const seller = product.seller || {};
  const href = `/${seller.username}/store/${product.slug}`;
  const storeHref = `/${seller.username}/store`;
  const off = discountOf(product);
  const out = isOutOfStock(product);

  // Cached image: onLoad hydration se pehle fire ho chuka hota hai -> yahan check
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete) {
      if (el.naturalWidth > 0) setLoaded(true);
      else setBroken(true);
    }
  }, [idx]);

  const go = (dir) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoaded(false);
    setBroken(false);
    setIdx((i) => (i + dir + images.length) % images.length);
  };

  return (
    <article className={out ? "mp-card mp-card-out" : "mp-card"}>
      <Link href={href} className="mp-media" aria-label={product.name}>
        {!loaded && !broken && images.length > 0 && <span className="mp-skel mp-media-skel" />}

        {images.length > 0 && !broken ? (
          <>
            {/* blurred copy fills empty space so the real image can show fully (no cropping) */}
            {loaded && <img src={images[idx]} alt="" aria-hidden="true" className="mp-img-bg" />}
            <img
              ref={imgRef}
              key={images[idx]}
              src={images[idx]}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="mp-img"
              onLoad={() => setLoaded(true)}
              onError={() => setBroken(true)}
            />
          </>
        ) : (
          <span className="mp-noimg">
            <IconPath d={ICON_IMAGES} />
            <small>No image</small>
          </span>
        )}

        {product.featured && <span className="mp-badge">★ Featured</span>}
        {out && <span className="mp-soldout"><b>SOLD OUT</b></span>}

        {images.length > 1 && (
          <>
            <button type="button" className="mp-arrow mp-arrow-l" aria-label="Previous image" onClick={go(-1)}>
              <IconPath d={ICON_LEFT} />
            </button>
            <button type="button" className="mp-arrow mp-arrow-r" aria-label="Next image" onClick={go(1)}>
              <IconPath d={ICON_RIGHT} />
            </button>
            <span className="mp-imgcount" aria-label={`${images.length} images`}>
              <IconPath d={ICON_IMAGES} /> {idx + 1}/{images.length}
            </span>
          </>
        )}
      </Link>

      <div className="mp-body">
        <h3 className="mp-name"><Link href={href}>{product.name}</Link></h3>

        <div className="mp-price">
          <strong>{formatMoney(product.price, product.currency)}</strong>
          {off > 0 && (
            <>
              <s>{formatMoney(product.mrp, product.currency)}</s>
              <span className="mp-off">{off}% OFF</span>
            </>
          )}
        </div>

        <Link href={storeHref} className="mp-seller" title={`@${seller.username}`}>
          {seller.profileImage ? (
            <img src={seller.profileImage} alt="" className="mp-seller-img" loading="lazy" />
          ) : (
            <span className="mp-seller-img mp-seller-fallback">
              {(seller.displayName || seller.username || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <span className="mp-seller-name">{seller.displayName || `@${seller.username}`}</span>
        </Link>

        <div className="mp-actions">
          <button type="button" className="mp-btn mp-btn-outline" disabled={out} onClick={() => onAdd(product)}>
            <IconPath d={ICON_CART} className="mp-btn-ic" /> Add to Cart
          </button>
          <button type="button" className="mp-btn mp-btn-solid" disabled={out} onClick={() => onBuy(product)}>
            <IconPath d={ICON_BOLT} className="mp-btn-ic" /> Buy Now
          </button>
          <Link href={storeHref} className="mp-btn mp-btn-ghost mp-btn-wide">
            <IconPath d={ICON_STORE} className="mp-btn-ic" /> View Store
          </Link>
        </div>
      </div>
    </article>
  );
}

function SkeletonGrid({ count = 8 }) {
  return (
    <div className="mp-grid" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mp-card">
          <span className="mp-skel mp-media" />
          <div className="mp-body">
            <span className="mp-skel mp-line" style={{ width: "80%" }} />
            <span className="mp-skel mp-line" style={{ width: "45%" }} />
            <span className="mp-skel mp-line" style={{ width: "60%", height: 30 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =====================================================================
   PAGE
   ===================================================================== */

function Marketplace() {
  /* ---------- routing / url params ---------- */
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const reqId = useRef(0);

  const q = sp.get("q") || "";
  // Old links like ?category=pet-supplies or ?category=health-wellness are ignored
  const rawCategory = sp.get("category") || "";
  const category = PRODUCT_CATEGORIES.some((c) => c.value === rawCategory) ? rawCategory : "";
  const sort = sp.get("sort") || "newest";
  const price = sp.get("price") || "";
  const featuredOnly = sp.get("featured") === "1";
  const currentPath = `${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;

  /* ---------- state ---------- */
  const [searchText, setSearchText] = useState(q);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState("");

  /* ---------- derived ---------- */
  const filtering = Boolean(q || category || price || featuredOnly);
  const hasMore = page < pages;

  /* ---------- url helpers ---------- */
  const setParams = useCallback(
    (changes) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      router.push(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
    },
    [sp, router, pathname]
  );

  const buildParams = useCallback(
    (p) => {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE), sort });
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (featuredOnly) params.set("featured", "1");
      if (price) {
        const [min, max] = price.split("-");
        if (min) params.set("minPrice", min);
        if (max) params.set("maxPrice", max);
      }
      return params;
    },
    [q, category, sort, price, featuredOnly]
  );

  /* ---------- handlers ---------- */
  const clearFilters = () => {
    setSearchText("");
    router.push(pathname);
  };

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  };

  async function loadMore() {
    if (loadingMore || page >= pages) return;
    const id = reqId.current;
    const nextPage = page + 1;
    setLoadingMore(true);
    setMoreError(false);

    try {
      const d = await fetchProducts(buildParams(nextPage));
      if (id !== reqId.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...d.products.filter((p) => !seen.has(p.id))];
      });
      setPage(nextPage);
      setPages(d.pages);
      setTotal(d.total);
    } catch {
      if (id === reqId.current) setMoreError(true);
    } finally {
      if (id === reqId.current) setLoadingMore(false);
    }
  }

  async function act(type, product) {
    const seller = product.seller;
    const accent = seller.accentColor || DEFAULT_ACCENT;

    if (!(await isLoggedIn())) {
      savePendingAction({
        type,
        productId: product.id,
        sellerUsername: seller.username,
        quantity: 1,
        returnTo: currentPath,
      });
      router.push(`/login?returnTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    const result = runShopAction({ type, product, seller, accent, quantity: 1, router });
    if (result === "added") showToast("Added to your cart ✓");
  }

  const handleAdd = (p) => act("ADD_TO_CART", p);
  const handleBuy = (p) => act("BUY_NOW", p);
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setParams({ q: searchText.trim() });
  };

  /* ---------- effects ---------- */

  // url ki search -> input
  useEffect(() => {
    setSearchText(q);
  }, [q]);

  // input -> url (debounce)
  useEffect(() => {
    if (searchText === q) return;
    const t = setTimeout(() => setParams({ q: searchText.trim() }), 350);
    return () => clearTimeout(t);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  // first page: filters badalte hi reset + 15 cards
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(false);
    setMoreError(false);
    setItems([]);
    setPage(1);

    fetchProducts(buildParams(1))
      .then((d) => {
        if (id !== reqId.current) return;
        setItems(d.products);
        setTotal(d.total);
        setPages(d.pages);
      })
      .catch(() => id === reqId.current && setError(true))
      .finally(() => id === reqId.current && setLoading(false));
  }, [buildParams, reloadKey]);

  // login ke baad pending cart / buy action
  useEffect(() => {
    const pending = consumePendingActionFor(window.location.pathname);
    if (!pending) return;

    (async () => {
      if (!(await isLoggedIn())) return;
      try {
        const d = await fetchProducts(new URLSearchParams({ id: pending.productId }));
        const product = d.products?.[0];

        if (!product || product.inStock === false) {
          showToast("Sorry, that product is no longer available.");
          return;
        }

        const result = runShopAction({
          type: pending.type,
          product,
          seller: product.seller,
          accent: product.seller.accentColor || DEFAULT_ACCENT,
          quantity: pending.quantity || 1,
          router,
        });
        if (result === "added") showToast("Added to your cart ✓");
      } catch {
        showToast("Sorry, that product is no longer available.");
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- render (sirf JSX) ---------- */
  return (
    <div className="mp">
      <header className="mp-hero">
        <div className="mp-wrap mp-hero-grid">
          <div className="mp-hero-text">
            <h1>
              Discover Amazing
              <span>Products.</span>
            </h1>
            <p className="mp-hero-sub">Shop from unique creators, small businesses and independent stores on LinkStorX.</p>

            <form className="mp-search" role="search" onSubmit={handleSearchSubmit}>
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search products, stores, categories..."
                aria-label="Search products"
              />
              <button type="submit" className="mp-search-btn" aria-label="Search">
                <IconPath d={ICON_SEARCH} />
              </button>
            </form>

            <ul className="mp-chips">
              <li>Unique Products</li>
              <li>Trusted Stores</li>
              <li>Easy Shopping</li>
              <li>Support Creators</li>
            </ul>
          </div>

          <div className="mp-promo">
            <a href="#all-products" className="mp-promo-float">
              <span className="mp-promo-ic"><IconPath d={ICON_BAG} /></span>
              <span>
                <b>Trending Products</b>
                <small>Explore now</small>
              </span>
            </a>
            <div className="mp-promo-card">
              <b>SHOP</b>
              <b>EXPLORE</b>
              <b>SUPPORT</b>
              <b>CREATORS</b>
              <small>Discover stores and products from creators across LinkStorX.</small>
            </div>
          </div>
        </div>
      </header>

      <div className="mp-wrap">
        <CategoryBar category={category} onSelect={(value) => setParams({ category: value })} />

        <section className="mp-section" id="all-products" aria-labelledby="mp-all">
          <h2 id="mp-all" className="mp-sr">All products</h2>

          <div className="mp-filters">
            <div className="mp-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={!featuredOnly}
                className={!featuredOnly ? "mp-tab mp-tab-on" : "mp-tab"}
                onClick={() => setParams({ featured: "" })}
              >
                All Products
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={featuredOnly}
                className={featuredOnly ? "mp-tab mp-tab-on" : "mp-tab"}
                onClick={() => setParams({ featured: "1" })}
              >
                Featured
              </button>
            </div>

            <div className="mp-selects">
              <div className="mp-select">
                <select aria-label="Price" value={price} onChange={(e) => setParams({ price: e.target.value })}>
                  <option value="">Price</option>
                  {PRICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <IconPath d={ICON_DOWN} />
              </div>

              <div className="mp-select">
                <select aria-label="Category" value={category} onChange={(e) => setParams({ category: e.target.value })}>
                  <option value="">All Categories</option>
                  {PRODUCT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <IconPath d={ICON_DOWN} />
              </div>

              <div className="mp-select mp-select-sort">
                <select
                  aria-label="Sort by"
                  value={sort}
                  onChange={(e) => setParams({ sort: e.target.value === "newest" ? "" : e.target.value })}
                >
                  {SORTS.map((s) => <option key={s.value} value={s.value}>Sort by: {s.label}</option>)}
                </select>
                <IconPath d={ICON_DOWN} />
              </div>
            </div>
          </div>

          {!loading && !error && total > 0 && (
            <p className="mp-count">
              Showing <b>{items.length}</b> of <b>{total.toLocaleString("en-IN")}</b> products
            </p>
          )}

          {loading ? (
            <SkeletonGrid />
          ) : error ? (
            <div className="mp-state" role="alert">
              <h3>Unable to load products.</h3>
              <p>Please try again.</p>
              <button type="button" className="mp-btn mp-btn-solid" onClick={() => setReloadKey((k) => k + 1)}>Try Again</button>
            </div>
          ) : items.length === 0 ? (
            <div className="mp-state">
              {filtering ? (
                <>
                  <h3>No products found</h3>
                  <p>Try a different search or category.</p>
                  <button type="button" className="mp-btn mp-btn-solid" onClick={clearFilters}>Clear Filters</button>
                </>
              ) : (
                <>
                  <h3>No products yet</h3>
                  <p>LinkStorX sellers are getting their stores ready. Check back soon.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="mp-grid">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} onAdd={handleAdd} onBuy={handleBuy} />
                ))}
                {loadingMore &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={`s${i}`} className="mp-card" aria-hidden="true">
                      <span className="mp-skel mp-media" />
                      <div className="mp-body">
                        <span className="mp-skel mp-line" style={{ width: "80%" }} />
                        <span className="mp-skel mp-line" style={{ width: "45%" }} />
                      </div>
                    </div>
                  ))}
              </div>

              {hasMore && (
                <div className="mp-more">
                  <button type="button" className="mp-btn mp-btn-solid mp-more-btn" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading..." : moreError ? "Retry" : "Show More"}
                  </button>
                  {moreError && <p className="mp-more-err">Couldn&apos;t load more products.</p>}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {toast && <div className="mp-toast" role="status">{toast}</div>}
    </div>
  );
}

export default function MarketplaceClient() {
  return (
    <Suspense fallback={<div className="mp"><div className="mp-wrap"><SkeletonGrid /></div></div>}>
      <Marketplace />
    </Suspense>
  );
}