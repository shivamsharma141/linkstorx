import Link from 'next/link';
import Script from 'next/script';
import { requireAuth } from '@/app/lib/auth/auth';
import { getSubscriptionSummary } from '@/app/businessLogic/subscriptionBusinessLogic';
import './dashboard.css';

export const metadata = {
  title: 'Dashboard | LinkStorX',
};

/*
 * Routes: agar analytics / analysis / inbox / settings ka path alag hai, to sirf yahan href badal dena.
 */
const HOME = {
  label: 'Home',
  short: 'Home',
  href: '/',
  icon: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
};

const STORE = {
  label: 'My Store',
  short: 'Store',
  href: '/dashboard/my-store',
  icon: 'M3 9l1.5-5h15L21 9M3 9c0 1.4 1.1 2.5 2.5 2.5S8 10.4 8 9c0 1.4 1.1 2.5 2.5 2.5h3C14.9 11.5 16 10.4 16 9c0 1.4 1.1 2.5 2.5 2.5S21 10.4 21 9M5 11.5V20h14v-8.5',
};

const PRODUCTS = {
  label: 'Add Products',
  short: 'Products',
  href: '/dashboard/products',
  icon: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 8v8M8 12h8',
};

const DASHBOARD = {
  label: 'Dashboard',
  short: 'Dashboard',
  href: '/dashboard/sellerdashboard',
  icon: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
};

const Analytics = {
  label: 'Analytics',
  short: 'Analytics',
  href: '/dashboard/analytics',
  icon: 'M4 20h16M7 20v-7M12 20V5M17 20v-10',
};

const INBOX = {
  label: 'Inbox',
  short: 'Inbox',
  href: '/dashboard/inbox',
  icon: 'M3 6h18v12H3zM3 7l9 6 9-6',
};

const SETTINGS = {
  label: 'Settings',
  short: 'Settings',
  href: '/dashboard/settings',
  icon: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6',
};

const GROUPS = [
  { title: 'Create Store', items: [STORE, PRODUCTS] },
  { title: 'Analytics', items: [DASHBOARD, Analytics, INBOX] },
];

/* Mobile bottom bar: Home, Store, Products, Dashboard, Analytics, Inbox (Settings + Subscription + Profile hamburger mein) */
const BOTTOM_ITEMS = [HOME, STORE, PRODUCTS, DASHBOARD, Analytics, INBOX];

/*
 * Active link highlight: layout server component hai, isliye pathname yahan nahi milta.
 * Route change par hamburger drawer aur profile dropdown bhi band ho jaate hain.
 */
const ACTIVE_NAV_SCRIPT = `
(function () {
  function sync() {
    var p = location.pathname.replace(/\\/+$/, '') || '/';
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var h = a.getAttribute('data-nav');
      var on = h === '/dashboard' ? p === h : p === h || p.indexOf(h + '/') === 0;
      a.classList.toggle(a.classList.contains('dash-link') ? 'dash-link-active' : 'dash-bottom-item-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    ['dash-menu', 'dash-profile'].forEach(function (id) {
      var c = document.getElementById(id);
      if (c) c.checked = false;
    });
  }
  window.__dashNavSync = sync;
  if (!window.__dashNavPatched) {
    window.__dashNavPatched = true;
    ['pushState', 'replaceState'].forEach(function (m) {
      var orig = history[m];
      history[m] = function () {
        var r = orig.apply(this, arguments);
        setTimeout(window.__dashNavSync, 0);
        setTimeout(window.__dashNavSync, 150);
        return r;
      };
    });
    window.addEventListener('popstate', function () { setTimeout(window.__dashNavSync, 0); });
  }
  sync();
})();
`;

// Text logo: "linkstorx" (Chewy font, sab black, navbar jaisa)
function Logo({ className = '' }) {
  return (
    <Link href="/" className={`dash-logo ${className}`} aria-label="linkstorx home">
      linkstor<span>x</span>
    </Link>
  );
}

function SideLink({ item }) {
  return (
    <Link href={item.href} data-nav={item.href} className="dash-link" suppressHydrationWarning>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={item.icon} />
      </svg>
      <span>{item.label}</span>
    </Link>
  );
}

// Subscription: box type button, modern icon (crown / shield-check)
function SubscriptionButton({ isSubscribed, summary }) {
  return (
    <Link
      href="/dashboard/subscription"
      className={`dash-sub${isSubscribed ? ' dash-sub-active' : ''}`}
    >
      <span className="dash-sub-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {isSubscribed ? (
            <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5" />
          ) : (
            <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" />
          )}
        </svg>
      </span>

      <span className="dash-sub-text">
        <span className="dash-sub-title">{isSubscribed ? 'Subscribed' : 'Subscription'}</span>
        <small>{isSubscribed ? `${summary.planName} plan` : 'Upgrade your plan'}</small>
      </span>

      <svg className="dash-sub-arrow" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

