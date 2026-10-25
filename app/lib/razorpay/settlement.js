/*
 * Settlement maths — SERVER ONLY.
 * Sab kuch PAISE (integer) mein hota hai taaki rounding ki galti na ho.
 *
 * Example: customer ne Rs 1000 pay kiye (100000 paise)
 *   Razorpay fee   2%            = Rs 20.00
 *   GST on fee     18% of 20.00  = Rs  3.60
 *   Platform fee   flat          = Rs 20.00
 *   --------------------------------------
 *   Seller ko milega             = Rs 956.40
 */

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const FEE_CONFIG = {
  gatewayPercent: num(process.env.PAYMENT_GATEWAY_FEE_PERCENT, 2),
  gstPercent: num(process.env.PAYMENT_GST_PERCENT, 18),
  platformFeePaise: Math.round(num(process.env.PLATFORM_COMMISSION_RUPEES, 20) * 100),
  payoutDelayDays: num(process.env.PAYOUT_DELAY_DAYS, 7),
  unpaidExpiryMinutes: num(process.env.UNPAID_ORDER_EXPIRY_MINUTES, 45),
};

export const toPaise = (rupees) => Math.round((Number(rupees) || 0) * 100);
export const toRupees = (paise) => (Number(paise) || 0) / 100;

export function calcSettlement(amountPaise) {
  const amount = Math.round(Number(amountPaise) || 0);

  const gatewayFeePaise = Math.round((amount * FEE_CONFIG.gatewayPercent) / 100);
  const gstOnFeePaise = Math.round((gatewayFeePaise * FEE_CONFIG.gstPercent) / 100);
  const platformFeePaise = FEE_CONFIG.platformFeePaise;

  const totalDeductionPaise = gatewayFeePaise + gstOnFeePaise + platformFeePaise;
  const sellerNetPaise = Math.max(0, amount - totalDeductionPaise);

  return { gatewayFeePaise, gstOnFeePaise, platformFeePaise, totalDeductionPaise, sellerNetPaise };
}

/* Delivery ke baad itne din ke andar seller ko payout milega */
export function payoutDueDate(deliveredAt = new Date()) {
  return new Date(new Date(deliveredAt).getTime() + FEE_CONFIG.payoutDelayDays * 86400000);
}