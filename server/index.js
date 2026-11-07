import env from './config/env.js';
import logger from './config/logger.js';
import createApp from './app.js';
import { expireUnpaidOrders } from './services/orderService.js';

if (env.jwtSecretGenerated) {
  logger.warn('JWT_SECRET is not set; using a temporary secret. Logins reset when the server restarts.');
}

// Every minute, cancel unpaid orders past their deadline and put their stock back.
setInterval(() => expireUnpaidOrders().catch((e) => logger.error('Order expiry sweep failed', { message: e.message })), 60000).unref();

createApp().listen(env.port, () => logger.info(`Grocify API running on port ${env.port}`));
