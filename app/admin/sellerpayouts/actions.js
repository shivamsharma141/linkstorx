"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/app/lib/auth/auth";
import { formatMoney } from "@/app/config/storeFeatures";
import {
  createPayout,
  markPayoutPaid,
  markPayoutFailed,
  verifyDelivery,
  flagDeliveryIssue,
} from "@/app/businessLogic/payoutBusinessLogic";

const BASE = "/admin/sellerpayouts";

/* returnTo sirf is section ke andar ka hona chahiye (open redirect se bachne ke liye) */
function backUrl(formData, fallbackTab) {
  const raw = String(formData.get("returnTo") || "");
  const safe = raw.startsWith(BASE) && !raw.startsWith("//") ? raw : `${BASE}?tab=${fallbackTab}`;
  const url = new URL(safe, "http://local");
  url.searchParams.delete("msg");
  url.searchParams.delete("type");
  return url;
}

function finish(url, tab, type, msg) {
  if (tab && url.pathname === BASE) url.searchParams.set("tab", tab);
  url.searchParams.set("type", type);
  url.searchParams.set("msg", msg);
  revalidatePath(BASE, "layout");
  redirect(url.pathname + url.search);
}

function errorText(error) {
  if (!error.statusCode || error.statusCode === 500) console.error(error);
  return error.statusCode && error.statusCode !== 500 ? error.message : "Something went wrong.";
}

const m = (v) => formatMoney(v, "INR");

export async function verifyDeliveryAction(formData) {
  await requireAdmin();
  const url = backUrl(formData, "toverify");

  let result;
  try {
    const r = await verifyDelivery(String(formData.get("orderNumber") || ""), String(formData.get("note") || ""));
    result = ["ok", `Order #${r.orderNumber} verified. It is now in To Pay.`];
  } catch (error) {
    result = ["err", errorText(error)];
  }
  finish(url, "toverify", ...result);
}

export async function flagIssueAction(formData) {
  await requireAdmin();
  const url = backUrl(formData, "toverify");

  let result;
  try {
    const r = await flagDeliveryIssue(String(formData.get("orderNumber") || ""), String(formData.get("reason") || ""));
    result = ["ok", `Order #${r.orderNumber} is on hold. No payout until you verify it.`];
  } catch (error) {
    result = ["err", errorText(error)];
  }
  finish(url, "toverify", ...result);
}

export async function createPayoutAction(formData) {
  await requireAdmin();
  const url = backUrl(formData, "topay");

  let tab = "pending";
  let result;
  try {
    const r = await createPayout(String(formData.get("sellerId") || ""));
    result = ["ok", `Payout created for ${r.sellerName} (${m(r.amount)}, ${r.orderCount} orders). Transfer the money, then enter the UTR.`];
  } catch (error) {
    tab = "topay";
    result = ["err", errorText(error)];
  }
  finish(url, tab, ...result);
}

/* UTR 2 baar aata hai (utr + utrConfirm). Dono same na hon to paid nahi hoga. */
export async function markPaidAction(formData) {
  await requireAdmin();
  const url = backUrl(formData, "pending");

  let tab = "paid";
  let result;
  try {
    const r = await markPayoutPaid(
      String(formData.get("payoutId") || ""),
      String(formData.get("utr") || ""),
      String(formData.get("utrConfirm") || "")
    );
    result = ["ok", `Marked as paid: ${r.sellerName} (${m(r.amount)}), UTR ${r.utr}.`];
  } catch (error) {
    tab = "pending";
    result = ["err", errorText(error)];
  }
  finish(url, tab, ...result);
}

export async function markFailedAction(formData) {
  await requireAdmin();
  const url = backUrl(formData, "pending");

  let tab = "failed";
  let result;
  try {
    const r = await markPayoutFailed(String(formData.get("payoutId") || ""), String(formData.get("reason") || ""));
    result = ["ok", `Payout for ${r.sellerName} marked failed. Orders are back in To Pay.`];
  } catch (error) {
    tab = "pending";
    result = ["err", errorText(error)];
  }
  finish(url, tab, ...result);
}