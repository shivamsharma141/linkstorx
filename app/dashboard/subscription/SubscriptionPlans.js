"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";

const ICONS = {
  box: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9',
  rocket: 'M14 4c3 0 6 3 6 6-2 3-4 5-7 6l-5-5c1-3 3-5 6-7zM9 15l-4 1 1-4M9 15l-2 4 4-2M15 9h.01',
  bars: 'M5 20v-7M12 20V8M19 20V4',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z',
  shield: 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6l1-7z',
  headset: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H5a1 1 0 0 1-1-1v-4zM20 14h-3v5h2a1 1 0 0 0 1-1v-4zM17 19c0 1.5-2 2-5 2',
};

/* Sirf dikhane wali cheezein. Price / limit server se aate hain. */
const PLAN_UI = {
  free: {
    tagline: 'Perfect for getting started',
    icon: 'box',
    desc: 'Start your journey with LinkStorX. Create your store and list your first products for free.',
    features: ['Your own public store link', 'Basic product management', 'Social media links', 'Basic support resources'],
    cta: 'Get Started Free',
    style: 'outline',
  },
  starter: {
    tagline: 'Great for small businesses',
    icon: 'rocket',
    desc: 'List more products and customize your store to match your brand.',
    features: ['Everything in Free', 'Store customization', 'Product categories', 'Standard support'],
    cta: 'Choose Starter',
    style: 'solid',
  },
  growth: {
    tagline: 'For serious sellers',
    icon: 'bars',
    desc: 'Get more product space and priority support to grow your business.',
    features: ['Everything in Starter', 'Better store customization', 'Priority support', 'Store setup assistance'],
    cta: 'Choose Growth',
    style: 'gradient',
    popular: true,
  },
};

