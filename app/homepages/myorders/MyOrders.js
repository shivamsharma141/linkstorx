"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { formatMoney } from "@/app/config/storeFeatures";

const LIMIT = 10;
const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const FLOW = ["confirmed", "shipped", "delivered"];
const CANCELLABLE = ["pending", "confirmed"]; // buyer sirf inme cancel kar sakta hai
const REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery is taking too long",
  "Other",
];
const STORE_HREF = "/homepages/mainproducts";
const LOGIN_HREF = "/login";

const PAY_LABELS = {
  pay_to_seller: "Pay to Seller",
  cod: "Cash on Delivery",
  online: "Paid Online",
};

function payLabel(method) {
  if (!method) return "Pay to Seller";
  if (PAY_LABELS[method]) return PAY_LABELS[method];
  return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDateTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  const date = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const time = dt
    .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    .toUpperCase();
  return `${date}, ${time}`;
}

/* ---------- icons ---------- */
const ICONS = {
  check: <path d="M20 6L9 17l-5-5" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
  truck: (
    <>
      <path d="M1 5h13v11H1z" />
      <path d="M14 9h4l3 3v4h-7" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  box: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  bag: (
    <>
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 01-8 0" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.5" />
    </>
  ),
};

function Icon({ name, size = 16 }) {
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

const BADGE_ICON = {
  pending: "clock",
  confirmed: "checkCircle",
  shipped: "truck",
  delivered: "checkCircle",
  cancelled: "xCircle",
};

function StatusBadge({ status }) {
  return (
    <span className={`mo-badge mo-badge-${status}`}>
      <Icon name={BADGE_ICON[status] || "clock"} size={15} />
      {LABELS[status] || status}
    </span>
  );
}

/* ---------- tracking timeline ---------- */
function Timeline({ status }) {
  let steps;
  let cur;
  if (status === "cancelled") {
    steps = [
      { key: "placed", label: "Order Placed" },
      { key: "cancelled", label: "Cancelled" },
    ];
    cur = 1;
  } else if (status === "pending") {
    steps = [
      { key: "placed", label: "Order Placed" },
      { key: "pending", label: "Pending" },
    ];
    cur = 1;
  } else {
    steps = [
      { key: "placed", label: "Order Placed" },
      { key: "confirmed", label: "Confirmed" },
      { key: "shipped", label: "Shipped" },
      { key: "delivered", label: "Delivered" },
    ];
    cur = 1 + FLOW.indexOf(status);
  }
  const finished = status === "delivered";

  return (
    <ol className="mo-tl" aria-label="Order progress">
      {steps.map((s, i) => {
        const done = i < cur || (finished && i === cur);
        const current = i === cur && !finished;
        const cls = [
          "mo-tl-step",
          done ? "mo-tl-done" : "",
          current ? "mo-tl-current" : "",
          s.key === "cancelled" ? "mo-tl-cancel" : "",
          i < cur ? "mo-tl-line-on" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <li key={s.key} className={cls}>
            <span className="mo-tl-dot">
              {s.key === "cancelled" ? (
                <span className="mo-tl-x">×</span>
              ) : done ? (
                <Icon name="check" size={14} />
              ) : null}
            </span>
            <span className="mo-tl-label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Thumbs({ items }) {
  const list = items || [];
  const showAll = list.length <= 4;
  const shown = showAll ? list : list.slice(0, 3);
  return (
    <div className="mo-thumbs">
      {shown.map((it, i) => (
        <div key={i} className="mo-thumb" title={it.name}>
          {it.image ? <img src={it.image} alt={it.name} loading="lazy" /> : <span>{(it.name || "?")[0]}</span>}
        </div>
      ))}
      {!showAll && <div className="mo-thumb mo-thumb-more">+{list.length - 3}</div>}
    </div>
  );
}

function Skeleton() {
  return (
    <ul className="mo-list" aria-hidden="true">
      {[0, 1, 2].map((n) => (
        <li key={n} className="mo-card mo-skel">
          <div className="mo-sk-head">
            <div>
              <span className="mo-sk mo-sk-line" style={{ width: 190, height: 20 }} />
              <span className="mo-sk mo-sk-line" style={{ width: 150, height: 13, marginTop: 10 }} />
            </div>
            <span className="mo-sk mo-sk-pill" />
          </div>
          <div className="mo-sk-body">
            <div className="mo-sk-thumbs">
              <span className="mo-sk mo-sk-thumb" />
              <span className="mo-sk mo-sk-thumb" />
              <span className="mo-sk mo-sk-thumb" />
            </div>
            <div className="mo-sk-mid">
              <span className="mo-sk mo-sk-line" style={{ width: 70, height: 14 }} />
              <span className="mo-sk mo-sk-line" style={{ width: "80%", height: 12, marginTop: 10 }} />
              <span className="mo-sk mo-sk-line" style={{ width: 110, height: 12, marginTop: 10 }} />
            </div>
            <div className="mo-sk-side">
              <span className="mo-sk mo-sk-line" style={{ width: 80, height: 22 }} />
              <span className="mo-sk mo-sk-line" style={{ width: 90, height: 12, marginTop: 8 }} />
              <span className="mo-sk mo-sk-btn" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function MyOrders() {
  const [status, setStatus] = useState("");
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const [open, setOpen] = useState({});

  // cancel flow
  const [cancelTarget, setCancelTarget] = useState(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [otherText, setOtherText] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(
    async (pageNum, append) => {
      append ? setLoadingMore(true) : setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams({ role: "buyer", page: String(pageNum), limit: String(LIMIT) });
        if (status) qs.set("status", status);
        const res = await fetch(`/api/orders?${qs}`);
        if (res.status === 401) {
          setNeedLogin(true);
          setOrders([]);
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
          throw new Error(data.message || "Couldn't load orders");
        }
        setNeedLogin(false);

        const list = data.orders || data.items || [];
        setOrders((prev) => (append ? [...prev, ...list] : list));
        setPage(pageNum);

        const pages = data.totalPages ?? data.pages ?? data.pagination?.totalPages;
        setHasMore(pages ? pageNum < pages : list.length === LIMIT);
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [status]
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 4500);
  }

  function openCancel(order) {
    setCancelTarget(order);
    setReason(REASONS[0]);
    setOtherText("");
    setCancelError("");
  }

  async function confirmCancel() {
    if (!cancelTarget || cancelling) return;
    const finalReason = reason === "Other" ? otherText.trim() : reason;

    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/orders/${cancelTarget.orderNumber}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason }),
      });
      if (res.status === 401) {
        setCancelTarget(null);
        setNeedLogin(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "We couldn't cancel this order.");
      }

      const updated = data.order;
      setOrders((prev) =>
        status && status !== "cancelled"
          ? prev.filter((o) => o.orderNumber !== updated.orderNumber) // is filter mein ab nahi aata
          : prev.map((o) => (o.orderNumber === updated.orderNumber ? { ...o, ...updated } : o))
      );
      setCancelTarget(null);
      showToast(data.message || "Order cancelled.");
    } catch (err) {
      setCancelError(err.message || "Something went wrong. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <main className="mo-page">
      <div className="mo-container">
        <header className="mo-header">
          <h1 className="mo-title">My Orders</h1>
          <p className="mo-subtitle">Track all your purchases in one place.</p>
        </header>

        <div className="mo-chips" role="tablist" aria-label="Filter orders by status">
          {["", ...STATUSES].map((s) => (
            <button
              key={s || "all"}
              type="button"
              role="tab"
              aria-selected={status === s}
              className={`mo-chip ${status === s ? "mo-chip-active" : ""}`}
              onClick={() => setStatus(s)}
            >
              {s ? LABELS[s] : "All Orders"}
            </button>
          ))}
        </div>

        {loading ? (
          <Skeleton />
        ) : needLogin ? (
          <div className="mo-state">
            <span className="mo-state-icon">
              <Icon name="lock" size={30} />
            </span>
            <h2>Please log in</h2>
            <p>Log in to see your orders.</p>
            <Link href={LOGIN_HREF} className="mo-btn">
              Log in
            </Link>
          </div>
        ) : error ? (
          <div className="mo-state">
            <span className="mo-state-icon mo-state-icon-err">
              <Icon name="alert" size={30} />
            </span>
            <h2>Couldn&apos;t load your orders</h2>
            <p>{error}</p>
            <button type="button" className="mo-btn" onClick={() => load(1, false)}>
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="mo-state">
            <span className="mo-state-icon">
              <Icon name="bag" size={32} />
            </span>
            <h2>No orders yet</h2>
            <p>
              {status
                ? `You have no ${LABELS[status].toLowerCase()} orders.`
                : "You haven't placed any orders yet."}
            </p>
            <Link href={STORE_HREF} className="mo-btn">
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="mo-list">
              {orders.map((o) => {
                const id = o.orderNumber || o._id;
                const isOpen = !!open[id];
                const c = o.customer || {};
                const items = o.items || [];
                const names = items.slice(0, 3).map((i) => i.name).join(", ");
                const extra = items.length > 3 ? ` and ${items.length - 3} more` : "";
                const qty = o.totalQty ?? items.reduce((s, i) => s + (i.quantity || 0), 0);

                return (
                  <li key={id} className="mo-card">
                    <div className="mo-a-head">
                      <h2 className="mo-num">Order #{o.orderNumber}</h2>
                      <p className="mo-date">Placed on {fmtDateTime(o.createdAt)}</p>
                    </div>

                    <div className="mo-a-badge">
                      <StatusBadge status={o.status} />
                    </div>

                    <div className="mo-a-thumbs">
                      <Thumbs items={items} />
                    </div>

                    <div className="mo-a-info">
                      <b className="mo-count">
                        {qty} {qty === 1 ? "item" : "items"}
                      </b>
                      <p className="mo-names">
                        {names}
                        {extra}
                      </p>
                      {o.sellerUsername && <p className="mo-seller">Seller: @{o.sellerUsername}</p>}
                    </div>

                    <div className="mo-a-price">
                      <b className="mo-price">{formatMoney(o.subtotal, o.currency)}</b>
                      <span className="mo-pay">{payLabel(o.payment?.method)}</span>
                    </div>

                    <div className="mo-a-btn">
                      <button
                        type="button"
                        className="mo-view"
                        onClick={() => toggle(id)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? "Hide Details" : "View Details"}
                        <span className={`mo-view-arrow ${isOpen ? "mo-view-arrow-up" : ""}`}>
                          <Icon name="arrow" size={16} />
                        </span>
                      </button>
                    </div>

                    {isOpen && (
                      <div className="mo-details">
                        <div className="mo-d-block">
                          <h3>Order Details</h3>
                          <dl className="mo-kv">
                            <div>
                              <dt>Order Number</dt>
                              <dd>#{o.orderNumber}</dd>
                            </div>
                            <div>
                              <dt>Order Date</dt>
                              <dd>{fmtDateTime(o.createdAt)}</dd>
                            </div>
                            <div>
                              <dt>Current Status</dt>
                              <dd>
                                <StatusBadge status={o.status} />
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="mo-d-block">
                          <h3>Order Tracking</h3>
                          <Timeline status={o.status} />
                        </div>

                        <div className="mo-d-block">
                          <h3>Products</h3>
                          <ul className="mo-prods">
                            {items.map((it, i) => (
                              <li key={i}>
                                <div className="mo-prod-img">
                                  {it.image ? (
                                    <img src={it.image} alt={it.name} loading="lazy" />
                                  ) : (
                                    <Icon name="box" size={22} />
                                  )}
                                </div>
                                <div className="mo-prod-main">
                                  <b>{it.name}</b>
                                  <span>
                                    Qty {it.quantity} × {formatMoney(it.price, it.currency || o.currency)}
                                  </span>
                                </div>
                                <b className="mo-prod-total">
                                  {formatMoney(it.lineTotal, it.currency || o.currency)}
                                </b>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mo-d-cols">
                          <div className="mo-d-block">
                            <h3>Delivery Details</h3>
                            <dl className="mo-kv mo-kv-col">
                              <div>
                                <dt>Name</dt>
                                <dd>{c.name}</dd>
                              </div>
                              <div>
                                <dt>Address</dt>
                                <dd>{c.address}</dd>
                              </div>
                              <div>
                                <dt>City</dt>
                                <dd>{c.city}</dd>
                              </div>
                              <div>
                                <dt>State</dt>
                                <dd>{c.state}</dd>
                              </div>
                              <div>
                                <dt>Pincode</dt>
                                <dd>{c.pincode}</dd>
                              </div>
                              <div>
                                <dt>Phone</dt>
                                <dd>{c.phone}</dd>
                              </div>
                            </dl>
                          </div>

                          <div className="mo-d-block">
                            <h3>Payment</h3>
                            <dl className="mo-kv mo-kv-col">
                              <div>
                                <dt>Method</dt>
                                <dd>{payLabel(o.payment?.method)}</dd>
                              </div>
                              <div>
                                <dt>Payment Status</dt>
                                <dd className="mo-cap">{o.payment?.status || "pending"}</dd>
                              </div>
                              <div>
                                <dt>Subtotal</dt>
                                <dd>{formatMoney(o.subtotal, o.currency)}</dd>
                              </div>
                              <div className="mo-kv-total">
                                <dt>Total</dt>
                                <dd>{formatMoney(o.subtotal, o.currency)}</dd>
                              </div>
                            </dl>
                            {o.note && (
                              <p className="mo-note">
                                <b>Your note:</b> {o.note}
                              </p>
                            )}
                          </div>
                        </div>

                        {o.status === "cancelled" && (
                          <div className="mo-cancel-note">
                            <b>
                              Order cancelled
                              {o.cancellation?.cancelledBy === "seller"
                                ? " by the seller"
                                : o.cancellation?.cancelledBy === "buyer"
                                ? " by you"
                                : ""}
                              {o.cancellation?.cancelledAt ? ` on ${fmtDateTime(o.cancellation.cancelledAt)}` : ""}
                            </b>
                            {o.cancellation?.reason && <span>Reason: {o.cancellation.reason}</span>}
                          </div>
                        )}

                        {CANCELLABLE.includes(o.status) && (
                          <div className="mo-cancel-row">
                            <p>Changed your mind? You can cancel this order before it ships.</p>
                            <button type="button" className="mo-cancel-btn" onClick={() => openCancel(o)}>
                              Cancel Order
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {hasMore && (
              <button
                type="button"
                className="mo-btn mo-more"
                onClick={() => load(page + 1, true)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load More"}
              </button>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className="mo-toast" role="status">
          <Icon name="checkCircle" size={18} />
          {toast}
        </div>
      )}

      {cancelTarget && (
        <div className="mo-modal-backdrop" onClick={() => !cancelling && setCancelTarget(null)}>
          <div
            className="mo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mo-cancel-h"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="mo-cancel-h" className="mo-modal-title">
              Cancel this order?
            </h2>
            <p className="mo-modal-sub">
              Order #{cancelTarget.orderNumber} ({formatMoney(cancelTarget.subtotal, cancelTarget.currency)}).
              {cancelTarget.sellerUsername ? ` @${cancelTarget.sellerUsername} will be notified.` : ""}
            </p>

            <p className="mo-modal-label">Why are you cancelling?</p>
            <div className="mo-reasons">
              {REASONS.map((r) => (
                <label key={r} className={`mo-reason ${reason === r ? "mo-reason-on" : ""}`}>
                  <input
                    type="radio"
                    name="cancel-reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    disabled={cancelling}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            {reason === "Other" && (
              <textarea
                className="mo-modal-text"
                rows={3}
                maxLength={300}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Tell us a bit more (optional)"
                disabled={cancelling}
              />
            )}

            {cancelError && (
              <p className="mo-modal-error" role="alert">
                {cancelError}
              </p>
            )}

            <div className="mo-modal-actions">
              <button
                type="button"
                className="mo-modal-keep"
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
              >
                Keep Order
              </button>
              <button
                type="button"
                className="mo-modal-danger"
                onClick={confirmCancel}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling…" : "Yes, Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}