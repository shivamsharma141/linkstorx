"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatMoney } from "@/app/config/storeFeatures";

import "./sellerdashboard.css";

const API = "/api/seller/dashboard";

// Ek baar me kitne orders / settlements load honge
const PAGE_SIZE = 10;

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const STEPS = ["pending", "confirmed", "shipped", "delivered"];

const RANGES = [
  { value: "all", label: "All Time" },
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
];

const STATUS_META = {
  pending: { label: "Pending", icon: "clock" },
  confirmed: { label: "Confirmed", icon: "check" },
  shipped: { label: "Shipped", icon: "truck" },
  delivered: { label: "Delivered", icon: "box" },
  cancelled: { label: "Cancelled", icon: "x" },
};

// Seller ka agla step + saral bhasha me madad
const NEXT_ACTION = {
  pending: {
    to: "confirmed",
    label: "Confirm Order",
    short: "Confirm",
    help: "Step 1: The customer has already paid online. Contact the customer by Call or WhatsApp, confirm the delivery address and delivery details, then click Confirm Order.",
  },
  confirmed: {
    to: "shipped",
    label: "Mark as shipped",
    short: "Mark shipped",
    help: "Step 2: Pack the product and arrange delivery yourself. Once the parcel has been handed over for delivery, mark the order as shipped.",
  },
  shipped: {
    to: "delivered",
    label: "Mark as delivered",
    short: "Deliver",
    help: "Step 3: The order is on the way. Once the customer has received the product, mark it as delivered. Your payout becomes eligible right after delivery.",
  },
};

const STATUS_TOAST = {
  confirmed: "Order confirmed successfully.",
  shipped: "Order marked as shipped.",
  delivered: "Order marked as delivered.",
};

const PENDING_CHECKLIST = [
  "Product / order details",
  "Delivery address and phone number",
  "Customer still wants the order",
  "Delivery arrangement",
];

const FINAL_HELP = {
  delivered: "All done. This order has been delivered.",
  cancelled: "This order was cancelled.",
};

const SELLER_CANCELLABLE = ["pending", "confirmed", "shipped"];

/* ---------------- icons ---------------- */
const ICONS = {
  box: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7a2 2 0 012-2h13v4" />
      <path d="M3 7v11a2 2 0 002 2h15a1 1 0 001-1v-3" />
      <path d="M21 9H5" />
      <circle cx="17" cy="14.5" r="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0113 0" />
      <path d="M16 4.5a3.5 3.5 0 010 7" />
      <path d="M18 14.2a6.5 6.5 0 013.5 5.8" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  truck: (
    <>
      <path d="M1 4h13v11H1z" />
      <path d="M14 8h4l3 3v4h-7" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  x: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  chevron: <path d="M6 9l6 6 6-6" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  phone: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5M12 18h.01" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10 20a2 2 0 004 0" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </>
  ),
  close: <path d="M18 6L6 18M6 6l12 12" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 012-2h9" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3z" />
      <path d="M12 11v4M12 8.5h.01" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" />
      <path d="M9 7h6M9 11h6M9 15h3" />
    </>
  ),
};

function Icon({ name, size = 18, stroke = 2 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

// Official WhatsApp glyph (always white). The green background comes from the button (.sd-cbtn-wa).
function WhatsAppIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" style={{ display: "block" }}>
      <path
        fill="#FFFFFF"
        style={{ fill: "#FFFFFF" }}
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

/* ---------------- helpers ---------------- */
function cleanPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function formatPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone || "";
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value)
    .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    .toUpperCase();
}

function timeAgo(value) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(value);
}

// Scroller ke bottom ke paas pahunche ya nahi
function nearBottom(e) {
  const el = e.currentTarget;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}

// Order ke status ke hisaab se WhatsApp ka ready message
function waMessage(order, storeName) {
  const store = storeName || "your seller";
  const name = order.customer?.name || "";
  const itemLines = (order.items || []).map((i) => `- ${i.name} x ${i.quantity}`).join("\n");
  const total = formatMoney(order.subtotal, order.currency);
  const no = order.orderNumber;
  const cu = order.customer || {};
  const address =
    [cu.address, cu.city, cu.state].filter(Boolean).join(", ") + (cu.pincode ? ` - ${cu.pincode}` : "");

  switch (order.status) {
    case "confirmed":
      return `Hi ${name}, this is ${store}. Your order #${no} is confirmed and we are getting it ready. We will let you know when it is on the way.`;
    case "shipped":
      return `Hi ${name}, this is ${store}. Your order #${no} is on the way! Order total: ${total}.`;
    case "delivered":
      return `Hi ${name}, thank you for shopping with ${store}! Your order #${no} has been delivered. We hope you like it.`;
    case "cancelled":
      return `Hi ${name}, this is ${store}. We are writing about your cancelled order #${no}.`;
    default: // pending
      return `Hello ${name},

This is ${store} from LinkStorX. Thank you for your order, we have received your payment.

Order ID: #${no}
Items:
${itemLines}
Order total: ${total}
Delivery address: ${address}

Please reply YES to confirm that your delivery address and phone number are correct. Once you confirm, we will process your order. Thank you!`;
  }
}

function waUrl(phone, text) {
  return `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(text)}`;
}

// Payment badge ka text + style (online / purane orders dono)
function payLabel(order) {
  const p = order.payment || {};
  if (p.status === "refunded") return { text: "Refunded", cls: "sd-paybadge-due" };
  if (p.status === "refund_pending") return { text: "Refund pending", cls: "sd-paybadge-due" };
  if (order.status === "cancelled") return null;
  if (p.status === "paid") {
    return { text: p.method === "razorpay" ? "Paid online" : "Payment received", cls: "sd-paybadge-paid" };
  }
  return { text: "Payment due", cls: "sd-paybadge-due" };
}

function payoutText(s, days) {
  switch (s.payoutState) {
    case "eligible":
      return `Eligible for payout. You will receive it by ${formatDate(s.payoutDueBy)}.`;
    case "paid_out":
      return `Paid out to you${s.paidOutAt ? ` on ${formatDate(s.paidOutAt)}` : ""}.`;
    case "after_delivery":
      return `Becomes eligible once the order is delivered. Payout is made within ${days} days of delivery.`;
    default:
      return "";
  }
}

/* ---------------- receipt helpers ---------------- */
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Ek order ka poora hisaab: customer ne kitna diya, kitna kata, aapko kitna mila.
// Agar API ye fields deti hai (customerPaid, gatewayFee, gstOnFee, platformFee) to wahi use hote hain,
// warna settlement amount (net) se wapas calculate kiya jata hai.
function orderBreakdown(o, rates) {
  const net = round2(o.amount);
  const gp = (Number(rates.gatewayPercent) || 0) / 100;
  const gstp = (Number(rates.gstPercent) || 0) / 100;

  if (o.customerPaid != null && o.gatewayFee != null && o.gstOnFee != null) {
    const platform = o.platformFee != null ? round2(o.platformFee) : round2(o.customerPaid - o.gatewayFee - o.gstOnFee - net);
    return {
      paid: round2(o.customerPaid),
      fee: round2(o.gatewayFee),
      gst: round2(o.gstOnFee),
      platform,
      net,
    };
  }

  const platform = round2(o.platformFee != null ? o.platformFee : rates.platformFee);
  const factor = 1 - gp * (1 + gstp) || 1;
  const paid = round2((net + platform) / factor);
  const fee = round2(paid * gp);
  const gst = round2(paid - fee - platform - net); // rounding yahin adjust hoti hai
  return { paid, fee, gst, platform, net };
}

