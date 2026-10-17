import Image from 'next/image';
import Link from 'next/link';
import { requireAuth } from '@/app/lib/auth/auth';
import { getSubscriptionSummary } from '@/app/businessLogic/subscriptionBusinessLogic';
import './dashboard.css';

export const metadata = {
  title: 'Dashboard | LinkStorX',
};

/*
 * Routes: agar analytics / settings ka path alag hai, to sirf yahan href badal dena.
 */
const HOME = {
  label: 'Home',
  short: 'Home',
  href: '/dashboard',
  icon: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
};

const GROUPS = [
  {
    title: 'Create Store',
    items: [
      {
        label: 'My Store',
        short: 'Store',
        href: '/dashboard/my-store',
        icon: 'M3 9l1.5-5h15L21 9M3 9c0 1.4 1.1 2.5 2.5 2.5S8 10.4 8 9c0 1.4 1.1 2.5 2.5 2.5h3C14.9 11.5 16 10.4 16 9c0 1.4 1.1 2.5 2.5 2.5S21 10.4 21 9M5 11.5V20h14v-8.5',
      },
      {
        label: 'Add Products',
        short: 'Products',
        href: '/dashboard/products',
        icon: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 8v8M8 12h8',
      },
    ],
  },
  {
    title: 'Analysis',
    items: [
      {
        label: 'Dashboard',
        short: 'Analysis',
        href: '/dashboard/analytics',
        icon: 'M4 20h16M7 20v-7M12 20V5M17 20v-10',
      },
    ],
  },
];

const SETTINGS = {
  label: 'Settings',
  short: 'Settings',
  href: '/dashboard/settings',
  icon: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6',
};

const BOTTOM_ITEMS = [HOME, ...GROUPS.flatMap((g) => g.items), SETTINGS];

/*
 * Active link highlight: layout server component hai, isliye pathname yahan nahi milta.
 * Ye chhota script URL dekh ke active class lagata hai (first load + Next.js ke link clicks par).
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

export default async function DashboardLayout({ children }) {
  const user = await requireAuth();
  const summary = await getSubscriptionSummary(user.id);

  const isSubscribed = summary.planId !== 'free' && !summary.expired;

  const initial = user.username.charAt(0).toUpperCase();
  const year = new Date().getFullYear();

  return (
    <div className="dash-layout">
      <input type="checkbox" id="dash-profile" className="dash-check" />

      {/* ---------- Desktop sidebar ---------- */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-top">
          <Link href="/">
            <Image src="/linkstorexnavlogo.png" alt="LinkStorX" width={150} height={46} priority className="dash-sidebar-logo" />
          </Link>
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
          <Link
            href="/dashboard/subscription"
            className={`dash-upgrade-btn${isSubscribed ? ' dash-upgrade-btn-active' : ''}`}
          >
            <span className="dash-upgrade-icon">
              <svg viewBox="0 0 24 24">
                {isSubscribed ? <path d="M6 12.5l4 4 8-9" /> : <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" />}
              </svg>
            </span>

            <span className="dash-upgrade-text">
              <span className="dash-upgrade-title">{isSubscribed ? 'Subscribed' : 'Subscription'}</span>
              {isSubscribed && <small>{summary.planName} plan</small>}
            </span>
          </Link>
        </div>

        <p className="dash-sidebar-footer">© {year} LinkStorX</p>
      </aside>

      <div className="dash-main">
        <header className="dash-header">
          <Link href="/" className="dash-header-logo">
            <Image src="/linkstorexnavlogo.png" alt="LinkStorX" width={150} height={46} className="dash-header-img" />
          </Link>

          <label htmlFor="dash-profile" className="dash-profile-overlay" />

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

                {/* sidebar mobile par nahi hai, isliye subscription yahan milega */}
                <Link href="/dashboard/subscription" className="dash-dropdown-link">
                  <svg viewBox="0 0 24 24">
                    {isSubscribed ? <path d="M6 12.5l4 4 8-9" /> : <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" />}
                  </svg>
                  {isSubscribed ? `Subscribed · ${summary.planName}` : 'Subscription'}
                </Link>

                <form action="/api/auth/logout" method="POST">
                  <button type="submit" className="dash-logout">
                    <svg viewBox="0 0 24 24">
                      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9" />
                    </svg>
                    Logout
                  </button>
                </form>
              </div>
            </div>
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

      <script dangerouslySetInnerHTML={{ __html: ACTIVE_NAV_SCRIPT }} />
    </div>
  );
}