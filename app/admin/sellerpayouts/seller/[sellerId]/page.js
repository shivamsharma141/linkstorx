import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/app/lib/auth/auth";
import { getSellerDetail } from "@/app/businessLogic/payoutBusinessLogic";
import { createPayoutAction } from "../../actions";
import OrderVerifyForms from "../../OrderVerifyForms";
import { m, fmt, fmtDay, Item, OrdersList, SellerSummary } from "../../shared";

import "../../payouts.css";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const BASE_PATH = "/admin/sellerpayouts";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default async function SellerDetailPage({ params, searchParams }) {
  await requireAdmin();

  const { sellerId } = await params;
  const sp = await searchParams;
  const notice = sp?.msg ? String(sp.msg).slice(0, 250) : "";
  const noticeType = sp?.type === "err" ? "err" : "ok";
  const returnTo = `${BASE_PATH}/seller/${sellerId}`;

  let data;
  try {
    data = await getSellerDetail(sellerId);
  } catch (error) {
    if (error.statusCode === 404) notFound();
    throw error;
  }

  const { seller, totals, summary, needsCheck, orders, payouts } = data;

  const cards = [
    ["Total paid by LinkStorx", totals.totalPaid, "verified"],
    ["Ready to pay", totals.ready, "total"],
    ["Awaiting UTR", totals.awaitingUtr, "total"],
    ["To verify", totals.toVerify, "pending"],
    ["On hold", totals.onHold, "rejected"],
    ["With seller (not delivered)", totals.withSeller, "muted"],
  ];

  return (
    <div className="pay-page">
      <div className="pay-container">
        <Link href={BASE_PATH} className="pay-back">
          ← Back to payouts
        </Link>

        <h1 className="pay-title">{seller.name}</h1>
        <p className="pay-sub">
          @{seller.username} · {seller.mobile || "no mobile"} · {seller.email || "no email"} · Seller status:{" "}
          <b>{seller.sellerStatus}</b>
          {seller.lastPayoutAt && <> · Last payout {fmt(seller.lastPayoutAt)}</>}
        </p>

        {notice && <div className={`pay-notice pay-notice-${noticeType}`}>{notice}</div>}

        <div className="pay-stats pay-stats-6">
          {cards.map(([label, value, tone]) => (
            <div key={label} className="pay-stat">
              <div className="pay-stat-label">{label}</div>
              <div className={`pay-stat-value pay-tone-${tone}`}>{m(value)}</div>
            </div>
          ))}
        </div>

        <div className="pay-card">
          <SellerSummary summary={summary} flush />

          <h3 className="pay-group-title pay-group-spaced">CONTACT</h3>
          <div className="pay-grid">
            <Item label="Email" value={seller.email} />
            <Item label="Mobile" value={seller.mobile} mono />
          </div>

          <h3 className="pay-group-title pay-group-spaced">BANK DETAILS</h3>
          <div className="pay-grid pay-bank">
            <Item label="Account holder" value={seller.bank.holder} />
            <Item label="Bank" value={seller.bank.bankName} />
            <Item label="Account number" value={seller.bank.accountNumber} mono />
            <Item label="IFSC" value={seller.bank.ifsc} mono />
          </div>

          {totals.ready > 0 && (
            <div className="pay-actions">
              {seller.canPay ? (
                <form action={createPayoutAction}>
                  <input type="hidden" name="sellerId" value={seller.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button type="submit" className="pay-btn pay-btn-primary">
                    Create Payout of {m(totals.ready)}
                  </button>
                </form>
              ) : (
                <span className="pay-warn">Seller is {seller.sellerStatus}. Verify the seller before paying.</span>
              )}
            </div>
          )}
        </div>

        {needsCheck.length > 0 && (
          <div className="pay-card">
            <h3 className="pay-group-title">NEEDS YOUR CHECK ({needsCheck.length})</h3>
            <p className="pay-sub pay-sub-tight">Call the customer and confirm delivery before this seller is paid.</p>
            {needsCheck.map((o) => (
              <OrderVerifyForms key={o.orderNumber} order={o} returnTo={returnTo} />
            ))}
          </div>
        )}

        {/* ================= PAYOUT HISTORY (click to open / close) ================= */}
        <div className="pay-card">
          <h3 className="pay-group-title">PAYOUT HISTORY ({payouts.length})</h3>
          {payouts.length === 0 ? (
            <p className="pay-meta">No payouts created for this seller yet.</p>
          ) : (
            <>
              <p className="pay-hint">Tap a payout to see its details, tap again to close.</p>
              {payouts.map((p) => (
                <details key={p.id} className="pay-acc pay-acc-inner" open={p.status === "Pending"}>
                  <summary className="pay-acc-head">
                    <span className="pay-acc-main">
                      <span className="pay-acc-name">{fmt(p.createdAt)}</span>
                      <span className="pay-meta">
                        {plural(p.orderCount, "order", "orders")} · {plural(p.productCount, "product", "products")}
                      </span>
                    </span>
                    <span className="pay-acc-side">
                      <span className={`pay-badge pay-badge-${p.status.toLowerCase()}`}>{p.status}</span>
                      <span className="pay-acc-amount">{m(p.amount)}</span>
                    </span>
                    <span className="pay-acc-chev" aria-hidden="true" />
                  </summary>

                  <div className="pay-acc-body">
                    <div className="pay-order-info pay-order-info-flush">
                      <div>
                        <span>UTR</span>
                        <b className="pay-mono">{p.utr || "-"}</b>
                      </div>
                      <div>
                        <span>Paid on</span>
                        <b>{p.paidAt ? fmt(p.paidAt) : "-"}</b>
                      </div>
                      <div>
                        <span>Sent to</span>
                        <b>
                          {p.bank?.bankName || "-"} {p.bank?.last4 ? `••••${p.bank.last4}` : ""}
                        </b>
                      </div>
                    </div>

                    {p.status === "Failed" && (
                      <p className="pay-reason">
                        Failed on {fmt(p.failedAt)}: {p.failureReason}
                      </p>
                    )}

                    <OrdersList orders={p.orders} showItems />
                  </div>
                </details>
              ))}
            </>
          )}
          <p className="pay-meta pay-note-top">
            Pending payouts: open the{" "}
            <Link href={`${BASE_PATH}?tab=pending`} className="pay-link">
              Awaiting UTR
            </Link>{" "}
            tab to add the UTR.
          </p>
        </div>

        <div className="pay-card">
          <h3 className="pay-group-title">ALL ORDERS ({orders.length})</h3>
          {data.ordersTruncated && <p className="pay-meta">Showing the latest 300 orders.</p>}
          {orders.length === 0 ? (
            <p className="pay-meta">No paid orders yet.</p>
          ) : (
            <div className="pay-table-wrap">
              <table className="pay-table pay-table-wide">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Products</th>
                    <th>Ordered</th>
                    <th>Delivered</th>
                    <th>Stage</th>
                    <th>UTR</th>
                    <th className="pay-right">Seller gets</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="pay-mono">#{o.orderNumber}</td>
                      <td>{o.customerName || "-"}</td>
                      <td className="pay-mono">{o.customerPhone || "-"}</td>
                      <td>{o.items || "-"}</td>
                      <td>{fmtDay(o.createdAt)}</td>
                      <td>{fmtDay(o.deliveredAt)}</td>
                      <td>
                        <span className={`pay-chip pay-chip-${o.stage}`}>{o.stageLabel}</span>
                        {o.verifyNote && <div className="pay-cell-note">{o.verifyNote}</div>}
                      </td>
                      <td className="pay-mono">{o.utr || "-"}</td>
                      <td className="pay-right">
                        <b>{m(o.amount)}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}