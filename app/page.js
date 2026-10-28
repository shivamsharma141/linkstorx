import Link from "next/link";
import Navbar from "./component/navbar/navbar";
import HomeProducts from "./component/home/HomeProducts";
import CategoryScroller from "./component/home/CategoryScroller";
import { getCurrentUser } from "@/app/lib/auth/auth";
import { PRODUCT_CATEGORIES } from "@/app/config/productCategories";

import "./component/home/home.css";

// Apne routes ke hisaab se yahan change kar lena
const ROUTES = {
  marketplace: "/homepages/mainproducts",
  dashboard: "/dashboard",
  signup: "/signup",
  login: "/login",
};

// Logged in user ka "My Store" link. Agar tera my-store route alag hai to sirf yahan change kar.
const myStoreRoute = (username) => `/${username}/store`;

/* ---------- IMAGES ----------
   A                             */
const IMAGES = {
  profile: "herophoto1.webp",
  productA: "heroimage.webp",
  productB: "heroimage2.webp",
};

const OWNER = "shivam sharma";

/* hero ke "Sellers and creators" pill ke avatars (internet se). Apni photos ho to /public me daal ke URL badal dena */
const AVATARS = [
  { n: 12, bg: "#fbcfe8" },
  { n: 32, bg: "#c7d2fe" },
  { n: 47, bg: "#bae6fd" },
  { n: 5, bg: "#fde68a" },
];

/* ---------- icons (no emoji) ---------- */
const P = {
  check: "M5 12l5 5 9-10",
  arrow: "M5 12h14M13 6l6 6-6 6",
  out: "M7 17L17 7M8 7h9v9",
  plus: "M5 5h14v14H5zM12 8v8M8 12h8",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  cart: "M3 4h2l2.4 11h10.2L20 7H6.5M9 20h.01M17 20h.01",
  storeIc: "M4 9l1.5-5h13L20 9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M5 12v8h14v-8",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  share: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  dots: "M12 6h.01M12 12h.01M12 18h.01",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1",
  cal: "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  fashion: "M8 4l-5 3 2 4 3-1v10h8V10l3 1 2-4-5-3a4 4 0 0 1-8 0z",
  beauty: "M10 3h4v6h-4zM9 9h6v4H9zM8 13h8v8H8z",
  electronics: "M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4zM17 15h3v5h-3z",
  home: "M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6",
  grocery: "M3 9h18l-2 11H5zM8 9l3-5M16 9l-3-5",
  sport: "M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12",
  book: "M5 4h5v16H5zM10 4h5v16h-5zM16 6l4 1-3 13-4-1",
  toy: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 10h.01M15 10h.01M9 14a4 4 0 0 0 6 0",
  auto: "M4 16v-4l2-5h12l2 5v4M4 16h16M7 19v-3M17 19v-3",
  craft: "M6 7h.01M6 17h.01M8 8l12 9M8 16L20 7",
  gift: "M4 9h16v4H4zM6 13v8h12v-8M12 9v12M12 9c-3 0-4-4-1.5-4.5S12 9 12 9zM12 9c3 0 4-4 1.5-4.5S12 9 12 9z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  chart: "M4 20V11M10 20V4M16 20v-6M22 20H2",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  tag: "M3 12V4h8l10 10-8 8L3 12zM7.5 8h.01",
  dashboard: "M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z",
};

/* hero ke neeche scrolling features strip (icon + text) */
const TICKER = [
  { label: "Link in bio", icon: P.link },
  { label: "Your own online store", icon: P.storeIc },
  { label: "Sell products", icon: P.tag },
  { label: "Cart and orders", icon: P.cart },
  { label: "Custom domains", icon: P.globe },
  { label: "Seller dashboard", icon: P.dashboard },
  { label: "Built-in analytics", icon: P.chart },
  { label: "No coding required", icon: P.bolt },
  { label: "Social links", icon: P.share },
  { label: "Events tab", icon: P.cal },
  { label: "Marketplace listing", icon: P.grid },
];

