"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  PRODUCT_CATEGORIES,
  getSubcategoriesForCategory,
} from "@/app/config/productCategories";

import { formatMoney } from "@/app/config/storeFeatures";

const MAX_IMAGES = 5;
const MAX_TAGS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Real viewport sizes the preview iframe renders at,
// then it is visually scaled down to fit the column.
const DEVICE_SIZES = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
};

/* =========================================================
   ICONS
   Small, dependency-free line icons (24x24, currentColor)
   used in place of emoji throughout the editor.
========================================================= */

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function IconChevronLeft(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconFileText(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6M9 9h1" />
    </svg>
  );
}

function IconImage(props) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="M21 16.5l-5.2-5.2a1.5 1.5 0 0 0-2.12 0L4 21" />
    </svg>
  );
}

function IconTag(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M12.5 3.5H6a2 2 0 0 0-2 2v6.5a2 2 0 0 0 .59 1.42l8.5 8.5a2 2 0 0 0 2.82 0l6-6a2 2 0 0 0 0-2.82l-8.5-8.5a2 2 0 0 0-1.41-.6z" />
      <circle cx="8" cy="8.5" r="1.4" />
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

function IconTagsMultiple(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M11.5 3.5H6a2 2 0 0 0-2 2v5.5a2 2 0 0 0 .59 1.42l7 7a2 2 0 0 0 2.82 0l5.5-5.5a2 2 0 0 0 0-2.82l-7-7a2 2 0 0 0-1.41-.6z" />
      <circle cx="7.5" cy="7.5" r="1.25" />
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

function IconUploadCloud(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M7 18a4.5 4.5 0 0 1-1-8.9 5.5 5.5 0 0 1 10.7-2A4.5 4.5 0 0 1 17 18" />
      <path d="M12 21v-8" />
      <path d="M9 15.5L12 12.5l3 3" />
    </svg>
  );
}

function IconCheck(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

function IconX(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
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

function IconLink(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M9.5 14.5l5-5" />
      <path d="M11 8.5l1.2-1.2a3.2 3.2 0 0 1 4.5 4.5L15.5 13" />
      <path d="M13 15.5l-1.2 1.2a3.2 3.2 0 0 1-4.5-4.5L8.5 11" />
    </svg>
  );
}

function IconClipboard(props) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="6" y="4.5" width="12" height="16" rx="2" />
      <path d="M9 4.5V3.8A1.8 1.8 0 0 1 10.8 2h2.4A1.8 1.8 0 0 1 15 3.8v.7" />
      <path d="M9 11h6M9 14.5h6M9 17.5h3.5" />
    </svg>
  );
}

function IconLock(props) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2" />
    </svg>
  );
}

function IconInfo(props) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.8v.1" />
    </svg>
  );
}

function createDefaultProduct() {
  return {
    name: "",
    shortDescription: "",
    description: "",
    images: [],
    price: "",
    compareAtPrice: "",
    currency: "INR",
    sku: "",
    trackInventory: true,
    stock: 0,
    category: "",
    subcategory: "",
    tags: [],
    featured: false,
    enabled: true,
  };
}

/*
 * FIX for "`value` prop on `input` should not be null":
 * MongoDB returns null for empty fields (e.g. compareAtPrice: null).
 * Controlled inputs need "" instead, so every field is normalised here.
 */
function normalizeProduct(raw) {
  const base = createDefaultProduct();
  if (!raw) return base;

  return {
    slug: raw.slug || "",
    name: raw.name ?? base.name,
    shortDescription: raw.shortDescription ?? base.shortDescription,
    description: raw.description ?? base.description,
    images: Array.isArray(raw.images) ? raw.images : [],
    price: raw.price ?? base.price,
    compareAtPrice: raw.compareAtPrice ?? base.compareAtPrice,
    currency: raw.currency || base.currency,
    sku: raw.sku ?? base.sku,
    trackInventory: raw.trackInventory ?? base.trackInventory,
    stock: raw.stock ?? base.stock,
    category: raw.category ?? base.category,
    subcategory: raw.subcategory ?? base.subcategory,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    featured: Boolean(raw.featured),
    enabled: raw.enabled ?? base.enabled,
  };
}

