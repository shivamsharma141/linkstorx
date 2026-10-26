import Link from "next/link";

import { requireAdmin } from "@/app/lib/auth/auth";
import {
  getToVerifyOverview,
  getToPayOverview,
  getPayoutHistory,
  getPayoutStats,
} from "@/app/businessLogic/payoutBusinessLogic";
import { createPayoutAction, markPaidAction, markFailedAction } from "./actions";
import OrderVerifyForms from "./OrderVerifyForms";
import { m, fmt, Item, OrdersList, SellerSummary } from "./shared";

import "./payouts.css";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const BASE_PATH = "/admin/sellerpayouts";

const TABS = [
  ["toverify", "1. To Verify"],
  ["topay", "2. To Pay"],
  ["pending", "3. Awaiting UTR"],
  ["paid", "Paid"],
  ["failed", "Failed"],
];

const STATUS_BY_TAB = { pending: "Pending", paid: "Paid", failed: "Failed" };

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default async function SellerPayoutsPage({ searchParams }) {
  await requireAdmin();

  const sp = await searchParams;
  const tab = TABS.some(([v]) => v === sp?.tab) ? sp.tab : "toverify";
  const notice = sp?.msg ? String(sp.msg).slice(0, 250) : "";
  const noticeType = sp?.type === "err" ? "err" : "ok";
  const returnTo = `${BASE_PATH}?tab=${tab}`;

  const [verify, overview, stats, history] = await Promise.all([
    getToVerifyOverview(),
    getToPayOverview(),
    getPayoutStats(),
    ["toverify", "topay"].includes(tab) ? Promise.resolve([]) : getPayoutHistory(STATUS_BY_TAB[tab]),
  ]);

  const statCards = [
    ["To verify", m(verify.totalAmount), "pending", `${verify.totalCount} orders`],
    ["Ready to pay", m(overview.totalToPay), "verified", `${overview.sellers.length} sellers`],
    ["Awaiting UTR", m(stats.Pending.amount), "total", `${stats.Pending.count} payouts`],
    ["Paid so far", m(stats.Paid.amount), "verified", `${stats.Paid.count} payouts`],
  ];

  return (
    <div className="pay-page">
      <div className="pay-container">
        <h1 className="pay-title">Seller Payouts</h1>
        <p className="pay-sub">
          Step 1: confirm delivery with the customer. Step 2: create the payout. Step 3: transfer the money and save the UTR.
        </p>

        {notice && <div className={`pay-notice pay-notice-${noticeType}`}>{notice}</div>}

        <div className="pay-stats">
          {statCards.map(([label, value, tone, hint]) => (
            <div key={label} className="pay-stat">
              <div className="pay-stat-label">{label}</div>
              <div className={`pay-stat-value pay-tone-${tone}`}>{value}</div>
              <div className="pay-stat-hint">{hint}</div>
            </div>
          ))}
        </div>

        <div className="pay-tabs">
          {TABS.map(([value, text]) => (
            <Link
              key={value}
              href={`${BASE_PATH}?tab=${value}`}
              className={tab === value ? "pay-tab pay-tab-active" : "pay-tab"}
            >
              {text}
            </Link>
          ))}
        </div>

        {/* ================= TO VERIFY ================= */}
        {tab === "toverify" && (
          <>
            <div className="pay-help">
              The seller marked these orders as <b>Delivered</b>, but LinkStorx delivers nothing itself. Call the
              customer and confirm the parcel arrived. Only after you press <b>Customer confirmed</b> will the order
              move to To Pay. If there is a problem, press <b>Problem / Hold</b> and the seller will not be paid.
            </div>

            {verify.truncated && (
              <div className="pay-notice pay-notice-err">Showing the first 1000 orders. Verify some, then reload.</div>
            )}

            {verify.sellers.length === 0 && <div className="pay-empty">No orders are waiting for verification.</div>}

            {verify.sellers.map((s) => (
              <div key={s.sellerId} className="pay-card">
                <div className="pay-card-head">
                  <div>
                    <div className="pay-label">Seller</div>
                    <Link href={`${BASE_PATH}/seller/${s.sellerId}`} className="pay-name pay-name-link">
                      {s.sellerName}
                    </Link>
                    <div className="pay-meta">
                      @{s.sellerUsername} · {s.mobile || "no mobile"} · {s.email || "no email"}
                    </div>
                    <div className="pay-meta">
                      {plural(s.orderCount, "order", "orders")} to verify
                      {s.holdCount > 0 && <span className="pay-overdue"> · {s.holdCount} on hold</span>}
                    </div>
                  </div>
                  <div className="pay-amount-box">
                    <div className="pay-amount-label">Seller will get</div>
                    <div className="pay-amount">{m(s.amount)}</div>
                  </div>
                </div>

                <div className="pay-divider" />

                <SellerSummary summary={s.summary} flush />

                {s.orders.map((o) => (
                  <OrderVerifyForms key={o.orderNumber} order={o} returnTo={returnTo} />
                ))}

                <Link href={`${BASE_PATH}/seller/${s.sellerId}`} className="pay-link">
                  View seller details and all orders →
                </Link>
              </div>
            ))}
          </>
        )}

        {/* ================= TO PAY ================= */}
        {tab === "topay" && (
          <>
            <div className="pay-help">
              These orders were delivered <b>and verified by LinkStorx</b>. Create a payout, transfer the money from
              your bank, then enter the UTR in the next tab.
            </div>

            {overview.truncated && (
              <div className="pay-notice pay-notice-err">
                Showing the first 1000 eligible orders. Create payouts, then reload to see the rest.
              </div>
            )}

            {overview.sellers.length === 0 && (
              <div className="pay-empty">No verified orders are waiting for payout.</div>
            )}

            {overview.sellers.map((s) => (
              <div key={s.sellerId} className="pay-card">
                <div className="pay-card-head">
                  <div>
                    <div className="pay-label">Seller</div>
                    <Link href={`${BASE_PATH}/seller/${s.sellerId}`} className="pay-name pay-name-link">
                      {s.sellerName}
                    </Link>
                    <div className="pay-meta">
                      @{s.sellerUsername} · {s.mobile || "no mobile"} · {s.email || "no email"}
                    </div>
                    <div className="pay-meta">
                      {plural(s.orderCount, "verified order", "verified orders")} · {plural(s.productCount, "product", "products")}
                      {s.overdue > 0 && <span className="pay-overdue"> · {s.overdue} past due date</span>}
                      {" · "}Paid so far: {m(s.totalPaid)}
                    </div>
                  </div>
                  <div className="pay-amount-box">
                    <div className="pay-amount-label">Amount to pay</div>
                    <div className="pay-amount">{m(s.amount)}</div>
                  </div>
                </div>

                <div className="pay-divider" />

                <SellerSummary summary={s.summary} flush />

                <h3 className="pay-group-title pay-group-spaced">CONTACT</h3>
                <div className="pay-grid">
                  <Item label="Email" value={s.email} />
                  <Item label="Mobile" value={s.mobile} mono />
                </div>

                <h3 className="pay-group-title pay-group-spaced">BANK DETAILS</h3>
                <div className="pay-grid pay-bank">
                  <Item label="Account holder" value={s.bank.holder} />
                  <Item label="Bank" value={s.bank.bankName} />
                  <Item label="Account number" value={s.bank.accountNumber} mono />
                  <Item label="IFSC" value={s.bank.ifsc} mono />
                </div>

                <OrdersList orders={s.orders} showDue showItems />

                <div className="pay-actions">
                  {s.canPay ? (
                    <form action={createPayoutAction}>
                      <input type="hidden" name="sellerId" value={s.sellerId} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button type="submit" className="pay-btn pay-btn-primary">
                        Create Payout of {m(s.amount)}
                      </button>
                    </form>
                  ) : (
                    <span className="pay-warn">Seller is {s.sellerStatus}. Verify the seller before paying.</span>
                  )}
                  <Link href={`${BASE_PATH}/seller/${s.sellerId}`} className="pay-link">
                    All orders of this seller →
                  </Link>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ================= HISTORY (click to open / close) ================= */}
        {!["toverify", "topay"].includes(tab) && (
          <>
            {history.length === 0 && <div className="pay-empty">No payouts here yet.</div>}

            {history.length > 0 && (
              <p className="pay-hint">
                {plural(history.length, "payout", "payouts")}. Tap a card to see the full details, tap again to close.
              </p>
            )}

            {history.map((p) => (
              // Awaiting UTR wale payout default open rehte hain (kyunki yahan kaam karna hota hai)
              <details key={p.id} className="pay-acc" open={p.status === "Pending"}>
                <summary className="pay-acc-head">
                  <span className="pay-acc-main">
                    <span className="pay-acc-name">{p.sellerName}</span>
                    <span className="pay-meta">
                      @{p.sellerUsername} · {plural(p.orderCount, "order", "orders")} ·{" "}
                      {plural(p.productCount, "product", "products")}
                    </span>
                    <span className="pay-meta">Created {fmt(p.createdAt)}</span>
                  </span>
                  <span className="pay-acc-side">
                    <span className={`pay-badge pay-badge-${p.status.toLowerCase()}`}>{p.status}</span>
                    <span className="pay-acc-amount">{m(p.amount)}</span>
                  </span>
                  <span className="pay-acc-chev" aria-hidden="true" />
                </summary>

                <div className="pay-acc-body">
                  <div className="pay-grid">
                    <Item label="Payout ID" value={p.id} mono />
                    <Item label="UTR" value={p.utr} mono />
                    <Item label="Paid on" value={p.paidAt ? fmt(p.paidAt) : ""} />
                    <Item label="Email" value={p.sellerEmail} />
                    <Item label="Mobile" value={p.sellerMobile} mono />
                  </div>

                  <SellerSummary summary={p.summary} />

                  <h3 className="pay-group-title pay-group-spaced">BANK (AT TIME OF PAYOUT)</h3>
                  <div className="pay-grid pay-bank">
                    <Item label="Account holder" value={p.bank.holder} />
                    <Item label="Bank" value={p.bank.bankName} />
                    <Item label="Account ending" value={p.bank.last4 ? `••••${p.bank.last4}` : ""} mono />
                    <Item label="IFSC" value={p.bank.ifsc} mono />
                  </div>

                  {p.status === "Failed" && (
                    <p className="pay-reason">
                      Failed on {fmt(p.failedAt)}: {p.failureReason}
                    </p>
                  )}

                  <OrdersList orders={p.orders} showItems />

                  <Link href={`${BASE_PATH}/seller/${p.sellerId}`} className="pay-link">
                    View seller details and full order history →
                  </Link>

                  {p.status === "Pending" && (
                    <>
                      <p className="pay-check">
                        Check before saving: <b>{m(p.amount)}</b> to <b>{p.bank.holder || "-"}</b> ({p.bank.bankName || "-"}, ••••
                        {p.bank.last4 || "----"}). Type the UTR from your bank receipt in both boxes.
                      </p>

                      <div className="pay-actions">
                        <form action={markPaidAction} className="pay-inline-form pay-utr-form">
                          <input type="hidden" name="payoutId" value={p.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <input
                            name="utr"
                            required
                            minLength={8}
                            maxLength={30}
                            placeholder="Enter UTR after transfer"
                            className="pay-input pay-mono"
                            autoComplete="off"
                          />
                          <input
                            name="utrConfirm"
                            required
                            minLength={8}
                            maxLength={30}
                            placeholder="Re-enter UTR to confirm"
                            className="pay-input pay-mono"
                            autoComplete="off"
                          />
                          <button type="submit" className="pay-btn pay-btn-verify">
                            Mark Paid
                          </button>
                        </form>

                        <form action={markFailedAction} className="pay-inline-form">
                          <input type="hidden" name="payoutId" value={p.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <input
                            name="reason"
                            required
                            minLength={3}
                            maxLength={300}
                            placeholder="Why did it fail?"
                            className="pay-input"
                            autoComplete="off"
                          />
                          <button type="submit" className="pay-btn pay-btn-reject">
                            Mark Failed
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              </details>
            ))}
          </>
        )}
      </div>
    </div>
  );
}