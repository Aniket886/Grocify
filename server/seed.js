// Run with: npm run seed
// Creates sample categories and products, plus the admin account from .env (SEED_ADMIN_*).
import bcrypt from 'bcryptjs';
import env from './config/env.js';
import * as store from './data/localStore.js';

const sample = {
  Fruits: [['Apple (1 kg)', 180, 25, 'Fresh red apples'], ['Banana (1 dozen)', 60, 8, 'Ripe bananas'], ['Orange (1 kg)', 90, 30, 'Juicy oranges']],
  Vegetables: [['Tomato (1 kg)', 40, 30, 'Farm tomatoes'], ['Onion (1 kg)', 35, 0, 'Red onions'], ['Potato (1 kg)', 30, 45, 'Fresh potatoes']],
  Dairy: [['Milk (1 L)', 56, 40, 'Toned milk'], ['Curd (500 g)', 35, 12, 'Fresh curd'], ['Paneer (200 g)', 85, 15, 'Soft paneer']],
  Staples: [['Rice (5 kg)', 420, 18, 'Sona masoori rice'], ['Wheat Flour (5 kg)', 260, 20, 'Whole wheat atta'], ['Toor Dal (1 kg)', 150, 22, 'Split pigeon peas']],
  Snacks: [['Biscuits', 20, 50, 'Tea biscuits'], ['Namkeen (200 g)', 45, 35, 'Mixed namkeen']],
};

if ((await store.listCategories()).length === 0) {
  for (const [catName, items] of Object.entries(sample)) {
    const cat = await store.createCategory(catName);
    for (const [name, price, stock, description] of items) {
      await store.createProduct({ name, price, stock, description, categoryId: cat.id, lowStockLimit: env.lowStockDefault, image: '' });
    }
  }
  console.log('Sample categories and products created.');
} else {
  console.log('Catalogue already exists; skipped.');
}

if (env.seedAdminEmail && env.seedAdminPassword) {
  if (!(await store.findUserByEmail(env.seedAdminEmail))) {
    await store.createUser({ name: 'Admin', email: env.seedAdminEmail, phone: '', role: 'admin', passwordHash: await bcrypt.hash(env.seedAdminPassword, 10) });
    console.log('Admin account created from .env.');
  } else {
    console.log('Admin account already exists.');
  }
} else {
  console.log('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set in .env; no admin created.');
}
