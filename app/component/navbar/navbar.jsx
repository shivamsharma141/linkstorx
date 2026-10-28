'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import './navbar.css';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Products', href: '/homepages/mainproducts' },
  { label: 'Myorders', href: '/homepages/myorders' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'About', href: '/about' },
];

function ArrowIcon() {
  return (
    <svg className="drawer-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Text logo: "linkstorx" (chunky Chewy font, sab black, same size)
function LogoText({ className = 'nav-logo-text', xClassName = 'nav-logo-x' }) {
  return (
    <span className={className}>
      linkstor<span className={xClassName}>x</span>
    </span>
  );
}

// `user` layout (server) se aata hai: { username, email } ya null
export default function Navbar({ user = null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const initial = user ? user.username.charAt(0).toUpperCase() : '';

  // Scroll hone par glass thoda strong ho jaye
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Drawer khula ho to body scroll lock
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Route change par drawer band
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header className={`navbar${scrolled ? ' navbar-scrolled' : ''}`}>
        <div className="nav-inner">
          {/* Text Logo */}
          <Link href="/" className="nav-logo" aria-label="linkstorx home">
            <LogoText />
          </Link>

          {/* Desktop links */}
          <nav className="nav-links" aria-label="Primary">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`navlink${active ? ' navlink-active' : ''}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side: text link + dark pill button */}
          <div className="nav-actions">
            {user ? (
              <>
                <form action="/api/auth/logout" method="POST" className="nav-text-form">
                  <button type="submit" className="nav-textlink">Log out</button>
                </form>
                <Link href="/dashboard" className="nav-cta">
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="nav-textlink">Login</Link>
                <Link href="/login" className="nav-cta">Get Started</Link>
              </>
            )}

            {/* Hamburger: sirf mobile */}
            <button
              type="button"
              className={`hamburger${menuOpen ? ' hamburger-open' : ''}`}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      <div
        className={`overlay${menuOpen ? ' overlay-visible' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <aside
        id="mobile-drawer"
        className={`drawer${menuOpen ? ' drawer-open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="drawer-header">
          <Link href="/" className="drawer-logo" aria-label="linkstorx home" onClick={() => setMenuOpen(false)}>
            <LogoText className="drawer-logo-text" xClassName="drawer-logo-x" />
          </Link>
          <button type="button" className="drawer-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="drawer-links" aria-label="Mobile">
          {NAV_LINKS.map((link, i) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`drawer-link${active ? ' drawer-link-active' : ''}`}
                style={{ transitionDelay: `${menuOpen ? i * 60 + 80 : 0}ms` }}
              >
                <span>{link.label}</span>
                <ArrowIcon />
              </Link>
            );
          })}
        </nav>

        <div className="drawer-footer">
          {user ? (
            <>
              <div className="drawer-user">
                <span className="profile-avatar">{initial}</span>
                <div className="drawer-user-text">
                  <p className="profile-user-name">{user.username}</p>
                  <p className="profile-user-email">{user.email}</p>
                </div>
              </div>

              <Link href="/dashboard" className="drawer-login" onClick={() => setMenuOpen(false)}>
                Go to Dashboard
              </Link>

              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="drawer-logout">Log out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="drawer-login" onClick={() => setMenuOpen(false)}>
              Login / Sign up
            </Link>
          )}
          <span>© {new Date().getFullYear()} linkstorx</span>
        </div>
      </aside>
    </>
  );
}