function LogoutForm() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button type="submit" className="dash-logout">
        <svg viewBox="0 0 24 24">
          <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9" />
        </svg>
        Logout
      </button>
    </form>
  );
}

export default async function DashboardLayout({ children }) {
  const user = await requireAuth();
  const summary = await getSubscriptionSummary(user.id);

  const isSubscribed = summary.planId !== 'free' && !summary.expired;

  const initial = user.username.charAt(0).toUpperCase();
  const year = new Date().getFullYear();

  return (
    <div className="dash-layout">
      <input type="checkbox" id="dash-profile" className="dash-check" />
      <input type="checkbox" id="dash-menu" className="dash-check" />

      {/* profile dropdown overlay (desktop) */}
      <label htmlFor="dash-profile" className="dash-profile-overlay" aria-label="Close profile menu" />

      {/* ---------- Mobile hamburger drawer (left se right khulta hai) ---------- */}
      <label htmlFor="dash-menu" className="dash-drawer-overlay" aria-label="Close menu" />
      <aside className="dash-drawer" aria-label="Menu">
        <div className="dash-drawer-top">
          <Logo />
          <label htmlFor="dash-menu" className="dash-drawer-close" aria-label="Close menu">
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </label>
        </div>

        {/* profile (avatar) yahan hai */}
        <div className="dash-drawer-user">
          <span className="dash-avatar">{initial}</span>
          <div className="dash-drawer-user-text">
            <p className="dash-dropdown-name">{user.username}</p>
            <p className="dash-dropdown-email">{user.email}</p>
          </div>
        </div>

        <nav className="dash-drawer-links" aria-label="More">
          <SideLink item={SETTINGS} />
          <LogoutForm />
        </nav>

        <div className="dash-upgrade">
          <SubscriptionButton isSubscribed={isSubscribed} summary={summary} />
        </div>

        <p className="dash-sidebar-footer">© {year} linkstorx</p>
      </aside>

      {/* ---------- Desktop sidebar ---------- */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-top">
          <Logo />
        </div>

        <nav className="dash-links" aria-label="Dashboard">
          <SideLink item={HOME} />

          {GROUPS.map((group) => (
            <div key={group.title} className="dash-group">
              <p className="dash-group-title">{group.title}</p>
              {group.items.map((item) => (
                <SideLink key={item.href} item={item} />
              ))}
            </div>
          ))}

          <div className="dash-links-bottom">
            <SideLink item={SETTINGS} />
          </div>
        </nav>

        <div className="dash-upgrade">
          <SubscriptionButton isSubscribed={isSubscribed} summary={summary} />
        </div>

        <p className="dash-sidebar-footer">© {year} linkstorx</p>
      </aside>

      <div className="dash-main">
        {/* poori width ka white header bar */}
        <header className="dash-header">
          <div className="dash-header-inner">
            <Logo className="dash-header-logo" />

            {/* desktop: profile dropdown */}
            <div className="dash-header-right">
              <div className="dash-profile">
                <label htmlFor="dash-profile" className="dash-profile-btn">
                  <span className="dash-avatar">{initial}</span>
                  <span className="dash-profile-name">{user.username}</span>
                  <svg viewBox="0 0 24 24" className="dash-chevron">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </label>

                <div className="dash-dropdown">
                  <div className="dash-dropdown-user">
                    <p className="dash-dropdown-name">{user.username}</p>
                    <p className="dash-dropdown-email">{user.email}</p>
                  </div>
                  <LogoutForm />
                </div>
              </div>
            </div>

            {/* mobile: hamburger right side (white) */}
            <label htmlFor="dash-menu" className="dash-burger" aria-label="Open menu">
              <svg viewBox="0 0 24 24">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </label>
          </div>
        </header>

        <main className="dash-content">{children}</main>
      </div>

      {/* ---------- Mobile / tablet bottom bar ---------- */}
      <nav className="dash-bottom" aria-label="Dashboard">
        {BOTTOM_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            data-nav={item.href}
            className="dash-bottom-item"
            suppressHydrationWarning
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={item.icon} />
            </svg>
            <span>{item.short}</span>
          </Link>
        ))}
      </nav>

      <Script id="dash-active-nav" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: ACTIVE_NAV_SCRIPT }} />
    </div>
  );
}