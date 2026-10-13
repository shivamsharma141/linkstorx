"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/app/config/storeFeatures";

const API_URL = "/api/marketplace/products";
const LIMIT = 5; // front page par sirf 5 cards

async function fetchLatest() {
  const res = await fetch(`${API_URL}?page=1&limit=${LIMIT}&sort=newest`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || "failed");
  return (data.products || []).slice(0, LIMIT);
}

function discountOf(p) {
  const price = Number(p.price);
  const was = Number(p.mrp);
  return was > price ? Math.round(((was - price) / was) * 100) : 0;
}

function Card({ product }) {
  const [broken, setBroken] = useState(false);
  const seller = product.seller || {};
  const image = product.images?.[0];
  const href = `/${seller.username}/store/${product.slug}`;
  const storeHref = `/${seller.username}/store`;
  const off = discountOf(product);
  const out = product.inStock === false;

  return (
    <article className={out ? "lx-card lx-card-out" : "lx-card"}>
      <Link href={href} className="lx-card-media" aria-label={product.name}>
        {image && !broken ? (
          <>
            <img src={image} alt="" aria-hidden="true" className="lx-card-bg" />
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="lx-card-img"
              onError={() => setBroken(true)}
            />
          </>
        ) : (
          <span className="lx-card-noimg">No image</span>
        )}
        {product.featured && <span className="lx-card-badge">Featured</span>}
        {out && <span className="lx-card-sold">Sold out</span>}
      </Link>

      <div className="lx-card-body">
        <h3 className="lx-card-name"><Link href={href}>{product.name}</Link></h3>

        <div className="lx-card-price">
          <strong>{formatMoney(product.price, product.currency)}</strong>
          {off > 0 && (
            <>
              <s>{formatMoney(product.mrp, product.currency)}</s>
              <em>{off}% off</em>
            </>
          )}
        </div>

        <Link href={storeHref} className="lx-card-seller">
          {seller.profileImage ? (
            <img src={seller.profileImage} alt="" loading="lazy" />
          ) : (
            <span>{(seller.displayName || seller.username || "?").charAt(0).toUpperCase()}</span>
          )}
          <small>{seller.displayName || `@${seller.username}`}</small>
        </Link>

        <Link href={href} className="lx-card-btn">View product</Link>
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className="lx-grid" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: LIMIT }).map((_, i) => (
        <div key={i} className="lx-card">
          <span className="lx-skel lx-card-media" />
          <div className="lx-card-body">
            <span className="lx-skel lx-skel-line" style={{ width: "80%" }} />
            <span className="lx-skel lx-skel-line" style={{ width: "45%" }} />
            <span className="lx-skel lx-skel-line" style={{ width: "100%", height: 38 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomeProducts({ marketplacePath = "/marketplace" }) {
  const [items, setItems] = useState(null); // null = loading
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await fetchLatest();
      setItems(list);
      setError(false);
    } catch {
      setItems((prev) => (prev === null ? [] : prev));
      setError(true);
    }
  }, []);

  // sirf page khulte hi ek baar fetch. Koi auto-refresh nahi: user page reload kare tabhi dubara hoga.
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (items === null) return <Skeleton />;

  if (items.length === 0) {
    return (
      <div className="lx-empty" role={error ? "alert" : undefined}>
        {error ? (
          <>
            <h3>Could not load products</h3>
            <p>Check your connection and try again.</p>
            <button type="button" className="lx-btn lx-btn-solid" onClick={refresh}>Try again</button>
          </>
        ) : (
          <>
            <h3>No products yet</h3>
            <p>Sellers are setting up their stores. New products will show up here as soon as they are listed.</p>
            <Link href={marketplacePath} className="lx-btn lx-btn-line">Open marketplace</Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="lx-grid">
      {items.map((p) => (
        <Card key={p.id} product={p} />
      ))}
    </div>
  );
}