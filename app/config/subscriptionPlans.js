/*
 * Subscription plans — SERVER ONLY.
 * Price aur product limit .env se aate hain. Browser kabhi price decide
 * nahi karta; woh sirf plan ka naam ("starter" / "growth") bhejta hai.
 */

function numberEnv(name, fallback) {
  const raw = process.env[name];

  if (raw === undefined || raw === "") return fallback;

  const value = Number(raw);

  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function rupeesToPaise(rupees) {
  return Math.round(rupees * 100);
}

export const PAID_PLAN_IDS = ["starter", "growth"];

export function getPlans() {
  const durationDays = Math.max(1, Math.floor(numberEnv("PLAN_DURATION_DAYS", 30)));

  return {
    free: {
      id: "free",
      name: "Free",
      rank: 0,
      pricePaise: 0,
      productLimit: Math.floor(numberEnv("PLAN_FREE_PRODUCT_LIMIT", 5)),
      durationDays: null,
    },
    starter: {
      id: "starter",
      name: "Starter",
      rank: 1,
      // fallback = real price, taaki .env bhoolne par galti se Rs 1 na ho jaye
      pricePaise: rupeesToPaise(numberEnv("PLAN_STARTER_PRICE", 99)),
      productLimit: Math.floor(numberEnv("PLAN_STARTER_PRODUCT_LIMIT", 10)),
      durationDays,
    },
    growth: {
      id: "growth",
      name: "Growth",
      rank: 2,
      pricePaise: rupeesToPaise(numberEnv("PLAN_GROWTH_PRICE", 199)),
      productLimit: Math.floor(numberEnv("PLAN_GROWTH_PRODUCT_LIMIT", 20)),
      durationDays,
    },
  };
}

export function getPlan(planId) {
  if (typeof planId !== "string") return null;

  const plans = getPlans();

  return Object.prototype.hasOwnProperty.call(plans, planId) ? plans[planId] : null;
}

/* Browser ko bhejne layak data (koi secret nahi). */
export function getPublicPlans() {
  return Object.values(getPlans()).map((plan) => ({
    id: plan.id,
    name: plan.name,
    rank: plan.rank,
    price: plan.pricePaise / 100,
    productLimit: plan.productLimit,
    durationDays: plan.durationDays,
  }));
}