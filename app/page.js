import Navbar from "./component/navbar/navbar";
import { getCurrentUser } from "@/app/lib/auth/auth";

export default async function Home() {
  const user = await getCurrentUser();

  const navUser = user
    ? {
        username: user.username,
        email: user.email,
      }
    : null;

  return (
    <>
      <Navbar user={navUser} />

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">✨ SHOP • EXPLORE</span>

          <h1>
            Everything You Love,
            <span> All in One Place.</span>
          </h1>

          <p>
            Discover amazing products and unique experiences from
            sellers and creators around you.
          </p>

          <div className="hero-buttons">
            <button className="primary-btn">
              Explore Products →
            </button>
          </div>

          <div className="hero-stats">
            <div>
              <h3>10K+</h3>
              <p>Products</p>
            </div>

            <div>
              <h3>500+</h3>
              <p>Sellers</p>
            </div>

            <div>
              <h3>1K+</h3>
              <p>Customers</p>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-card">
            <span>🔥 Trending</span>
            <h2>Discover Something New</h2>
            <p>Shop products from amazing sellers.</p>
          </div>

          <div className="floating-card product-card">
            🛍️
            <div>
              <strong>Trending Products</strong>
              <small>Explore now</small>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section">
        <div className="section-header">
          <div>
            <span className="section-label">EXPLORE</span>
            <h2>Shop by Category</h2>
            <p>Find exactly what you're looking for.</p>
          </div>

          <button className="view-btn">
            View All →
          </button>
        </div>

        <div className="categories">
          <div className="category">
            <div className="category-icon">👕</div>
            <h3>Fashion</h3>
            <p>2,400+ Products</p>
          </div>

          <div className="category">
            <div className="category-icon">📱</div>
            <h3>Electronics</h3>
            <p>1,800+ Products</p>
          </div>

          <div className="category">
            <div className="category-icon">🏠</div>
            <h3>Home & Living</h3>
            <p>1,200+ Products</p>
          </div>

          <div className="category">
            <div className="category-icon">💄</div>
            <h3>Beauty</h3>
            <p>900+ Products</p>
          </div>

          <div className="category">
            <div className="category-icon">🎨</div>
            <h3>Art & Crafts</h3>
            <p>700+ Products</p>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="section products-section">
        <div className="section-header">
          <div>
            <span className="section-label">TRENDING NOW</span>
            <h2>Featured Products</h2>
            <p>Handpicked products from our sellers.</p>
          </div>

          <button className="view-btn">
            View All →
          </button>
        </div>

        <div className="products-grid">
          <div className="product">
            <div className="product-image">👟</div>

            <div className="product-info">
              <span>Fashion</span>
              <h3>Premium Running Shoes</h3>
              <p>₹1,999</p>

              <button>Add to Cart</button>
            </div>
          </div>

          <div className="product">
            <div className="product-image">🎧</div>

            <div className="product-info">
              <span>Electronics</span>
              <h3>Wireless Headphones</h3>
              <p>₹2,499</p>

              <button>Add to Cart</button>
            </div>
          </div>

          <div className="product">
            <div className="product-image">⌚</div>

            <div className="product-info">
              <span>Electronics</span>
              <h3>Smart Watch Pro</h3>
              <p>₹3,999</p>

              <button>Add to Cart</button>
            </div>
          </div>

          <div className="product">
            <div className="product-image">🎒</div>

            <div className="product-info">
              <span>Accessories</span>
              <h3>Urban Travel Backpack</h3>
              <p>₹1,299</p>

              <button>Add to Cart</button>
            </div>
          </div>
        </div>
      </section>

      {/* SELLER CTA */}
      <section className="seller-section">
        <div>
          <span className="section-label">FOR SELLERS</span>

          <h2>Turn Your Products Into Opportunities.</h2>

          <p>
            Join LinkStorX and showcase your products to customers
            looking for something new.
          </p>

          <button className="primary-btn">
            Start Selling →
          </button>
        </div>

        <div className="seller-visual">
          <div className="seller-icon">🛍️</div>
          <h3>Grow Your Business</h3>
          <p>Reach more customers. Build your brand.</p>
        </div>
      </section>

      {/* WHY LINKSTORX */}
      <section className="section">
        <div className="center-heading">
          <span className="section-label">WHY LINKSTORX</span>

          <h2>More Than Just Shopping</h2>

          <p>
            A place where shopping and discovery come together.
          </p>
        </div>

        <div className="features">
          <div className="feature">
            <div>🛒</div>

            <h3>Discover Products</h3>

            <p>
              Explore products from different sellers and discover
              new brands.
            </p>
          </div>

          <div className="feature">
            <div>🚀</div>

            <h3>Support Sellers</h3>

            <p>
              Give growing businesses a platform to showcase their
              products.
            </p>
          </div>

          <div className="feature">
            <div>✨</div>

            <h3>Explore More</h3>

            <p>
              One platform to discover products, people and brands.
            </p>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="newsletter">
        <span className="section-label">STAY UPDATED</span>

        <h2>Don't Miss What's Next.</h2>

        <p>
          Get updates about new products and exciting things
          happening on LinkStorX.
        </p>

        <div className="newsletter-form">
          <input
            type="email"
            placeholder="Enter your email address"
          />

          <button>Subscribe</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-brand">
          <h2>
            LinkStor<span>X</span>
          </h2>

          <p>Shop. Explore.</p>
        </div>

        <div className="footer-links">
          <div>
            <h4>Marketplace</h4>
            <a href="#">Products</a>
            <a href="#">Categories</a>
          </div>

          <div>
            <h4>For Sellers</h4>
            <a href="#">Start Selling</a>
            <a href="#">Seller Login</a>
            <a href="#">Seller Guide</a>
          </div>

          <div>
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Contact</a>
            <a href="#">Help Center</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 LinkStorX. All rights reserved.</p>

          <div>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </footer>
    </>
  );
}