function Section({ icon, title, hint, children }) {
  return (
    <section className="pe-card">
      <div className="pe-card-head">
        <span className="pe-card-icon">{icon}</span>
        <h2 className="pe-card-title">{title}</h2>
      </div>
      {hint && <p className="pe-section-hint">{hint}</p>}
      {children}
    </section>
  );
}

function Field({ label, required, error, children }) {
  return (
    <label className="pe-field">
      <span className="pe-label">
        {label}
        {required && <span className="pe-req"> *</span>}
      </span>
      {children}
      {error && <span className="prod-field-error">{error}</span>}
    </label>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className="pe-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="pe-toggle-slider" />
    </label>
  );
}

export default function ProductEditor({
  mode,
  productId,
  initialProduct,
  sellerUsername,
}) {
  const router = useRouter();
  const fileRef = useRef(null);
  const isEdit = mode === "edit";

  const [product, setProduct] = useState(() => normalizeProduct(initialProduct));
  const [tagInput, setTagInput] = useState("");
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [copied, setCopied] = useState(false);

  /* ---------------- live preview state ---------------- */

  // id of a product created via "Save & Update Preview" (new-product mode)
  const [savedId, setSavedId] = useState(null);
  const [previewMode, setPreviewMode] = useState("mobile");
  const [previewKey, setPreviewKey] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewScale, setPreviewScale] = useState(1);
  const previewFrameRef = useRef(null);

  const effectiveId = productId || savedId;

  // Measure the preview column and scale the real-size iframe to fit it
  useEffect(() => {
    const el = previewFrameRef.current;
    if (!el) return;

    const deviceWidth = DEVICE_SIZES[previewMode].width;

    function recalc() {
      const w = el.clientWidth;
      setPreviewScale(w > 0 ? Math.min(w / deviceWidth, 1) : 1);
    }

    recalc();

    const observer = new ResizeObserver(recalc);
    observer.observe(el);

    return () => observer.disconnect();
  }, [previewMode]);

  const subcategories = useMemo(
    () => getSubcategoriesForCategory(product.category) || [],
    [product.category]
  );

  const discountPercent = useMemo(() => {
    const price = Number(product.price);
    const compare = Number(product.compareAtPrice);

    if (!compare || compare <= price || !Number.isFinite(price)) return 0;
    return Math.round(((compare - price) / compare) * 100);
  }, [product.price, product.compareAtPrice]);

  function updateField(field, value) {
    setProduct((prev) => ({ ...prev, [field]: value }));
  }

  /* ---------------- tags ---------------- */

  function addTag() {
    const value = tagInput.trim().replace(/,+$/, "").trim();
    setTagInput("");

    if (!value) return;
    if (product.tags.length >= MAX_TAGS) return;
    if (product.tags.some((t) => t.toLowerCase() === value.toLowerCase())) return;

    updateField("tags", [...product.tags, value]);
  }

  function removeTag(tag) {
    updateField("tags", product.tags.filter((t) => t !== tag));
  }

  /* ---------------- images ---------------- */

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const slots = MAX_IMAGES - product.images.length;

    if (slots <= 0) {
      setError(`You can add up to ${MAX_IMAGES} images.`);
      return;
    }

    const queue = files.slice(0, slots);
    const urls = [];
    const problems = [];

    setError("");
    setUploadingCount(queue.length);

    for (const file of queue) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        problems.push(`${file.name}: only JPG, PNG or WEBP allowed.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        problems.push(`${file.name}: must be 5 MB or smaller.`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/products/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success || !data.url) {
          problems.push(`${file.name}: ${data.message || "upload failed."}`);
          continue;
        }

        urls.push(data.url);
      } catch {
        problems.push(`${file.name}: network error.`);
      }
    }

    if (urls.length > 0) {
      // functional update so nothing is lost if state changed meanwhile
      setProduct((prev) => ({
        ...prev,
        images: [...prev.images, ...urls].slice(0, MAX_IMAGES),
      }));
    }

    if (problems.length > 0) setError(problems.join(" "));
    setUploadingCount(0);
  }

  function removeImage(index) {
    setProduct((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }

  function makeMain(index) {
    if (index === 0) return;

    setProduct((prev) => {
      const next = [...prev.images];
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return { ...prev, images: next };
    });
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    uploadFiles(event.dataTransfer.files);
  }

  /* ---------------- save ---------------- */

  function validate(publish) {
    const errors = {};

    if (!product.name.trim()) errors.name = "Product name is required.";

    // The server always requires a category, even for drafts
    if (!product.category) errors.category = "Select a category.";

    if (publish) {
      if (!(Number(product.price) > 0)) {
        errors.price = "Enter a selling price greater than 0.";
      }
      if (subcategories.length > 0 && !product.subcategory) {
        errors.subcategory = "Select a subcategory.";
      }
    }

    if (product.trackInventory && Number(product.stock) < 0) {
      errors.stock = "Stock cannot be negative.";
    }

    return errors;
  }

  /*
   * handleSave(publish)                 -> save and go back to the list
   * handleSave(false, { stay: true })   -> save, stay on page, reload preview
   *
   * "Save & Update Preview" on a brand-new product creates it as a draft,
   * then every next click updates that same product (PATCH).
   */
  async function handleSave(publish, { stay = false } = {}) {
    setError("");

    const errors = validate(publish);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);

    // The Published toggle decides this (it is ON by default).
    const enabledValue = product.enabled;

    const payload = {
      name: product.name.trim(),
      shortDescription: product.shortDescription,
      description: product.description,
      images: product.images,
      price: Number(product.price) || 0,
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      currency: product.currency,
      sku: product.sku,
      trackInventory: product.trackInventory,
      stock: Number(product.stock) || 0,
      category: product.category,
      subcategory: product.subcategory,
      tags: product.tags,
      featured: product.featured,
      enabled: enabledValue,
    };

    try {
      const url = effectiveId ? `/api/products/${effectiveId}` : "/api/products";

      const response = await fetch(url, {
        method: effectiveId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Could not save product.");
        setFieldErrors(data.fields || {});
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (stay) {
        if (data.product?.id) setSavedId(data.product.id);

        setProduct((prev) => ({
          ...prev,
          slug: data.product?.slug || prev.slug,
          enabled: enabledValue,
        }));

        setPreviewLoading(true);
        setPreviewKey((k) => k + 1);
        return;
      }

      router.push("/dashboard/products");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Seller's public STORE page. Used for the live preview and the Copy Link button.
  const previewUrl = sellerUsername ? `/${sellerUsername}/store` : "";

  async function handleCopyLink() {
    if (!previewUrl) return;

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${previewUrl}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }

    setTimeout(() => setCopied(false), 2000);
  }

  /* ---------------- "customer will see" data ---------------- */

  const priceNow = formatMoney(Number(product.price) || 0, product.currency);
  const priceWas = formatMoney(Number(product.compareAtPrice) || 0, product.currency);

  return (
    <div className="prodedit-wrapper">
      <div className="prodedit-header">
        <div>
          {/* BACK BUTTON — goes back to the Products list */}
          <Link href="/dashboard/products" className="prodedit-back">
            <IconChevronLeft className="prodedit-back-icon" />
            Back
          </Link>
          <h1 className="prod-title">{isEdit ? "Edit Product" : "Add Product"}</h1>
          <p className="prod-subtitle">
            {isEdit
              ? "Update this product. Changes are not saved until you click save."
              : "Create a product for your LinkStorx store."}
          </p>
        </div>

        <div className="prodedit-actions">
          {previewUrl && (
            <button type="button" className="pe-btn pe-btn-outline" onClick={handleCopyLink}>
              {copied ? <IconCheck className="pe-btn-icon" /> : <IconLink className="pe-btn-icon" />}
              {copied ? "Copied" : "Copy Link"}
            </button>
          )}

          <button
            type="button"
            className="pe-btn pe-btn-outline"
            onClick={() => router.push("/dashboard/products")}
          >
            Cancel
          </button>

          <button
            type="button"
            className="pe-btn pe-btn-primary"
            disabled={saving || uploadingCount > 0}
            onClick={() => handleSave(product.enabled)}
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Product"}
          </button>
        </div>
      </div>

      {error && <div className="prod-error-banner">{error}</div>}

      <div className="prodedit-body">
        <div className="prodedit-form">
          <Section icon={<IconFileText />} title="Product Information">
            <Field label="Product Name" required error={fieldErrors.name}>
              <input
                type="text"
                className="pe-input"
                placeholder="e.g. Premium Hoodie"
                value={product.name}
                onChange={(e) => updateField("name", e.target.value)}
                maxLength={140}
              />
            </Field>

            <Field label="Short Description">
              <input
                type="text"
                className="pe-input"
                placeholder="A short description for your product..."
                value={product.shortDescription}
                onChange={(e) => updateField("shortDescription", e.target.value)}
                maxLength={200}
              />
            </Field>

            <Field label="Description">
              <textarea
                className="pe-input"
                rows={5}
                placeholder="Write a detailed description about your product..."
                value={product.description}
                onChange={(e) => updateField("description", e.target.value)}
                maxLength={5000}
              />
            </Field>
          </Section>

          <Section
            icon={<IconImage />}
            title="Product Images"
            hint={`Upload up to ${MAX_IMAGES} images. The first image will be the main image.`}
          >
            {product.images.length < MAX_IMAGES && (
              <div
                className={dragging ? "prodedit-drop prodedit-drop-active" : "prodedit-drop"}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
              >
                <span className="prodedit-drop-icon">
                  <IconUploadCloud />
                </span>
                <strong>{uploadingCount > 0 ? "Uploading..." : "Click to upload images"}</strong>
                <span>JPG, PNG or WEBP · Max {MAX_IMAGES} images · 5 MB each</span>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => {
                uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {(product.images.length > 0 || uploadingCount > 0) && (
              <div className="prodedit-images">
                {product.images.map((url, index) => (
                  <div
                    key={url + index}
                    className={index === 0 ? "prodedit-image prodedit-image-main" : "prodedit-image"}
                    title={index === 0 ? "Main image" : "Click to make this the main image"}
                    onClick={() => makeMain(index)}
                  >
                    <img src={url} alt="" />
                    {index === 0 && <span className="prodedit-image-badge">MAIN</span>}
                    <button
                      type="button"
                      className="prodedit-image-remove"
                      aria-label="Remove image"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                    >
                      <IconX className="prodedit-image-remove-icon" />
                    </button>
                  </div>
                ))}

                {Array.from({ length: uploadingCount }).map((_, i) => (
                  <div key={`up-${i}`} className="prodedit-image prodedit-image-loading">
                    Uploading…
                  </div>
                ))}

                {product.images.length + uploadingCount < MAX_IMAGES && (
                  <button
                    type="button"
                    className="prodedit-image prodedit-image-add"
                    onClick={() => fileRef.current?.click()}
                  >
                    <IconPlus />
                    Add
                  </button>
                )}
              </div>
            )}

            {fieldErrors.images && (
              <span className="prod-field-error">{fieldErrors.images}</span>
            )}
          </Section>

          <Section icon={<IconTag />} title="Pricing">
            <div className="prodedit-grid-3">
              <Field label="Selling Price" required error={fieldErrors.price}>
                <div className="pe-prefix">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0"
                    className="pe-input"
                    placeholder="1199"
                    value={product.price}
                    onChange={(e) => updateField("price", e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Original Price (Compare at)">
                <div className="pe-prefix">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0"
                    className="pe-input"
                    placeholder="1499"
                    value={product.compareAtPrice}
                    onChange={(e) => updateField("compareAtPrice", e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Currency">
                <select
                  className="pe-input"
                  value={product.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                >
                  <option value="INR">INR (₹)</option>
                </select>
              </Field>
            </div>

            {discountPercent > 0 && (
              <div className="prodedit-see">
                <span className="prodedit-see-icon">
                  <IconCheck />
                </span>
                <span>
                  Customer will see: <strong>{priceNow}</strong>{" "}
                  <s>{priceWas}</s>
                </span>
                <span className="prod-chip-off">{discountPercent}% OFF</span>
              </div>
            )}
          </Section>

          <Section icon={<IconBox />} title="Inventory">
            <div className="prodedit-grid-2">
              <Field label="SKU (Optional)">
                <input
                  type="text"
                  className="pe-input"
                  placeholder="e.g. HOODIE-001"
                  value={product.sku}
                  onChange={(e) => updateField("sku", e.target.value)}
                />
              </Field>

              {product.trackInventory && (
                <Field label="Stock Quantity" error={fieldErrors.stock}>
                  <input
                    type="number"
                    min="0"
                    className="pe-input"
                    value={product.stock}
                    onChange={(e) => updateField("stock", e.target.value)}
                  />
                </Field>
              )}
            </div>

            <div className="pe-toggle-row">
              <Toggle
                checked={product.trackInventory}
                onChange={(v) => updateField("trackInventory", v)}
              />
              <div>
                <strong>Track Inventory</strong>
                <small>Enable to track stock quantity</small>
              </div>
            </div>
          </Section>

          <Section icon={<IconTagsMultiple />} title="Category & Tags">
            <div className="prodedit-grid-2">
              <Field label="Category" required error={fieldErrors.category}>
                <select
                  className="pe-input"
                  value={product.category}
                  onChange={(e) => {
                    setProduct((prev) => ({
                      ...prev,
                      category: e.target.value,
                      subcategory: "",
                    }));
                  }}
                >
                  <option value="">Select a category</option>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>

              {subcategories.length > 0 && (
                <Field label="Subcategory" required error={fieldErrors.subcategory}>
                  <select
                    className="pe-input"
                    value={product.subcategory}
                    onChange={(e) => updateField("subcategory", e.target.value)}
                  >
                    <option value="">Select a subcategory</option>
                    {subcategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <div className="pe-field">
              <span className="pe-label">Tags</span>
              <div className="pe-tags">
                {product.tags.map((tag) => (
                  <span key={tag} className="pe-tag">
                    {tag}
                    <button type="button" aria-label={`Remove ${tag}`} onClick={() => removeTag(tag)}>
                      <IconX className="pe-tag-remove-icon" />
                    </button>
                  </span>
                ))}

                {product.tags.length < MAX_TAGS && (
                  <input
                    className="pe-tag-input"
                    value={tagInput}
                    placeholder={`Add a tag and press Enter (max ${MAX_TAGS})`}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    onBlur={addTag}
                  />
                )}
              </div>
            </div>
          </Section>

          <Section icon={<IconEye />} title="Visibility">
            <div className="prodedit-toggles">
              <div className="pe-toggle-row">
                <Toggle
                  checked={product.enabled}
                  onChange={(v) => updateField("enabled", v)}
                />
                <div>
                  <strong>Published</strong>
                  <small>Visible in your store and on your public profile</small>
                </div>
              </div>


              <div className="pe-toggle-row">
                <Toggle
                  checked={product.featured}
                  onChange={(v) => updateField("featured", v)}
                />
                <div>
                  <strong>Featured Product</strong>
                  <small>Show this product in the featured section</small>
                </div>
              </div>
            </div>
          </Section>

          <Section
            icon={<IconClipboard />}
            title="Order Settings"
            hint="How do customers place orders?"
          >
            <label className="os-option os-option-active">
              <span className="os-radio-dot" aria-hidden="true" />
              <div className="os-option-body">
                <strong>Order Form</strong>
                <small>
                  Customers can submit their details and place orders directly
                  through your LinkStorx store.
                </small>
              </div>
            </label>

            <div className="pe-label" style={{ marginTop: 18, marginBottom: 8 }}>
              Payment Methods
            </div>
            <div className="os-payment-list">
              <div className="os-payment-row">
                <span className="os-payment-icon">
                  <IconLock />
                </span>
                <div className="os-payment-body">
                  <strong>Online Payments</strong>
                  <small>Online payments are not available yet.</small>
                </div>
                <span className="os-badge-soon">Coming Soon</span>
              </div>

              <div className="os-payment-row">
                <span className="os-payment-icon">
                  <IconLock />
                </span>
                <div className="os-payment-body">
                  <strong>Cash on Delivery</strong>
                  <small>COD will be available in a future update.</small>
                </div>
                <span className="os-badge-soon">Coming Soon</span>
              </div>
            </div>

            <div className="os-note" style={{ marginTop: 14 }}>
              <span className="os-note-icon">
                <IconInfo />
              </span>
              <p>
                All customer orders will be received and managed directly from
                your LinkStorx dashboard.
              </p>
            </div>
          </Section>
        </div>

        {/* LIVE PREVIEW — a real iframe of the actual public product page.
            It is pixel-identical to what customers see and fully clickable,
            because it IS the live page. It shows the last SAVED version,
            so click "Save & Update Preview" after making changes. */}
        <aside className="prodedit-preview">
          <div className="pv-header">
            <h2 className="prodedit-preview-title">Live Preview</h2>

            <div className="pv-device-toggle">
              <button
                type="button"
                className={previewMode === "desktop" ? "pv-device-btn pv-device-active" : "pv-device-btn"}
                onClick={() => setPreviewMode("desktop")}
              >
                Desktop
              </button>
              <button
                type="button"
                className={previewMode === "mobile" ? "pv-device-btn pv-device-active" : "pv-device-btn"}
                onClick={() => setPreviewMode("mobile")}
              >
                Mobile
              </button>
            </div>
          </div>

          <button
            type="button"
            className="pe-btn pe-btn-outline pv-refresh"
            disabled={saving || uploadingCount > 0}
            onClick={() => handleSave(false, { stay: true })}
          >
            {saving ? "Saving..." : "Save & Update Preview"}
          </button>

          <div className="pv-frame-outer" ref={previewFrameRef}>
            <div
              className="pv-frame"
              style={{
                width: DEVICE_SIZES[previewMode].width * previewScale,
                height: DEVICE_SIZES[previewMode].height * previewScale,
              }}
            >
              {previewUrl ? (
                <>
                  {previewLoading && (
                    <div className="pv-frame-loading">Loading preview…</div>
                  )}

                  <div
                    className="pv-frame-scale"
                    style={{
                      width: DEVICE_SIZES[previewMode].width,
                      height: DEVICE_SIZES[previewMode].height,
                      transform: `scale(${previewScale})`,
                    }}
                  >
                    <iframe
                      key={previewKey}
                      src={previewUrl}
                      title="Live store preview"
                      className="pv-frame-iframe"
                      style={{
                        width: DEVICE_SIZES[previewMode].width,
                        height: DEVICE_SIZES[previewMode].height,
                      }}
                      onLoad={(e) => {
                        setPreviewLoading(false);

                        // Hide the iframe's native scrollbar (same-origin only).
                        // Scrolling still works, only the bar is hidden.
                        try {
                          const doc = e.target.contentDocument;

                          if (doc && !doc.getElementById("pv-hide-scrollbar")) {
                            const style = doc.createElement("style");
                            style.id = "pv-hide-scrollbar";
                            style.textContent = `
                              html { scrollbar-width: none; }
                              ::-webkit-scrollbar { width: 0; height: 0; }
                            `;
                            doc.head.appendChild(style);
                          }
                        } catch {
                          /* cross-origin — ignore */
                        }
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="pv-frame-empty">
                  Store preview is not available yet.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}