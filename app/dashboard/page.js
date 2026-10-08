import Image from 'next/image';
import Link from 'next/link';
import { requireAuth } from '@/app/lib/auth/auth';
import './dashboard.css';

// is page ka path (dusre page mein sirf ye ek line change karni hai)
const CURRENT_PATH = '/dashboard';

const NAV_ITEMS = [
  { label: 'Home', href: '/dashboard', icon: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
  {
    label: 'My Store',
    href: '/dashboard/my-store',
    icon: 'M3 9l1.5-5h15L21 9M3 9c0 1.4 1.1 2.5 2.5 2.5S8 10.4 8 9c0 1.4 1.1 2.5 2.5 2.5h3C14.9 11.5 16 10.4 16 9c0 1.4 1.1 2.5 2.5 2.5S21 10.4 21 9M5 11.5V20h14v-8.5',
  },
  {
    label: 'Links',
    href: '/dashboard/links',
    icon: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  },
  {
    label: 'Add Products',
    href: '/dashboard/products',
    icon: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 8v8M8 12h8',
  },
  // {
  //   label: 'Events',
  //   href: '/dashboard/events',
  //   icon: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  // },
  { label: 'Overview', href: '/dashboard/overview', icon: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z' },
];

export default async function DashboardPage() {
  const user = await requireAuth();

  const initial = user.username.charAt(0).toUpperCase();
  const year = new Date().getFullYear();

  // active link ki class yahin ready ho jati hai, html mein koi logic nahi
  const links = NAV_ITEMS.map((item) => ({
    ...item,
    className: item.href === CURRENT_PATH ? 'dash-link dash-link-active' : 'dash-link',
  }));

  return (
    <div className="dash-layout">
      {/* sidebar aur profile ka open/close CSS se hota hai, JS ki zaroorat nahi */}
      <input type="checkbox" id="dash-menu" className="dash-check" />
      <input type="checkbox" id="dash-profile" className="dash-check" />

      <aside className="dash-sidebar">
        <div className="dash-sidebar-top">
          <Link href="/">
            <Image src="/linkstorexnavlogo.png" alt="LinkStorX" width={150} height={46} priority className="dash-sidebar-logo" />
          </Link>

          <label htmlFor="dash-menu" className="dash-close">
            <svg viewBox="0 0 24 24">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </label>
        </div>

        <nav className="dash-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={link.className}>
              <svg viewBox="0 0 24 24">
                <path d={link.icon} />
              </svg>
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="dash-sidebar-footer">© {year} LinkStorX</p>
      </aside>

      <label htmlFor="dash-menu" className="dash-overlay" />

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

            <label htmlFor="dash-menu" className="dash-hamburger">
              <span />
              <span />
              <span />
            </label>
          </div>
        </header>

        <main className="dash-content">
          <h1 className="dash-heading">Welcome back, {user.username}</h1>
        </main>
      </div>
    </div>
  );
}