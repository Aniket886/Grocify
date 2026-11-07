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

export default function createApp() {
  const app = express();

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
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

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

  // In production (e.g. Render / Cloud), serve compiled Vite frontend and support client-side SPA routing
  // Dynamically substitutes request host into Open Graph meta tags so preview images always resolve cleanly
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('{*path}', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      const indexPath = path.join(distDir, 'index.html');
      try {
        const host = req.get('x-forwarded-host') || req.get('host');
        const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
        if (host) {
          const baseUrl = `${proto}://${host}`;
          let html = fs.readFileSync(indexPath, 'utf8');
          html = html.replaceAll('https://gmu2027.space', baseUrl);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.send(html);
        }
      } catch {
        // Fallback to static sendFile
      }
      res.sendFile(indexPath);
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
