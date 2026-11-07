import logger from '../config/logger.js';
import * as store from '../data/localStore.js';

// Cancels unpaid orders past their deadline (stock goes back) and logs each one.
// Used by the timed sweep AND by requests that notice an expired order, so every expiry is logged once.
export async function expireUnpaidOrders(nowMs) {
  const expired = await store.expireUnpaidOrders(nowMs);
  expired.forEach((orderId) => logger.info('Order expired, stock released', { orderId }));
  return expired;
}
