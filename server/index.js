import env from './config/env.js';
import logger from './config/logger.js';
import createApp from './app.js';
import { expireUnpaidOrders } from './services/orderService.js';
import * as store from './data/localStore.js';
import { ensureAccounts } from './services/bootstrap.js';

// Ensure the initial catalogue exists on boot (e.g. fresh Render container or clean local DB)
const autoSeed = async () => {
  try {
    const existing = await store.listCategories();
    if (existing.length === 0) {
      const sample = {
        'Fruits': [
          ['Apple (1 kg)', 180, 25, 'Fresh red apples', '1 kg', 'Fresh Harvest', 'Shimla Orchards', '/images/products/apple.jpg'],
          ['Banana (1 dozen)', 60, 8, 'Ripe bananas', '1 Dozen', 'High Energy', 'Robusta Groves', '/images/products/banana.jpg'],
          ['Orange (1 kg)', 90, 30, 'Juicy oranges', '1 kg', 'Vitamin C Rich', 'Nagpur Orchards', '/images/products/orange.jpg'],
          ['Fresh Organic Alphonso Mangoes', 850, 4, 'Carbide-free naturally ripened royal mangoes', '1 Dozen Box', 'GI-Tagged', 'Ratnagiri Orchards', '/images/products/alphonso_mangoes.jpg'],
        ],
        'Vegetables': [
          ['Tomato (1 kg)', 40, 30, 'Farm fresh red tomatoes', '1 kg', 'Farm Fresh', 'Local Farms', '/images/products/tomato.jpg'],
          ['Onion (1 kg)', 35, 12, 'Red onions with high pungency', '1 kg', 'Kitchen Essential', 'Nashik Farms', '/images/products/onion.jpg'],
          ['Potato (1 kg)', 30, 45, 'Fresh table potatoes', '1 kg', 'Everyday Staple', 'Hassan Valley', '/images/products/potato.jpg'],
        ],
        'Dairy & Eggs': [
          ['Milk (1 L)', 56, 40, 'Pasteurized toned cow milk', '1 L Pouch', 'Farm Direct', 'Daily Dairy', '/images/products/milk.jpg'],
          ['Curd (500 g)', 35, 12, 'Thick natural farm curd', '500 g Tub', 'Probiotic', 'Daily Dairy', '/images/products/curd.jpg'],
          ['Farm Fresh Malai Paneer', 95, 16, 'Soft melt-in-mouth cottage cheese', '200 g Pack', 'High Protein', 'Daily Farmstead Dairy', '/images/products/malai_paneer.jpg'],
        ],
        'Staples & Grains': [
          ['Organic Sona Masoori Brown Rice', 390, 30, 'Unpolished aromatic brown rice', '5 kg Bag', 'Whole Grain', 'Tungabhadra Basin', '/images/products/brown_rice.jpg'],
          ['Stone-Ground Sharbati Atta', 285, 25, 'Chakki milled whole wheat flour', '5 kg Bag', '100% Sharbati', 'Sehore, MP', '/images/products/sharbati_atta.jpg'],
          ['Unpolished Organic Toor Dal', 175, 28, 'Naturally sun-dried split pigeon peas', '1 kg Pouch', 'Unpolished', 'Gulbarga', '/images/products/unpolished_toor_dal.jpg'],
        ],
        'Artisanal & Gourmet': [
          ['A2 Gir Cow Cultured Desi Ghee', 649, 24, 'Bilona churned cultured ghee from grass-fed cows', '500 ml Glass Jar', 'Artisanal Bestseller', 'Gir Sanctuary, Gujarat', '/images/products/desi_ghee.jpg'],
          ['Artisanal Multifloral Forest Honey', 380, 18, 'Raw, unprocessed wild forest honey', '500 g Jar', '100% Raw Organic', 'Western Ghats Bio-Reserve', '/images/products/forest_honey.jpg'],
          ['Single-Origin Arabica Roasted Beans', 420, 15, 'Medium roast estate coffee with cocoa notes', '250 g Pouch', 'Single-Origin', 'Coorg High Estates', '/images/products/arabica_coffee.jpg'],
          ['GI-Tagged Kashmiri Mogra Saffron (Kesar)', 350, 8, 'Grade-1 royal saffron all-red stigma threads', '1 g Vial', 'Royal Grade-1', 'Pampore, Kashmir Valley', '/images/products/kashmiri_saffron.jpg'],
        ],
        'Cold-Pressed Oils & Masalas': [
          ['Wood Cold-Pressed Mustard Oil', 235, 35, 'Kachi ghani slow pressed oil in wooden Kolhu', '1 L Bottle', 'Cold-Pressed', 'Alwar, Rajasthan', '/images/products/mustard_oil.jpg'],
          ['Fine Himalayan Pink Rock Salt', 95, 40, 'Pure unrefined rock salt with 84 trace minerals', '1 kg Pack', 'Mineral Rich', 'Himalayan Foothills', '/images/products/pink_rock_salt.jpg'],
          ['Virgin Cold-Pressed Coconut Oil', 260, 20, 'Extra virgin coconut oil from fresh white kernel', '500 ml Jar', 'Extra Virgin', 'Udupi Coastal Groves', '/images/products/coconut_oil.jpg'],
        ],
        'Snacks & Confections': [
          ['Artisanal 70% Dark Chocolate with Quinoa', 195, 22, 'Handcrafted bean-to-bar chocolate with toasted quinoa', '80 g Bar', 'Bean-to-Bar', 'Idukki Cacao', '/images/products/dark_chocolate.jpg'],
          ['Sparkling Ginger-Lime Raw Kombucha', 160, 14, 'Live fermented green tea tonic with fresh lime', '330 ml Bottle', 'Live Probiotic', 'Artisanal Fermentary', '/images/products/kombucha.jpg'],
          ['Slow Roasted 7-Grain Super Seeds Mix', 180, 25, 'High omega-3 blend of 7 roasted super seeds', '200 g Pouch', 'Superfood', 'Organic Harvest Co.', '/images/products/super_seeds_mix.jpg'],
          ['Royal Kashmiri Jumbo Walnut Kernels', 490, 15, 'Handpicked extra-large walnut halves', '400 g Pack', 'High Omega-3', 'Sopore, Kashmir', '/images/products/walnut_kernels.jpg'],
        ],
        'Household & Essentials': [
          ['Tea Sachet (₹1 payment test)', 1, 500, 'Single tea sachet priced at ₹1 for testing UPI checkout end to end', '1 pc', 'Test Item', 'Darjeeling, West Bengal', '/images/products/darjeeling_tea.jpg'],
          ['Eco-Friendly Bamboo Toothbrushes', 160, 30, 'Moso bamboo ergonomic toothbrushes with charcoal bristles', 'Pack of 4', 'Biodegradable', 'Sustainable Living', '/images/products/bamboo_toothbrushes.jpg'],
          ['Neem & Citrus Natural Floor Cleaner', 199, 20, 'Non-toxic bio-enzyme cleaner with cold-pressed neem', '1 L Bottle', 'Pet-Safe Non-Toxic', 'Bio-Enzyme Labs', '/images/products/floor_cleaner.jpg'],
        ],
        'Electronics & Spatial Devices': [
          ['Grocify Spatial Wireless Pro Headphones', 2499, 10, 'Spatial audio over-ear headphones with active noise cancellation and 360 virtual viewer', 'Audio Device', '360° Inspection', 'Grocify Hardware Lab', '/images/products/headphones.jpg'],
        ],
        'Curated Gifting': [
          ['Curated Artisan Festive Gourmet Box', 1499, 6, 'Signature gift hamper with Forest Honey, A2 Ghee, Walnuts and Dark Chocolate', 'Luxury Hamper', 'Handcrafted Gifting', 'Grocify Collection', '/images/products/festive_hamper.png'],
        ]
      };

      for (const [catName, items] of Object.entries(sample)) {
        const cat = await store.createCategory(catName);
        for (const [name, price, stock, description, unit, badge, origin, image] of items) {
          const originalPrice = Math.round(price * 1.18);
          const discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
          await store.createProduct({
            name,
            price,
            originalPrice,
            discountPercentage,
            stock,
            description,
            categoryId: cat.id,
            lowStockLimit: env.lowStockDefault,
            unit: unit || '',
            badge: badge || '',
            origin: origin || '',
            image: image || '',
            isActive: true,
          });
        }
      }
      logger.info('Auto-seeded comprehensive PBL grocery & artisanal catalogue');
    }

    // Accounts are never created from built-in credentials. See services/bootstrap.js.
    await ensureAccounts({ store, env, logger });
  } catch (err) {
    logger.error('Auto-seed check failed', { message: err.message });
  }
};

await store.initStore();
await autoSeed();

if (env.jwtSecretGenerated) {
  logger[env.nodeEnv === 'production' ? 'error' : 'warn']('JWT_SECRET is not set: using a temporary secret, so every login is signed out when the server restarts. Set JWT_SECRET to a long random value.');
}

// Every minute, cancel unpaid orders past their deadline and put their stock back.
setInterval(() => expireUnpaidOrders().catch((e) => logger.error('Order expiry sweep failed', { message: e.message })), 60000).unref();

const server = createApp().listen(env.port, () => logger.info(`Grocify API running on port ${env.port}`));

// Render sends SIGTERM on every deploy: finish saving before the container stops.
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    server.close();
    await store.flushStore().catch(() => {});
    process.exit(0);
  });
}
