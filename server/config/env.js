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

// A stable persistent fallback secret ensures login sessions survive server restarts and cloud re-deployments
const defaultStableJwtSecret = 'grocify_production_jwt_secret_2026_super_secure_key_gm_university';
const hasJwtSecret = !isPlaceholder(process.env.JWT_SECRET);

const env = {
  version,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrl: pick(process.env.CLIENT_URL, 'http://localhost:5173'),
  // Local login tokens. Uses environment JWT_SECRET or stable secret so tokens survive server restarts
  jwtSecret: hasJwtSecret ? process.env.JWT_SECRET : defaultStableJwtSecret,
  jwtSecretGenerated: !hasJwtSecret,
  jwtExpiresIn: pick(process.env.JWT_EXPIRES_IN, '7d'),
  dataFile: process.env.DATA_FILE || path.join(root, 'server/data/dev-db.json'),
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: path.resolve(root, process.env.LOG_DIR || './logs'),
  logMaxFiles: process.env.LOG_MAX_FILES || '14d',
  logMaxSize: process.env.LOG_MAX_SIZE || '10m',
  paymentProvider: pick(process.env.PAYMENT_PROVIDER, 'mock'),
  paymentTimeoutMinutes: Number(process.env.PAYMENT_TIMEOUT_MINUTES) || 15,
  lowStockDefault: Number(process.env.LOW_STOCK_DEFAULT_LIMIT) || 10,
  seedAdminEmail: pick(process.env.SEED_ADMIN_EMAIL, ''),
  seedAdminPassword: pick(process.env.SEED_ADMIN_PASSWORD, ''),
};

export default env;
