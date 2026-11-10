import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import env from './config/env.js';
import logger from './config/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { buildCsp, looksLikeFile, renderIndexHtml } from './utils/html.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import inventoryRoutes from './routes/inventory.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

/**
 * CORS decision for one request. Cross-site browser calls are allowed only from the configured
 * origins (CLIENT_URL and CORS_ORIGINS). A page calling its own host is same-origin and always allowed.
 * Any other Origin gets no CORS headers at all, so the browser blocks the calling page from reading
 * the response. The Origin is never reflected back blindly.
 */
export function corsOptionsFor(req) {
  const origin = req.get('Origin');
  if (!origin) return { origin: false };
  let sameHost = false;
  try { sameHost = new URL(origin).host === req.get('host'); } catch { /* malformed Origin: not allowed */ }
  const allowed = sameHost || env.corsOrigins.includes(origin.replace(/\/+$/, ''));
  return { origin: allowed ? origin : false, credentials: allowed };
}

export default function createApp() {
  const app = express();
  // Behind a hosting proxy (Render), the client address is in X-Forwarded-For. Trusting exactly the
  // configured number of hops makes req.ip the real client, which rate limiting and logs rely on.
  app.set('trust proxy', env.trustProxy);

  // Every request gets an ID (or keeps a safe one sent by the caller) so one request can be
  // followed through the logs. It is returned in the X-Request-Id header.
  app.use((req, res, next) => {
    const incoming = req.get('X-Request-Id');
    req.id = incoming && /^[\w.-]{1,64}$/.test(incoming) ? incoming : crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    req.log = logger.child({ requestId: req.id }); // every log line from this request carries its ID
    next();
  });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors((req, cb) => cb(null, corsOptionsFor(req))));
  app.use(express.json({
    limit: '100kb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }));

  // One line per request: ID, method, path, status, duration, user, IP.
  // Level follows the outcome: 5xx is an error, 4xx a warning, the rest info.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      logger[level]('request', { requestId: req.id, method: req.method, path: req.originalUrl.split('?')[0], status: res.statusCode, ms: Date.now() - start, userId: req.user?.id, ip: req.ip });
    });
    next();
  });

  app.get('/api/health', (req, res) => res.json({ ok: true, version: env.version }));
  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Serve static assets from public/images directly (works in both dev and production)
  app.use('/images', express.static(path.join(publicDir, 'images')));

  // In production (e.g. Render / Cloud), serve compiled Vite frontend and support client-side SPA routing
  // Dynamically substitutes request host into Open Graph meta tags so preview images always resolve cleanly
  if (fs.existsSync(distDir)) {
    const indexPath = path.join(distDir, 'index.html');
    let gatewayOrigin = [];
    try { gatewayOrigin = [new URL(env.paymentGatewayUrl).origin]; } catch { /* no gateway image origin */ }

    // Every HTML response goes through this one function, so each carries the security headers.
    const sendShell = (req, res, next) => {
      let html;
      try {
        html = fs.readFileSync(indexPath, 'utf8');
      } catch {
        return next();
      }
      // Host headers are validated inside renderIndexHtml before they touch the page.
      html = renderIndexHtml(html, {
        host: req.get('x-forwarded-host') || req.get('host'),
        proto: req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http'),
      });
      res.setHeader('Content-Security-Policy', buildCsp(html, { imgOrigins: gatewayOrigin }));
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    };

    app.get(['/', '/index.html'], sendShell);
    // index:false so the static handler never serves the shell itself (it would skip the headers above).
    app.use(express.static(distDir, { index: false }));
    app.get('{*path}', (req, res, next) => {
      // API paths and anything that names a file (/.env, /backup.zip, /x.js.map) are never answered
      // with the app shell: they fall through to a plain 404.
      if (req.path.startsWith('/api') || looksLikeFile(req.path)) return next();
      sendShell(req, res, next);
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
