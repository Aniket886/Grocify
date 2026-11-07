// Frontend-only category taxonomy.
//
// The backend has its own `categories` collection that the admin edits. This file is a
// richer DISPLAY taxonomy: top-level SECTIONS group a wide range of category tiles for
// customers to browse, without changing anything on the server. A section or category
// may have no matching products yet; the product list page will say so.
//
// Each category carries:
//   slug     : URL-safe id used in links like /c/<slug>
//   name     : shown to customers
//   icon     : short emoji / symbol (visual only, not required)
//   match    : optional array of case-insensitive strings. A backend category whose name
//              contains any of these counts as "this" category and its products load when
//              the customer opens it. If `match` is missing the category is a placeholder
//              (no products yet; the page still opens with a friendly empty state).
//   featured : optional. Marks it as a featured promotional pick.

export const SECTIONS = [
  {
    slug: 'grocery-kitchen',
    name: 'Grocery & Kitchen',
    tagline: 'Everyday essentials',
    icon: '🛒',
    accent: 'warm',
    categories: [
      { slug: 'fruits', name: 'Fruits', icon: '🍎', match: ['fruit'] },
      { slug: 'vegetables', name: 'Vegetables', icon: '🥦', match: ['veget'] },
      { slug: 'dairy', name: 'Dairy & Eggs', icon: '🥛', match: ['dairy', 'egg'] },
      { slug: 'staples', name: 'Staples & Grains', icon: '🌾', match: ['staple', 'rice', 'flour', 'dal'] },
      { slug: 'bakery', name: 'Bakery', icon: '🥐' },
      { slug: 'instant-food', name: 'Instant Food', icon: '🍜' },
      { slug: 'oils-masalas', name: 'Oils & Masalas', icon: '🧂' },
      { slug: 'organic', name: 'Organic', icon: '🌱' },
    ],
  },
  {
    slug: 'snacks-drinks',
    name: 'Snacks & Drinks',
    tagline: 'Treats, chai and juices',
    icon: '🍪',
    accent: 'warm',
    categories: [
      { slug: 'snacks', name: 'Snacks', icon: '🥨', match: ['snack'] },
      { slug: 'biscuits', name: 'Biscuits', icon: '🍪' },
      { slug: 'chocolates', name: 'Chocolates', icon: '🍫' },
      { slug: 'sweets', name: 'Indian Sweets', icon: '🍬', featured: true },
      { slug: 'chips', name: 'Chips', icon: '🥔' },
      { slug: 'drinks', name: 'Drinks & Juice', icon: '🧃' },
      { slug: 'tea-coffee', name: 'Tea & Coffee', icon: '☕' },
      { slug: 'ice-cream', name: 'Ice Cream', icon: '🍨' },
      { slug: 'dry-fruits', name: 'Dry Fruits', icon: '🥜', featured: true },
    ],
  },
  {
    slug: 'beauty-personal-care',
    name: 'Beauty & Personal Care',
    tagline: 'Looks and daily care',
    icon: '💄',
    accent: 'rose',
    categories: [
      { slug: 'beauty', name: 'Beauty', icon: '💄' },
      { slug: 'cosmetics', name: 'Cosmetics', icon: '💋' },
      { slug: 'skin', name: 'Skin', icon: '🧴' },
      { slug: 'hair', name: 'Hair', icon: '💇' },
      { slug: 'bath-body', name: 'Bath & Body', icon: '🛁' },
      { slug: 'fragrance', name: 'Fragrance', icon: '🌸' },
      { slug: 'baby-care', name: 'Baby Care', icon: '🍼' },
      { slug: 'feminine-hygiene', name: 'Feminine Hygiene', icon: '🌷' },
    ],
  },
  {
    slug: 'household-essentials',
    name: 'Household & Essentials',
    tagline: 'For a tidy home',
    icon: '🧼',
    accent: 'cool',
    categories: [
      { slug: 'cleaning', name: 'Cleaning', icon: '🧹' },
      { slug: 'laundry', name: 'Laundry', icon: '🧺' },
      { slug: 'kitchenware', name: 'Kitchenware', icon: '🍳' },
      { slug: 'dining', name: 'Dining', icon: '🍽️' },
      { slug: 'storage', name: 'Storage', icon: '🗄️' },
      { slug: 'batteries', name: 'Batteries & Lights', icon: '🔦' },
    ],
  },
  {
    slug: 'electronics',
    name: 'Electronics',
    tagline: 'Gadgets, audio and more',
    icon: '🎧',
    accent: 'indigo',
    categories: [
      { slug: 'headphones', name: 'Headphones', icon: '🎧', interactive3D: true },
      { slug: 'phones', name: 'Phones', icon: '📱', interactive3D: true },
      { slug: 'watches', name: 'Watches', icon: '⌚', interactive3D: true },
      { slug: 'speakers', name: 'Speakers', icon: '🔊', interactive3D: true },
      { slug: 'cameras', name: 'Cameras', icon: '📷', interactive3D: true },
      { slug: 'laptops', name: 'Laptops', icon: '💻' },
      { slug: 'accessories', name: 'Accessories', icon: '🔌' },
      { slug: 'appliances', name: 'Appliances', icon: '🧊' },
    ],
  },
  {
    slug: 'artisanal',
    name: 'Artisanal & Gourmet',
    tagline: 'Handcrafted provisions and organics',
    icon: '✨',
    accent: 'emerald',
    categories: [
      { slug: 'gourmet-sweets', name: 'Artisan Confections', icon: '🍬', featured: true },
      { slug: 'dry-fruits', name: 'Premium Nuts & Fruits', icon: '🥜', featured: true },
      { slug: 'organic-honey', name: 'Raw Honey & Spreads', icon: '🍯', featured: true },
      { slug: 'single-origin', name: 'Single-Origin Tea & Coffee', icon: '☕' },
      { slug: 'cold-pressed-oils', name: 'Cold-Pressed Oils', icon: '🫒' },
      { slug: 'gourmet-spices', name: 'Artisan Spices', icon: '🌿' },
      { slug: 'sweets', name: 'Confectionery', icon: '🍬' },
    ],
  },
  {
    slug: 'party',
    name: 'Party',
    tagline: 'Celebrations and get-togethers',
    icon: '🎉',
    accent: 'emerald',
    categories: [
      { slug: 'party-balloons', name: 'Balloons', icon: '🎈' },
      { slug: 'party-tableware', name: 'Tableware', icon: '🥳' },
      { slug: 'party-games', name: 'Party Games', icon: '🎲' },
      { slug: 'party-drinks', name: 'Drinks', icon: '🥤' },
      { slug: 'party-music', name: 'Music & Lights', icon: '🎵' },
    ],
  },
  {
    slug: 'gifting',
    name: 'Gifting',
    tagline: 'For everyone you love',
    icon: '🎁',
    accent: 'rose',
    categories: [
      { slug: 'gift-chocolates', name: 'Chocolate Gifts', icon: '🍫' },
      { slug: 'gift-hampers', name: 'Hampers', icon: '🧺' },
      { slug: 'gift-flowers', name: 'Flowers', icon: '💐' },
      { slug: 'gift-cards', name: 'Gift Cards', icon: '💳' },
      { slug: 'gift-perfume', name: 'Perfumes', icon: '🌸' },
    ],
  },
  {
    slug: 'decor',
    name: 'Decor',
    tagline: 'Home that feels like you',
    icon: '🖼️',
    accent: 'warm',
    categories: [
      { slug: 'decor-wall', name: 'Wall Decor', icon: '🖼️' },
      { slug: 'decor-vases', name: 'Vases', icon: '🏺' },
      { slug: 'decor-candles', name: 'Candles', icon: '🕯️' },
      { slug: 'decor-plants', name: 'Indoor Plants', icon: '🪴' },
      { slug: 'decor-cushions', name: 'Cushions', icon: '🛋️' },
    ],
  },
  {
    slug: 'kids',
    name: 'Kids',
    tagline: 'For little ones',
    icon: '🧸',
    accent: 'rose',
    categories: [
      { slug: 'kids-toys', name: 'Toys', icon: '🧸' },
      { slug: 'kids-clothing', name: 'Clothing', icon: '👕' },
      { slug: 'kids-books', name: 'Books', icon: '📚' },
      { slug: 'kids-stationery', name: 'Stationery', icon: '✏️' },
      { slug: 'kids-baby-care', name: 'Baby Care', icon: '🍼' },
    ],
  },
  {
    slug: 'fashion',
    name: 'Fashion',
    tagline: 'Everyday wear',
    icon: '👔',
    accent: 'indigo',
    categories: [
      { slug: 'fashion-men', name: 'Men', icon: '👔' },
      { slug: 'fashion-women', name: 'Women', icon: '👗' },
      { slug: 'fashion-kids', name: 'Kids', icon: '🧒' },
      { slug: 'fashion-footwear', name: 'Footwear', icon: '👟' },
      { slug: 'fashion-bags', name: 'Bags', icon: '👜' },
    ],
  },
  {
    slug: 'jewelry',
    name: 'Jewelry',
    tagline: 'Classics and new picks',
    icon: '💍',
    accent: 'emerald',
    categories: [
      { slug: 'jewel-earrings', name: 'Earrings', icon: '✨' },
      { slug: 'jewel-necklaces', name: 'Necklaces', icon: '📿' },
      { slug: 'jewel-rings', name: 'Rings', icon: '💍' },
      { slug: 'jewel-bangles', name: 'Bangles', icon: '🪙' },
    ],
  },
  {
    slug: 'health-pharma',
    name: 'Health & Pharma',
    tagline: 'Everyday health',
    icon: '💊',
    accent: 'cool',
    categories: [
      { slug: 'pharma', name: 'Pharmacy', icon: '💊' },
      { slug: 'vitamins', name: 'Vitamins', icon: '🧬' },
      { slug: 'wellness-devices', name: 'Wellness Devices', icon: '🩺' },
      { slug: 'first-aid', name: 'First Aid', icon: '🩹' },
      { slug: 'ayurveda', name: 'Ayurveda', icon: '🌿' },
      { slug: 'sexual-wellness', name: 'Sexual Wellness', icon: '🫶', discreet: true },
    ],
  },
  {
    slug: 'pet-care',
    name: 'Pet Care',
    tagline: 'For your best friend',
    icon: '🐾',
    accent: 'warm',
    categories: [
      { slug: 'pet-food', name: 'Food', icon: '🥣' },
      { slug: 'pet-toys', name: 'Toys', icon: '🎾' },
      { slug: 'pet-grooming', name: 'Grooming', icon: '🧴' },
      { slug: 'pet-accessories', name: 'Accessories', icon: '🦮' },
    ],
  },
  {
    slug: 'sports',
    name: 'Sports',
    tagline: 'Play on',
    icon: '🏏',
    accent: 'cool',
    categories: [
      { slug: 'sports-cricket', name: 'Cricket', icon: '🏏' },
      { slug: 'sports-fitness', name: 'Fitness', icon: '🏋️' },
      { slug: 'sports-outdoor', name: 'Outdoor', icon: '🏕️' },
      { slug: 'sports-apparel', name: 'Apparel', icon: '👕' },
    ],
  },
  {
    slug: 'hobby',
    name: 'Hobby',
    tagline: 'Make, learn, play',
    icon: '🎨',
    accent: 'indigo',
    categories: [
      { slug: 'hobby-art', name: 'Art Supplies', icon: '🎨' },
      { slug: 'hobby-music', name: 'Music', icon: '🎸' },
      { slug: 'hobby-board', name: 'Board Games', icon: '🎲' },
      { slug: 'hobby-diy', name: 'DIY & Crafts', icon: '🧵' },
    ],
  },
  {
    slug: 'bookstore',
    name: 'Bookstore',
    tagline: 'Stories and study',
    icon: '📚',
    accent: 'warm',
    categories: [
      { slug: 'books-fiction', name: 'Fiction', icon: '📖' },
      { slug: 'books-nonfiction', name: 'Non-fiction', icon: '📘' },
      { slug: 'books-academic', name: 'Academic', icon: '🎓' },
      { slug: 'books-regional', name: 'Regional', icon: '📙' },
    ],
  },
  {
    slug: 'spiritual',
    name: 'Spiritual',
    tagline: 'Pooja and prayer',
    icon: '🪷',
    accent: 'emerald',
    categories: [
      { slug: 'spiritual-pooja', name: 'Pooja Items', icon: '🪔' },
      { slug: 'spiritual-incense', name: 'Incense', icon: '🪵' },
      { slug: 'spiritual-books', name: 'Spiritual Books', icon: '📜' },
      { slug: 'spiritual-idols', name: 'Idols', icon: '🕉️' },
    ],
  },
  {
    slug: 'travel-store',
    name: 'Travel Store',
    tagline: 'Pack and go',
    icon: '🧳',
    accent: 'cool',
    categories: [
      { slug: 'travel-luggage', name: 'Luggage', icon: '🧳' },
      { slug: 'travel-accessories', name: 'Accessories', icon: '🧦' },
      { slug: 'travel-toiletries', name: 'Toiletries', icon: '🧴' },
      { slug: 'travel-adapters', name: 'Adapters', icon: '🔌' },
    ],
  },
  {
    slug: 'imported',
    name: 'Imported',
    tagline: 'From around the world',
    icon: '🌍',
    accent: 'indigo',
    categories: [
      { slug: 'imported-snacks', name: 'Snacks', icon: '🍬' },
      { slug: 'imported-drinks', name: 'Drinks', icon: '🥤' },
      { slug: 'imported-beauty', name: 'Beauty', icon: '💄' },
      { slug: 'imported-gadgets', name: 'Gadgets', icon: '🎧' },
    ],
  },
];

