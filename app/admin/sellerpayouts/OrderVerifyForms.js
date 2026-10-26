import { verifyDeliveryAction, flagIssueAction } from "./actions";
import { m, fmtDay } from "./shared";

export default function OrderVerifyForms({ order, returnTo }) {
  const onHold = order.stage === "hold" || order.verifyStatus === "issue";

  return (
    <div className={onHold ? "pay-order pay-order-hold" : "pay-order"}>
      <div className="pay-order-top">
        <b className="pay-mono">#{order.orderNumber}</b>
        <span className={`pay-chip pay-chip-${onHold ? "hold" : "check"}`}>
          {onHold ? "On hold" : "Needs verification"}
        </span>
        <span className="pay-order-amount">{m(order.amount)}</span>
      </div>

      <div className="pay-order-info">
        <div>
          <span>Customer</span>
          <b>{order.customerName || "-"}</b>
        </div>
        <div>
          <span>Call customer</span>
          {order.customerPhone ? (
            <a className="pay-link pay-mono" href={`tel:+91${order.customerPhone}`}>
              {order.customerPhone}
            </a>
          ) : (
            <b>-</b>
          )}
        </div>
        <div>
          <span>Seller marked delivered</span>
          <b>{fmtDay(order.deliveredAt)}</b>
        </div>
        <div className="pay-order-wide">
          <span>Address</span>
          <b>{order.address}</b>
        </div>
        <div className="pay-order-wide">
          <span>Items</span>
          <b>{order.items}</b>
        </div>
      </div>

      {onHold && order.verifyNote && <p className="pay-reason">Problem noted: {order.verifyNote}</p>}

      <div className="pay-actions">
        <form action={verifyDeliveryAction} className="pay-inline-form">
          <input type="hidden" name="orderNumber" value={order.orderNumber} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input
            name="note"
            maxLength={300}
            placeholder="Note (optional), e.g. spoke to customer on call"
            className="pay-input"
            autoComplete="off"
          />
          <button type="submit" className="pay-btn pay-btn-verify">
            Customer confirmed
          </button>
        </form>

        <form action={flagIssueAction} className="pay-inline-form">
          <input type="hidden" name="orderNumber" value={order.orderNumber} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input
            name="reason"
            required
            minLength={3}
            maxLength={300}
            placeholder="Problem (not received, not reachable...)"
            className="pay-input"
            autoComplete="off"
          />
          <button type="submit" className="pay-btn pay-btn-reject">
            Problem / Hold
          </button>
        </form>
      </div>
    </div>
  );
}