// PDF me sirf simple ASCII chahiye, isliye "Rs." use karte hain
function pdfMoney(v) {
  return `Rs. ${(Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function receiptLines({ s, o, b, rates, storeName }) {
  const W = 62;
  const line = "-".repeat(W);
  const row = (label, value) => {
    const l = String(label);
    const v = String(value);
    return l + " ".repeat(Math.max(1, W - l.length - v.length)) + v;
  };
  const when = s.status === "Paid" && s.paidAt ? s.paidAt : s.createdAt;
  const items = String(o.items || "-");
  const isPaid = s.status === "Paid";

  const lines = [
    "LINKSTORX - PAYOUT RECEIPT",
    line,
    `Seller          : ${storeName || "-"}`,
    `Order           : #${o.orderNumber}`,
    `Items           : ${items.length > 44 ? `${items.slice(0, 41)}...` : items}`,
    `Settlement date : ${formatDate(when)} ${formatTime(when)}`,
    `Payout status   : ${isPaid ? "Paid" : s.status === "Failed" ? "Transfer failed" : "Processing"}`,
  ];
  if (isPaid) lines.push(`UTR             : ${s.utr || "-"}`);
  lines.push(
    `Sent to         : ${s.bank?.bankName || "Your bank"}${s.bank?.last4 ? ` ****${s.bank.last4}` : ""}`,
    line,
    row("Customer paid", pdfMoney(b.paid)),
    row(`Razorpay fee (${rates.gatewayPercent}% of ${pdfMoney(b.paid)})`, `- ${pdfMoney(b.fee)}`),
    row(`GST (${rates.gstPercent}% of fee ${pdfMoney(b.fee)})`, `- ${pdfMoney(b.gst)}`),
    row("Platform commission (per order)", `- ${pdfMoney(b.platform)}`),
    line,
    row(isPaid ? "YOU RECEIVED" : "YOU WILL RECEIVE", pdfMoney(b.net)),
    line,
    `Total deducted  : ${pdfMoney(round2(b.fee + b.gst + b.platform))}`,
    "",
    "How it is calculated:",
    `1. Razorpay fee = ${rates.gatewayPercent}% of the amount the customer paid.`,
    `2. GST = ${rates.gstPercent}% of the Razorpay fee (not of the order).`,
    "3. Platform commission is a fixed amount per order.",
    "4. You receive: customer paid - fee - GST - commission.",
    "",
    `Generated on ${formatDate(new Date())} ${formatTime(new Date())}`
  );
  return lines;
}

