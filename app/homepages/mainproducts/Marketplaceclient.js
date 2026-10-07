"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PRODUCT_CATEGORIES } from "@/app/config/productCategories";
import { formatMoney } from "@/app/config/storeFeatures";
import { addToCart } from "@/app/lib/cart/cartStorage";

import "./mainproduct.css";

/* ---------------- shop action helpers ---------------- */

const API_URL = "/api/marketplace/products";
const PENDING_KEY = "ls_pending_action";
const PENDING_TTL_MS = 10 * 60 * 1000;
const DEFAULT_ACCENT = "#3a2b20";
const PAGE_SIZE = 15;

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

const CAT_COLORS = ["#fee2e2", "#ffe4e6", "#dbeafe", "#d1fae5", "#fef3c7", "#cffafe", "#ede9fe", "#e0e7ff", "#ffedd5", "#dbeafe", "#fef9c3", "#fce7f3", "#f1f5f9"];

/* ---------------- icons ---------------- */

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function IconPath({ d, ...props }) {
  return (
    <svg {...iconProps} {...props}>
      <path d={d} />
    </svg>
  );
}

const ICON_SEARCH = "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4";
const ICON_LEFT = "M15 18l-6-6 6-6";
const ICON_RIGHT = "M9 18l6-6-6-6";
const ICON_STORE = "M4 9l1.5-5h13L20 9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M5 12v8h14v-8";
const ICON_CART = "M3 4h2l.4 2M7 13h10l3-7H6.4M7 13l-1.6-7M7 13l-1.6 7h11.2";
const ICON_BOLT = "M13 3L5 14h6l-1 7 8-11h-6z";
const ICON_IMAGES = "M5 7h14v12H5zM8 4h11v3M9 15l3-3 4 4";
const ICON_GRID = "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z";

const CATEGORY_ICONS = [
  [/fashion|cloth/, "M8 4l-5 3 2 4 3-1v10h8V10l3 1 2-4-5-3a4 4 0 0 1-8 0z"],
  [/beauty|personal/, "M10 3h4v6h-4zM9 9h6v4H9zM8 13h8v8H8z"],
  [/electron/, "M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4zM17 15h3v5h-3z"],
  [/home|living/, "M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"],
  [/grocery|food/, "M3 9h18l-2 11H5zM8 9l3-5M16 9l-3-5"],
  [/health|well/, "M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"],
  [/sport|fitness/, "M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12"],
  [/book|station/, "M5 4h5v16H5zM10 4h5v16h-5zM16 6l4 1-3 13-4-1"],
  [/toy|kid/, "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 10h.01M15 10h.01M9 14a4 4 0 0 0 6 0"],
  [/auto|car/, "M4 16v-4l2-5h12l2 5v4M4 16h16M7 19v-3M17 19v-3"],
  [/pet/, "M12 12c-3 0-5 3-4 5s3 1 4 1 3 1 4-1-1-5-4-5zM7 10h.01M17 10h.01M10 6h.01M14 6h.01"],
  [/hand|craft/, "M6 7h.01M6 17h.01M8 8l12 9M8 16L20 7"],
  [/gift|life/, "M4 9h16v4H4zM6 13v8h12v-8M12 9v12M12 9c-3 0-4-4-1.5-4.5S12 9 12 9zM12 9c3 0 4-4 1.5-4.5S12 9 12 9z"],
];

function categoryIcon(value) {
  const hit = CATEGORY_ICONS.find(([re]) => re.test(String(value).toLowerCase()));
  return hit ? hit[1] : ICON_GRID;
}

/* ---------------- helpers ---------------- */

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