// Quick look-ups.
export const SECTION_BY_SLUG = Object.fromEntries(SECTIONS.map((s) => [s.slug, s]));
export const ALL_CATEGORIES = SECTIONS.flatMap((s) => s.categories.map((c) => ({ ...c, sectionSlug: s.slug, sectionName: s.name })));
export const CATEGORY_BY_SLUG = Object.fromEntries(ALL_CATEGORIES.map((c) => [c.slug, c]));

// Does a backend category (with a real name from Firestore / the local store) fit this
// display category? Case-insensitive, any match counts. A display category without `match`
// never matches anything and shows the empty state.
export function backendMatchesDisplay(backendName, display) {
  if (!display?.match || !backendName) return false;
  const name = backendName.toLowerCase();
  return display.match.some((m) => name.includes(m.toLowerCase()));
}

// Returns the backend category ids that back a display category, given the full list
// of backend categories. Use this to build a `?category=...` query (can be multiple).
export function backendIdsFor(display, backendCategories) {
  return backendCategories.filter((bc) => backendMatchesDisplay(bc.name, display)).map((bc) => bc.id);
}

// Products with 3D viewer support. These live only in the frontend presentation layer.
export const INTERACTIVE_3D_CATEGORY_SLUGS = new Set(
  ALL_CATEGORIES.filter((c) => c.interactive3D).map((c) => c.slug),
);
