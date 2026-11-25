/* =========================================================
   CENTRALIZED PRODUCT CATEGORY CONFIGURATION
   Single source of truth. Do not duplicate this list
   anywhere else in the app — import it instead.

   NOTE: Pet Supplies and Health & Wellness (medicine /
   supplements / healthcare) are intentionally NOT included
   because they are not supported by our payment partner
   (Razorpay). Do not add them back.
========================================================= */

export const PRODUCT_CATEGORIES = [
  {
    value: "fashion-clothing",
    label: "Fashion & Clothing",
    subcategories: [
      "Men's Wear",
      "Women's Wear",
      "Kids Wear",
      "Footwear",
      "Bags & Wallets",
      "Watches",
      "Jewelry & Accessories",
      "Ethnic Wear",
    ],
  },
  {
    value: "beauty-personal-care",
    label: "Beauty & Personal Care",
    subcategories: [
      "Skincare",
      "Haircare",
      "Makeup",
      "Fragrances",
      "Bath & Body",
      "Grooming Tools",
    ],
  },
  {
    value: "electronics",
    label: "Electronics",
    subcategories: [
      "Mobile Accessories",
      "Audio",
      "Computer Accessories",
      "Gadgets",
      "Smart Devices",
      "Cables & Chargers",
    ],
  },
  {
    value: "home-living",
    label: "Home & Living",
    subcategories: [
      "Home Decor",
      "Kitchen & Dining",
      "Furniture",
      "Bedding & Bath",
      "Storage & Organization",
      "Lighting",
    ],
  },
  {
    value: "grocery-food",
    label: "Grocery & Food",
    subcategories: [
      "Snacks",
      "Beverages",
      "Bakery",
      "Organic Foods",
      "Spices & Condiments",
      "Sweets & Confectionery",
    ],
  },
  {
    value: "sports-fitness",
    label: "Sports & Fitness",
    subcategories: [
      "Gym Equipment",
      "Sportswear",
      "Outdoor & Adventure",
      "Yoga Gear",
      "Team Sports Gear",
    ],
  },
  {
    value: "books-stationery",
    label: "Books & Stationery",
    subcategories: [
      "Books",
      "Notebooks & Diaries",
      "Art Supplies",
      "Office Supplies",
      "Educational Material",
    ],
  },
  {
    value: "toys-kids",
    label: "Toys & Kids",
    subcategories: [
      "Toys",
      "Baby Products",
      "Kids Fashion",
      "Learning & Educational",
      "Kids Furniture",
    ],
  },
  {
    value: "automotive",
    label: "Automotive",
    subcategories: [
      "Car Accessories",
      "Bike Accessories",
      "Tools & Equipment",
      "Cleaning & Care",
    ],
  },
  {
    value: "handmade-crafts",
    label: "Handmade & Crafts",
    subcategories: [
      "Handmade Decor",
      "Handmade Jewelry",
      "Art & Paintings",
      "Craft Supplies",
      "Custom/Personalized Items",
    ],
  },
  {
    value: "gifts-lifestyle",
    label: "Gifts & Lifestyle",
    subcategories: [
      "Gift Sets",
      "Greeting Cards",
      "Candles & Fragrance",
      "Lifestyle Accessories",
    ],
  },
  {
    value: "other",
    label: "Other",
    subcategories: ["General"],
  },
];

/* Categories that were removed (not supported by Razorpay).
   Used ONLY to hide old products that still carry these values. */
export const REMOVED_CATEGORY_VALUES = ["pet-supplies", "health-wellness"];

export const PRODUCT_CATEGORY_VALUES = PRODUCT_CATEGORIES.map(
  (category) => category.value
);

export function getCategoryByValue(value) {
  return PRODUCT_CATEGORIES.find(
    (category) => category.value === value
  );
}

export function getSubcategoriesForCategory(value) {
  const category = getCategoryByValue(value);
  return category ? category.subcategories : [];
}

export function isValidCategory(value) {
  return PRODUCT_CATEGORY_VALUES.includes(value);
}

export function isValidSubcategory(categoryValue, subcategory) {
  const subs = getSubcategoriesForCategory(categoryValue);
  return subs.includes(subcategory);
}

/* =========================================================
   SIZE CONFIGURATION
   Kaun si category / subcategory mein size chahiye, aur seller ko
   kaunse ready-made (preset) sizes dikhane hain.
   Seller apna custom size bhi likh sakta hai.

   Naya size type ya naya rule add karna ho to sirf yahin add karo.
========================================================= */

export const SIZE_TYPES = {
  clothing: {
    label: "Clothing sizes",
    presets: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"],
  },
  shoes: {
    label: "Shoe sizes (UK/India)",
    presets: ["5", "6", "7", "8", "9", "10", "11", "12"],
  },
  kids: {
    label: "Kids sizes",
    presets: [
      "0-3 M",
      "3-6 M",
      "6-12 M",
      "1-2 Y",
      "2-3 Y",
      "3-4 Y",
      "4-5 Y",
      "5-6 Y",
      "6-8 Y",
      "8-10 Y",
      "10-12 Y",
    ],
  },
};

/* category -> subcategory -> size type */
const SIZE_RULES = {
  "fashion-clothing": {
    "Men's Wear": "clothing",
    "Women's Wear": "clothing",
    "Ethnic Wear": "clothing",
    "Kids Wear": "kids",
    Footwear: "shoes",
  },
  "sports-fitness": {
    Sportswear: "clothing",
  },
  "toys-kids": {
    "Kids Fashion": "kids",
  },
};

/* Returns { type, label, presets } if this category + subcategory needs
   sizes, otherwise null. */
export function getSizeConfig(category, subcategory) {
  const type = SIZE_RULES[category]?.[subcategory];
  if (!type) return null;

  const config = SIZE_TYPES[type];
  return { type, label: config.label, presets: config.presets };
}

export function categoryNeedsSize(category, subcategory) {
  return Boolean(getSizeConfig(category, subcategory));
}