// Chhota sa PDF banane wala (koi library nahi chahiye)
function makePdf(lines) {
  const esc = (t) =>
    String(t)
      .replace(/[^\x20-\x7E]/g, "?")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  let content = "BT\n/F1 11 Tf\n16 TL\n50 790 Td\n";
  lines.forEach((l) => {
    content += `(${esc(l)}) Tj T*\n`;
  });
  content += "ET";

  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------------- small components ---------------- */
function StatusBadge({ status }) {
  const known = ORDER_STATUSES.includes(status) ? status : "pending";
  return <span className={`sd-badge sd-st-${known}`}>{known}</span>;
}

function PayBadge({ order }) {
  const l = payLabel(order);
  if (!l) return null;
  return <span className={`sd-paybadge ${l.cls}`}>{l.text}</span>;
}

function PayCell({ order }) {
  if (!payLabel(order)) return <span className="sd-person-meta">—</span>;
  return <PayBadge order={order} />;
}

function Thumb({ src, alt = "" }) {
  return (
    <span className="sd-thumb">
      {src ? <img src={src} alt={alt} loading="lazy" /> : <Icon name="image" size={18} />}
    </span>
  );
}

function ContactButtons({ phone, name, email, message, large }) {
  if (!phone) return null;
  return (
    <span className={`sd-contact ${large ? "sd-contact-lg" : ""}`}>
      <a href={`tel:+${cleanPhone(phone)}`} className="sd-cbtn" aria-label={`Call ${name}`} title="Call">
        <Icon name="phone" size={16} />
        {large && "Call"}
      </a>
      <a
        href={waUrl(phone, message)}
        target="_blank"
        rel="noopener noreferrer"
        className="sd-cbtn sd-cbtn-wa"
        aria-label={`WhatsApp ${name}`}
        title="WhatsApp"
      >
        <WhatsAppIcon size={large ? 26 : 28} />
        {large && "WhatsApp"}
      </a>
      {large && email && (
        <a href={`mailto:${email}`} className="sd-cbtn" aria-label={`Email ${name}`} title="Email">
          <Icon name="mail" size={16} />
          Email
        </a>
      )}
    </span>
  );
}

function ProductsCell({ items = [] }) {
  const first = items[0];
  if (!first) return <span className="sd-person-meta">—</span>;
  const extra = items.length - 1;
  return (
    <div className="sd-prod">
      <Thumb src={first.image} alt={first.name} />
      <div>
        <span className="sd-prod-name" title={first.name}>
          {first.name}
        </span>
        {extra > 0 && <span className="sd-prod-more">+{extra} more</span>}
      </div>
    </div>
  );
}

function Empty({ icon = "box", title, text, small, children }) {
  return (
    <div className={`sd-empty ${small ? "sd-empty-sm" : ""}`}>
      <span className="sd-empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}

function StepTracker({ status }) {
  const cancelled = status === "cancelled";
  const current = STEPS.indexOf(status);
  return (
    <ol className="sd-steps" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const state = cancelled ? "" : i < current ? "done" : i === current ? "now" : "";
        return (
          <li key={s} className={`sd-step ${state ? `sd-step-${state}` : ""}`}>
            <span className="sd-step-dot">{state === "done" ? <Icon name="check" size={13} /> : i + 1}</span>
            <span className="sd-step-label">{STATUS_META[s].label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- order manager (modal) ---------------- */
function OrderModal({ order, storeName, rates, onClose, onStatusChange, onPaymentChange, onCopy }) {
  const [busy, setBusy] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");

  const next = NEXT_ACTION[order.status];
  const canCancel = SELLER_CANCELLABLE.includes(order.status);
  const cancelled = order.status === "cancelled";
  const paid = order.payment?.status === "paid";
  const isOnline = order.payment?.method === "razorpay";
  const st = order.settlement || {};
  const c = order.customer || {};
  const cancel = order.cancellation || {};
  const fm = (v) => formatMoney(v, order.currency);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function submitStatus(status, why) {
    if (busy) return;
    setBusy(true);
    setErr("");
    const result = await onStatusChange(order._id, status, why);
    setBusy(false);
    if (!result.ok) {
      setErr(result.message);
      return;
    }
    setCancelling(false);
    setReason("");
  }

  async function togglePayment() {
    if (payBusy) return;
    setPayBusy(true);
    setErr("");
    const result = await onPaymentChange(order._id, paid ? "pending" : "paid");
    setPayBusy(false);
    if (!result.ok) setErr(result.message);
  }

  const fullAddress = `${c.address}, ${c.city}, ${c.state} - ${c.pincode}`;

  return (
    <div className="sd-modal-backdrop" onClick={onClose}>
      <div
        className="sd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sd-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sd-modal-head">
          <div>
            <h2 id="sd-modal-title" className="sd-modal-title">
              Order #{order.orderNumber}
            </h2>
            <p className="sd-modal-date">
              {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
            </p>
          </div>
          <button type="button" className="sd-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* progress */}
        {cancelled ? (
          <div className="sd-box sd-cancel-box">
            <b>
              Cancelled by {cancel.cancelledBy === "seller" ? "you" : "the customer"}
              {cancel.cancelledAt ? ` · ${formatDate(cancel.cancelledAt)}` : ""}
            </b>
            {cancel.reason && <p style={{ marginTop: 4 }}>{cancel.reason}</p>}
          </div>
        ) : (
          <StepTracker status={order.status} />
        )}

        {/* what to do now */}
        {!cancelled && (
          <div className={`sd-hint sd-hint-${order.status}`}>
            <span className="sd-hint-icon">
              <Icon name={next ? "bulb" : "check"} size={18} />
            </span>
            <div>
              <p>{next ? next.help : FINAL_HELP[order.status]}</p>
              {order.status === "pending" && (
                <ul className="sd-checklist">
                  {PENDING_CHECKLIST.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* main action */}
        {(next || canCancel) && (
          <div className="sd-actionbox">
            {!cancelling ? (
              <>
                {next && (
                  <button type="button" className="sd-bigbtn" disabled={busy} onClick={() => submitStatus(next.to)}>
                    {busy ? "Updating…" : next.label}
                    {!busy && <Icon name="arrow" size={18} />}
                  </button>
                )}
                {canCancel && (
                  <button type="button" className="sd-textbtn" disabled={busy} onClick={() => setCancelling(true)}>
                    Cancel this order
                  </button>
                )}
              </>
            ) : (
              <div className="sd-cancel-form">
                <label htmlFor="sd-cancel-reason" className="sd-person-meta">
                  Why are you cancelling? (the customer will see this)
                </label>
                <textarea
                  id="sd-cancel-reason"
                  className="sd-reason"
                  rows={3}
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Item is out of stock"
                />
                {isOnline && paid && (
                  <p className="sd-subnote">
                    The customer has already paid online. The full amount will be refunded to them automatically.
                  </p>
                )}
                <div className="sd-status-actions">
                  <button
                    type="button"
                    className="sd-danger sd-danger-solid"
                    disabled={busy || reason.trim().length < 3}
                    onClick={() => submitStatus("cancelled", reason.trim())}
                  >
                    {busy ? "Cancelling…" : "Yes, cancel order"}
                  </button>
                  <button type="button" className="sd-ghost" disabled={busy} onClick={() => setCancelling(false)}>
                    Go back
                  </button>
                </div>
              </div>
            )}
            {err && (
              <p className="sd-more-err" role="alert" style={{ marginTop: 10 }}>
                {err}
              </p>
            )}
          </div>
        )}

        {/* customer */}
        <div className="sd-box">
          <h3 className="sd-box-title">Customer</h3>
          <div className="sd-person" style={{ marginBottom: 14 }}>
            <div>
              <p className="sd-person-name">{c.name}</p>
              <p className="sd-person-meta">{formatPhone(c.phone)}</p>
              {c.email && <p className="sd-person-meta">{c.email}</p>}
            </div>
          </div>
          <ContactButtons
            large
            phone={c.phone}
            name={c.name}
            email={c.email}
            message={waMessage(order, storeName)}
          />
          <dl className="sd-kv" style={{ marginTop: 16 }}>
            <dt>Deliver to</dt>
            <dd>
              {fullAddress}
              <button type="button" className="sd-copy" onClick={() => onCopy(fullAddress)}>
                <Icon name="copy" size={13} /> Copy address
              </button>
            </dd>
            {order.note && (
              <>
                <dt>Customer note</dt>
                <dd>{order.note}</dd>
              </>
            )}
          </dl>
        </div>

        {/* payment */}
        <div className="sd-box sd-paybox">
          <h3 className="sd-box-title">Payment</h3>

          {isOnline && !cancelled && (
            <>
              <p className="sd-subnote">
                The customer paid online through Razorpay. You do not need to collect any payment.
              </p>

              <div className="sd-break">
                <div className="sd-break-row">
                  <span>Customer paid</span>
                  <b>{fm(st.customerPaid)}</b>
                </div>
                <div className="sd-break-row sd-break-minus">
                  <span>Razorpay fee ({rates.gatewayPercent}%)</span>
                  <b>− {fm(st.gatewayFee)}</b>
                </div>
                <div className="sd-break-row sd-break-minus">
                  <span>GST ({rates.gstPercent}% on Razorpay fee)</span>
                  <b>− {fm(st.gstOnFee)}</b>
                </div>
                <div className="sd-break-row sd-break-minus">
                  <span>Platform commission (per order)</span>
                  <b>− {fm(st.platformFee)}</b>
                </div>
                <div className="sd-break-row sd-break-total">
                  <span>You will receive</span>
                  <b>{fm(st.sellerNet)}</b>
                </div>
              </div>

              {payoutText(st, rates.payoutDays) && (
                <p className={`sd-payout sd-payout-${st.payoutState}`}>{payoutText(st, rates.payoutDays)}</p>
              )}
            </>
          )}

          {isOnline && cancelled && (
            <div className="sd-paybox-row">
              <div>
                <p className="sd-paybox-amount">{fm(order.subtotal)}</p>
                <p className="sd-person-meta">
                  {order.payment?.status === "refunded"
                    ? "Order cancelled. The payment was refunded to the customer."
                    : order.payment?.status === "refund_pending"
                    ? "Order cancelled. The refund to the customer is being processed."
                    : "Order cancelled, nothing to receive."}
                </p>
              </div>
              <PayBadge order={order} />
            </div>
          )}

          {/* purane orders (jo online payment se pehle aaye the) */}
          {!isOnline && (
            <>
              <p className="sd-subnote">
                This order was placed before online payments. Payment is handled directly between you and the
                customer.
              </p>
              <div className="sd-paybox-row">
                <div>
                  <p className="sd-paybox-amount">{fm(order.subtotal)}</p>
                  {cancelled && <p className="sd-person-meta">Order cancelled, nothing to collect</p>}
                </div>
                <PayBadge order={order} />
              </div>
              {!cancelled && (
                <button
                  type="button"
                  className={paid ? "sd-ghost" : "sd-primary sd-paybtn"}
                  disabled={payBusy}
                  onClick={togglePayment}
                >
                  {payBusy ? "Saving…" : paid ? "Mark as not paid" : "Payment received"}
                </button>
              )}
            </>
          )}
        </div>

        {/* products */}
        <div className="sd-box">
          <h3 className="sd-box-title">Products</h3>
          <ul className="sd-items">
            {order.items.map((it, i) => (
              <li key={i} className="sd-item">
                <Thumb src={it.image} alt={it.name} />
                <div className="sd-item-info">
                  <p className="sd-item-name">{it.name}</p>
                  <p className="sd-item-meta">
                    {formatMoney(it.price, it.currency || order.currency)} × {it.quantity}
                  </p>
                </div>
                <b className="sd-item-total">{formatMoney(it.lineTotal, it.currency || order.currency)}</b>
              </li>
            ))}
          </ul>
          <div className="sd-sumrow">
            <span>
              Total ({order.totalQty} {order.totalQty === 1 ? "item" : "items"})
            </span>
            <b>{formatMoney(order.subtotal, order.currency)}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- settlement receipt (modal + PDF download) ---------------- */
function ReceiptModal({ s, o, rates, storeName, onClose, onDownload }) {
  const b = orderBreakdown(o, rates);
  const fm = (v) => formatMoney(v, "INR");
  const isPaid = s.status === "Paid";
  const when = isPaid && s.paidAt ? s.paidAt : s.createdAt;
  const statusText = isPaid ? "Paid to you" : s.status === "Failed" ? "Transfer failed" : "Processing";
  const statusCls = isPaid ? "sd-paybadge-paid" : "sd-paybadge-due";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="sd-modal-backdrop" onClick={onClose}>
      <div
        className="sd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sd-receipt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sd-modal-head">
          <div>
            <h2 id="sd-receipt-title" className="sd-modal-title">
              Receipt · Order #{o.orderNumber}
            </h2>
            <p className="sd-modal-date">
              {formatDate(when)} at {formatTime(when)}
            </p>
          </div>
          <button type="button" className="sd-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* order + payout details */}
        <div className="sd-box">
          <h3 className="sd-box-title">Payout details</h3>
          <dl className="sd-kv">
            <dt>Order</dt>
            <dd>#{o.orderNumber}</dd>
            <dt>Items</dt>
            <dd>{o.items || "-"}</dd>
            <dt>Status</dt>
            <dd>
              <span className={`sd-paybadge ${statusCls}`}>{statusText}</span>
            </dd>
            {isPaid && (
              <>
                <dt>UTR</dt>
                <dd style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{s.utr || "-"}</dd>
              </>
            )}
            <dt>Sent to</dt>
            <dd>
              {s.bank?.bankName || "Your bank"} {s.bank?.last4 ? `••••${s.bank.last4}` : ""}
            </dd>
          </dl>
        </div>

        {/* how the money is calculated */}
        <div className="sd-box">
          <h3 className="sd-box-title">How your money is calculated</h3>
          <div className="sd-break" style={{ margin: 0 }}>
            <div className="sd-break-row">
              <span className="sd-break-label">
                Customer paid
                <em>Total amount the customer paid online</em>
              </span>
              <b>{fm(b.paid)}</b>
            </div>
            <div className="sd-break-row sd-break-minus">
              <span className="sd-break-label">
                Razorpay fee ({rates.gatewayPercent}%)
                <em>
                  {rates.gatewayPercent}% of {fm(b.paid)}
                </em>
              </span>
              <b>− {fm(b.fee)}</b>
            </div>
            <div className="sd-break-row sd-break-minus">
              <span className="sd-break-label">
                GST ({rates.gstPercent}% on fee)
                <em>
                  {rates.gstPercent}% of the Razorpay fee ({fm(b.fee)}), not of the order
                </em>
              </span>
              <b>− {fm(b.gst)}</b>
            </div>
            <div className="sd-break-row sd-break-minus">
              <span className="sd-break-label">
                Platform commission
                <em>Fixed amount per order</em>
              </span>
              <b>− {fm(b.platform)}</b>
            </div>
            <div className="sd-break-row sd-break-total">
              <span>{isPaid ? "You received" : "You will receive"}</span>
              <b>{fm(b.net)}</b>
            </div>
          </div>
          <p className="sd-subnote" style={{ marginTop: 10 }}>
            Total deducted: {fm(round2(b.fee + b.gst + b.platform))}. You receive customer paid − Razorpay fee − GST −
            platform commission.
          </p>
        </div>

        <div className="sd-actionbox">
          <button type="button" className="sd-bigbtn" onClick={() => onDownload({ s, o, b })}>
            <Icon name="down" size={18} />
            Download receipt (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- settlement card (expand / collapse) ---------------- */
function SettlementCard({ s, onReceipt }) {
  const [open, setOpen] = useState(false);
  const fm = (v) => formatMoney(v, "INR");

  const label = s.status === "Paid" ? "Paid to you" : s.status === "Failed" ? "Transfer failed" : "Processing";
  const cls = s.status === "Paid" ? "sd-paybadge-paid" : "sd-paybadge-due";
  const when = s.status === "Paid" && s.paidAt ? s.paidAt : s.createdAt;

  return (
    <li className={`sd-settle ${open ? "sd-settle-open" : ""}`}>
      <button type="button" className="sd-settle-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="sd-settle-main">
          <span className="sd-settle-amount">{fm(s.amount)}</span>
          <span className="sd-person-meta">
            {s.orderCount} {s.orderCount === 1 ? "order" : "orders"} · {s.productCount}{" "}
            {s.productCount === 1 ? "product" : "products"}
          </span>
        </span>
        <span className="sd-settle-side">
          <span className={`sd-paybadge ${cls}`}>{label}</span>
          <span className="sd-person-meta">
            {formatDate(when)} · {formatTime(when)}
          </span>
        </span>
        <Icon name="chevron" size={16} />
      </button>

      {open && (
        <div className="sd-settle-body">
          {s.status === "Pending" && (
            <p className="sd-subnote">
              LinkStorx is transferring this amount to your bank account. The UTR will appear here once the transfer is done.
            </p>
          )}
          {s.status === "Failed" && (
            <p className="sd-subnote">
              This transfer did not go through. These orders are back in the payout queue and will be paid again.
            </p>
          )}

          <dl className="sd-kv">
            <dt>Amount</dt>
            <dd>{fm(s.amount)}</dd>
            {s.status === "Paid" && (
              <>
                <dt>UTR</dt>
                <dd style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{s.utr || "-"}</dd>
                <dt>Paid on</dt>
                <dd>
                  {formatDate(s.paidAt)} · {formatTime(s.paidAt)}
                </dd>
              </>
            )}
            <dt>Sent to</dt>
            <dd>
              {s.bank.bankName || "Your bank"} {s.bank.last4 ? `••••${s.bank.last4}` : ""}
            </dd>
            <dt>Created</dt>
            <dd>{formatDate(s.createdAt)}</dd>
          </dl>

          <h4 className="sd-box-title" style={{ marginTop: 14 }}>
            Orders in this payout
          </h4>
          <ul className="sd-items sd-items-scroll sd-scroll">
            {s.orders.map((o) => (
              <li key={o.orderNumber} className="sd-item sd-item-col">
                <div className="sd-item-row">
                  <div className="sd-item-info">
                    <p className="sd-item-name">#{o.orderNumber}</p>
                    <p className="sd-item-meta">{o.items || "-"}</p>
                  </div>
                  <b className="sd-item-total">{fm(o.amount)}</b>
                </div>
                <button type="button" className="sd-view sd-view-receipt" onClick={() => onReceipt(s, o)}>
                  <Icon name="receipt" size={15} />
                  View receipt
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/* ---------------- loading skeleton ---------------- */
function DashboardSkeleton() {
  return (
    <>
      <div className="sd-kpis">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sd-skel sd-skel-kpi" />
        ))}
      </div>
      <div className="sd-status-grid">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="sd-skel sd-skel-status" />
        ))}
      </div>
      <div className="sd-card sd-card-pad">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="sd-skel sd-skel-row" />
        ))}
      </div>
    </>
  );
}

/* =========================================================
   MAIN
   ========================================================= */
export default function SellerDashboard() {
  const [range, setRange] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // orders
  const [orders, setOrders] = useState([]);
  const [ordersMeta, setOrdersMeta] = useState({ hasMore: false, total: 0 });
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [filter, setFilter] = useState({ status: "", q: "" });
  const [searchText, setSearchText] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [rowBusy, setRowBusy] = useState("");

  // customers
  const [customers, setCustomers] = useState([]);
  const [custHasMore, setCustHasMore] = useState(false);
  const [custLoading, setCustLoading] = useState(false);

  // settlements
  const [settlements, setSettlements] = useState([]);
  const [settleHasMore, setSettleHasMore] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState(false);

  // ui
  const [active, setActive] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [toast, setToast] = useState(null);
  const [showLowStock, setShowLowStock] = useState(false);

  const ordersRef = useRef(null);
  const reqId = useRef(0);

  /* ---------- toast ---------- */
  function showToast(msg, type = "ok") {
    setToast({ msg, type, id: Date.now() });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- dashboard stats ---------- */
  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError("");
      }
      try {
        const res = await fetch(`${API}?range=${range}&limit=${PAGE_SIZE}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Could not load your dashboard");
        }
        setData(json);
        if (!silent) {
          setCustomers(json.customers || []);
          setCustHasMore(Boolean(json.customersHasMore));
          setSettlements(json.settlements || []);
          setSettleHasMore(Boolean(json.settlementsHasMore));
          setSettleError(false);
        }
      } catch (err) {
        if (!silent) setError(err.message || "Something went wrong");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [range]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ---------- search debounce ---------- */
  useEffect(() => {
    const t = setTimeout(() => {
      setFilter((f) => (f.q === searchText.trim() ? f : { ...f, q: searchText.trim() }));
    }, 350);
    return () => clearTimeout(t);
  }, [searchText]);

  /* ---------- orders (filter / search) ---------- */
  useEffect(() => {
    const id = ++reqId.current;
    setOrdersLoading(true);
    setOrdersError("");

    (async () => {
      try {
        const params = new URLSearchParams({
          section: "orders",
          skip: "0",
          limit: String(PAGE_SIZE),
          status: filter.status,
          q: filter.q,
        });
        const res = await fetch(`${API}?${params}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (id !== reqId.current) return;
        if (!res.ok || !json.success) throw new Error(json.message || "Could not load orders");
        setOrders(json.orders);
        setOrdersMeta({ hasMore: json.hasMore, total: json.total });
        setMoreError(false);
      } catch (err) {
        if (id === reqId.current) setOrdersError(err.message || "Could not load orders");
      } finally {
        if (id === reqId.current) setOrdersLoading(false);
      }
    })();
  }, [filter.status, filter.q, reloadKey]);

  async function loadMore() {
    if (moreLoading) return;
    setMoreLoading(true);
    setMoreError(false);
    try {
      const params = new URLSearchParams({
        section: "orders",
        skip: String(orders.length),
        limit: String(PAGE_SIZE),
        status: filter.status,
        q: filter.q,
      });
      const res = await fetch(`${API}?${params}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error();
      setOrders((prev) => {
        const seen = new Set(prev.map((o) => o._id));
        return [...prev, ...json.orders.filter((o) => !seen.has(o._id))];
      });
      setOrdersMeta({ hasMore: json.hasMore, total: json.total });
    } catch {
      setMoreError(true);
    } finally {
      setMoreLoading(false);
    }
  }

  async function loadMoreCustomers() {
    if (custLoading) return;
    setCustLoading(true);
    try {
      const res = await fetch(`${API}?section=customers&skip=${customers.length}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error();
      setCustomers((prev) => {
        const seen = new Set(prev.map((c) => c.key));
        return [...prev, ...json.customers.filter((c) => !seen.has(c.key))];
      });
      setCustHasMore(Boolean(json.hasMore));
    } catch {
      showToast("Couldn't load more customers", "error");
    } finally {
      setCustLoading(false);
    }
  }

  async function loadMoreSettlements() {
    if (settleLoading) return;
    setSettleLoading(true);
    setSettleError(false);
    try {
      const res = await fetch(
        `${API}?section=settlements&skip=${settlements.length}&limit=${PAGE_SIZE}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error();
      setSettlements((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...json.settlements.filter((x) => !seen.has(x.id))];
      });
      setSettleHasMore(Boolean(json.hasMore));
    } catch {
      setSettleError(true);
      showToast("Couldn't load more settlements", "error");
    } finally {
      setSettleLoading(false);
    }
  }

  /* ---------- scroll = auto load next 10 ---------- */
  function onOrdersScroll(e) {
    if (nearBottom(e) && ordersMeta.hasMore && !moreLoading && !moreError && !ordersLoading) loadMore();
  }

  function onSettleScroll(e) {
    if (nearBottom(e) && settleHasMore && !settleLoading && !settleError) loadMoreSettlements();
  }

  /* ---------- in-page navigation helpers ---------- */
  function scrollToOrders() {
    setTimeout(() => ordersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  function applyStatus(status) {
    setFilter((f) => ({ ...f, status: f.status === status ? "" : status }));
    scrollToOrders();
  }

  function clearFilters() {
    setSearchText("");
    setFilter({ status: "", q: "" });
  }

  function showCustomerOrders(customer) {
    const term = String(customer.phone || customer.name || "");
    setSearchText(term);
    setFilter({ status: "", q: term });
    scrollToOrders();
  }

  /* ---------- order actions ---------- */
  async function changeStatus(orderId, status, reason) {
    try {
      const res = await fetch(API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status, reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        return { ok: false, message: json.message || "Couldn't update the order" };
      }

      const updated = json.order;
      const leavesFilter = filter.status && updated.status !== filter.status;

      setOrders((prev) =>
        leavesFilter ? prev.filter((o) => o._id !== orderId) : prev.map((o) => (o._id === orderId ? updated : o))
      );
      if (leavesFilter) setOrdersMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
      setActive((cur) => (cur && cur._id === orderId ? updated : cur));
      loadDashboard(true);

      showToast(
        status === "cancelled"
          ? `Order #${updated.orderNumber} cancelled`
          : STATUS_TOAST[status] || `Order #${updated.orderNumber} is now ${STATUS_META[status].label}`
      );
      return { ok: true };
    } catch {
      return { ok: false, message: "Network error. Please try again." };
    }
  }

  // Sirf purane (pre-online-payment) orders ke liye
  async function changePayment(orderId, paymentStatus) {
    try {
      const res = await fetch(API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        return { ok: false, message: json.message || "Couldn't update the payment" };
      }
      const updated = json.order;
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      setActive((cur) => (cur && cur._id === orderId ? updated : cur));
      loadDashboard(true);
      showToast(
        paymentStatus === "paid"
          ? "Payment marked as received."
          : `Order #${updated.orderNumber} marked as not paid`
      );
      return { ok: true };
    } catch {
      return { ok: false, message: "Network error. Please try again." };
    }
  }

  function openOrder(order) {
    setActive(order);
    // seller ne dekh liya -> sellerSeen = true
    if (order.sellerSeen === false) {
      setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, sellerSeen: true } : o)));
      fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order._id }),
      }).catch(() => {});
    }
  }

  async function openOrderById(id) {
    const found = orders.find((o) => o._id === id);
    if (found) return openOrder(found);
    try {
      const res = await fetch(`${API}?section=order&id=${id}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error();
      openOrder(json.order);
    } catch {
      showToast("Couldn't open that order", "error");
    }
  }

  // Table / card me ek-tap quick action
  async function quickAdvance(order) {
    const next = NEXT_ACTION[order.status];
    if (!next) return;
    // Purane (non-online) orders me delivered se pehle modal (payment check) dikhao
    if (next.to === "delivered" && order.payment?.method !== "razorpay") return openOrder(order);
    if (rowBusy) return;
    setRowBusy(order._id);
    const result = await changeStatus(order._id, next.to);
    setRowBusy("");
    if (!result.ok) showToast(result.message, "error");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Address copied");
    } catch {
      showToast("Couldn't copy. Please select and copy manually.", "error");
    }
  }

  /* ---------- settlement receipt ---------- */
  function openReceipt(s, o) {
    setReceipt({ s, o });
  }

  function downloadReceipt({ s, o, b }) {
    try {
      const blob = makePdf(receiptLines({ s, o, b, rates, storeName }));
      downloadBlob(blob, `receipt-order-${o.orderNumber}.pdf`);
      showToast("Receipt downloaded");
    } catch {
      showToast("Couldn't download the receipt. Please try again.", "error");
    }
  }

  /* ---------- derived ---------- */
  const seller = data?.seller || {};
  const stats = data?.stats || {};
  const counts = data?.statusCounts || {};
  const attn = data?.attention || {};
  const earn = data?.earnings || {};
  const rates = data?.feeRates || { gatewayPercent: 2, gstPercent: 18, platformFee: 20, payoutDays: 7 };
  const notifications = data?.notifications || [];
  const lowStockList = data?.lowStockList || [];
  const storeName = seller.storeName || "";
  const firstName = String(seller.name || "").trim().split(/\s+/)[0] || "there";
  const allOrdersCount = ORDER_STATUSES.reduce((sum, s) => sum + (counts[s] || 0), 0);
  const rangeLabel = RANGES.find((r) => r.value === range)?.label || "";
  const inRange = range === "all" ? "" : ` (${rangeLabel.toLowerCase()})`;
  const filtering = Boolean(filter.status || filter.q);
  const money = (v) => formatMoney(v || 0, stats.currency || "INR");

  const attentionItems = [
    {
      key: "pending",
      count: counts.pending || 0,
      text: (counts.pending || 0) === 1 ? "Pending order to confirm" : "Pending orders to confirm",
      tone: "pending",
      onClick: () => applyStatus("pending"),
    },
    {
      key: "cancelled",
      count: attn.recentCancelled || 0,
      text:
        (attn.recentCancelled || 0) === 1 ? "Order cancelled this week" : "Orders cancelled this week",
      tone: "cancelled",
      onClick: () => applyStatus("cancelled"),
    },
    {
      key: "stock",
      count: attn.lowStock || 0,
      text: (attn.lowStock || 0) === 1 ? "Product running low" : "Products running low",
      tone: "confirmed",
      onClick: () => setShowLowStock((v) => !v),
    },
  ];

  const noteTone = {
    new_order: { cls: "sd-st-delivered", icon: "box" },
    cancelled: { cls: "sd-st-cancelled", icon: "x" },
    pending: { cls: "sd-st-pending", icon: "clock" },
    low_stock: { cls: "sd-st-confirmed", icon: "alert" },
  };

  function onNoteClick(n) {
    if (n.type === "new_order" || n.type === "cancelled") return openOrderById(n.orderId);
    if (n.type === "pending") return applyStatus("pending");
    setShowLowStock(true);
  }

  /* ---------- order row actions ---------- */
  function RowActions({ o }) {
    const next = NEXT_ACTION[o.status];
    return (
      <div className="sd-actions">
        {next && (
          <button
            type="button"
            className={`sd-next sd-next-${o.status}`}
            disabled={rowBusy === o._id}
            onClick={() => quickAdvance(o)}
          >
            {rowBusy === o._id ? "Saving…" : next.short}
          </button>
        )}
        <button type="button" className="sd-view" onClick={() => openOrder(o)}>
          View receipt
        </button>
        <ContactButtons
          phone={o.customer?.phone}
          name={o.customer?.name}
          message={waMessage(o, storeName)}
        />
      </div>
    );
  }

  /* =========================================================
     RENDER
     ========================================================= */
  return (
    <div className="sd-page">
      {/* ================= WELCOME ================= */}
      <header className="sd-head">
        <div>
          <h1 className="sd-title">Welcome back, {firstName}! 👋</h1>
          <p className="sd-sub">Here&apos;s what&apos;s happening with your store today.</p>
        </div>

        <label className="sd-range">
          <Icon name="calendar" size={18} />
          <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Time period for the numbers">
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="sd-chev">
            <Icon name="chevron" size={16} />
          </span>
        </label>
      </header>

      {/* ================= PAYMENT & PAYOUT NOTICE ================= */}
      <section className="sd-notice" aria-label="Payments and payouts">
        <div className="sd-notice-body">
          <h2 className="sd-notice-title">How payments &amp; payouts work</h2>
          <p>
            Customers pay online through Razorpay, so you don&apos;t need to collect any money. From every order we
            deduct the Razorpay fee ({rates.gatewayPercent}%), {rates.gstPercent}% GST on that fee and a platform
            commission of {formatMoney(rates.platformFee, "INR")} per order. The remaining amount is paid to you within{" "}
            {rates.payoutDays} days after the order is delivered. Delivery is still arranged by you.
          </p>
        </div>
      </section>

      {loading && !data && <DashboardSkeleton />}

      {error && !data && (
        <div className="sd-card sd-card-pad">
          <Empty icon="alert" title="We couldn't load your dashboard" text={error}>
            <button type="button" className="sd-retry" onClick={() => loadDashboard()}>
              Try again
            </button>
          </Empty>
        </div>
      )}

      {data && (
        <>
          {/* ================= HOW IT WORKS (always visible) ================= */}
          <section className="sd-tip" aria-label="How to manage orders">
            <div className="sd-tip-body">
              <h2 className="sd-tip-title">How to manage an order</h2>
              <ol className="sd-tip-steps">
                <li>
                  A new order appears as <b>Pending</b> after the customer has paid online.
                </li>
                <li>
                  Contact the customer by Call or WhatsApp, confirm the address and delivery details, then tap{" "}
                  <b>Confirm</b>.
                </li>
                <li>Pack the product, arrange delivery yourself, then tap <b>Shipped</b>.</li>
                <li>
                  Once the customer receives it, tap <b>Delivered</b>. Your earnings for that order become eligible
                  for payout.
                </li>
              </ol>
            </div>
          </section>

          {/* ================= KPI ================= */}
          <section className="sd-kpis" aria-label="Store summary">
            <div className="sd-kpi sd-kpi-orders">
              <span className="sd-kpi-icon">
                <Icon name="box" size={26} />
              </span>
              <div className="sd-kpi-body">
                <p className="sd-kpi-label">Total Orders</p>
                <p className="sd-kpi-value">{stats.totalOrders || 0}</p>
                <p className="sd-kpi-note">All orders received{inRange}</p>
              </div>
            </div>

            <div className="sd-kpi sd-kpi-sales">
              <span className="sd-kpi-icon">
                <Icon name="wallet" size={26} />
              </span>
              <div className="sd-kpi-body">
                <p className="sd-kpi-label">Total Sales</p>
                <p className="sd-kpi-value">{money(stats.totalSales)}</p>
                <p className="sd-kpi-note">From delivered orders{inRange}</p>
              </div>
            </div>

            <div className="sd-kpi sd-kpi-pending">
              <span className="sd-kpi-icon">
                <Icon name="clock" size={26} />
              </span>
              <div className="sd-kpi-body">
                <p className="sd-kpi-label">Pending Orders</p>
                <p className="sd-kpi-value">{counts.pending || 0}</p>
                <p className="sd-kpi-note">Need your attention</p>
              </div>
            </div>

            <div className="sd-kpi sd-kpi-customers">
              <span className="sd-kpi-icon">
                <Icon name="users" size={26} />
              </span>
              <div className="sd-kpi-body">
                <p className="sd-kpi-label">Total Customers</p>
                <p className="sd-kpi-value">{stats.totalCustomers || 0}</p>
                <p className="sd-kpi-note">Customers who placed orders{inRange}</p>
              </div>
            </div>
          </section>

          {/* ================= EARNINGS ================= */}
          <section className="sd-card sd-card-pad" aria-labelledby="sd-h-earn">
            <div className="sd-card-head">
              <div>
                <h2 id="sd-h-earn" className="sd-card-title">
                  Your Earnings
                </h2>
                <p className="sd-card-sub">Online orders after Razorpay fee, GST and platform commission (all time)</p>
              </div>
            </div>

            <div className="sd-earn-grid">
              <div className="sd-earn sd-earn-eligible">
                <span className="sd-earn-label">Eligible for payout</span>
                <b className="sd-earn-value">{money(earn.eligible)}</b>
                <span className="sd-earn-note">Delivered orders. Paid to you within {rates.payoutDays} days of delivery.</span>
              </div>
              <div className="sd-earn sd-earn-upcoming">
                <span className="sd-earn-label">Eligible after delivery</span>
                <b className="sd-earn-value">{money(earn.upcoming)}</b>
                <span className="sd-earn-note">Paid orders that are not delivered yet.</span>
              </div>
              <div className="sd-earn sd-earn-paid">
                <span className="sd-earn-label">Paid to you</span>
                <b className="sd-earn-value">{money(earn.paidOut)}</b>
                <span className="sd-earn-note">Already transferred to you.</span>
              </div>
            </div>

            <div className="sd-break sd-break-card">
              <div className="sd-break-row">
                <span>Customers paid (active orders)</span>
                <b>{money(earn.gross)}</b>
              </div>
              <div className="sd-break-row sd-break-minus">
                <span>Razorpay fee ({rates.gatewayPercent}%)</span>
                <b>− {money(earn.gatewayFee)}</b>
              </div>
              <div className="sd-break-row sd-break-minus">
                <span>GST ({rates.gstPercent}% on Razorpay fee)</span>
                <b>− {money(earn.gstOnFee)}</b>
              </div>
              <div className="sd-break-row sd-break-minus">
                <span>Platform commission ({formatMoney(rates.platformFee, "INR")} per order)</span>
                <b>− {money(earn.platformFee)}</b>
              </div>
              <div className="sd-break-row sd-break-total">
                <span>Your total share</span>
                <b>{money(earn.net)}</b>
              </div>
            </div>
          </section>

          {/* ================= SETTLEMENTS HISTORY ================= */}
          <section className="sd-card sd-card-pad" aria-labelledby="sd-h-settle">
            <div className="sd-card-head">
              <div>
                <h2 id="sd-h-settle" className="sd-card-title">
                  Settlements History
                </h2>
                <p className="sd-card-sub">
                  Every payout LinkStorx has made to you. Tap one to see the orders, UTR and receipts.
                </p>
              </div>
            </div>

            {settlements.length === 0 ? (
              <Empty
                small
                icon="wallet"
                title="No settlements yet"
                text="Once your delivered orders are verified and paid out, they will show up here."
              />
            ) : (
              <>
                <ul className="sd-settle-list sd-scroll sd-settle-scroll" onScroll={onSettleScroll}>
                  {settlements.map((s) => (
                    <SettlementCard key={s.id} s={s} onReceipt={openReceipt} />
                  ))}
                  {settleLoading && (
                    <li className="sd-scroll-note" aria-live="polite">
                      Loading…
                    </li>
                  )}
                </ul>
                {settleHasMore && (
                  <div className="sd-more">
                    <button type="button" className="sd-more-btn" onClick={loadMoreSettlements} disabled={settleLoading}>
                      {settleLoading ? "Loading…" : settleError ? "Try again" : "Show more"}
                      {!settleLoading && <Icon name="down" size={16} />}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* ================= STATUS SUMMARY ================= */}
          <section className="sd-card sd-card-pad" aria-labelledby="sd-h-status">
            <div className="sd-card-head">
              <div>
                <h2 id="sd-h-status" className="sd-card-title">
                  Order Status Summary
                </h2>
                <p className="sd-card-sub">Tap a status to see only those orders</p>
              </div>
            </div>
            <div className="sd-status-grid">
              {ORDER_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={filter.status === s}
                  className={`sd-status sd-st-${s} ${filter.status === s ? "sd-status-active" : ""}`}
                  onClick={() => applyStatus(s)}
                >
                  <span className="sd-status-icon">
                    <Icon name={STATUS_META[s].icon} size={20} />
                  </span>
                  <span>
                    <span className="sd-status-name">{STATUS_META[s].label}</span>
                    <span className="sd-status-count" style={{ display: "block" }}>
                      {counts[s] || 0}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ================= ORDERS ================= */}
          <section className="sd-card sd-card-pad sd-orders" ref={ordersRef} aria-labelledby="sd-h-orders">
            <div className="sd-card-head">
              <div>
                <h2 id="sd-h-orders" className="sd-card-title">
                  Orders
                </h2>
                <p className="sd-card-sub">Latest paid orders from your customers</p>
              </div>

              <label className="sd-search">
                <Icon name="search" size={16} />
                <input
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search name, phone or order no."
                  aria-label="Search orders"
                />
              </label>
            </div>

            {/* status chips */}
            <div className="sd-chips" role="tablist" aria-label="Filter orders by status">
              <button
                type="button"
                role="tab"
                aria-selected={!filter.status}
                className={`sd-chip ${!filter.status ? "sd-chip-active" : ""}`}
                onClick={() => setFilter((f) => ({ ...f, status: "" }))}
              >
                All <span className="sd-chip-count">{allOrdersCount}</span>
              </button>
              {ORDER_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={filter.status === s}
                  className={`sd-chip ${filter.status === s ? "sd-chip-active" : ""}`}
                  onClick={() => setFilter((f) => ({ ...f, status: s }))}
                >
                  {STATUS_META[s].label} <span className="sd-chip-count">{counts[s] || 0}</span>
                </button>
              ))}
            </div>

            {filter.q && (
              <p className="sd-filter-note">
                Showing results for “{filter.q}”
                <button type="button" onClick={clearFilters}>
                  Clear
                </button>
              </p>
            )}

            {ordersError ? (
              <Empty icon="alert" title="We couldn't load your orders" text={ordersError}>
                <button type="button" className="sd-retry" onClick={() => setReloadKey((k) => k + 1)}>
                  Try again
                </button>
              </Empty>
            ) : ordersLoading && orders.length === 0 ? (
              <div>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="sd-skel sd-skel-row" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              filtering ? (
                <Empty
                  icon="search"
                  title={filter.status ? `No ${STATUS_META[filter.status].label.toLowerCase()} orders` : "No orders found"}
                  text="Try a different status or search."
                >
                  <button type="button" className="sd-retry" onClick={clearFilters}>
                    Show all orders
                  </button>
                </Empty>
              ) : (
                <Empty
                  icon="box"
                  title="No orders yet"
                  text="Your customer orders will appear here once someone places and pays for an order."
                />
              )
            ) : (
              <div style={{ opacity: ordersLoading ? 0.55 : 1, transition: "opacity .15s" }}>
                {/* desktop / tablet table (scrolls inside, loads next 10 at the bottom) */}
                <div className="sd-table-wrap sd-scroll" onScroll={onOrdersScroll}>
                  <table className="sd-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Products</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o._id} className={o.status === "pending" ? "sd-row-pending" : ""}>
                          <td>
                            <span className="sd-ordno">
                              #{o.orderNumber}
                              {o.sellerSeen === false && (
                                <span className="sd-dot" title="New" aria-label="Not seen yet" />
                              )}
                            </span>
                          </td>
                          <td>
                            <div className="sd-person">
                              <div>
                                <p className="sd-person-name">{o.customer?.name}</p>
                                <p className="sd-person-meta">{formatPhone(o.customer?.phone)}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <ProductsCell items={o.items} />
                          </td>
                          <td className="sd-num">{o.totalQty}</td>
                          <td className="sd-total">{formatMoney(o.subtotal, o.currency)}</td>
                          <td>
                            <PayCell order={o} />
                          </td>
                          <td>
                            <StatusBadge status={o.status} />
                          </td>
                          <td>
                            <div className="sd-date">
                              <b>{formatDate(o.createdAt)}</b>
                              <span>{formatTime(o.createdAt)}</span>
                            </div>
                          </td>
                          <td>
                            <RowActions o={o} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* mobile cards (scrolls inside too) */}
                <ul className="sd-order-cards sd-scroll" onScroll={onOrdersScroll}>
                  {orders.map((o) => (
                    <li key={o._id} className={`sd-ocard ${o.status === "pending" ? "sd-ocard-pending" : ""}`}>
                      <div className="sd-ocard-top">
                        <span className="sd-ordno">
                          #{o.orderNumber}
                          {o.sellerSeen === false && <span className="sd-dot" aria-label="Not seen yet" />}
                        </span>
                        <StatusBadge status={o.status} />
                      </div>

                      <div className="sd-ocard-mid">
                        <div className="sd-person">
                          <div>
                            <p className="sd-person-name">{o.customer?.name}</p>
                            <p className="sd-person-meta">{formatPhone(o.customer?.phone)}</p>
                          </div>
                        </div>
                        <ProductsCell items={o.items} />
                        <div className="sd-ocard-row">
                          <span className="sd-person-meta">
                            Qty <b className="sd-num">{o.totalQty}</b>
                          </span>
                          <PayBadge order={o} />
                          <b className="sd-total">{formatMoney(o.subtotal, o.currency)}</b>
                        </div>
                      </div>

                      <div className="sd-ocard-foot">
                        <div className="sd-date">
                          <b>{formatDate(o.createdAt)}</b>
                          <span>{formatTime(o.createdAt)}</span>
                        </div>
                      </div>
                      <RowActions o={o} />
                    </li>
                  ))}
                </ul>

                <div className="sd-more">
                  {ordersMeta.hasMore && (
                    <button type="button" className="sd-more-btn" onClick={loadMore} disabled={moreLoading}>
                      {moreLoading ? "Loading…" : "Show more"}
                      {!moreLoading && <Icon name="down" size={16} />}
                    </button>
                  )}
                  {moreError && <p className="sd-more-err">Couldn&apos;t load more orders. Please try again.</p>}
                  <p className="sd-more-note">
                    Showing {orders.length} of {ordersMeta.total} {ordersMeta.total === 1 ? "order" : "orders"}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ================= CUSTOMERS + ATTENTION / NOTIFICATIONS ================= */}
          <div className="sd-bottom">
            <section className="sd-card sd-card-pad" aria-labelledby="sd-h-cust">
              <div className="sd-card-head">
                <div>
                  <h2 id="sd-h-cust" className="sd-card-title">
                    Recent Customers
                  </h2>
                  <p className="sd-card-sub">People who ordered from you lately</p>
                </div>
              </div>

              {customers.length === 0 ? (
                <Empty
                  icon="users"
                  title="No customers yet"
                  text="Customers will appear here after their first order."
                />
              ) : (
                <>
                  <ul className="sd-cust-list">
                    {customers.map((c) => (
                      <li key={c.key} className="sd-cust">
                        <div className="sd-cust-main">
                          <p className="sd-person-name">{c.name}</p>
                          <p className="sd-person-meta">{formatPhone(c.phone)}</p>
                          {c.email && <p className="sd-person-meta">{c.email}</p>}
                        </div>
                        <div className="sd-cust-stats">
                          <div className="sd-cust-stat">
                            <span>Orders</span>
                            <b>{c.orders}</b>
                          </div>
                          <div className="sd-cust-stat">
                            <span>Spent</span>
                            <b>{formatMoney(c.spent, stats.currency || "INR")}</b>
                          </div>
                          <div className="sd-cust-stat">
                            <span>Last order</span>
                            <b>{formatDate(c.lastOrderAt)}</b>
                          </div>
                        </div>
                        <div className="sd-cust-actions">
                          <button type="button" className="sd-view" onClick={() => showCustomerOrders(c)}>
                            Orders
                          </button>
                          <ContactButtons
                            phone={c.phone}
                            name={c.name}
                            message={`Hi ${c.name}, this is ${storeName || "your seller"}.`}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  {custHasMore && (
                    <div className="sd-more">
                      <button type="button" className="sd-more-btn" onClick={loadMoreCustomers} disabled={custLoading}>
                        {custLoading ? "Loading…" : "Show more"}
                        {!custLoading && <Icon name="down" size={16} />}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            <div className="sd-stack">
              <section className="sd-card sd-card-pad" aria-labelledby="sd-h-attn">
                <div className="sd-card-head" style={{ marginBottom: 14 }}>
                  <h2 id="sd-h-attn" className="sd-card-title">
                    Needs Your Attention
                  </h2>
                </div>
                <ul className="sd-attn-list">
                  {attentionItems.map((a) => (
                    <li key={a.key}>
                      <button
                        type="button"
                        className={`sd-attn sd-st-${a.tone} ${a.count === 0 ? "sd-attn-zero" : ""}`}
                        onClick={a.onClick}
                      >
                        <span className="sd-attn-count">{a.count}</span>
                        <span className="sd-attn-text">{a.text}</span>
                        <Icon name={a.key === "stock" ? "chevron" : "arrow"} size={16} />
                      </button>
                    </li>
                  ))}
                </ul>

                {showLowStock && (
                  <div className="sd-lowlist">
                    {lowStockList.length === 0 ? (
                      <p className="sd-person-meta">All your products have enough stock.</p>
                    ) : (
                      <ul>
                        {lowStockList.map((p) => (
                          <li key={p.id}>
                            <span>{p.name}</span>
                            <b>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</b>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>

              <section className="sd-card sd-card-pad" aria-labelledby="sd-h-notes">
                <div className="sd-card-head" style={{ marginBottom: 14 }}>
                  <h2 id="sd-h-notes" className="sd-card-title">
                    Notifications
                  </h2>
                </div>
                {notifications.length === 0 ? (
                  <Empty
                    small
                    icon="bell"
                    title="You're all caught up"
                    text="New orders and important alerts will show up here."
                  />
                ) : (
                  <ul className="sd-notes">
                    {notifications.map((n) => {
                      const tone = noteTone[n.type] || noteTone.pending;
                      return (
                        <li key={n.id}>
                          <button type="button" className="sd-note sd-note-clickable" onClick={() => onNoteClick(n)}>
                            <span className={`sd-note-icon ${tone.cls}`}>
                              <Icon name={tone.icon} size={16} />
                            </span>
                            <div className="sd-note-body">
                              <p className="sd-note-title">{n.text}</p>
                              {n.at && <p className="sd-note-time">{timeAgo(n.at)}</p>}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      {active && (
        <OrderModal
          order={active}
          storeName={storeName}
          rates={rates}
          onClose={() => setActive(null)}
          onStatusChange={changeStatus}
          onPaymentChange={changePayment}
          onCopy={copyText}
        />
      )}

      {receipt && (
        <ReceiptModal
          s={receipt.s}
          o={receipt.o}
          rates={rates}
          storeName={storeName}
          onClose={() => setReceipt(null)}
          onDownload={downloadReceipt}
        />
      )}

      {toast && (
        <div className={`sd-toast ${toast.type === "error" ? "sd-toast-error" : ""}`} role="status" aria-live="polite">
          {toast.msg}
        </div>
      )}
    </div>
  );
}