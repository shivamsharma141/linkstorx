import { requireAuth } from "@/app/lib/auth/auth";
import {
  getSubscriptionSummary,
  getPublicPlans,
} from "@/app/businessLogic/subscriptionBusinessLogic";

import SubscriptionPlans from "./SubscriptionPlans";
import "./subscription.css";

export const metadata = {
  title: 'Subscription | LinkStorX',
};

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const user = await requireAuth();

  const summary = await getSubscriptionSummary(user.id);
  const plans = getPublicPlans();

  return <SubscriptionPlans plans={plans} summary={summary} />;
}