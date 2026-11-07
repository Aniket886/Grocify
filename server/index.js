import env from './config/env.js';
import logger from './config/logger.js';
import createApp from './app.js';

if (env.jwtSecretGenerated) {
  logger.warn('JWT_SECRET is not set; using a temporary secret. Logins reset when the server restarts.');
}

import { expireUnpaidOrders } from './data/localStore.js';

// Every minute, cancel unpaid orders past their deadline and put their stock back.
setInterval(async () => {
  const expired = await expireUnpaidOrders();
  expired.forEach((id) => logger.info('Order expired, stock released', { orderId: id }));
}, 60000).unref();

createApp().listen(env.port, () => logger.info(`Grocify API running on port ${env.port}`));
