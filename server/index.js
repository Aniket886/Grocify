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
        Fruits: [['Apple (1 kg)', 180, 25, 'Fresh red apples'], ['Banana (1 dozen)', 60, 8, 'Ripe bananas'], ['Orange (1 kg)', 90, 30, 'Juicy oranges']],
        Vegetables: [['Tomato (1 kg)', 40, 30, 'Farm tomatoes'], ['Onion (1 kg)', 35, 0, 'Red onions'], ['Potato (1 kg)', 30, 45, 'Fresh potatoes']],
        Dairy: [['Milk (1 L)', 56, 40, 'Toned milk'], ['Curd (500 g)', 35, 12, 'Fresh curd'], ['Paneer (200 g)', 85, 15, 'Soft paneer']],
        Staples: [['Rice (5 kg)', 420, 18, 'Sona masoori rice'], ['Wheat Flour (5 kg)', 260, 20, 'Whole wheat atta'], ['Toor Dal (1 kg)', 150, 22, 'Split pigeon peas']],
        Snacks: [['Biscuits', 20, 50, 'Tea biscuits'], ['Namkeen (200 g)', 45, 35, 'Mixed namkeen']],
      };
      for (const [catName, items] of Object.entries(sample)) {
        const cat = await store.createCategory(catName);
        for (const [name, price, stock, description] of items) {
          await store.createProduct({ name, price, stock, description, categoryId: cat.id, lowStockLimit: env.lowStockDefault, image: '' });
        }
      }
      logger.info('Auto-seeded initial grocery catalogue (5 categories, 14 products)');
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
