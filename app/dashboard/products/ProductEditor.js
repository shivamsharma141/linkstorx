"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  PRODUCT_CATEGORIES,
  getSubcategoriesForCategory,
} from "@/app/config/productCategories";

const MAX_IMAGES = 5;
const MAX_TAGS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/* Change this to your real Help & Support page route */
const SUPPORT_HREF = "/dashboard/support";

// Real viewport sizes the preview renders at,
// then it is visually scaled down to fit the column.
const DEVICE_SIZES = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 },
};

/* page notch ke NEECHE se start hota hai (CSS mein bhi 36px hai, dono same rakho) */
const MOBILE_NOTCH_H = 36;

/* =========================================================
   CAPITAL LETTER HELPERS
========================================================= */

/* Sirf pehla letter capital: "premium hoodie" -> "Premium hoodie" */
function capFirst(value) {
  return String(value ?? "").replace(/^(\s*)(\S)/, (m, space, ch) => space + ch.toUpperCase());
}

/* Har word ka pehla letter capital (naam / bank ke liye) */
function capWords(value) {
  return String(value ?? "").replace(/(^|\s)(\S)/g, (m, space, ch) => space + ch.toUpperCase());
}

/* =========================================================
   LOCAL STORAGE
   1) FORM DRAFT   -> form wapas restore karne ke liye
   2) PREVIEW DRAFT -> store page (iframe) isse padhta hai
========================================================= */

const DRAFT_PREFIX = "ls-product-draft";
const PREVIEW_PREFIX = "ls_draft"; // PublicStoreView "ls_draft:" se start hone wali key hi padhta hai

function readLocalDraft(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.product) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalDraft(key, product) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ product, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

function clearLocalDraft(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* =========================================================
   MONEY (INR / USD)
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

const STEPS = ["Personal", "Bank details", "Fees & policy"];

const STEP_FIELDS = [
  ["fullName", "email", "mobile"],
  [
    "bankAccountHolderName",
    "bankName",
    "accountNumber",
    "confirmAccountNumber",
    "ifsc",
  ],
  ["termsAccepted"],
];

const EMPTY_SELLER_FORM = {
  fullName: "",
  email: "",
  mobile: "",
  bankAccountHolderName: "",
  bankName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifsc: "",
  termsAccepted: false,
};

function validateSellerForm(v) {
  const e = {};
  if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(v.fullName.trim())) e.fullName = "Enter your full name (letters only).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (!/^[6-9]\d{9}$/.test(v.mobile)) e.mobile = "Enter a valid 10-digit mobile number.";
  if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(v.bankAccountHolderName.trim())) e.bankAccountHolderName = "Enter the account holder name.";
  if (v.bankName.trim().length < 2) e.bankName = "Enter your bank name.";
  if (!/^\d{9,18}$/.test(v.accountNumber)) e.accountNumber = "Account number must be 9 to 18 digits.";
  else if (v.confirmAccountNumber !== v.accountNumber) e.confirmAccountNumber = "Account numbers do not match.";
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.ifsc)) e.ifsc = "Enter a valid IFSC code (e.g. HDFC0001234).";
  if (!v.termsAccepted) e.termsAccepted = "You must accept the fees and settlement policy.";
  return e;
}

function pickErrors(all, fields) {
  const out = {};
  fields.forEach((f) => {
    if (all[f]) out[f] = all[f];
  });
  return out;
}

/* =========================================================
   ICONS
   Small, dependency-free line icons (24x24, currentColor)
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

function IconEyeOff(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M10.6 5.6a9.8 9.8 0 0 1 1.4-.1c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3.2 3.9" />
      <path d="M6.6 7.1A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.5 0 2.8-.4 4-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
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

function IconClock(props) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconTruck(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M2 6h11v10H2z" />
      <path d="M13 9h4.5L21 12.5V16h-8" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

function IconPercent(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M19 5L5 19" />
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="17" cy="17" r="2.2" />
    </svg>
  );
}

function IconExternal(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

function IconRefresh(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

function IconPhone(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function IconMonitor(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function IconGlobe(props) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.9 5.7 3.9 9s-1.4 6.4-3.9 9c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3z" />
    </svg>
  );
}

function IconCloud(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

function IconPencil(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 20h4l10.6-10.6a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

/* Seller fees shown on the last registration step */
const FEES = [
  {
    icon: IconPercent,
    value: "2% + 18% GST",
    label: "Online transaction fee",
    text: "2% on every online order, plus 18% GST charged on that fee.",
  },
  {
    icon: IconTag,
    value: "₹20",
    label: "Platform commission",
    text: "Flat amount per applicable order.",
  },
  {
    icon: IconClock,
    value: "7 days",
    label: "Settlement cycle",
    text: "Your money is settled within 7 days after the order is delivered.",
  },
  {
    icon: IconTruck,
    value: "You deliver",
    label: "Delivery",
    text: "You arrange delivery for your own orders. LinkStorx may add integrated delivery in the future.",
  },
];

