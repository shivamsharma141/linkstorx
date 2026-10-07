"use client";

import { useState } from "react";
import Link from "next/link";

const SOCIAL_META = {
  instagram: { label: "Instagram", color: "#D62976" },
  youtube: { label: "YouTube", color: "#FF0000" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  x: { label: "X", color: "#000000" },
  facebook: { label: "Facebook", color: "#1877F2" },
  telegram: { label: "Telegram", color: "#229ED9" },
  website: { label: "Website", color: "#5c5245" },
};

/* =========================================================
   Platform brand styling for the "My Links" buttons.
   Any link whose `icon` matches one of these keys gets
   rendered as a filled brand-colored pill instead of the
   default white card.
========================================================= */

const LINK_PLATFORM_STYLE = {
  instagram: {
    background:
      "linear-gradient(135deg, #FEDA75 0%, #FA7E1E 35%, #D62976 60%, #962FBF 85%, #4F5BD5 100%)",
    color: "#fff",
  },
  youtube: { background: "#FF0000", color: "#fff" },
  linkedin: { background: "#0A66C2", color: "#fff" },
  whatsapp: { background: "#25D366", color: "#fff" },
  x: { background: "#000000", color: "#fff" },
  facebook: { background: "#1877F2", color: "#fff" },
  telegram: { background: "#229ED9", color: "#fff" },
  website: { background: "#5c5245", color: "#fff" },
};

const SOCIAL_PATHS = {
  youtube:
    "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",

  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",

  whatsapp:
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.198.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884",

  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",

  facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",

  telegram:
    "M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
};

const INSTAGRAM_MONO_PATH =
  "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.012-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z";

function SocialIcon({ platform, size = 19, mono = false }) {
  if (platform === "instagram") {
    if (mono) {
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="#fff">
          <path d={INSTAGRAM_MONO_PATH} />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <defs>
          <linearGradient id="ls-ig" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#FEDA75" />
            <stop offset="35%" stopColor="#FA7E1E" />
            <stop offset="60%" stopColor="#D62976" />
            <stop offset="85%" stopColor="#962FBF" />
            <stop offset="100%" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>

        <rect
          x="2.6"
          y="2.6"
          width="18.8"
          height="18.8"
          rx="5.4"
          fill="none"
          stroke="url(#ls-ig)"
          strokeWidth="2.1"
        />

        <circle
          cx="12"
          cy="12"
          r="4.4"
          fill="none"
          stroke="url(#ls-ig)"
          strokeWidth="2.1"
        />

        <circle cx="17.1" cy="6.9" r="1.35" fill="url(#ls-ig)" />
      </svg>
    );
  }

  if (platform === "website") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.5 2.6 3.9 5.7 3.9 9s-1.4 6.4-3.9 9c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d={SOCIAL_PATHS[platform]} />
    </svg>
  );
}

function normalizeUrl(url) {
  const value = String(url || "").trim();

  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("whatsapp:")
  ) {
    return value;
  }

  return `https://${value}`;
}

/* Tries a bunch of common field names/shapes so the shop
   grid still shows an image even if the product object uses
   a different key than expected. */
function getProductImage(product) {
  if (!product) return null;

  const direct =
    product.image ||
    product.imageUrl ||
    product.imageURL ||
    product.thumbnail ||
    product.thumbnailUrl ||
    product.photo ||
    product.photoUrl ||
    product.picture ||
    product.coverImage ||
    product.mainImage ||
    null;

  if (direct) return direct;

  const arrays = [
    product.images,
    product.photos,
    product.pictures,
    product.gallery,
    product.media,
  ];

  for (const arr of arrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        return first.url || first.src || first.image || null;
      }
    }
  }

  return null;
}

/* Same idea as getProductImage — tries common field names so
   a short description shows up even if the field is named
   differently in your product data. */
function getProductDescription(product) {
  if (!product) return null;

  return (
    product.description ||
    product.shortDescription ||
    product.desc ||
    product.summary ||
    product.subtitle ||
    product.tagline ||
    null
  );
}