const CATEGORY_ICONS = [
  [/fashion|cloth/, P.fashion],
  [/beauty|personal/, P.beauty],
  [/electron/, P.electronics],
  [/home|living/, P.home],
  [/grocery|food/, P.grocery],
  [/sport|fitness/, P.sport],
  [/book|station/, P.book],
  [/toy|kid/, P.toy],
  [/auto|car/, P.auto],
  [/hand|craft/, P.craft],
  [/gift|life/, P.gift],
];

const CAT_TONES = [
  ["#fee2e2", "#dc2626"],
  ["#ffe4e6", "#e11d48"],
  ["#dbeafe", "#2563eb"],
  ["#d1fae5", "#059669"],
  ["#fef3c7", "#d97706"],
  ["#cffafe", "#0891b2"],
  ["#ede9fe", "#7c3aed"],
  ["#e0e7ff", "#4f46e5"],
  ["#ffedd5", "#ea580c"],
  ["#dbeafe", "#2563eb"],
  ["#fef9c3", "#ca8a04"],
  ["#fce7f3", "#db2777"],
  ["#f1f5f9", "#475569"],
];

function categoryIcon(value) {
  const hit = CATEGORY_ICONS.find(([re]) => re.test(String(value).toLowerCase()));
  return hit ? hit[1] : P.grid;
}

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* Real brand logos (Instagram, YouTube, LinkedIn, WhatsApp) */
function Social({ kind, uid = "a" }) {
  return (
    <span className={`lx-so lx-so-${kind}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {kind === "ig" && (
          <>
            <defs>
              <linearGradient id={`lx-ig-${uid}`} x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#feda75" />
                <stop offset="0.25" stopColor="#fa7e1e" />
                <stop offset="0.5" stopColor="#d62976" />
                <stop offset="0.75" stopColor="#962fbf" />
                <stop offset="1" stopColor="#4f5bd5" />
              </linearGradient>
            </defs>
            <rect width="24" height="24" rx="6.5" fill={`url(#lx-ig-${uid})`} />
            <rect x="5.4" y="5.4" width="13.2" height="13.2" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
            <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.7" />
            <circle cx="16.3" cy="7.7" r="0.95" fill="#fff" />
          </>
        )}
        {kind === "yt" && (
          <>
            <rect x="0" y="3.5" width="24" height="17" rx="5" fill="#ff0000" />
            <path d="M9.8 8.4v7.2l6.2-3.6z" fill="#fff" />
          </>
        )}
        {kind === "in" && (
          <>
            <rect width="24" height="24" rx="4.5" fill="#0a66c2" />
            <g fill="#fff" transform="translate(4.6 5) scale(0.62)">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect x="2" y="9" width="4" height="12" />
              <circle cx="4" cy="4" r="2" />
            </g>
          </>
        )}
        {kind === "wa" && (
          <>
            <circle cx="12" cy="12" r="12" fill="#25d366" />
            <path
              transform="translate(4.8 4.8) scale(0.6)"
              fill="#fff"
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
            />
          </>
        )}
      </svg>
    </span>
  );
}

/* Image slot: src ho to photo, warna gradient placeholder */
function Pic({ src, tone }) {
  return <span className={`lx-img lx-img-${tone}`}>{src ? <img src={src} alt="" /> : null}</span>;
}

