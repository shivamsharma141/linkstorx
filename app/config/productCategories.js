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