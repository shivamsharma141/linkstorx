'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import './navbar.css';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Products', href: '/homepages/mainproducts' },
  { label: 'Myorders', href: '/homepages/myorders' },

  { label: 'Blogs', href: '/blogs' },
  { label: 'About', href: '/about' },
];

// `user` layout (server) se aata hai: { username, email } ya null
export default function Navbar({ user = null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const initial = user ? user.username.charAt(0).toUpperCase() : '';

  // Add a slightly stronger glass effect once the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Close the drawer + profile dropdown automatically on route change
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [profileOpen]);

  return (
    <>
      <header className={`navbar${scrolled ? ' navbar-scrolled' : ''}`}>
        <div className="nav-inner">
          {/* Logo */}
          <Link href="/" className="nav-logo" aria-label="LinkStorX home">
            <Image
              src="/linkstorexnavlogo.png"
              alt="LinkStorX"
              width={190}
              height={58}
              priority
              className="nav-image"
            />
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

          {/* Right side actions */}
          <div className="nav-actions">
            <button type="button" className="icon-btn" aria-label="Cart">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M3 4h2l.4 2M7 13h10l3-7H6.4M7 13l-1.6-7M7 13l-1.6 7h11.2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="20" r="1.4" fill="currentColor" />
                <circle cx="17" cy="20" r="1.4" fill="currentColor" />
              </svg>
            </button>

            <button type="button" className="icon-btn" aria-label="Premium">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </button>

            {user ? (
              /* Logged in — profile dropdown */
              <div className="profile" ref={profileRef}>
                <button
                  type="button"
                  className="profile-btn"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  aria-label="Account menu"
                  onClick={() => setProfileOpen((open) => !open)}
                >
                  <span className="profile-avatar">{initial}</span>
                  <span className="profile-name">{user.username}</span>
                  <svg className="profile-chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="profile-dropdown" role="menu">
                    <div className="profile-user">
                      <p className="profile-user-name">{user.username}</p>
                      <p className="profile-user-email">{user.email}</p>
                    </div>

                    <Link href="/dashboard" className="profile-item" role="menuitem">
                      Dashboard
                    </Link>

                    <form action="/api/auth/logout" method="POST">
                      <button type="submit" className="profile-item profile-logout" role="menuitem">
                        Logout
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              /* Logged out — Login / Signup premium pill */
              <Link href="/login" className="login-btn" aria-label="Login or sign up">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="login-btn-text">Login</span>
              </Link>
            )}

            {/* Hamburger — mobile only */}
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

      {/* Mobile drawer — slides in from the left */}
      <aside
        id="mobile-drawer"
        className={`drawer${menuOpen ? ' drawer-open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="drawer-header">
          <Image
            src="/linkstorexnavlogo.png"
            alt="LinkStorX"
            width={150}
            height={46}
            className="drawer-logo"
          />
          <button
            type="button"
            className="drawer-close"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M5 5l14 14M19 5L5 19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
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
                {link.label}
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
                <button type="submit" className="drawer-logout">
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="drawer-login" onClick={() => setMenuOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              Login / Sign up
            </Link>
          )}
          <span>© {new Date().getFullYear()} LinkStorX</span>
        </div>
      </aside>
    </>
  );
}