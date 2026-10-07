import { NextResponse } from "next/server";

import { connectToDatabase } from "@/app/lib/database/mongodb";
import Product from "@/app/databaseModels/Product";
import User from "@/app/databaseModels/User";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORTS = {
  newest: { createdAt: -1 },
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
  name: { name: 1 },
  featured: { featured: -1, createdAt: -1 },
};

// Image string ho ya object ({url}, {secure_url}...) -> hamesha valid URL string
const toUrl = (x) => {
  const u =
    typeof x === "string" ? x : x?.url || x?.secure_url || x?.src || x?.path || "";
  if (!u) return "";
  return /^(https?:|data:|blob:|\/)/.test(u) ? u : `/${u}`;
};

function getImages(d) {
  const arrays = [d.images, d.gallery, d.photos, d.imageUrls, d.media, d.pictures]
    .filter(Array.isArray)
    .flat();
  const singles = [d.image, d.imageUrl, d.thumbnail, d.coverImage, d.cover, d.mainImage];
  const list = [...arrays, ...singles].map(toUrl).filter(Boolean);
  return [...new Set(list)];
}

export async function GET(request) {
  try {
    await connectToDatabase();

    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(48, Math.max(1, Number(sp.get("limit")) || 15));
    const q = (sp.get("q") || "").trim().slice(0, 80);

    const filter = { enabled: true };

    if (sp.get("id")) filter._id = sp.get("id");
    if (sp.get("category")) filter.category = sp.get("category");
    if (sp.get("featured") === "1") filter.featured = true;

    const min = Number(sp.get("minPrice"));
    const max = Number(sp.get("maxPrice"));
    if (min > 0 || max > 0) {
      filter.price = {};
      if (min > 0) filter.price.$gte = min;
      if (max > 0) filter.price.$lte = max;
    }

    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      const sellers = await User.find({ username: re }).select("_id").limit(50).lean();

      filter.$or = [
        { name: re },
        { shortDescription: re },
        { description: re },
        { tags: re },
        { category: re },
        ...(sellers.length ? [{ userId: { $in: sellers.map((s) => s._id) } }] : []),
      ];
    }

    const [docs, total] = await Promise.all([
      Product.find(filter)
        // _id tie-breaker: load-more me duplicate/miss na ho
        .sort({ ...(SORTS[sp.get("sort")] || SORTS.newest), _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: "userId", select: "username" })
        .lean(),
      Product.countDocuments(filter),
    ]);

    const products = docs
      .filter((d) => d.userId?.username)
      .map((d) => ({
        id: String(d._id),
        slug: d.slug,
        name: d.name,
        description: d.shortDescription || d.description || "",
        images: getImages(d),
        price: d.price,
        mrp: d.compareAtPrice ?? null,
        currency: d.currency || "INR",
        inStock: !d.trackInventory || (Number(d.stock) || 0) > 0,
        category: d.category,
        tags: d.tags || [],
        featured: Boolean(d.featured),
        seller: {
          username: d.userId.username,
          displayName: d.userId.username,
          profileImage: "",
          accentColor: "",
        },
      }));

    return NextResponse.json({
      success: true,
      products,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error("marketplace products error:", err);
    return NextResponse.json({ success: false, message: "Unable to load products." }, { status: 500 });
  }
}