const PERKS = [
  { icon: 'shield', title: 'Safe & Secure', text: 'Your data and store are always safe with us.' },
  { icon: 'bolt', title: 'Upgrade Anytime', text: 'You can change your plan whenever you need.' },
  { icon: 'headset', title: "We're Here to Help", text: 'Get support whenever you need assistance.' },
];

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24">
      <path d={ICONS[name]} />
    </svg>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export default function SubscriptionPlans({ plans, summary }) {
  const router = useRouter();

  const [busyPlan, setBusyPlan] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const currentPlan = plans.find((p) => p.id === summary.planId) || plans[0];
  const locked = Boolean(busyPlan) || verifying;

  // Plan expire hua hai (summary me planId tab 'free' hota hai)
  const isExpired = Boolean(summary.expired);
  const expiredName = summary.expiredPlanName || 'paid';

  /* ---------- payment ke baad server se verify ---------- */

  async function verifyPayment(response) {
    setVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/subscription/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(
          (data.message || 'We could not confirm your payment yet.') +
            ' If money was deducted, your plan will activate automatically within a few minutes.'
        );
        return;
      }

      setSuccess(data.summary);
      router.refresh();
    } catch {
      setError(
        'We could not confirm your payment yet. If money was deducted, your plan will activate automatically within a few minutes.'
      );
    } finally {
      setVerifying(false);
      setBusyPlan(null);
    }
  }

  /* ---------- plan choose -> order -> Razorpay checkout ---------- */

  async function handleChoose(planId) {
    setError('');
    setSuccess(null);
    setBusyPlan(planId);

    try {
      const res = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Sirf plan ka naam. Price server decide karta hai.
        body: JSON.stringify({ plan: planId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.message || 'Could not start the payment. Please try again.');
        setBusyPlan(null);
        return;
      }

      if (typeof window === 'undefined' || !window.Razorpay) {
        setError('The payment window could not load. Please refresh the page and try again.');
        setBusyPlan(null);
        return;
      }

      const checkout = new window.Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        name: 'LinkStorX',
        description: `${data.planName} plan`,
        prefill: data.prefill,
        theme: { color: '#1a56ff' },
        handler: (response) => {
          verifyPayment(response);
        },
        modal: {
          ondismiss: () => setBusyPlan(null),
        },
      });

      checkout.on('payment.failed', (failure) => {
        setError(failure?.error?.description || 'Payment failed. Please try again.');
        setBusyPlan(null);
      });

      checkout.open();
    } catch {
      setError('Network error. Please try again.');
      setBusyPlan(null);
    }
  }

  /* ---------- har card ka button ---------- */

  function getButton(plan) {
    const ui = PLAN_UI[plan.id];

    if (plan.id === 'free') {
      return {
        label: summary.planId === 'free' ? 'Current Plan' : 'Free Plan',
        style: 'muted',
        disabled: true,
      };
    }

    // Jo plan expire hua hai uska button "Renew Now"
    if (isExpired && summary.expiredPlanId === plan.id) {
      return { label: 'Renew Now', style: ui.style, disabled: false };
    }

    if (summary.planId === plan.id) {
      return { label: 'Renew Plan', style: ui.style, disabled: false };
    }

    if (currentPlan.rank > plan.rank) {
      return { label: 'Included in your plan', style: 'muted', disabled: true };
    }

    return { label: ui.cta, style: ui.style, disabled: false };
  }

  return (
    <div className="sub-page">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="sub-hero">
        <h1 className="sub-title">
          Choose the Plan That Fits <span>Your Business</span>
        </h1>
        <p className="sub-subtitle">Start for free and upgrade anytime. Your store, your products, your growth.</p>
      </div>

      <div className={summary.reached || isExpired ? 'sub-status sub-status-warn' : 'sub-status'}>
        <p>
          <strong>{summary.planName} plan</strong>
          {' · '}
          {summary.used} of {summary.productLimit} products used
          {summary.expiresAt && !isExpired && summary.planId !== 'free' && (
            <> · Active until {formatDate(summary.expiresAt)}</>
          )}
          {summary.expiresAt && isExpired && (
            <> · {expiredName} plan expired on {formatDate(summary.expiresAt)}</>
          )}
        </p>

        {summary.reached && <p className="sub-status-note">{summary.message}</p>}
      </div>

      {isExpired && !success && (
        <div className="sub-alert" role="alert">
          Bro, your {expiredName} subscription has expired. Please take a subscription again to get your full product
          limit back.
        </div>
      )}

      {error && (
        <div className="sub-alert" role="alert">
          {error}
        </div>
      )}

      {verifying && <div className="sub-alert sub-alert-info">Confirming your payment, please wait...</div>}

      {success && (
        <div className="sub-alert sub-alert-ok" role="status">
          Payment successful! Your <strong>{success.planName}</strong> plan is active until{' '}
          {success.expiresAt ? formatDate(success.expiresAt) : '-'}. You can now add up to {success.productLimit}{' '}
          products.{' '}
          <Link href="/dashboard/products/new" className="sub-alert-link">
            Add a product
          </Link>
        </div>
      )}

      <div className="sub-grid">
        {plans.map((plan) => {
          const ui = PLAN_UI[plan.id];
          const button = getButton(plan);
          const isBusy = busyPlan === plan.id;

          return (
            <div key={plan.id} className={`sub-card${ui.popular ? ' sub-card-popular' : ''}`}>
              {ui.popular && (
                <span className="sub-badge">
                  <Icon name="crown" />
                  Most Popular
                </span>
              )}

              <div className="sub-card-head">
                <span className="sub-icon">
                  <Icon name={ui.icon} />
                </span>
                <div>
                  <h2 className="sub-plan-name">{plan.name}</h2>
                  <p className="sub-plan-tag">{ui.tagline}</p>
                </div>
              </div>

              <p className="sub-price">
                ₹{plan.price} <span>{plan.id === 'free' ? '/ forever' : '/ month'}</span>
              </p>
              <p className="sub-desc">{ui.desc}</p>

              <div className="sub-limit">
                <Icon name="box" />
                {plan.productLimit} products total
              </div>

              <ul className="sub-features">
                {ui.features.map((feature) => (
                  <li key={feature}>
                    <span className="sub-check">
                      <svg viewBox="0 0 24 24">
                        <path d="M6 12.5l4 4 8-9" />
                      </svg>
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`sub-btn sub-btn-${button.style}`}
                disabled={button.disabled || locked}
                onClick={() => handleChoose(plan.id)}
              >
                {isBusy ? 'Opening payment...' : button.label}
              </button>
            </div>
          );
        })}
      </div>

      <div className="sub-perks">
        {PERKS.map((perk) => (
          <div key={perk.title} className="sub-perk">
            <span className="sub-perk-icon">
              <Icon name={perk.icon} />
            </span>
            <div>
              <h3>{perk.title}</h3>
              <p>{perk.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}