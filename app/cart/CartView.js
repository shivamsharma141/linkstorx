"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { formatMoney } from "@/app/config/storeFeatures";
import QuantitySelector from "@/app/component/cart/QuantitySelector";
import {
  getCart,
  setQuantity,
  removeFromCart,
  subscribeToCart,
} from "@/app/lib/cart/cartStorage";

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  note: "",
};

const FIELD_ORDER = ["name", "phone", "email", "address", "city", "state", "pincode"];

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = "Please enter your full name";
  if (!/^[6-9]\d{9}$/.test(f.phone.trim())) e.phone = "Enter a valid 10-digit mobile number";
  if (f.email && !/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Enter a valid email address";
  if (f.address.trim().length < 8) e.address = "Please enter your full address (house no., street, area)";
  if (!f.city.trim()) e.city = "Please enter your city";
  if (!f.state.trim()) e.state = "Please enter your state";
  if (!/^\d{6}$/.test(f.pincode.trim())) e.pincode = "Enter a valid 6-digit pincode";
  return e;
}

/* ---------- Razorpay checkout window ---------- */
function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("Browser only"));
    if (window.Razorpay) return resolve(true);

    const fail = () =>
      reject(new Error("Could not load the payment window. Check your internet and try again."));

    const existing = document.getElementById("rzp-checkout-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", fail);
      return;
    }

    const s = document.createElement("script");
    s.id = "rzp-checkout-js";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = fail;
    document.body.appendChild(s);
  });
}

function openCheckout({ checkout, orderNumber, form, accent, storeName }) {
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: checkout.keyId,
      amount: checkout.amountPaise,
      currency: checkout.currency,
      order_id: checkout.razorpayOrderId,
      name: storeName || "LinkStorx",
      description: `Order #${orderNumber}`,
      prefill: { name: form.name, email: form.email, contact: form.phone },
      theme: { color: accent },
      handler: (response) => resolve(response),
      modal: {
        confirm_close: true,
        ondismiss: () => reject(new Error("Payment was not completed. You can try again.")),
      },
    });
    rzp.open();
  });
}

/* ---------- tiny inline icon set ---------- */
const ICONS = {
  back: <path d="M15 18l-6-6 6-6" />,
  check: <path d="M20 6L9 17l-5-5" />,
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>
  ),
  truck: (
    <>
      <path d="M1 4h13v11H1z" />
      <path d="M14 8h4l3 3v4h-7" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  bag: (
    <>
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 01-8 0" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </>
  ),
};

