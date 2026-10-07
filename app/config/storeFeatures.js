/* =========================================================
   CENTRALIZED STORE FEATURE FLAGS

   Do not scatter hardcoded payment/delivery checks
   throughout the application. Import STORE_FEATURES
   wherever a feature needs to be checked, and flip
   these centrally when a feature is ready to launch.
========================================================= */

export const STORE_FEATURES = {
  cart: true,
  buyNow: true,
  checkout: true,

  // Intentionally OFF for this MVP.
  onlinePayments: false,
  delivery: false,
  shipping: false,
  sellerPayouts: false,
};

export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_CURRENCY_SYMBOL = "₹";

export function formatMoney(amount, currency = DEFAULT_CURRENCY) {
  const value = Number(amount) || 0;

  if (currency === "INR") {
    return `${DEFAULT_CURRENCY_SYMBOL}${value.toLocaleString("en-IN")}`;
  }

  return `${currency} ${value.toLocaleString()}`;
}
