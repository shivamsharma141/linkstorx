"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { PRODUCT_CATEGORIES } from "@/app/config/productCategories";
import { formatMoney } from "@/app/config/storeFeatures";

/* =========================================================
   ICONS
   Small, dependency-free line icons (24x24, currentColor)
   used in place of emoji throughout this page.
========================================================= */

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function IconImage(props) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="M21 16.5l-5.2-5.2a1.5 1.5 0 0 0-2.12 0L4 21" />
    </svg>
  );
}

function IconBox(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M3.5 7.5l8.5-4 8.5 4-8.5 4-8.5-4z" />
      <path d="M3.5 7.5v9l8.5 4 8.5-4v-9" />
      <path d="M12 11.5v9" />
    </svg>
  );
}

function IconCheckCircle(props) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.6 2.6L16 9.5" />
    </svg>
  );
}

function IconAlertTriangle(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M12 4.2L2.7 19.5a1 1 0 0 0 .86 1.5h17a1 1 0 0 0 .86-1.5L12 4.2a1 1 0 0 0-1.72 0z" />
      <path d="M12 10v4.2" />
      <circle cx="12" cy="17.3" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconStar({ filled, ...props }) {
  return (
    <svg {...iconProps} fill={filled ? "currentColor" : "none"} {...props}>
      <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.4l-5.4 2.9 1-6-4.4-4.3 6.1-.9L12 3.5z" />
    </svg>
  );
}

function IconSearch(props) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

function IconPlus(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconChevronLeft(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconChevronRight(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function IconMoreVertical(props) {
  return (
    <svg {...iconProps} fill="currentColor" stroke="none" {...props}>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

function IconEdit(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 20h4l10.6-10.6a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

function IconExternalLink(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M9 6H5.5A1.5 1.5 0 0 0 4 7.5v11A1.5 1.5 0 0 0 5.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />
      <path d="M14 4h6v6" />
      <path d="M20 4l-9.5 9.5" />
    </svg>
  );
}

function IconEye(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function IconEyeOff(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6A10.7 10.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a13.5 13.5 0 0 1-3.2 3.9M6.7 7.2C4.2 8.8 2.5 12 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 3.3-.58" />
      <path d="M9.9 9.9a2.75 2.75 0 0 0 3.9 3.9" />
    </svg>
  );
}

function IconTrash(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4.5 7h15" />
      <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
      <path d="M6.5 7l1 12.5A1.5 1.5 0 0 0 9 21h6a1.5 1.5 0 0 0 1.5-1.5L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

const PAGE_SIZE = 10;
const LOW_STOCK_LIMIT = 5;
const MENU_HEIGHT_ESTIMATE = 240; // px, used to decide open-up vs open-down

const SORTERS = {
  newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  oldest: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
  "price-asc": (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0),
  "price-desc": (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0),
  name: (a, b) => (a.name || "").localeCompare(b.name || ""),
};

function getDiscount(product) {
  const price = Number(product.price);
  const compare = Number(product.compareAtPrice);
  if (!compare || compare <= price) return 0;
  return Math.round(((compare - price) / compare) * 100);
}

function getStock(product) {
  if (!product.trackInventory) return { label: "In stock", tone: "ok" };

  const stock = Number(product.stock) || 0;
  if (stock <= 0) return { label: "Out of stock", tone: "out" };
  if (stock <= LOW_STOCK_LIMIT) return { label: `${stock} left`, tone: "low" };
  return { label: `${stock} in stock`, tone: "ok" };
}

function categoryLabel(value) {
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label || value || "—";
}

function EmptyIllustration() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden="true">
      <path d="M26 42h58l-4 48a6 6 0 0 1-6 5H36a6 6 0 0 1-6-5l-4-48Z" fill="#3b82f6" />
      <path d="M26 42h58l-1.5 18H27.5L26 42Z" fill="#2563eb" />
      <path
        d="M42 42v-8a13 13 0 0 1 26 0v8"
        fill="none"
        stroke="#1e40af"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M92 20l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="#fbbf24" />
      <path d="M14 58l1.5 4.5L20 64l-4.5 1.5L14 70l-1.5-4.5L8 64l4.5-1.5L14 58Z" fill="#fbbf24" />
    </svg>
  );
}

export default function ProductsList({ initialProducts, sellerUsername }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [menuStyle, setMenuStyle] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
  }, [search, category, status, sort]);

  // The menu is position: fixed, so close it when the page scrolls/resizes
  // (otherwise it would drift away from its button).
  useEffect(() => {
    if (menuId === null) return;

    const close = () => setMenuId(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuId]);

  const stats = useMemo(
    () => ({
      total: products.length,
      published: products.filter((p) => p.enabled).length,
      low: products.filter(
        (p) => p.trackInventory && (Number(p.stock) || 0) <= LOW_STOCK_LIMIT
      ).length,
      featured: products.filter((p) => p.featured).length,
    }),
    [products]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products
      .filter((p) => {
        if (q) {
          const haystack = [p.name, p.shortDescription, ...(p.tags || [])]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        if (category && p.category !== category) return false;
        if (status === "enabled" && !p.enabled) return false;
        if (status === "disabled" && p.enabled) return false;

        return true;
      })
      .sort(SORTERS[sort] || SORTERS.newest);
  }, [products, search, category, status, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(start, start + PAGE_SIZE);

  async function patchProduct(product, changes, failMessage) {
    setBusyId(product.id);
    setMenuId(null);
    setError("");

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || failMessage);
        return;
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? data.product : p))
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const toggleEnabled = (product) =>
    patchProduct(product, { enabled: !product.enabled }, "Could not update product.");

  const toggleFeatured = (product) =>
    patchProduct(product, { featured: !product.featured }, "Could not update product.");

  async function confirmDelete() {
    if (!deleteTarget) return;

    setBusyId(deleteTarget.id);
    setError("");

    try {
      const response = await fetch(`/api/products/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Could not delete product.");
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setCategory("");
    setStatus("");
  }

  function previewHref(product) {
    return sellerUsername && product.slug
      ? `/${sellerUsername}/store/${product.slug}`
      : null;
  }

  /*
   * Open / close the 3-dots menu.
   * The menu is placed with position: fixed using the button's position on
   * screen, so the table's overflow: hidden can never clip it. If there is
   * not enough room below the button, it opens upward instead.
   */
  function toggleMenu(event, productId) {
    if (menuId === productId) {
      setMenuId(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const viewportW = document.documentElement.clientWidth;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < MENU_HEIGHT_ESTIMATE && rect.top > spaceBelow;

    const style = {
      position: "fixed",
      right: Math.max(8, viewportW - rect.right),
      left: "auto",
    };

    if (openUp) {
      style.bottom = window.innerHeight - rect.top + 6;
      style.top = "auto";
    } else {
      style.top = rect.bottom + 6;
      style.bottom = "auto";
    }

    setMenuStyle(style);
    setMenuId(productId);
  }

  function renderPrice(product) {
    const discount = getDiscount(product);

    return (
      <div className="prod-price">
        <span className="prod-price-now">
          {formatMoney(product.price, product.currency)}
        </span>
        {discount > 0 && (
          <>
            <span className="prod-price-was">
              {formatMoney(product.compareAtPrice, product.currency)}
            </span>
            <span className="prod-chip-off">{discount}% OFF</span>
          </>
        )}
      </div>
    );
  }

  function renderThumb(product) {
    return (
      <div className="prod-thumb">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt="" />
        ) : (
          <IconImage className="prod-thumb-empty" />
        )}
      </div>
    );
  }

  function renderMenu(product, full) {
    const open = menuId === product.id;
    const href = previewHref(product);

    return (
      <div className="prod-menu-wrap">
        <button
          type="button"
          className="pe-icon-btn"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={busyId === product.id}
          onClick={(e) => toggleMenu(e, product.id)}
        >
          <IconMoreVertical />
        </button>

        {open && (
          <>
            <div className="prod-menu-backdrop" onClick={() => setMenuId(null)} />
            <div className="prod-menu" role="menu" style={menuStyle || undefined}>
              {full && (
                <Link href={`/dashboard/products/${product.id}`}>
                  <IconEdit /> Edit
                </Link>
              )}
              {full && href && (
                <a href={href} target="_blank" rel="noreferrer">
                  <IconExternalLink /> Preview
                </a>
              )}
              <button type="button" onClick={() => toggleEnabled(product)}>
                {product.enabled ? <IconEyeOff /> : <IconEye />}
                {product.enabled ? "Move to draft" : "Publish"}
              </button>
              <button type="button" onClick={() => toggleFeatured(product)}>
                <IconStar filled={product.featured} />
                {product.featured ? "Remove from featured" : "Mark as featured"}
              </button>
              <button
                type="button"
                className="prod-menu-danger"
                onClick={() => {
                  setMenuId(null);
                  setDeleteTarget(product);
                }}
              >
                <IconTrash /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const statCards = [
    { icon: <IconBox />, tone: "purple", label: "Total Products", value: stats.total, hint: "All products in your store" },
    { icon: <IconCheckCircle />, tone: "green", label: "Published", value: stats.published, hint: "Visible to customers" },
    { icon: <IconAlertTriangle />, tone: "orange", label: "Low Stock", value: stats.low, hint: "Need attention" },
    { icon: <IconStar filled />, tone: "yellow", label: "Featured", value: stats.featured, hint: "Featured products" },
  ];

  return (
    <div className="prod-wrapper">
      <div className="prod-header">
        <div>
          {/* BACK BUTTON (same style as the editor page) */}
          <Link href="/dashboard" className="prodedit-back">
            <IconChevronLeft className="prodedit-back-icon" />
            Back
          </Link>
          <h1 className="prod-title">Products</h1>
          <p className="prod-subtitle">
            Manage everything you sell on your LinkStorx store.
          </p>
        </div>

        <Link href="/dashboard/products/new" className="pe-btn pe-btn-primary">
          <IconPlus className="pe-btn-icon" />
          Add Product
        </Link>
      </div>

      {error && <div className="prod-error-banner">{error}</div>}

      {products.length === 0 ? (
        <div className="prod-empty">
          <EmptyIllustration />
          <h2>Start selling on LinkStorx</h2>
          <p>Add your first product and showcase it directly on your public profile.</p>
          <Link href="/dashboard/products/new" className="pe-btn pe-btn-primary">
            <IconPlus className="pe-btn-icon" />
            Add Product
          </Link>
        </div>
      ) : (
        <>
          <div className="prod-stats">
            {statCards.map((s) => (
              <div key={s.label} className="prod-stat">
                <div className="prod-stat-top">
                  <span className={`prod-stat-icon prod-tone-${s.tone}`}>{s.icon}</span>
                  <span className="prod-stat-label">{s.label}</span>
                </div>
                <div className="prod-stat-value">{s.value}</div>
                <div className="prod-stat-hint">{s.hint}</div>
              </div>
            ))}
          </div>

          <div className="prod-toolbar">
            <div className="prod-search-wrap">
              <IconSearch className="prod-search-icon" />
              <input
                className="pe-input prod-search"
                placeholder="Search products by name, description, or tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="pe-input prod-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              className="pe-input prod-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="enabled">Published</option>
              <option value="disabled">Draft</option>
            </select>

            <select
              className="pe-input prod-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <div className="prod-empty prod-empty-small">
              <p>No products match your filters.</p>
              <button type="button" className="pe-btn pe-btn-outline" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="prod-table-wrap">
                <table className="prod-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Featured</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageItems.map((product) => {
                      const stock = getStock(product);
                      const href = previewHref(product);

                      return (
                        <tr key={product.id}>
                          <td>
                            <div className="prod-cell-name">
                              {renderThumb(product)}
                              <div className="prod-name-text">
                                <strong>{product.name}</strong>
                                {product.shortDescription && (
                                  <span>{product.shortDescription}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>{categoryLabel(product.category)}</td>
                          <td>{renderPrice(product)}</td>

                          <td>
                            <span className={`prod-stock prod-stock-${stock.tone}`}>
                              {stock.label}
                            </span>
                          </td>

                          <td>
                            <span
                              className={
                                product.enabled
                                  ? "prod-badge prod-badge-on"
                                  : "prod-badge prod-badge-off"
                              }
                            >
                              {product.enabled ? "Published" : "Draft"}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className={product.featured ? "prod-star prod-star-on" : "prod-star"}
                              title={product.featured ? "Remove from featured" : "Mark as featured"}
                              disabled={busyId === product.id}
                              onClick={() => toggleFeatured(product)}
                            >
                              <IconStar filled={product.featured} />
                            </button>
                          </td>

                          <td>
                            <div className="prod-actions">
                              <Link
                                href={`/dashboard/products/${product.id}`}
                                className="pe-btn pe-btn-outline pe-btn-sm"
                              >
                                Edit
                              </Link>

                              {href ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="pe-btn pe-btn-outline pe-btn-sm"
                                >
                                  Preview
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  className="pe-btn pe-btn-outline pe-btn-sm"
                                  disabled
                                >
                                  Preview
                                </button>
                              )}

                              {renderMenu(product, false)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="prod-cards">
                {pageItems.map((product) => {
                  const stock = getStock(product);

                  return (
                    <div key={product.id} className="prod-card">
                      {renderThumb(product)}

                      <div className="prod-card-info">
                        <strong>{product.name}</strong>
                        {renderPrice(product)}
                        <span className="prod-card-meta">
                          <span className={`prod-stock prod-stock-${stock.tone}`}>
                            {stock.label}
                          </span>
                          <span className="prod-dot">•</span>
                          <span className={product.enabled ? "prod-text-on" : "prod-text-off"}>
                            {product.enabled ? "Published" : "Draft"}
                          </span>
                        </span>
                      </div>

                      {renderMenu(product, true)}
                    </div>
                  );
                })}
              </div>

              <div className="prod-pagination">
                <span className="prod-showing">
                  Showing {start + 1} to {Math.min(start + PAGE_SIZE, visible.length)} of{" "}
                  {visible.length} products
                </span>

                {totalPages > 1 && (
                  <div className="prod-pages">
                    <button
                      type="button"
                      className="prod-page-btn"
                      aria-label="Previous page"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <IconChevronLeft />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={n === currentPage ? "prod-page-btn prod-page-active" : "prod-page-btn"}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="prod-page-btn"
                      aria-label="Next page"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <IconChevronRight />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {deleteTarget && (
        <div className="prod-modal-overlay">
          <div className="prod-modal">
            <h3>Delete product?</h3>
            <p>
              This will permanently delete &quot;{deleteTarget.name}&quot;. This
              cannot be undone.
            </p>

            <div className="prod-modal-actions">
              <button
                type="button"
                className="pe-btn pe-btn-outline"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="pe-btn prod-btn-danger"
                onClick={confirmDelete}
                disabled={busyId === deleteTarget.id}
              >
                {busyId === deleteTarget.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}