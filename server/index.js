import env from './config/env.js';
import logger from './config/logger.js';
import createApp from './app.js';
import { expireUnpaidOrders } from './services/orderService.js';
import * as store from './data/localStore.js';
import bcrypt from 'bcryptjs';

// Ensure initial catalogue and primary accounts exist on boot (e.g. fresh Render container or clean local DB)
const autoSeed = async () => {
  try {
    const existing = await store.listCategories();
    if (existing.length === 0) {
      const sample = {
        'Fruits': [
          ['Apple (1 kg)', 180, 25, 'Fresh red apples', '1 kg', '🍎 Fresh Harvest', 'Shimla Orchards'],
          ['Banana (1 dozen)', 60, 8, 'Ripe bananas', '1 Dozen', '🍌 High Energy', 'Robusta Groves'],
          ['Orange (1 kg)', 90, 30, 'Juicy oranges', '1 kg', '🍊 Vitamin C Rich', 'Nagpur Orchards'],
          ['Fresh Organic Alphonso Mangoes', 850, 4, 'Carbide-free naturally ripened royal mangoes', '1 Dozen Box', '🥭 GI-Tagged', 'Ratnagiri Orchards'],
        ],
        'Vegetables': [
          ['Tomato (1 kg)', 40, 30, 'Farm fresh red tomatoes', '1 kg', '🍅 Farm Fresh', 'Local Farms'],
          ['Onion (1 kg)', 35, 12, 'Red onions with high pungency', '1 kg', '🧅 Kitchen Essential', 'Nashik Farms'],
          ['Potato (1 kg)', 30, 45, 'Fresh table potatoes', '1 kg', '🥔 Everyday Staple', 'Hassan Valley'],
        ],
        'Dairy & Eggs': [
          ['Milk (1 L)', 56, 40, 'Pasteurized toned cow milk', '1 L Pouch', '🥛 Farm Direct', 'Daily Dairy'],
          ['Curd (500 g)', 35, 12, 'Thick natural farm curd', '500 g Tub', '🥣 Probiotic', 'Daily Dairy'],
          ['Farm Fresh Malai Paneer', 95, 16, 'Soft melt-in-mouth cottage cheese', '200 g Pack', '🧀 High Protein', 'Daily Farmstead Dairy'],
        ],
        'Staples & Grains': [
          ['Organic Sona Masoori Brown Rice', 390, 30, 'Unpolished aromatic brown rice', '5 kg Bag', 'Whole Grain', 'Tungabhadra Basin', 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=600&q=80'],
          ['Stone-Ground Sharbati Atta', 285, 25, 'Chakki milled whole wheat flour', '5 kg Bag', '100% Sharbati', 'Sehore, MP', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'],
          ['Unpolished Organic Toor Dal', 175, 28, 'Naturally sun-dried split pigeon peas', '1 kg Pouch', 'Unpolished', 'Gulbarga', 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=600&q=80'],
        ],
        'Artisanal & Gourmet': [
          ['A2 Gir Cow Cultured Desi Ghee', 649, 24, 'Bilona churned cultured ghee from grass-fed cows', '500 ml Glass Jar', 'Artisanal Bestseller', 'Gir Sanctuary, Gujarat', 'https://images.unsplash.com/photo-1631452180539-96aca7d48617?auto=format&fit=crop&w=600&q=80'],
          ['Artisanal Multifloral Forest Honey', 380, 18, 'Raw, unprocessed wild forest honey', '500 g Jar', '100% Raw Organic', 'Western Ghats Bio-Reserve', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80'],
          ['Single-Origin Arabica Roasted Beans', 420, 15, 'Medium roast estate coffee with cocoa notes', '250 g Pouch', 'Single-Origin', 'Coorg High Estates', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80'],
          ['GI-Tagged Kashmiri Mogra Saffron (Kesar)', 350, 8, 'Grade-1 royal saffron all-red stigma threads', '1 g Vial', 'Royal Grade-1', 'Pampore, Kashmir Valley', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80'],
        ],
        'Cold-Pressed Oils & Masalas': [
          ['Wood Cold-Pressed Mustard Oil', 235, 35, 'Kachi ghani slow pressed oil in wooden Kolhu', '1 L Bottle', 'Cold-Pressed', 'Alwar, Rajasthan', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80'],
          ['Fine Himalayan Pink Rock Salt', 95, 40, 'Pure unrefined rock salt with 84 trace minerals', '1 kg Pack', 'Mineral Rich', 'Himalayan Foothills', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80'],
          ['Virgin Cold-Pressed Coconut Oil', 260, 20, 'Extra virgin coconut oil from fresh white kernel', '500 ml Jar', 'Extra Virgin', 'Udupi Coastal Groves', 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80'],
        ],
        'Snacks & Confections': [
          ['Artisanal 70% Dark Chocolate with Quinoa', 195, 22, 'Handcrafted bean-to-bar chocolate with toasted quinoa', '80 g Bar', 'Bean-to-Bar', 'Idukki Cacao', 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80'],
          ['Sparkling Ginger-Lime Raw Kombucha', 160, 14, 'Live fermented green tea tonic with fresh lime', '330 ml Bottle', 'Live Probiotic', 'Artisanal Fermentary', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'],
          ['Slow Roasted 7-Grain Super Seeds Mix', 180, 25, 'High omega-3 blend of 7 roasted super seeds', '200 g Pouch', 'Superfood', 'Organic Harvest Co.', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'],
          ['Royal Kashmiri Jumbo Walnut Kernels', 490, 15, 'Handpicked extra-large walnut halves', '400 g Pack', 'High Omega-3', 'Sopore, Kashmir', 'https://images.unsplash.com/photo-1568283096533-078a24930eb8?auto=format&fit=crop&w=600&q=80'],
        ],
        'Household & Essentials': [
          ['Eco-Friendly Bamboo Toothbrushes', 160, 30, 'Moso bamboo ergonomic toothbrushes with charcoal bristles', 'Pack of 4', 'Biodegradable', 'Sustainable Living', 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80'],
          ['Neem & Citrus Natural Floor Cleaner', 199, 20, 'Non-toxic bio-enzyme cleaner with cold-pressed neem', '1 L Bottle', 'Pet-Safe Non-Toxic', 'Bio-Enzyme Labs', 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80'],
        ],
        'Electronics & Spatial Devices': [
          ['Grocify Spatial Wireless Pro Headphones', 2499, 10, 'Spatial audio over-ear headphones with active noise cancellation and 360 virtual viewer', 'Audio Device', '360° Inspection', 'Grocify Hardware Lab', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'],
        ],
        'Curated Gifting': [
          ['Curated Artisan Festive Gourmet Box', 1499, 6, 'Signature gift hamper with Forest Honey, A2 Ghee, Walnuts and Dark Chocolate', 'Luxury Hamper', 'Handcrafted Gifting', 'Grocify Collection', 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80'],
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

    // 1. Ensure project owner / customer account (anikettegginamath@gmail.com) is permanently preserved across deployments
    const aniketEmail = 'anikettegginamath@gmail.com';
    const aniketUser = await store.findUserByEmail(aniketEmail);
    if (!aniketUser) {
      await store.createUser({
        name: 'Aniket Tegginamath',
        email: aniketEmail,
        phone: '+91 98765 43210',
        role: 'customer',
        address: {
          line: 'Vidyanagar, GMU Campus Road',
          city: 'Hubballi',
          pincode: '580031',
        },
        passwordHash: await bcrypt.hash('aniket123', 10),
      });
      logger.info(`Customer account automatically initialized & preserved for ${aniketEmail}`);
    }

    // 2. Ensure admin account exists even on ephemeral cloud deploys
    const adminEmail = env.seedAdminEmail || 'admin@grocify.test';
    const adminPassword = env.seedAdminPassword || 'Admin@123';
    if (!(await store.findUserByEmail(adminEmail))) {
      await store.createUser({
        name: 'Admin',
        email: adminEmail,
        phone: '',
        role: 'admin',
        passwordHash: await bcrypt.hash(adminPassword, 10),
      });
      logger.info(`Admin account initialized for ${adminEmail}`);
    }
  } catch (err) {
    logger.error('Auto-seed check failed', { message: err.message });
  }
};

await autoSeed();

// Every minute, cancel unpaid orders past their deadline and put their stock back.
setInterval(() => expireUnpaidOrders().catch((e) => logger.error('Order expiry sweep failed', { message: e.message })), 60000).unref();

createApp().listen(env.port, () => logger.info(`Grocify API running on port ${env.port}`));