/* ---------------- components ---------------- */

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
    <article className="mp-card">
      <Link href={href} className="mp-media" aria-label={product.name}>
        {!loaded && !broken && images.length > 0 && <span className="mp-skel mp-media-skel" />}
        {images.length > 0 && !broken ? (
          <img
            ref={imgRef}
            key={images[idx]}
            src={images[idx]}
            alt={product.name}
            loading="lazy"
            className="mp-img"
            onLoad={() => setLoaded(true)}
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="mp-noimg"><IconPath d={ICON_IMAGES} /></span>
        )}

        {product.featured && <span className="mp-badge">Featured</span>}
        {out && <span className="mp-badge mp-badge-out">Sold out</span>}

        {images.length > 1 && (
          <>
            <button type="button" className="mp-arrow mp-arrow-l" aria-label="Previous image" onClick={go(-1)}>
              <IconPath d={ICON_LEFT} />
            </button>
            <button type="button" className="mp-arrow mp-arrow-r" aria-label="Next image" onClick={go(1)}>
              <IconPath d={ICON_RIGHT} />
            </button>
            <span className="mp-imgcount" aria-label={`${images.length} images`}>
              <IconPath d={ICON_IMAGES} /> {images.length}
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
          <Link href={storeHref} className="mp-btn mp-btn-ghost mp-btn-wide">
            <IconPath d={ICON_STORE} className="mp-btn-ic" /> View Store
          </Link>
          <button type="button" className="mp-btn mp-btn-outline" disabled={out} onClick={() => onAdd(product)}>
            <IconPath d={ICON_CART} className="mp-btn-ic" /> Add to Cart
          </button>
          <button type="button" className="mp-btn mp-btn-solid" disabled={out} onClick={() => onBuy(product)}>
            <IconPath d={ICON_BOLT} className="mp-btn-ic" /> Buy Now
          </button>
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

/* ---------------- page ---------------- */

function Marketplace() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const catRef = useRef(null);
  const reqId = useRef(0);

  const q = sp.get("q") || "";
  const category = sp.get("category") || "";
  const sort = sp.get("sort") || "newest";
  const price = sp.get("price") || "";
  const featuredOnly = sp.get("featured") === "1";

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

  const currentPath = `${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;

  const setParams = useCallback(
    (changes) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      router.push(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
    },
    [sp, router, pathname]
  );

  const clearFilters = () => {
    setSearchText("");
    router.push(pathname);
  };

  /* search box */
  useEffect(() => {
    setSearchText(q);
  }, [q]);

  useEffect(() => {
    if (searchText === q) return;
    const t = setTimeout(() => setParams({ q: searchText.trim() }), 350);
    return () => clearTimeout(t);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  /* params builder */
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

  /* first page: filters badalte hi reset + 15 cards */
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

  /* show more: agle 15 neeche append */
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

  /* cart / buy now / auth */
  function showToast(text) {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
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

  /* derived */
  const filtering = Boolean(q || category || price || featuredOnly);
  const hasMore = page < pages;
  const handleAdd = (p) => act("ADD_TO_CART", p);
  const handleBuy = (p) => act("BUY_NOW", p);
  const scrollCats = (dir) => catRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });

  return (
    <div className="mp">
      <header className="mp-hero">
        <div className="mp-wrap mp-hero-grid">
          <div className="mp-hero-text">
            <h1>
              Discover Amazing
              <span>Products</span>
            </h1>
            <p>Shop from unique creators, small businesses and independent stores on LinkStorX.</p>

            <form className="mp-search" role="search" onSubmit={(e) => { e.preventDefault(); setParams({ q: searchText.trim() }); }}>
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

          <div className="mp-promo" aria-hidden="true">
            <b>SHOP</b>
            <b>EXPLORE</b>
            <b>SUPPORT</b>
            <b>CREATORS</b>
            <small>Discover stores and products from creators across LinkStorX.</small>
          </div>
        </div>
      </header>

      <div className="mp-wrap">
        <div className="mp-cats-row">
          <nav className="mp-cats" aria-label="Categories" ref={catRef}>
            <button type="button" className={!category ? "mp-cat mp-cat-on" : "mp-cat"} onClick={() => setParams({ category: "" })}>
              <span className="mp-cat-circle"><IconPath d={ICON_GRID} /></span>
              <span className="mp-cat-label">All</span>
            </button>
            {PRODUCT_CATEGORIES.map((c, i) => (
              <button
                key={c.value}
                type="button"
                className={category === c.value ? "mp-cat mp-cat-on" : "mp-cat"}
                aria-pressed={category === c.value}
                onClick={() => setParams({ category: c.value })}
              >
                <span className="mp-cat-circle" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}>
                  <IconPath d={categoryIcon(c.value)} />
                </span>
                <span className="mp-cat-label">{c.label}</span>
              </button>
            ))}
          </nav>
          <button type="button" className="mp-cat-next" aria-label="Scroll categories" onClick={() => scrollCats(1)}>
            <IconPath d={ICON_RIGHT} />
          </button>
        </div>

        <section className="mp-section" id="all-products" aria-labelledby="mp-all">
          <h2 id="mp-all" className="mp-sr">All products</h2>

          <div className="mp-filters">
            <div className="mp-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={!featuredOnly} className={!featuredOnly ? "mp-tab mp-tab-on" : "mp-tab"} onClick={() => setParams({ featured: "" })}>
                All Products
              </button>
              <button type="button" role="tab" aria-selected={featuredOnly} className={featuredOnly ? "mp-tab mp-tab-on" : "mp-tab"} onClick={() => setParams({ featured: "1" })}>
                Featured
              </button>
            </div>

            <div className="mp-selects">
              <select aria-label="Price" value={price} onChange={(e) => setParams({ price: e.target.value })}>
                <option value="">Price</option>
                {PRICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>

              <select aria-label="Category" value={category} onChange={(e) => setParams({ category: e.target.value })}>
                <option value="">All Categories</option>
                {PRODUCT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>

              <select aria-label="Sort by" value={sort} onChange={(e) => setParams({ sort: e.target.value === "newest" ? "" : e.target.value })}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>Sort by: {s.label}</option>)}
              </select>
            </div>
          </div>

          {!loading && !error && total > 0 && (
            <p className="mp-count">
              Showing {items.length} of {total.toLocaleString("en-IN")} products
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