export default function PublicProfileView({ profile, storeProducts = [] }) {
  const [activeSection, setActiveSection] = useState("links");

  const visibleSocials =
    profile.socialIcons?.filter(
      (social) => social.enabled && social.url && social.url.trim() !== ""
    ) || [];

  const visibleButtons =
    profile.primaryButtons?.filter(
      (button) => button.enabled && button.label && button.label.trim() !== ""
    ) || [];

  const visibleLinks =
    profile.links?.filter(
      (link) => link.enabled && link.url && link.url.trim() !== ""
    ) || [];

  const accent = profile.theme?.accentColor || "#2563eb";

  const storeHref = `/${profile.username}/store`;

  return (
    <div className="pub-page" style={{ "--pub-accent": accent }}>
      <div className="pub-card">
        <div className="pub-photo-wrap">
          <div className="pub-photo">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={profile.displayName || profile.username}
              />
            ) : (
              <div className="pub-photo-placeholder" />
            )}
          </div>

          <div className="pub-photo-overlay" />
        </div>

        <div className="pub-heading">
          <p className="pub-welcome">Welcome to my website</p>

          <h1 className="pub-name">
            {profile.displayName || profile.username}
          </h1>
        </div>

        <div className="pub-info">
          {/* Visit Store — filled button, matches the primary
              buttons below it. This one stays on the hero. */}
          <Link href={storeHref} className="pub-store-link">
            <span> Visit My Store</span>
            <span className="pub-button-arrow">→</span>
          </Link>

          {visibleButtons.length > 0 && (
            <div className="pub-buttons">
              {visibleButtons.map((button) => {
                const href = normalizeUrl(button.url);

                return href ? (
                  <a
                    key={button.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pub-button"
                    style={{ background: accent }}
                  >
                    <span>{button.label}</span>
                    <span className="pub-button-arrow">→</span>
                  </a>
                ) : (
                  <div
                    key={button.id}
                    className="pub-button"
                    style={{ background: accent }}
                  >
                    <span>{button.label}</span>
                    <span className="pub-button-arrow">→</span>
                  </div>
                );
              })}
            </div>
          )}

          {profile.categoryTags?.length > 0 && (
            <div className="pub-tags">
              {profile.categoryTags.map((tag) => (
                <span key={tag} className="pub-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {visibleSocials.length > 0 && (
            <div className="pub-socials">
              {visibleSocials.map((social) => (
                <a
                  key={social.platform}
                  href={normalizeUrl(social.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pub-social"
                  title={SOCIAL_META[social.platform]?.label || social.platform}
                  style={{ color: SOCIAL_META[social.platform]?.color || "#333" }}
                >
                  <SocialIcon platform={social.platform} />
                </a>
              ))}
            </div>
          )}

          {profile.bio && <p className="pub-bio">{profile.bio}</p>}
        </div>
      </div>

      <nav className="pub-nav">
        {[
          { key: "links", label: "Links" },
          { key: "shop", label: "Shop" },
          { key: "events", label: "Events" },
          { key: "about", label: "About" },
          { key: "contact", label: "Contact" },
        ].map((section) => (
          <button
            key={section.key}
            type="button"
            className={
              activeSection === section.key
                ? "pub-nav-item pub-nav-item-active"
                : "pub-nav-item"
            }
            onClick={() => setActiveSection(section.key)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div className="pub-section">
        {activeSection === "links" && (
          <>
            <h2 className="pub-section-title">My Links</h2>

            {visibleLinks.length === 0 ? (
              <p className="pub-empty">No links yet.</p>
            ) : (
              <div className="pub-links">
                {visibleLinks.map((link) => {
                  const platformStyle = LINK_PLATFORM_STYLE[link.icon];

                  return (
                    <a
                      key={link.id}
                      href={normalizeUrl(link.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        platformStyle
                          ? "pub-link pub-link-platform"
                          : "pub-link"
                      }
                      style={
                        platformStyle
                          ? {
                              background: platformStyle.background,
                              color: platformStyle.color,
                              borderColor: "transparent",
                            }
                          : undefined
                      }
                    >
                      <span className="pub-link-icon">
                        {platformStyle ? (
                          <SocialIcon
                            platform={link.icon}
                            size={18}
                            mono={link.icon === "instagram"}
                          />
                        ) : (
                          link.icon || "🔗"
                        )}
                      </span>

                      <span>{link.title}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeSection === "shop" && (
          <>
            <h2 className="pub-section-title">Shop</h2>

            {storeProducts.length === 0 ? (
              <p className="pub-empty">No products yet.</p>
            ) : (
              <div className="pub-shop-grid">
                {storeProducts.slice(0, 8).map((product) => {
                  const imgSrc = getProductImage(product);
                  const description = getProductDescription(product);

                  return (
                    <Link
                      key={product.id}
                      href={storeHref}
                      className="pub-shop-item"
                    >
                      <div className="pub-shop-item-media">
                        {imgSrc ? (
                          <img src={imgSrc} alt={product.name} />
                        ) : (
                          <div className="pub-shop-item-placeholder" />
                        )}
                      </div>

                      <div className="pub-shop-item-body">
                        <span className="pub-shop-item-name">
                          {product.name}
                        </span>

                        {description && (
                          <span className="pub-shop-item-desc">
                            {description}
                          </span>
                        )}

                        <div className="pub-shop-item-footer">
                          {product.price != null && (
                            <span className="pub-shop-item-price">
                              ₹{product.price}
                            </span>
                          )}

                          <span className="pub-shop-buy-btn">Buy Now</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeSection === "events" && (
          <>
            <h2 className="pub-section-title">Upcoming Events</h2>
            <p className="pub-empty">Events coming soon.</p>
          </>
        )}

        {activeSection === "about" && (
          <>
            <h2 className="pub-section-title">About</h2>
            <p className="pub-empty">{profile.bio || "No bio yet."}</p>
          </>
        )}

        {activeSection === "contact" && (
          <>
            <h2 className="pub-section-title">Contact</h2>

            {visibleSocials.length > 0 ? (
              <div className="pub-contact-list">
                {visibleSocials.map((social) => (
                  <a
                    key={social.platform}
                    href={normalizeUrl(social.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pub-contact-item"
                  >
                    <span style={{ color: SOCIAL_META[social.platform]?.color }}>
                      <SocialIcon platform={social.platform} />
                    </span>

                    <span>{SOCIAL_META[social.platform]?.label}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="pub-empty">No contact details yet.</p>
            )}
          </>
        )}
      </div>

      <footer className="pub-footer">Made with ❤ by LinkStorx</footer>
    </div>
  );
}