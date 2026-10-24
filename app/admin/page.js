import Link from "next/link";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/app/lib/auth/auth";
import {
  getSellersForAdmin,
  reviewSellerByAdmin,
} from "@/app/businessLogic/productBusinessLogic";

import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const TABS = [
  ["", "All"],
  ["pending", "Pending"],
  ["verified", "Verified"],
  ["rejected", "Rejected"],
];

async function reviewAction(formData) {
  "use server";

  // Re-check admin inside the action; the page check alone is not enough.
  const admin = await requireAdmin();

  const sellerId = String(formData.get("sellerId") || "");
  const decision = String(formData.get("decision") || "");
  const reason = String(formData.get("reason") || "");

  try {
    await reviewSellerByAdmin(admin.id, sellerId, decision, reason);
  } catch (error) {
    if (!error.statusCode || error.statusCode === 500) console.error(error);
    // validation errors (e.g. missing reason) simply leave the seller unchanged
  }

  revalidatePath("/admin");
}

function fmt(date) {
  return date ? new Date(date).toLocaleString("en-IN") : "-";
}

function Badge({ value, prefix }) {
  return (
    <span className={`adm-badge adm-badge-${value}`}>
      {prefix}
      {value}
    </span>
  );
}

function Item({ label, value, mono }) {
  return (
    <div>
      <div className="adm-item-label">{label}</div>
      <div className={mono ? "adm-item-value adm-mono" : "adm-item-value"}>
        {value || "-"}
      </div>
    </div>
  );
}

export default async function AdminPage({ searchParams }) {
  const admin = await requireAdmin();

  const { status = "" } = await searchParams;

  const [sellers, allSellers] = await Promise.all([
    getSellersForAdmin(status),
    status ? getSellersForAdmin("") : null,
  ]);

  const counts = (allSellers || sellers).reduce(
    (acc, s) => {
      acc.all += 1;
      acc[s.sellerStatus] = (acc[s.sellerStatus] || 0) + 1;
      return acc;
    },
    { all: 0, pending: 0, verified: 0, rejected: 0 }
  );

  const stats = [
    ["Total", counts.all, "total"],
    ["Pending", counts.pending, "pending"],
    ["Verified", counts.verified, "verified"],
    ["Rejected", counts.rejected, "rejected"],
  ];

  return (
    <div className="adm-page">
      <div className="adm-container">
        <h1 className="adm-title">Admin Dashboard</h1>
        <p className="adm-welcome">Welcome, {admin.username}</p>

        <h2 className="adm-section-title">Seller Verification</h2>

        <div className="adm-stats">
          {stats.map(([text, n, tone]) => (
            <div key={text} className="adm-stat">
              <div className="adm-stat-label">{text}</div>
              <div className={`adm-stat-value adm-tone-${tone}`}>{n}</div>
            </div>
          ))}
        </div>

        <div className="adm-tabs">
          {TABS.map(([value, text]) => (
            <Link
              key={value || "all"}
              href={value ? `/admin?status=${value}` : "/admin"}
              className={status === value ? "adm-tab adm-tab-active" : "adm-tab"}
            >
              {text}
            </Link>
          ))}
        </div>

        {sellers.length === 0 && <div className="adm-empty">No sellers found.</div>}

        {sellers.map((s) => (
          <div key={s.id} className="adm-card">
            <div className="adm-card-head">
              <div>
                <div className="adm-name">{s.fullName}</div>
                <div className="adm-sub">Registered {fmt(s.createdAt)}</div>
              </div>
              <div className="adm-badges">
                <Badge value={s.sellerStatus} prefix="Seller: " />
                <Badge value={s.bankVerificationStatus} prefix="Bank: " />
              </div>
            </div>

            <div className="adm-divider" />

            <h3 className="adm-group-title">CONTACT</h3>
            <div className="adm-grid">
              <Item label="Email" value={s.email} />
              <Item label="Mobile" value={s.mobile} mono />
            </div>

            <h3 className="adm-group-title adm-group-title-spaced">BANK DETAILS</h3>
            <div className="adm-grid adm-bank">
              <Item label="Account holder" value={s.bankAccountHolderName} />
              <Item label="Bank" value={s.bankName} />
              <Item label="Account number" value={s.accountNumber} mono />
              <Item label="IFSC" value={s.ifsc} mono />
            </div>

            <div className="adm-terms">
              <Item label="Terms accepted" value={fmt(s.termsAcceptedAt)} />
            </div>

            {s.rejectionReason && (
              <p className="adm-reason">Rejection reason: {s.rejectionReason}</p>
            )}

            <div className="adm-actions">
              {s.sellerStatus !== "verified" && (
                <form action={reviewAction}>
                  <input type="hidden" name="sellerId" value={s.id} />
                  <input type="hidden" name="decision" value="verify" />
                  <button type="submit" className="adm-btn adm-btn-verify">
                    Mark Verified
                  </button>
                </form>
              )}

              {s.sellerStatus !== "rejected" && (
                <form action={reviewAction} className="adm-reject-form">
                  <input type="hidden" name="sellerId" value={s.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <input
                    name="reason"
                    required
                    minLength={5}
                    maxLength={300}
                    placeholder="Rejection reason"
                    className="adm-input"
                  />
                  <button type="submit" className="adm-btn adm-btn-reject">
                    Reject
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}