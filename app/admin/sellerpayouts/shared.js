import { formatMoney } from "@/app/config/storeFeatures";

export const m = (v) => formatMoney(v || 0, "INR");

export function fmt(date) {
  return date ? new Date(date).toLocaleString("en-IN") : "-";
}

export function fmtDay(date) {
  return date ? new Date(date).toLocaleDateString("en-IN") : "-";
}

export function Item({ label, value, mono }) {
  return (
    <div>
      <div className="pay-item-label">{label}</div>
      <div className={mono ? "pay-item-value pay-mono" : "pay-item-value"}>{value || "-"}</div>
    </div>
  );
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* Seller ka lifetime record: kitna paid, kitna deliver hua, kitna abhi seller ke paas hai */
export function SellerSummary({ summary, flush }) {
  if (!summary) return null;

  const cells = [
    [
      "Total paid by LinkStorx",
      m(summary.totalPaid),
      `${plural(summary.paidPayouts, "payout", "payouts")} · ${plural(summary.paidOutOrders, "order", "orders")} · ${plural(
        summary.paidOutProducts,
        "product",
        "products"
      )}`,
    ],
    [
      "Delivered so far",
      plural(summary.deliveredOrders, "order", "orders"),
      `${plural(summary.deliveredProducts, "product", "products")} · seller share ${m(summary.deliveredAmount)}`,
    ],
    [
      "With seller (not delivered)",
      plural(summary.withSellerOrders, "order", "orders"),
      `${plural(summary.withSellerProducts, "product", "products")} · ${m(summary.withSellerAmount)}`,
    ],
  ];

  return (
    <>
      <h3 className={flush ? "pay-group-title" : "pay-group-title pay-group-spaced"}>SELLER HISTORY (ALL TIME)</h3>
      <div className="pay-summary">
        {cells.map(([label, value, hint]) => (
          <div key={label} className="pay-sum">
            <div className="pay-sum-label">{label}</div>
            <div className="pay-sum-value">{value}</div>
            <div className="pay-sum-hint">{hint}</div>
          </div>
        ))}
      </div>
    </>
  );
}

export function OrdersList({ orders, showDue, showItems }) {
  return (
    <details className="pay-details">
      <summary>
        View {orders.length} {orders.length === 1 ? "order" : "orders"}
      </summary>
      <div className="pay-table-wrap">
        <table className={showItems ? "pay-table pay-table-wide" : "pay-table"}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Phone</th>
              {showItems && <th>Products</th>}
              <th>Delivered</th>
              {showDue && <th>Due by</th>}
              <th className="pay-right">Seller gets</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.orderNumber}>
                <td className="pay-mono">#{o.orderNumber}</td>
                <td>{o.customerName || "-"}</td>
                <td className="pay-mono">{o.customerPhone || "-"}</td>
                {showItems && <td>{o.items || "-"}</td>}
                <td>{fmtDay(o.deliveredAt)}</td>
                {showDue && <td>{fmtDay(o.dueBy)}</td>}
                <td className="pay-right">
                  <b>{m(o.amount)}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}