function Icon({ name, size = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

/* Payment method picker: Online = selected, COD = coming soon (disabled) */
function PaymentMethods() {
  return (
    <div className="ck-paymethods" role="radiogroup" aria-label="Payment method">
      <label className="ck-paymethod ck-paymethod-active">
        <input type="radio" name="ck-pm" checked readOnly />
        <span className="ck-paymethod-icon">
          <Icon name="card" size={18} />
        </span>
        <span className="ck-paymethod-text">
          <b>Pay online</b>
          <small>UPI, cards, netbanking &amp; wallets. Secured by Razorpay.</small>
        </span>
      </label>

      <label className="ck-paymethod ck-paymethod-disabled" aria-disabled="true">
        <input type="radio" name="ck-pm" disabled />
        <span className="ck-paymethod-icon">
          <Icon name="truck" size={18} />
        </span>
        <span className="ck-paymethod-text">
          <b>Cash on Delivery</b>
          <small>Pay when your order arrives.</small>
        </span>
        <em className="ck-soon">Coming soon</em>
      </label>
    </div>
  );
}

export default function CartView() {
  const [items, setItems] = useState([]);
  const [unavailable, setUnavailable] = useState({});
  const [quote, setQuote] = useState(null); // server se: { deliveryTotal, total, delivery: { productId: charge } }
  const [checking, setChecking] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [accent, setAccent] = useState("#3a2b20");
  const [lastStore, setLastStore] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderDone, setOrderDone] = useState(null);

  // Order jo ban chuka hai par pay hona baaki hai (retry ke liye)
  // { orderNumber, checkout, payment? }
  const [pendingOrder, setPendingOrder] = useState(null);

  useEffect(() => {
    const cart = getCart();
    setItems(cart);

    // seller's accent color: from the cart item first, else the saved key
    let saved = "";
    let savedStore = "";
    try {
      saved = localStorage.getItem("ls_cart_accent") || "";
      savedStore = localStorage.getItem("ls_cart_store") || "";
    } catch {}
    setAccent(cart[0]?.accent || saved || "#3a2b20");

    // remember the seller's store so we can return there even when the cart is empty
    if (cart[0]?.publicUsername) {
      savedStore = `/${cart[0].publicUsername}/store`;
      try {
        localStorage.setItem("ls_cart_store", savedStore);
      } catch {}
    }
    setLastStore(savedStore);

    // Payment window pehle se load kar lo taaki click par turant khule
    if (cart.length > 0) loadRazorpay().catch(() => {});

    setLoaded(true);
    return subscribeToCart((next) => {
      setItems(next);
      if (next[0]?.accent) setAccent(next[0].accent);
    });
  }, []);

  // Product ya quantity badle to dobara check hota hai
  const cartKey = items.map((i) => `${i.productId}:${i.quantity}`).join("|");

  // Availability + delivery charges hamesha backend se re-check hote hain
  useEffect(() => {
    if (!loaded) return;

    if (items.length === 0) {
      setChecking(false);
      setUnavailable({});
      setQuote(null);
      return;
    }

    let cancelled = false;
    setChecking(true);

    fetch("/api/cart/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        const map = {};
        const delivery = {};
        data.items.forEach((i) => {
          if (!i.available) map[i.productId] = i.reason;
          else delivery[i.productId] = i.deliveryCharge || 0;
        });
        setUnavailable(map);
        setQuote({
          deliveryTotal: data.deliveryTotal || 0,
          total: data.total || 0,
          delivery,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, cartKey]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const currency = items[0]?.currency || "INR";
  const deliveryTotal = quote?.deliveryTotal || 0;
  const payable = Math.round((subtotal + deliveryTotal) * 100) / 100; // customer ko yahi pay karna hai
  const hasUnavailable = Object.keys(unavailable).length > 0;
  const onlineOk = currency === "INR"; // Razorpay sirf INR
  const storeHref = items[0]?.publicUsername
    ? `/${items[0].publicUsername}/store`
    : lastStore || "/";
  const sellerHandle = items[0]?.publicUsername || "";
  const sellerName = items[0]?.sellerName || sellerHandle || "the seller";
  const sellerImage = items[0]?.sellerImage || "";

  // Cart badal gaya (amount badla) -> purana unpaid order ab sahi nahi, naya banega
  useEffect(() => {
    setPendingOrder((p) => (p && !p.payment ? null : p));
  }, [payable]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    // Details badli -> purana unpaid order dobara banega
    setPendingOrder((p) => (p && !p.payment ? null : p));
  }

  function handlePlaceOrder() {
    const e = validate(form);
    setErrors(e);

    const firstKey = FIELD_ORDER.find((k) => e[k]);
    if (firstKey) {
      const el = document.getElementById(`f-${firstKey}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }

    setOrderError("");
    setShowConfirm(true);
  }

  /*
   * 1) Order banao (server amount khud nikalta hai, delivery ke saath) -> Razorpay order id milta hai
   * 2) Razorpay window kholo, customer pay kare
   * 3) Signature server par verify karo -> order "paid"
   */
  async function handleConfirm() {
    if (placing || !onlineOk) return;
    setPlacing(true);
    setOrderError("");

    try {
      let session = pendingOrder;

      if (!session) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seller: items[0]?.publicUsername,
            items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            customer: form,
            payment: "razorpay",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false || !data.checkout) {
          throw new Error(data.message || "We couldn't place your order");
        }
        session = { orderNumber: data.orderId, checkout: data.checkout };
        setPendingOrder(session);
      }

      // Payment pehle ho chuki hai par verify fail hua tha -> sirf verify dobara
      let paid = session.payment;
      if (!paid) {
        await loadRazorpay();
        paid = await openCheckout({
          checkout: session.checkout,
          orderNumber: session.orderNumber,
          form,
          accent,
          storeName: sellerName,
        });
        session = { ...session, payment: paid };
        setPendingOrder(session);
      }

      const vr = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: session.orderNumber,
          razorpay_order_id: paid.razorpay_order_id,
          razorpay_payment_id: paid.razorpay_payment_id,
          razorpay_signature: paid.razorpay_signature,
        }),
      });
      const vd = await vr.json().catch(() => ({}));
      if (!vr.ok || vd.success === false) {
        throw new Error(
          vd.message ||
            "We received your payment but couldn't confirm it yet. Please tap Confirm payment again."
        );
      }

      const snapshot = {
        total: session.checkout.amountPaise / 100, // server ka final amount (items + delivery)
        qty: totalQty,
        currency,
        id: session.orderNumber,
        phone: form.phone,
        storeHref,
      };
      items.forEach((i) => removeFromCart(i.productId));
      setPendingOrder(null);
      setShowConfirm(false);
      setOrderDone(snapshot);
    } catch (err) {
      setOrderError(err.message || "Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  const wrapStyle = { "--pub-accent": accent };

  /* ---------------- loading ---------------- */
  if (!loaded) {
    return (
      <div className="ls-store-page ck-page" style={wrapStyle}>
        <div className="ck-center">Loading your cart…</div>
      </div>
    );
  }

  /* ---------------- order placed ---------------- */
  if (orderDone) {
    const steps = [
      { label: "Payment received", done: true },
      { label: "Seller confirms your order", done: false },
      { label: "Order shipped", done: false },
      { label: "Order delivered", done: false },
    ];

    return (
      <div className="ls-store-page ck-page" style={wrapStyle}>
        <div className="ck-container">
          <div className="ck-card ck-success">
            <div className="ck-success-icon">
              <Icon name="check" size={32} />
            </div>
            <h1 className="ck-title ck-title-sm">Payment successful!</h1>
            <p className="ck-subtitle ck-subtitle-center">
              Your order has been placed and sent to the seller.
            </p>

            <div className="ck-success-meta">
              {orderDone.id && (
                <div>
                  <span>Order</span>
                  <b>#{orderDone.id}</b>
                </div>
              )}
              <div>
                <span>Items</span>
                <b>{orderDone.qty}</b>
              </div>
              <div>
                <span>Paid</span>
                <b>{formatMoney(orderDone.total, orderDone.currency)}</b>
              </div>
            </div>

            <h2 className="ck-card-title ck-left">What happens next?</h2>
            <ol className="ck-timeline">
              {steps.map((s) => (
                <li key={s.label} className={s.done ? "ck-tl-done" : ""}>
                  <span className="ck-tl-dot">
                    {s.done && <Icon name="check" size={12} />}
                  </span>
                  {s.label}
                </li>
              ))}
            </ol>

            <p className="ck-success-note">
              The seller may contact you on <b>{orderDone.phone}</b> to confirm
              delivery details.
            </p>

            <Link href={orderDone.storeHref} className="ls-btn ls-btn-primary ck-cta">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- empty cart ---------------- */
  if (items.length === 0) {
    return (
      <div className="ls-store-page ck-page" style={wrapStyle}>
        <div className="ck-container">
          <div className="ck-card ck-empty">
            <div className="ck-empty-icon">
              <Icon name="bag" size={34} />
            </div>
            <h1 className="ck-title ck-title-sm">Your cart is empty</h1>
            <p className="ck-subtitle ck-subtitle-center">
              Looks like you haven&apos;t added anything yet.
            </p>
            <Link href={storeHref} className="ls-btn ls-btn-primary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- form field helper ---------------- */
  const field = (key, label, props = {}) => {
    const err = errors[key];
    const common = {
      id: `f-${key}`,
      value: form[key],
      placeholder: props.placeholder,
      autoComplete: props.autoComplete,
      onChange: (e) => setField(key, e.target.value),
      "aria-invalid": err ? "true" : "false",
      "aria-describedby": err ? `f-${key}-err` : undefined,
    };

    return (
      <div className={`ck-field ${props.wide ? "ck-field-wide" : ""}`}>
        <label htmlFor={`f-${key}`}>{label}</label>
        {props.textarea ? (
          <textarea rows={props.rows || 3} {...common} />
        ) : (
          <input
            type={props.type || "text"}
            inputMode={props.inputMode}
            maxLength={props.maxLength}
            {...common}
          />
        )}
        {err && (
          <span id={`f-${key}-err`} className="ck-error" role="alert">
            {err}
          </span>
        )}
      </div>
    );
  };

  const placeDisabled = checking || hasUnavailable || !onlineOk || !quote;
  const placeLabel = checking ? "Checking availability…" : "Proceed to Pay";
  const currentStep = showConfirm ? 3 : 2;
  const stepList = ["Cart", "Delivery", "Payment"];

  /* ---------------- main checkout ---------------- */
  return (
    <div className="ls-store-page ck-page" style={wrapStyle}>
      <div className="ck-container">
        {/* HEADER */}
        <header className="ck-header">
          <Link href={storeHref} className="ck-back">
            <Icon name="back" size={16} />
            Back to Store
          </Link>
          <h1 className="ck-title">Checkout</h1>
          <p className="ck-subtitle">
            Review your order, add your delivery details and pay securely online.
          </p>

          <ol className="ck-steps" aria-label="Checkout progress">
            {stepList.map((label, i) => {
              const n = i + 1;
              const state =
                n < currentStep ? "done" : n === currentStep ? "active" : "";
              return (
                <li key={label} className="ck-step-wrap">
                  <span
                    className={`ck-step ${state ? `ck-step-${state}` : ""}`}
                    aria-current={n === currentStep ? "step" : undefined}
                  >
                    <span className="ck-step-dot">
                      {state === "done" ? <Icon name="check" size={13} /> : n}
                    </span>
                    {label}
                  </span>
                  {n < stepList.length && (
                    <span
                      className={`ck-step-line ${n < currentStep ? "ck-step-line-done" : ""}`}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </header>

        {hasUnavailable && (
          <div className="ck-alert" role="alert">
            Some items in your cart are no longer available. Remove them to
            continue.
          </div>
        )}

        {!onlineOk && (
          <div className="ck-alert" role="alert">
            Online payment is currently available for INR products only.
          </div>
        )}

        <div className="ck-layout">
          {/* ============ LEFT ============ */}
          <div className="ck-main">
            {/* YOUR ORDER */}
            <section className="ck-card" aria-labelledby="ck-h-order">
              <div className="ck-card-head">
                <h2 id="ck-h-order" className="ck-card-title">
                  Your Order
                </h2>
                <span className="ck-pill">
                  {totalQty} {totalQty === 1 ? "item" : "items"}
                </span>
              </div>

              <ul className="ck-items">
                {items.map((item) => {
                  const issue = unavailable[item.productId];
                  const soldBy =
                    item.sellerName ||
                    (item.publicUsername ? `@${item.publicUsername}` : "");

                  return (
                    <li key={item.productId} className="ck-item">
                      <div className="ck-item-media">
                        {item.image ? (
                          <img src={item.image} alt={item.name} />
                        ) : (
                          <Icon name="image" size={28} />
                        )}
                      </div>

                      <div className="ck-item-main">
                        <Link
                          href={`/${item.publicUsername}/store/${item.productSlug}`}
                          className="ck-item-name"
                        >
                          {item.name}
                        </Link>
                        {soldBy && <p className="ck-item-seller">Sold by {soldBy}</p>}
                        <p className="ck-item-unit">
                          {formatMoney(item.price, item.currency)}
                        </p>

                        {quote && !issue && (
                          <p className="ck-item-unit">
                            {quote.delivery[item.productId] > 0
                              ? `+ ${formatMoney(quote.delivery[item.productId], item.currency)} delivery`
                              : "Free delivery"}
                          </p>
                        )}

                        {issue && (
                          <p className="ck-item-issue">
                            {issue === "out_of_stock"
                              ? "Out of stock"
                              : issue === "disabled"
                              ? "No longer available"
                              : "This product was removed"}
                          </p>
                        )}

                        <button
                          type="button"
                          className="ck-link-btn"
                          onClick={() => removeFromCart(item.productId)}
                          aria-label={`Remove ${item.name}`}
                        >
                          <Icon name="trash" size={14} />
                          Remove
                        </button>
                      </div>

                      <div className="ck-item-side">
                        <QuantitySelector
                          quantity={item.quantity}
                          onChange={(q) => setQuantity(item.productId, q)}
                          disabled={Boolean(issue)}
                        />
                        <div className="ck-item-subtotal">
                          <span>Subtotal</span>
                          <b>{formatMoney(item.price * item.quantity, item.currency)}</b>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* CONTACT */}
            <section className="ck-card" aria-labelledby="ck-h-contact">
              <div className="ck-card-head ck-card-head-col">
                <h2 id="ck-h-contact" className="ck-card-title">
                  Contact Information
                </h2>
                <p className="ck-card-sub">
                  We&apos;ll use these details to help the seller contact you
                  about your order.
                </p>
              </div>
              <div className="ck-form-grid">
                {field("name", "Full Name *", {
                  placeholder: "Your full name",
                  autoComplete: "name",
                })}
                {field("phone", "Mobile Number *", {
                  type: "tel",
                  inputMode: "numeric",
                  maxLength: 10,
                  placeholder: "10-digit mobile number",
                  autoComplete: "tel-national",
                })}
                {field("email", "Email (optional)", {
                  type: "email",
                  placeholder: "you@example.com",
                  autoComplete: "email",
                  wide: true,
                })}
              </div>
            </section>

            {/* ADDRESS */}
            <section className="ck-card" id="ls-delivery-form" aria-labelledby="ck-h-address">
              <div className="ck-card-head ck-card-head-col">
                <h2 id="ck-h-address" className="ck-card-title">
                  Delivery Address
                </h2>
                <p className="ck-card-sub">Where should the seller deliver your order?</p>
              </div>
              <div className="ck-form-grid">
                {field("address", "Address *", {
                  textarea: true,
                  wide: true,
                  placeholder: "House no., street, area, landmark",
                  autoComplete: "street-address",
                })}
                {field("city", "City *", {
                  placeholder: "City",
                  autoComplete: "address-level2",
                })}
                {field("state", "State *", {
                  placeholder: "State",
                  autoComplete: "address-level1",
                })}
                {field("pincode", "Pincode *", {
                  inputMode: "numeric",
                  maxLength: 6,
                  placeholder: "6-digit pincode",
                  autoComplete: "postal-code",
                })}
              </div>
            </section>

            {/* NOTE */}
            <section className="ck-card" aria-labelledby="ck-h-note">
              <div className="ck-card-head">
                <h2 id="ck-h-note" className="ck-card-title">
                  Note for Seller
                </h2>
                <span className="ck-pill">Optional</span>
              </div>
              <div className="ck-field">
                <label htmlFor="f-note" className="ck-sr-only">
                  Note for seller
                </label>
                <textarea
                  id="f-note"
                  rows={3}
                  value={form.note}
                  placeholder="Any special instructions for the seller?"
                  onChange={(e) => setField("note", e.target.value)}
                />
              </div>
            </section>

            {/* PAYMENT METHOD */}
            <section className="ck-card" aria-labelledby="ck-h-pay">
              <div className="ck-card-head ck-card-head-col">
                <h2 id="ck-h-pay" className="ck-card-title">
                  Payment Method
                </h2>
                <p className="ck-card-sub">
                  After you tap <b>Proceed to Pay</b>, a secure Razorpay window
                  opens. Your order is confirmed only after the payment is
                  successful.
                </p>
              </div>

              <PaymentMethods />

              <p className="ck-info-foot">
                <Icon name="lock" size={15} />
                Payments are processed securely by Razorpay. We never see your
                card or UPI details.
              </p>
            </section>
          </div>

          {/* ============ RIGHT ============ */}
          <aside className="ck-side">
            {/* SELLER */}
            <section className="ck-card ck-seller" aria-label="Seller">
              <span className="ck-eyebrow">Sold by</span>
              <div className="ck-seller-row">
                {sellerImage ? (
                  <img src={sellerImage} alt="" className="ck-avatar" />
                ) : (
                  <span className="ck-avatar ck-avatar-fallback">
                    {sellerName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="ck-seller-text">
                  <b>{sellerName}</b>
                  {sellerHandle && <span>@{sellerHandle}</span>}
                </div>
                <Link href={storeHref} className="ck-seller-link">
                  View store
                </Link>
              </div>
              <p className="ck-seller-note">
                The seller will arrange delivery after your payment is confirmed.
              </p>
            </section>

            {/* SUMMARY */}
            <section className="ck-card ck-summary" aria-labelledby="ck-h-sum">
              <h2 id="ck-h-sum" className="ck-card-title ck-summary-title">
                Order Summary
              </h2>

              <div className="ck-row">
                <span>Subtotal ({totalQty} {totalQty === 1 ? "item" : "items"})</span>
                <span className="ck-row-val">{formatMoney(subtotal, currency)}</span>
              </div>
              <div className="ck-row">
                <span>Delivery</span>
                <span className="ck-row-val">
                  {!quote
                    ? "Calculating…"
                    : deliveryTotal > 0
                    ? formatMoney(deliveryTotal, currency)
                    : "Free"}
                </span>
              </div>
              <div className="ck-row">
                <span>Payment</span>
                <span className="ck-row-val">Online (Razorpay)</span>
              </div>
              <div className="ck-row ck-total">
                <span>Total to pay</span>
                <span className="ck-total-amount">{formatMoney(payable, currency)}</span>
              </div>

              <div className="ck-cta-block">
                <button
                  type="button"
                  className="ls-btn ls-btn-primary ck-cta"
                  disabled={placeDisabled}
                  onClick={handlePlaceOrder}
                >
                  {placeLabel}
                </button>
                <p className="ck-cta-note">
                  <Icon name="lock" size={13} />
                  100% secure payment via Razorpay.
                </p>
              </div>

              <ul className="ck-trust">
                <li>
                  <Icon name="check" size={14} /> Pay with UPI, cards, netbanking or wallets
                </li>
                <li>
                  <Icon name="check" size={14} /> Order is sent to the seller after payment
                </li>
                <li>
                  <Icon name="check" size={14} /> Automatic refund if the order is cancelled
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>

      {/* MOBILE STICKY BAR */}
      <div className="ck-mobilebar">
        <div className="ck-mobilebar-total">
          <span>Total</span>
          <b>{formatMoney(payable, currency)}</b>
        </div>
        <button
          type="button"
          className="ls-btn ls-btn-primary"
          disabled={placeDisabled}
          onClick={handlePlaceOrder}
        >
          {placeLabel}
        </button>
      </div>

      {/* REVIEW & PAY */}
      {showConfirm && (
        <div
          className="ck-modal-backdrop"
          onClick={() => !placing && setShowConfirm(false)}
        >
          <div
            className="ck-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ck-h-review"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="ck-h-review" className="ck-modal-title">
              Review &amp; pay
            </h2>

            <dl className="ck-modal-summary">
              <div>
                <dt>Deliver to</dt>
                <dd>{form.name}</dd>
              </div>
              <div>
                <dt>Mobile</dt>
                <dd>{form.phone}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>
                  {form.address}, {form.city}, {form.state} - {form.pincode}
                </dd>
              </div>
              <div>
                <dt>Total to pay</dt>
                <dd>
                  <b>{formatMoney(payable, currency)}</b>
                </dd>
              </div>
            </dl>

            <PaymentMethods />

            {orderError && (
              <p className="ck-error" role="alert">
                {orderError}
              </p>
            )}

            <div className="ck-modal-actions">
              <button
                type="button"
                className="ls-btn ls-btn-outline"
                onClick={() => setShowConfirm(false)}
                disabled={placing}
              >
                Go Back
              </button>
              <button
                type="button"
                className="ls-btn ls-btn-primary"
                onClick={handleConfirm}
                disabled={placing || !onlineOk}
              >
                {placing
                  ? "Processing…"
                  : pendingOrder?.payment
                  ? "Confirm payment"
                  : `Pay ${formatMoney(payable, currency)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}