export default async function Home() {
  const user = await getCurrentUser();
  const navUser = user ? { username: user.username, email: user.email } : null;

  // Logged in -> dashboard, logged out -> login
  const createHref = user ? ROUTES.dashboard : ROUTES.login;
  const sellerHref = user ? ROUTES.dashboard : ROUTES.login;

  // Claim link: logged in -> apna store, logged out -> login
  const myStoreHref = user ? myStoreRoute(user.username) : null;

  return (
    <>
      <Navbar user={navUser} />

      <main className="lx">
        {/* ============ 1. HERO ============ */}
        <section className="lx-h">
          <div className="lx-h-glow" aria-hidden="true" />

          <div className="lx-wrap lx-h-grid">
            {/* ---- text ---- */}
            <div className="lx-h-text">
              <div className="lx-h-proof">
                <span className="lx-h-avatars" aria-hidden="true">
                  {AVATARS.map((a) => (
                    <i
                      key={a.n}
                      style={{ backgroundColor: a.bg, backgroundImage: `url(https://i.pravatar.cc/80?img=${a.n})` }}
                    />
                  ))}
                </span>
                <span className="lx-h-stars" aria-hidden="true">★★★★★</span>
                <span>Sellers and creators are already live</span>
              </div>

              <h1>One Link. Endless Ways to Sell.</h1>

              <p className="lx-h-lead">
                More than a link in bio — LinkStorX is your all-in-one digital storefront.
  Bring your social links, products, events, and bookings together on one
  page. Showcase what you offer, help customers discover your brand, and
  turn visitors into customers with your own online store. Everything you
  need to build your presence and start selling, all from one link.
              </p>

              {user ? (
                /* logged in -> My Store */
                <div className="lx-claim">
                  <div className="lx-claim-field lx-claim-static">
                    <span>linkstorx.com/</span>
                    <b>{user.username}</b>
                  </div>
                  <Link href={myStoreHref} className="lx-claim-btn">My Store</Link>
                </div>
              ) : (
                /* logged out -> login (username ?username= me jata hai) */
                <form className="lx-claim" action={ROUTES.login} method="get">
                  <label className="lx-claim-field">
                    <span>linkstorx.com/</span>
                    <input
                      type="text"
                      name="username"
                      placeholder="yourname"
                      autoComplete="off"
                      spellCheck="false"
                      aria-label="Choose your username"
                    />
                  </label>
                  <button type="submit" className="lx-claim-btn">Get Started</button>
                </form>
              )}

              <ul className="lx-h-points">
                <li><Icon d={P.check} /> Link in bio and ecommerce store in one</li>
                <li><Icon d={P.check} /> Cart, orders and seller dashboard</li>
                <li><Icon d={P.check} /> Connect your own custom domain</li>
              </ul>

              <div className="lx-h-links">
                <Link href={createHref} className="lx-h-btn lx-h-btn-main">
                  {user ? "Open dashboard" : "Create your page"} <Icon d={P.arrow} />
                </Link>
                <Link href={ROUTES.marketplace} className="lx-h-btn lx-h-btn-ghost">
                  <Icon d={P.storeIc} /> View products
                </Link>
              </div>
            </div>

            {/* ---- 3 cards ---- */}
            <div className="lx-h-stage">
              {/* left: shop */}
              <div className="lx-h-card lx-h-card-l">
                <Pic src={IMAGES.productA} tone="c" />
                <div className="lx-h-shop-body">
                  <b>Classic Hoodie</b>
                  <small>Soft fleece, made for everyday wear.</small>
                  <strong>₹1,499</strong>
                  <span className="lx-h-order">Add to cart</span>
                </div>
                <div className="lx-h-shop-row">
                  <Pic src={IMAGES.productB} tone="b" />
                  <div><b>Tshirt</b><small>₹1,299</small></div>
                  <span className="lx-pill lx-pill-green">In stock</span>
                </div>
              </div>

              {/* center: real profile page */}
              <div className="lx-h-card lx-h-card-c">
                <div className="lx-h-pf-photo">
                  {IMAGES.profile ? <img src={IMAGES.profile} alt="" /> : <Icon d={P.user} />}
                  <span className="lx-h-pf-btn lx-h-pf-share"><Icon d={P.share} /></span>
                  <span className="lx-h-pf-btn lx-h-pf-more"><Icon d={P.dots} /></span>
                </div>

                <div className="lx-h-pf-card">
                  <div className="lx-h-pf-name">
                    {OWNER}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="11" fill="#1d9bf0" />
                      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="lx-h-pf-tags">TECH | CREATOR | FITNESS</div>
                  <p>Web developer and creator. My links and my store in one place.</p>
                  <div className="lx-h-pf-social">
                    <Social kind="ig" uid="h1" />
                    <Social kind="yt" />
                    <Social kind="in" />
                    <Social kind="wa" />
                  </div>
                  <div className="lx-h-pf-visit"><Icon d={P.storeIc} /> Visit My Store <Icon d={P.arrow} /></div>
                </div>

                <div className="lx-h-pf-tabs">
                  <b><Icon d={P.link} /> Links</b>
                  <span><Icon d={P.storeIc} /> Shop</span>
                  <span><Icon d={P.cal} /> Events</span>
                  <span><Icon d={P.mail} /> Contact</span>
                </div>

                <div className="lx-h-pf-h">My Links</div>
                <div className="lx-h-pf-link lx-h-pf-link-ig"><Social kind="ig" uid="h2" /><div><b>Instagram</b><small>Follow my journey</small></div></div>
                <div className="lx-h-pf-link lx-h-pf-link-in"><Social kind="in" uid="h3" /><div><b>LinkedIn</b><small>Let's connect professionally</small></div></div>
              </div>

              {/* right: seller dashboard */}
              <div className="lx-h-card lx-h-card-r">
                <div className="lx-h-or-h">Seller dashboard</div>
                <div className="lx-h-or-stats">
                  <div><small>Sales</small><b>₹2,798</b></div>
                  <div><small>Orders</small><b>2</b></div>
                </div>
                <div className="lx-h-or-row">
                  <Pic src={IMAGES.productA} tone="c" />
                  <div><b>Classic Hoodie</b><small>#LS-261010</small></div>
                  <span className="lx-pill lx-pill-amber">Pending</span>
                </div>
                <div className="lx-h-or-row">
                  <Pic src={IMAGES.productB} tone="b" />
                  <div><b>Tshirt</b><small>#LS-261006</small></div>
                  <span className="lx-pill lx-pill-green">Delivered</span>
                </div>
                <div className="lx-h-domain">
                  <Icon d={P.link} />
                  <span>shop.yourbrand.com</span>
                  <i>Custom domain</i>
                </div>
              </div>
            </div>
          </div>

          {/* features ticker */}
          <div className="lx-h-ticker" aria-label="LinkStorX features">
            <div className="lx-h-track">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={i} aria-hidden={i >= TICKER.length ? "true" : undefined}>
                  <i className="lx-h-tick-ic"><Icon d={t.icon} /></i>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ============ 2. EVERYTHING INSIDE ============ */}
        <section className="lx-all">
          <div className="lx-wrap lx-all-grid">
            <div className="lx-dash">
              <div className="lx-dash-side" aria-hidden="true">
                <div className="lx-dash-logo">LinkStor<span>X</span></div>
                <span className="on"><Icon d={P.home} /> Dashboard</span>
                <span><Icon d={P.storeIc} /> My Store</span>
                <span><Icon d={P.plus} /> Add Products</span>
                <span><Icon d={P.cart} /> Orders</span>
                <div className="lx-dash-plan"><b>Subscribed</b><small>Starter plan</small></div>
              </div>

              <div className="lx-dash-main">
                <div className="lx-dash-top">
                  <h4>Welcome back, Shivam</h4>
                  <small>Here is how your store is doing</small>
                </div>

                <div className="lx-stats">
                  <div><small>Total sales</small><b>₹2,798</b></div>
                  <div><small>Orders</small><b>2</b></div>
                  <div><small>Store visits</small><b>148</b></div>
                </div>

                <div className="lx-dash-card">
                  <h4>Latest orders</h4>
                  <div className="lx-otabs"><b>All 2</b><span>Pending 1</span><span>Confirmed 0</span><span>Shipped 0</span><span>Delivered 1</span></div>
                  <div className="lx-trow lx-trow-head"><span>Order</span><span>Product</span><span>Total</span><span>Status</span></div>
                  <div className="lx-trow lx-trow-warm">
                    <b>#LS-261010</b>
                    <Link href={ROUTES.marketplace} className="lx-tprod"><Pic src={IMAGES.productA} tone="c" />Classic Hoodie</Link>
                    <b>₹1,499</b>
                    <span className="lx-pill lx-pill-amber">Pending</span>
                  </div>
                  <div className="lx-trow">
                    <b>#LS-261006</b>
                    <Link href={ROUTES.marketplace} className="lx-tprod"><Pic src={IMAGES.productB} tone="b" />Wall hanging</Link>
                    <b>₹1,299</b>
                    <span className="lx-pill lx-pill-green">Delivered</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lx-all-text">
              <h2>Everything a seller needs is already inside.</h2>
              <p className="lx-lead">
                Seller dashboard, store, products, orders and custom domains. No extra tools to set up
                and no separate website to maintain.
              </p>

              <dl className="lx-list">
                <div>
                  <dt>Seller dashboard</dt>
                  <dd>See sales, orders and visits in one place.</dd>
                </div>
                <div>
                  <dt>Your own store</dt>
                  <dd>A store page with your name, your products and your look.</dd>
                </div>
                <div>
                  <dt>Product management</dt>
                  <dd>Add products, set prices and mark items sold out when stock ends.</dd>
                </div>
                <div>
                  <dt>Cart and orders</dt>
                  <dd>Customers add to cart and order without leaving your page.</dd>
                </div>
                <div>
                  <dt>Custom domains</dt>
                  <dd>Use your own domain for your links page and your store.</dd>
                </div>
                <div>
                  <dt>One link for everything</dt>
                  <dd>Put your links and your store behind a single address in your bio.</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* ============ 3. CATEGORIES (marketplace jaisa) ============ */}
        <section className="lx-cats">
          <div className="lx-wrap">
            <div className="lx-head">
              <div>
                <h2>Shop by category</h2>
                <p>Pick a category and see what sellers have listed.</p>
              </div>
            </div>

            <CategoryScroller>
              <Link href={ROUTES.marketplace} className="lx-cat lx-cat-all">
                <span className="lx-cat-circle" style={{ "--bg": "#0a84ff", "--fg": "#ffffff" }}>
                  <Icon d={P.grid} />
                </span>
                <span className="lx-cat-label">All</span>
              </Link>

              {PRODUCT_CATEGORIES.map((c, i) => {
                const [bg, fg] = CAT_TONES[i % CAT_TONES.length];
                return (
                  <Link
                    key={c.value}
                    href={`${ROUTES.marketplace}?category=${encodeURIComponent(c.value)}`}
                    className="lx-cat"
                  >
                    <span className="lx-cat-circle" style={{ "--bg": bg, "--fg": fg }}>
                      <Icon d={categoryIcon(c.value)} />
                    </span>
                    <span className="lx-cat-label">{c.label}</span>
                  </Link>
                );
              })}
            </CategoryScroller>
          </div>
        </section>

        {/* ============ 4. LATEST PRODUCTS (live, 5 cards) ============ */}
        <section className="lx-prods">
          <div className="lx-wrap">
            <div className="lx-head">
              <div>
                <h2>New from our sellers</h2>
                <p>The latest products listed on LinkStorX.</p>
              </div>
              <Link href={ROUTES.marketplace} className="lx-textlink">View all products</Link>
            </div>

            <HomeProducts marketplacePath={ROUTES.marketplace} />

            <div className="lx-center">
              <Link href={ROUTES.marketplace} className="lx-btn lx-btn-solid">View all products</Link>
            </div>
          </div>
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="lx-footer">
        <div className="lx-wrap">
          <div className="lx-foot-top">
            <div>
              <div className="lx-foot-logo">LinkStor<span>X</span></div>
              <p>Link in bio, with a store.</p>
            </div>

            <div className="lx-foot-cols">
              <div>
                <h4>Marketplace</h4>
                <Link href={ROUTES.marketplace}>Products</Link>
                <Link href={ROUTES.marketplace}>Categories</Link>
              </div>
              <div>
                <h4>For sellers</h4>
                <Link href={createHref}>Start selling</Link>
                <Link href={sellerHref}>{user ? "Dashboard" : "Seller login"}</Link>
                <a href="#">Seller guide</a>
              </div>
              <div>
                <h4>Company</h4>
                <a href="#">About us</a>
                <a href="#">Contact</a>
                <a href="#">Help center</a>
              </div>
            </div>
          </div>

          <div className="lx-foot-bottom">
            <p>© 2026 LinkStorX. All rights reserved.</p>
            <div>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}