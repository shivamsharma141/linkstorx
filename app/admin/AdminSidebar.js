"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  width: 18,
  height: 18,
};

function IconUserCheck() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 11.5l2 2 3.5-4" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg {...iconProps}>
      <path d="M3 7a2 2 0 012-2h13v4" />
      <path d="M3 7v11a2 2 0 002 2h15a1 1 0 001-1v-3" />
      <path d="M21 9H5" />
      <circle cx="17" cy="14.5" r="1" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

// Baad mein sirf label / href / icon yahan badalna hai
const NAV_ITEMS = [
  { href: "/admin/selleronboardingverification", label: "Seller Onboarding", icon: IconUserCheck },
  { href: "/admin/sellerpayouts", label: "Seller Payouts", icon: IconWallet },
  { href: "/admin/nav2", label: "nav2", icon: IconGrid },
  { href: "/admin/nav3", label: "nav3", icon: IconGrid },
  { href: "/admin/nav4", label: "nav4", icon: IconGrid },
  { href: "/admin/nav5", label: "nav5", icon: IconGrid },
];

export default function AdminSidebar({ username }) {
  const pathname = usePathname();

  return (
    <aside className="ash-sidebar">
      <div className="ash-brand">
        <span className="ash-brand-title">LinkStorx</span>
        <span className="ash-brand-sub">Admin Panel</span>
      </div>

      <nav className="ash-nav" aria-label="Admin navigation">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={active ? "ash-link ash-link-active" : "ash-link"}
              aria-current={active ? "page" : undefined}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ash-user">
        <span className="ash-user-label">Signed in as</span>
        <strong>{username}</strong>
      </div>
    </aside>
  );
}