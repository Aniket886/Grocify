import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(root, '.env'), quiet: true });

// The app version comes from package.json, the single source of truth (also shown in the website footer).
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const isPlaceholder = (v) => !v || v.startsWith('[FILL');
const pick = (v, fallback) => (isPlaceholder(v) ? fallback : v);
const list = (v) => (isPlaceholder(v) ? [] : v.split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean));

const nodeEnv = process.env.NODE_ENV || 'development';
const clientUrl = pick(process.env.CLIENT_URL, 'http://localhost:5173').replace(/\/+$/, '');

// SECURITY: the signing secret for login tokens must never live in source code. If JWT_SECRET is not
// set, a random secret is generated for this process only. Logins then reset on every restart, which is
// the safe failure: nobody who has read the repository can forge a token. Set JWT_SECRET in production.
const hasJwtSecret = !isPlaceholder(process.env.JWT_SECRET);

function trustProxy() {
  const v = process.env.TRUST_PROXY;
  if (isPlaceholder(v)) return nodeEnv === 'production' ? 1 : false; // one proxy hop (Render) in production
  if (v === 'true') return true;
  if (v === 'false') return false;
  return /^\d+$/.test(v) ? Number(v) : v;
}

const env = {
  version,
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  clientUrl,
  // Browser origins allowed to call the API from another site. Same-origin requests are always allowed.
  corsOrigins: [...new Set([clientUrl, ...list(process.env.CORS_ORIGINS)])],
  // How many reverse proxies sit in front of the app, so req.ip is the real client and not the proxy.
  trustProxy: trustProxy(),
  jwtSecret: hasJwtSecret ? process.env.JWT_SECRET : crypto.randomBytes(48).toString('hex'),
  jwtSecretGenerated: !hasJwtSecret,
  jwtExpiresIn: pick(process.env.JWT_EXPIRES_IN, '7d'),
  // Postgres connection string (Neon, Supabase, Render Postgres...). When set, data is stored there so it survives redeploys.
  databaseUrl: pick(process.env.DATABASE_URL, ''),
  // Opt in to verifying the database's TLS certificate (recommended once the provider's CA is confirmed).
  databaseSslVerify: process.env.DATABASE_SSL_VERIFY === 'true',
  dataFile: process.env.DATA_FILE || path.join(root, 'server/data/dev-db.json'),
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: path.resolve(root, process.env.LOG_DIR || './logs'),
  logMaxFiles: process.env.LOG_MAX_FILES || '14d',
  logMaxSize: process.env.LOG_MAX_SIZE || '10m',
  paymentProvider: process.env.NODE_ENV === 'test' ? (process.env.TEST_PAYMENT_PROVIDER || 'mock') : pick(process.env.PAYMENT_PROVIDER, 'mock'),
  paymentGatewayUrl: pick(process.env.PAYMENT_GATEWAY_URL, 'http://127.0.0.1:8000'),
  paymentGatewayKeyId: pick(process.env.PAYMENT_GATEWAY_KEY_ID, ''),
  paymentGatewaySecret: pick(process.env.PAYMENT_GATEWAY_SECRET, ''),
  paymentWebhookSecret: pick(process.env.PAYMENT_WEBHOOK_SECRET, ''),
  paymentGatewayEnv: pick(process.env.PAYMENT_GATEWAY_ENV, 'live'),
  paymentTimeoutMinutes: Number(process.env.PAYMENT_TIMEOUT_MINUTES) || 15,
  lowStockDefault: Number(process.env.LOW_STOCK_DEFAULT_LIMIT) || 10,
  // The customer-facing delivery stepper is a demonstration aid. Set DEMO_DELIVERY_CONTROLS=false for a real store.
  demoDeliveryControls: process.env.DEMO_DELIVERY_CONTROLS !== 'false',
  seedAdminEmail: pick(process.env.SEED_ADMIN_EMAIL, ''),
  seedAdminPassword: pick(process.env.SEED_ADMIN_PASSWORD, ''),
};

export default env;
