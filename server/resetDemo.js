// Run with: npm run demo:reset
// Wipes all local data (users, orders, payments...) and recreates the sample products
// and the admin account from .env, so the demo always starts from the same clean state.
import fs from 'node:fs';
import env from './config/env.js';

if (env.nodeEnv === 'production') {
  console.error('Refusing to reset data when NODE_ENV=production.');
  process.exit(1);
}

fs.rmSync(env.dataFile, { force: true });
console.log('Local data cleared.');
await import('./seed.js');