function createDefaultProduct() {
  return {
    name: "",
    shortDescription: "",
    description: "",
    images: [],
    price: "",
    compareAtPrice: "",
    currency: "INR",
    deliveryType: "free",
    deliveryCharge: "",
    sku: "",
    trackInventory: true,
    stock: 0,
    category: "",
    subcategory: "",
    tags: [],
    featured: false,
    enabled: false, // products are drafts until the seller clicks Publish
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
    currency: raw.currency === "USD" ? "USD" : "INR",
    deliveryType: raw.deliveryType === "paid" ? "paid" : "free",
    deliveryCharge: raw.deliveryCharge > 0 ? raw.deliveryCharge : "",
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

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <label className="pe-toggle" style={disabled ? { opacity: 0.5 } : undefined}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="pe-toggle-slider" />
    </label>
  );
}

/* Digits-only input with an eye button to show / hide the value */
function SecretInput({ value, onChange, placeholder, onPaste }) {
  const [show, setShow] = useState(false);

  return (
    <div className="pe-secret">
      <input
        type={show ? "text" : "password"}
        inputMode="numeric"
        autoComplete="off"
        className="pe-input"
        value={value}
        maxLength={18}
        placeholder={placeholder}
        onPaste={onPaste}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      />
      <button
        type="button"
        className="pe-secret-btn"
        aria-label={show ? "Hide number" : "Show number"}
        title={show ? "Hide" : "Show"}
        onClick={() => setShow((v) => !v)}
      >
        {show ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}

/* =========================================================
   SELLER REGISTRATION (3 steps, shown before the first product)
   Note: bank details kabhi localStorage mein save nahi hoti (security).
========================================================= */

function SellerRegistration({ onRegister, rejectionReason }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(EMPTY_SELLER_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function set(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function goNext() {
    setFormError("");
    const found = pickErrors(validateSellerForm(values), STEP_FIELDS[step]);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setStep((s) => s + 1);
  }

  function goBack() {
    setFormError("");
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit(e) {
    e.preventDefault();
    setFormError("");

    if (step < STEPS.length - 1) {
      goNext();
      return;
    }

    const found = validateSellerForm(values);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      const badStep = STEP_FIELDS.findIndex((fields) => fields.some((k) => found[k]));
      if (badStep !== -1) setStep(badStep);
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await onRegister(values);

      if (!result?.success) {
        const serverErrors = result?.fields || {};
        setErrors(serverErrors);
        setFormError(result?.message || "Could not submit. Please try again.");

        const badStep = STEP_FIELDS.findIndex((fields) =>
          fields.some((k) => serverErrors[k])
        );
        if (badStep !== -1) setStep(badStep);
        return;
      }

      setDone(true);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="prodedit-wrapper">
      <div className="prodedit-header">
        <div>
          <Link href="/dashboard/products" className="prodedit-back">
            <IconChevronLeft className="prodedit-back-icon" />
            Back
          </Link>
          <h1 className="prod-title">Seller Registration</h1>
          <p className="prod-subtitle">
            Register once to start building your LinkStorx store.
          </p>
        </div>
      </div>

      <ol className="sr-steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`sr-step${i === step ? " sr-step-active" : ""}${i < step ? " sr-step-done" : ""}`}
          >
            <span className="sr-step-dot">{i < step ? <IconCheck /> : i + 1}</span>
            <span className="sr-step-label">{label}</span>
          </li>
        ))}
      </ol>

      {rejectionReason && (
        <div className="prod-error-banner">
          Your previous registration was rejected: {rejectionReason}. Please
          correct your details and submit again.
        </div>
      )}
      {formError && <div className="prod-error-banner">{formError}</div>}

      <form className="prodedit-form sr-form" onSubmit={submit} noValidate>
        {step === 0 && (
          <Section
            icon={<IconFileText />}
            title="Personal & Contact Details"
            hint="Our team will use these details to contact you for verification."
          >
            <Field label="Full Name" required error={errors.fullName}>
              <input
                className="pe-input"
                value={values.fullName}
                maxLength={80}
                onChange={(e) => set("fullName", capWords(e.target.value))}
              />
            </Field>
            <div className="prodedit-grid-2">
              <Field label="Email Address" required error={errors.email}>
                <input
                  type="email"
                  className="pe-input"
                  value={values.email}
                  maxLength={120}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
              <Field label="Mobile Number" required error={errors.mobile}>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="pe-input"
                  value={values.mobile}
                  maxLength={10}
                  placeholder="10-digit number"
                  onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
                />
              </Field>
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section
            icon={<IconLock />}
            title="Bank Details"
            hint="Your bank details are stored encrypted and are never shown publicly. Your settlements will be sent to this account."
          >
            <div className="prodedit-grid-2">
              <Field label="Account Holder Name" required error={errors.bankAccountHolderName}>
                <input
                  className="pe-input"
                  value={values.bankAccountHolderName}
                  maxLength={80}
                  onChange={(e) => set("bankAccountHolderName", capWords(e.target.value))}
                />
              </Field>
              <Field label="Bank Name" required error={errors.bankName}>
                <input
                  className="pe-input"
                  value={values.bankName}
                  maxLength={80}
                  onChange={(e) => set("bankName", capWords(e.target.value))}
                />
              </Field>
            </div>

            <div className="prodedit-grid-2">
              <Field label="Account Number" required error={errors.accountNumber}>
                <SecretInput
                  value={values.accountNumber}
                  onChange={(v) => set("accountNumber", v)}
                />
              </Field>
              <Field label="Confirm Account Number" required error={errors.confirmAccountNumber}>
                <SecretInput
                  value={values.confirmAccountNumber}
                  onChange={(v) => set("confirmAccountNumber", v)}
                  onPaste={(e) => e.preventDefault()}
                />
              </Field>
            </div>

            <Field label="IFSC Code" required error={errors.ifsc}>
              <input
                className="pe-input"
                value={values.ifsc}
                maxLength={11}
                placeholder="HDFC0001234"
                onChange={(e) =>
                  set("ifsc", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
              />
            </Field>
          </Section>
        )}

        {step === 2 && (
          <Section
            icon={<IconClipboard />}
            title="Fees & Settlement"
            hint="Here is how selling on LinkStorx works."
          >
            <div className="sr-fees">
              {FEES.map(({ icon: Icon, value, label, text }) => (
                <div key={label} className="sr-fee">
                  <span className="sr-fee-icon">
                    <Icon />
                  </span>
                  <div>
                    <span className="sr-fee-label">{label}</span>
                    <strong className="sr-fee-value">{value}</strong>
                    <p className="sr-fee-text">{text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="sr-terms">
              <Toggle
                checked={values.termsAccepted}
                onChange={(v) => set("termsAccepted", v)}
              />
              <div>
                <strong>I accept the platform fees and settlement policy</strong>
                <small>Required to complete registration</small>
              </div>
            </div>
            {errors.termsAccepted && (
              <span className="prod-field-error">{errors.termsAccepted}</span>
            )}
          </Section>
        )}

        <div className="sr-nav">
          {step > 0 ? (
            <button type="button" className="pe-btn pe-btn-outline" onClick={goBack}>
              Back
            </button>
          ) : (
            <span />
          )}

          {step < STEPS.length - 1 ? (
            <button key="next" type="submit" className="pe-btn pe-btn-primary">
              Next
            </button>
          ) : (
            <button
              key="register"
              type="submit"
              className="pe-btn pe-btn-primary"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Register as Seller"}
            </button>
          )}
        </div>
      </form>

      {done && (
        <div className="prod-modal-overlay">
          <div className="prod-modal" role="dialog" aria-modal="true">
            <span className="prod-modal-icon">
              <IconCheck />
            </span>
            <h3>You&apos;re registered with LinkStorx!</h3>
            <p>
              Your verification is pending. You can build your product page
              right now. Our team will contact you and approve your account
              within 24 hours.
            </p>
            <div className="prod-modal-actions">
              <button
                type="button"
                className="pe-btn pe-btn-primary"
                onClick={() => router.refresh()}
              >
                Start adding products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PRODUCT EDITOR
========================================================= */

export default function ProductEditor({
  mode,
  productId,
  initialProduct,
  sellerUsername,
  sellerInfo = { status: "none", rejectionReason: "" },
  registerSeller,
}) {
  const router = useRouter();
  const fileRef = useRef(null);
  const isEdit = mode === "edit";
  const canPublish = sellerInfo.status === "verified";

  const [product, setProduct] = useState(() => normalizeProduct(initialProduct));
  const [tagInput, setTagInput] = useState("");
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [copied, setCopied] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showPreviewWait, setShowPreviewWait] = useState(false);

  /* ---------------- local storage keys + state ---------------- */

  const idPart = `${sellerUsername || "seller"}:${productId || "new"}`;
  const draftKey = `${DRAFT_PREFIX}:${idPart}`; // form restore
  const previewStoreKey = `${PREVIEW_PREFIX}:${idPart}`; // store page (iframe) isse padhta hai

  const initialJson = useRef(null);
  if (initialJson.current === null) {
    initialJson.current = JSON.stringify(normalizeProduct(initialProduct));
  }

  const [hydrated, setHydrated] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null); // edit mode: user se puchho
  const [restoredNotice, setRestoredNotice] = useState(false); // new mode: auto restored
  const [localSavedAt, setLocalSavedAt] = useState(null);

  /* ---------------- live preview state ---------------- */

  const [previewMode, setPreviewMode] = useState("mobile"); // mobile | desktop
  const [previewView, setPreviewView] = useState("draft"); // draft | live
  const [baseUrl, setBaseUrl] = useState("");
  const [frameKey, setFrameKey] = useState(0);
  const [frameLoaded, setFrameLoaded] = useState(false);

  /* preview sizing (profile editor jaisa) */
  const stageRef = useRef(null);
  const [stageWidth, setStageWidth] = useState(320);
  const [vh, setVh] = useState(800);
  const [now, setNow] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const calc = () => setStageWidth(el.clientWidth || 320);
    calc();
    const observer = new ResizeObserver(calc);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* screen height track karo taaki phone preview bahar na nikle */
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* phone status bar ka live time */
  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  const device = DEVICE_SIZES[previewMode];
  const maxPhoneW = stageWidth >= 640 ? 340 : 300;
  const byHeight = Math.round((vh * 0.8 * device.width) / device.height);

  const screenW = Math.max(
    previewMode === "mobile"
      ? Math.min(maxPhoneW, stageWidth - 24, Math.max(byHeight, 200))
      : stageWidth - 2,
    120
  );
  const scale = screenW / device.width;
  const screenH = Math.round(device.height * scale);
  const notchH = previewMode === "mobile" ? MOBILE_NOTCH_H : 0;
  const frameH = Math.max(1, Math.round((screenH - notchH) / scale));

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

  /* The draft product, shaped exactly like a real public product.
     Isse localStorage mein likhte hain, store page (iframe) padhta hai. */
  const previewProduct = useMemo(() => {
    const price = Number(product.price) || 0;
    const compare = Number(product.compareAtPrice) || 0;
    const hasDiscount = compare > price && price > 0;

    return {
      id: productId || "preview-draft",
      slug: product.slug || "preview-draft",
      name: product.name.trim() || "Your product name",
      shortDescription: product.shortDescription,
      description: product.description.trim() || product.shortDescription,
      images: product.images,
      price,
      compareAtPrice: hasDiscount ? compare : null,
      discountPercent: hasDiscount ? Math.round(((compare - price) / compare) * 100) : 0,
      currency: product.currency,
      deliveryType: product.deliveryType,
      deliveryCharge:
        product.deliveryType === "paid" ? Number(product.deliveryCharge) || 0 : 0,
      category: product.category,
      subcategory: product.subcategory,
      tags: product.tags,
      featured: product.featured,
      inStock: !(product.trackInventory && Number(product.stock) <= 0),
      isDraft: !product.enabled,
    };
  }, [product, productId]);

  function updateField(field, value) {
    setProduct((prev) => ({ ...prev, [field]: value }));
  }

  // Seller's public STORE page. Used for "Copy Link", "Open store" and the preview iframe.
  const previewUrl = sellerUsername ? `/${sellerUsername}/store` : "";
  const shortUrl = `${baseUrl}${previewUrl}`.replace(/^https?:\/\//, "");

  /* ---------------- local storage: restore on open ---------------- */

  useEffect(() => {
    const saved = readLocalDraft(draftKey);

    if (saved) {
      const serverBase = normalizeProduct(initialProduct);
      // enabled + slug hamesha server se, local se nahi
      const restored = {
        ...normalizeProduct(saved.product),
        enabled: serverBase.enabled,
        slug: serverBase.slug,
      };

      if (JSON.stringify(restored) !== initialJson.current) {
        if (!isEdit) {
          setProduct(restored);
          setRestoredNotice(true);
          setLocalSavedAt(saved.savedAt || Date.now());
        } else {
          setPendingRestore({ product: restored, savedAt: saved.savedAt });
        }
      }
    }

    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  /* ---------------- local storage: auto save while typing ---------------- */

  useEffect(() => {
    if (!hydrated || pendingRestore) return;

    const json = JSON.stringify(product);

    if (json === initialJson.current) {
      clearLocalDraft(draftKey);
      setLocalSavedAt(null);
      return;
    }

    const timer = setTimeout(() => {
      if (writeLocalDraft(draftKey, product)) setLocalSavedAt(Date.now());
    }, 400);

    return () => clearTimeout(timer);
  }, [product, hydrated, pendingRestore, draftKey]);

  /* ---------------- LIVE PREVIEW FEED ----------------
     Har change pe preview product localStorage mein likho.
     Store page (iframe) isse "storage" event + polling se padhta hai. */

  useEffect(() => {
    if (!hydrated || pendingRestore) return;

    try {
      window.localStorage.setItem(
        previewStoreKey,
        JSON.stringify({ preview: previewProduct, savedAt: Date.now() })
      );
    } catch {
      /* storage full / blocked: ignore */
    }
  }, [previewProduct, previewStoreKey, hydrated, pendingRestore]);

  /* Editor band hone par preview key saaf karo */
  useEffect(() => {
    return () => {
      try {
        window.localStorage.removeItem(previewStoreKey);
      } catch {
        /* ignore */
      }
    };
  }, [previewStoreKey]);

  function restoreLocalDraft() {
    if (!pendingRestore) return;
    setProduct(pendingRestore.product);
    setLocalSavedAt(pendingRestore.savedAt || Date.now());
    setPendingRestore(null);
    setRestoredNotice(true);
  }

  function discardLocalDraft() {
    clearLocalDraft(draftKey);
    setLocalSavedAt(null);

    if (pendingRestore) {
      setPendingRestore(null);
    } else {
      setProduct(normalizeProduct(initialProduct));
    }
    setRestoredNotice(false);
  }

  /* ---------------- preview controls ---------------- */

  function refreshPreview() {
    setFrameLoaded(false);
    setFrameKey((k) => k + 1);
  }

  function switchPreviewView(view) {
    if (view === previewView) return;

    // Live store unverified seller ke liye band hai
    if (view === "live" && !canPublish) {
      setShowPreviewWait(true);
      return;
    }

    setFrameLoaded(false);
    setPreviewView(view);
    setFrameKey((k) => k + 1);
  }

  function switchDevice(next) {
    if (next === previewMode) return;
    setFrameLoaded(false);
    setPreviewMode(next);
  }

  /* ---------------- tags ---------------- */

  function addTag() {
    const value = capFirst(tagInput.trim().replace(/,+$/, "").trim());
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

    // The server needs the delivery charge whenever delivery is "paid"
    if (product.deliveryType === "paid" && !(Number(product.deliveryCharge) > 0)) {
      errors.deliveryCharge = "Enter the delivery charge you want to take.";
    }

    if (product.trackInventory && Number(product.stock) < 0) {
      errors.stock = "Stock cannot be negative.";
    }

    return errors;
  }

  /*
   * handleSave("draft")   -> save as draft (never published)
   * handleSave("publish") -> publish (only verified sellers; others get the popup)
   * handleSave("keep")    -> save changes, keep current status
   *
   * A product is NEVER published unless the seller clicks Publish.
   * Unverified seller: sab kuch local storage + draft mein rehta hai.
   */
  async function handleSave(saveMode) {
    setError("");

    if (saveMode === "publish" && !canPublish) {
      setShowPending(true);
      return;
    }

    const enabledValue =
      saveMode === "publish" ? true : saveMode === "draft" ? false : product.enabled;

    const errors = validate(enabledValue);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);

    const payload = {
      name: product.name.trim(),
      shortDescription: product.shortDescription,
      description: product.description,
      images: product.images,
      price: Number(product.price) || 0,
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      currency: product.currency,
      deliveryType: product.deliveryType,
      deliveryCharge:
        product.deliveryType === "paid" ? Number(product.deliveryCharge) || 0 : 0,
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
      const url = productId ? `/api/products/${productId}` : "/api/products";

      const response = await fetch(url, {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Server refused to publish (seller not verified)
        if (saveMode === "publish" && response.status === 403) {
          setShowPending(true);
          return;
        }

        setError(data.message || "Could not save product.");
        setFieldErrors(data.fields || {});
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Server pe save ho gaya, ab local copies ki zaroorat nahi
      clearLocalDraft(draftKey);
      try {
        window.localStorage.removeItem(previewStoreKey);
      } catch {
        /* ignore */
      }

      router.push("/dashboard/products");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyLink() {
    if (!previewUrl) return;

    // Store is not open to customers until the seller is verified
    if (!canPublish) {
      setShowPreviewWait(true);
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${previewUrl}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }

    setTimeout(() => setCopied(false), 2000);
  }

  /* ---------------- "customer will see" data ---------------- */

  const currencySymbol = CURRENCY_SYMBOL[product.currency] || "₹";
  const priceNow = money(Number(product.price) || 0, product.currency);
  const priceWas = money(Number(product.compareAtPrice) || 0, product.currency);
  const deliveryAmount = Number(product.deliveryCharge) || 0;

  /* ---------------- seller registration gate ----------------
     New products need a seller registration first. All hooks are
     above this line, so this early return is safe. */
  if (
    !isEdit &&
    registerSeller &&
    (sellerInfo.status === "none" || sellerInfo.status === "rejected")
  ) {
    return (
      <SellerRegistration
        onRegister={registerSeller}
        rejectionReason={sellerInfo.rejectionReason}
      />
    );
  }

  const isLive = isEdit && product.enabled;

  /* Draft  -> store page, localStorage se tumhara draft product merge karta hai
     Live   -> bilkul wahi store jo customers dekhte hain */
  const frameSrc =
    previewView === "draft"
      ? `${previewUrl}?lsPreview=1&lsDraft=${encodeURIComponent(previewStoreKey)}`
      : `${previewUrl}?v=${frameKey}`;

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
              ? "Update this product. Changes go live only after you click save."
              : "Create a product for your LinkStorx store."}
          </p>

          {localSavedAt && (
            <span className="pe-local-pill">
              <IconCloud style={{ width: 13, height: 13 }} />
              Draft saved on this device
            </span>
          )}
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

          {isLive ? (
            <>
              <button
                type="button"
                className="pe-btn pe-btn-outline"
                disabled={saving || uploadingCount > 0}
                onClick={() => handleSave("draft")}
              >
                Move to Draft
              </button>
              <button
                type="button"
                className="pe-btn pe-btn-primary"
                disabled={saving || uploadingCount > 0}
                onClick={() => handleSave("keep")}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="pe-btn pe-btn-outline"
                disabled={saving || uploadingCount > 0}
                onClick={() => handleSave("draft")}
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                className="pe-btn pe-btn-primary"
                disabled={saving || uploadingCount > 0}
                onClick={() => handleSave("publish")}
              >
                Publish
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit mode: is device pe purana unsaved draft mila */}
      {pendingRestore && (
        <div className="pe-banner pe-banner-local">
          <span className="pe-banner-icon">
            <IconPencil />
          </span>
          <div className="pe-banner-body">
            <strong>Unsaved changes found on this device</strong>
            <p>You edited this product earlier but did not save it. Do you want to continue from there?</p>
            <div className="pe-banner-actions">
              <button type="button" className="pe-btn pe-btn-primary pe-btn-sm" onClick={restoreLocalDraft}>
                Restore changes
              </button>
              <button type="button" className="pe-btn pe-btn-outline pe-btn-sm" onClick={discardLocalDraft}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New mode: draft apne aap wapas aa gaya */}
      {restoredNotice && !pendingRestore && (
        <div className="pe-banner pe-banner-local">
          <span className="pe-banner-icon">
            <IconCloud />
          </span>
          <div className="pe-banner-body">
            <strong>We restored your draft</strong>
            <p>This was saved on this device. Start fresh if you do not need it.</p>
            <div className="pe-banner-actions">
              <button type="button" className="pe-btn pe-btn-outline pe-btn-sm" onClick={discardLocalDraft}>
                Start fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {sellerInfo.status === "pending" && (
        <div className="pe-banner pe-banner-pending">
          <span className="pe-banner-icon">
            <IconClock />
          </span>
          <div>
            <strong>Your seller verification is pending</strong>
            <p>
              But you can build your product page right now. It is saved on
              this device and you can see it in the Draft preview. The
              LinkStorx team will contact you and approve your account within
              24 hours. Until then your products stay saved as drafts.
            </p>
          </div>
        </div>
      )}

      {sellerInfo.status === "rejected" && (
        <div className="pe-banner pe-banner-rejected">
          <span className="pe-banner-icon">
            <IconInfo />
          </span>
          <div>
            <strong>Your seller registration was rejected</strong>
            <p>
              {sellerInfo.rejectionReason
                ? `${sellerInfo.rejectionReason}. `
                : ""}
              Please contact Help &amp; Support to fix this.
            </p>
          </div>
        </div>
      )}

      {error && <div className="prod-error-banner">{error}</div>}

      <div className={`prodedit-body ${previewMode === "desktop" ? "prodedit-body-desktop" : ""}`}>
        <div className="prodedit-form">
          <Section icon={<IconFileText />} title="Product Information">
            <Field label="Product Name" required error={fieldErrors.name}>
              <input
                type="text"
                className="pe-input"
                placeholder="e.g. Premium Hoodie"
                value={product.name}
                onChange={(e) => updateField("name", capFirst(e.target.value))}
                maxLength={140}
              />
            </Field>

            <Field label="Short Description">
              <input
                type="text"
                className="pe-input"
                placeholder="A short description for your product..."
                value={product.shortDescription}
                onChange={(e) => updateField("shortDescription", capFirst(e.target.value))}
                maxLength={200}
              />
            </Field>

            <Field label="Description">
              <textarea
                className="pe-input"
                rows={5}
                placeholder="Write a detailed description about your product..."
                value={product.description}
                onChange={(e) => updateField("description", capFirst(e.target.value))}
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
                  <span>{currencySymbol}</span>
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

              <Field label="Original Price (Compare at)" error={fieldErrors.compareAtPrice}>
                <div className="pe-prefix">
                  <span>{currencySymbol}</span>
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

              <Field label="Currency" error={fieldErrors.currency}>
                <select
                  className="pe-input"
                  value={product.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
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
                    onChange={(e) => setTagInput(capFirst(e.target.value))}
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
            <div className="vis-row">
              <span
                className={`vis-chip ${product.enabled ? "vis-chip-live" : "vis-chip-draft"}`}
              >
                {product.enabled ? "Published" : "Draft"}
              </span>
              <small>
                {product.enabled
                  ? "Visible in your store and on your public profile."
                  : canPublish
                  ? "Not visible to customers until you click Publish."
                  : "Not visible to customers. You can publish after seller verification."}
              </small>
            </div>

            <div className="pe-toggle-row" style={{ marginTop: 14 }}>
              <Toggle
                checked={product.featured}
                onChange={(v) => updateField("featured", v)}
              />
              <div>
                <strong>Featured Product</strong>
                <small>Show this product in the featured section</small>
              </div>
            </div>
          </Section>

          <Section icon={<IconTruck />} title="Delivery">
            <div className="os-note">
              <span className="os-note-icon">
                <IconInfo />
              </span>
              <p>
                <strong>You arrange the delivery yourself.</strong> Every order
                you receive has to be delivered by you, so decide how you want
                to handle delivery charges.
              </p>
            </div>

            <div className="dv-tips">
              <div className="dv-tip">
                <strong>Want to charge for delivery?</strong>
                <p>
                  Decide the delivery charge you want to take from the customer
                  and enter it below. Customers will see it clearly on your
                  product.
                </p>
              </div>

              <div className="dv-tip">
                <strong>Want to offer free delivery?</strong>
                <p>
                  Don&apos;t mention any delivery charges. Add your delivery
                  cost into the product price instead. Customers will see free
                  delivery and pay the full amount.
                </p>
              </div>
            </div>

            <div className="prodedit-grid-2" style={{ marginTop: 14 }}>
              <Field label="Delivery charge for customer">
                <select
                  className="pe-input"
                  value={product.deliveryType}
                  onChange={(e) => updateField("deliveryType", e.target.value)}
                >
                  <option value="free">Free delivery (cost is in my product price)</option>
                  <option value="paid">I will charge for delivery</option>
                </select>
              </Field>

              {product.deliveryType === "paid" && (
                <Field label="Delivery charge amount" required error={fieldErrors.deliveryCharge}>
                  <div className="pe-prefix">
                    <span>{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      className="pe-input"
                      placeholder="50"
                      value={product.deliveryCharge}
                      onChange={(e) => updateField("deliveryCharge", e.target.value)}
                    />
                  </div>
                </Field>
              )}
            </div>

            <div className="prodedit-see">
              <span className="prodedit-see-icon">
                <IconCheck />
              </span>
              <span>
                Customer will see:{" "}
                <strong>
                  {product.deliveryType === "paid" && deliveryAmount > 0
                    ? `+ ${money(deliveryAmount, product.currency)} delivery`
                    : "Free delivery"}
                </strong>
              </span>
            </div>
          </Section>
        </div>

        {/* LIVE PREVIEW — tumhara REAL store page phone / browser frame mein.
            Draft: form ka data localStorage se aata hai (drafts + unverified sellers).
            Live: jo customers abhi dekh rahe hain. */}
        <aside className="prodedit-preview">
          <div className="pv-head">
            <div>
              <h2 className="prodedit-preview-title">Live Preview</h2>
              <p className="pv-sub">
                {previewView === "draft"
                  ? "Your real store page with your changes. Updates as you type."
                  : "Your store exactly as customers see it right now."}
              </p>
            </div>

            <div className="pv-tools">
              <button
                type="button"
                className="pe-icon-btn"
                aria-label="Refresh preview"
                title="Refresh preview"
                onClick={refreshPreview}
              >
                <IconRefresh style={{ width: 14, height: 14 }} />
              </button>

              {previewUrl &&
                (canPublish ? (
                  <a
                    className="pe-icon-btn"
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open store in new tab"
                    title="Open store in new tab"
                  >
                    <IconExternal style={{ width: 14, height: 14 }} />
                  </a>
                ) : (
                  <button
                    type="button"
                    className="pe-icon-btn"
                    aria-label="Open store in new tab"
                    title="Open store in new tab"
                    onClick={() => setShowPreviewWait(true)}
                  >
                    <IconLock style={{ width: 14, height: 14 }} />
                  </button>
                ))}
            </div>
          </div>

          <div className="pv-controls">
            {/* Draft / Live */}
            <div className="pv-seg" role="tablist" aria-label="Preview version">
              <span
                className={
                  previewView === "draft" ? "pv-seg-pill" : "pv-seg-pill pv-seg-pill-desktop"
                }
              />
              <button
                type="button"
                className={previewView === "draft" ? "pv-seg-active" : ""}
                onClick={() => switchPreviewView("draft")}
              >
                <IconPencil style={{ width: 14, height: 14 }} /> Draft
              </button>
              <button
                type="button"
                className={previewView === "live" ? "pv-seg-active" : ""}
                onClick={() => switchPreviewView("live")}
              >
                {canPublish ? (
                  <IconGlobe style={{ width: 14, height: 14 }} />
                ) : (
                  <IconLock style={{ width: 14, height: 14 }} />
                )}{" "}
                Live
              </button>
            </div>

            {/* Mobile / Desktop */}
            <div className="pv-seg" role="tablist" aria-label="Device">
              <span
                className={
                  previewMode === "mobile" ? "pv-seg-pill" : "pv-seg-pill pv-seg-pill-desktop"
                }
              />
              <button
                type="button"
                className={previewMode === "mobile" ? "pv-seg-active" : ""}
                onClick={() => switchDevice("mobile")}
              >
                <IconPhone style={{ width: 14, height: 14 }} /> Mobile
              </button>
              <button
                type="button"
                className={previewMode === "desktop" ? "pv-seg-active" : ""}
                onClick={() => switchDevice("desktop")}
              >
                <IconMonitor style={{ width: 14, height: 14 }} /> Desktop
              </button>
            </div>
          </div>

          <span className={previewView === "draft" ? "pv-badge pv-badge-draft" : "pv-badge pv-badge-live"}>
            {previewView === "draft" ? (
              <>
                <IconEyeOff style={{ width: 11, height: 11 }} />
                {product.enabled
                  ? "Preview with your changes, not saved yet"
                  : "Draft preview, only you can see this"}
              </>
            ) : (
              <>
                <IconGlobe style={{ width: 11, height: 11 }} />
                Live store, visible to everyone
              </>
            )}
          </span>

          <div className="pv-stage" ref={stageRef}>
            <div
              className={`pv-device pv-device-${previewMode}`}
              style={{ width: previewMode === "mobile" ? screenW + 24 : screenW + 2 }}
            >
              {previewMode === "desktop" && (
                <div className="pv-browser-bar">
                  <span className="pv-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="pv-url">
                    <IconGlobe style={{ width: 11, height: 11 }} />
                    {shortUrl || "your-store"}
                  </span>
                </div>
              )}

              {previewMode === "mobile" && <span className="pv-notch" />}

              <div className="pv-screen" style={{ width: screenW, height: screenH }}>
                {previewMode === "mobile" && (
                  <div className="pv-statusbar" aria-hidden="true">
                    <span className="pv-status-time">{now}</span>
                    <span className="pv-status-icons">
                      <svg viewBox="0 0 18 12" width="16" height="11" fill="currentColor">
                        <rect x="0" y="8" width="3" height="4" rx="1" />
                        <rect x="5" y="5" width="3" height="7" rx="1" />
                        <rect x="10" y="2" width="3" height="10" rx="1" />
                        <rect x="15" y="0" width="3" height="12" rx="1" />
                      </svg>
                      <svg viewBox="0 0 26 12" width="24" height="11" fill="none">
                        <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity=".4" />
                        <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
                        <rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" />
                      </svg>
                    </span>
                  </div>
                )}

                {previewUrl ? (
                  <>
                    <div
                      className="pv-scale"
                      style={{
                        width: device.width,
                        height: frameH,
                        transform: `scale(${scale})`,
                      }}
                    >
                      <iframe
                        key={`${frameKey}-${previewView}-${previewMode}`}
                        title="Store live preview"
                        className="pv-iframe"
                        src={frameSrc}
                        style={{ width: device.width, height: frameH }}
                        onLoad={(e) => {
                          setFrameLoaded(true);
                          try {
                            const doc = e.target.contentDocument;
                            if (doc && !doc.getElementById("pv-hide-scrollbar")) {
                              const style = doc.createElement("style");
                              style.id = "pv-hide-scrollbar";
                              style.textContent =
                                "html{scrollbar-width:none}::-webkit-scrollbar{width:0;height:0}";
                              doc.head.appendChild(style);
                            }
                          } catch {
                            /* cross-origin: ignore */
                          }
                        }}
                      />
                    </div>

                    {!frameLoaded && (
                      <div className="pv-msg">
                        <span className="pv-spin" />
                        <span>
                          {previewView === "draft"
                            ? "Loading your store preview…"
                            : "Loading your live store…"}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="pv-msg">
                    <span>Set up your profile username to see the live preview.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {showPending && (
        <div className="prod-modal-overlay" onClick={() => setShowPending(false)}>
          <div
            className="prod-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="prod-modal-icon">
              <IconClock />
            </span>
            <h3>Verification is still pending</h3>
            <p>
              You can&apos;t publish products yet. The LinkStorx team will contact
              you within 24 hours to complete your verification. Until then, your
              products stay safely saved as drafts.
            </p>
            <p>Very urgent? Please contact Help &amp; Support.</p>
            <div className="prod-modal-actions">
              <Link href={SUPPORT_HREF} className="pe-btn pe-btn-outline">
                Help &amp; Support
              </Link>
              <button
                type="button"
                className="pe-btn pe-btn-primary"
                onClick={() => setShowPending(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreviewWait && (
        <div className="prod-modal-overlay" onClick={() => setShowPreviewWait(false)}>
          <div
            className="prod-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="prod-modal-icon">
              <IconClock />
            </span>
            <h3>Please wait for verification</h3>
            <p>
              Once your seller account is verified, your store goes live and you
              can see the Live view. The LinkStorx team will contact you and open
              your store within 24 hours. The Draft preview on this page works
              right now.
            </p>
            <div className="prod-modal-actions">
              <Link href={SUPPORT_HREF} className="pe-btn pe-btn-outline">
                Help &amp; Support
              </Link>
              <button
                type="button"
                className="pe-btn pe-btn-primary"
                onClick={() => setShowPreviewWait(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}