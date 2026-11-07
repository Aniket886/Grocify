import logger from '../config/logger.js';
import * as store from '../data/localStore.js';
import { DELIVERY_STATUSES } from '../utils/constants.js';
import { badRequest, text } from '../middleware/validate.js';
import { present } from './ordersController.js';

// Paid orders with their delivery details (for the admin Deliveries screen).
export async function list(req, res) {
  const status = req.query.status;
  if (status && !DELIVERY_STATUSES.includes(status)) throw badRequest('Unknown delivery status');
  const deliveries = await store.listDeliveries({ status });
  const rows = [];
  for (const d of deliveries) {
    const order = await store.getOrder(d.orderId);
    if (order) rows.push(await present(order, { withCustomer: true }));
  }
  res.json({ orders: rows, statuses: DELIVERY_STATUSES });
}

export async function assign(req, res) {
  const name = text(req.body.assignedTo, 'Delivery person', { max: 80 });
  await store.assignDelivery(req.params.id, name);
  logger.info('Delivery assigned', { adminId: req.user.id, orderId: req.params.id, assignedTo: name });
  res.json({ order: await present(await store.getOrder(req.params.id), { withCustomer: true }) });
}

export async function updateStatus(req, res) {
  const { order } = await store.advanceDelivery(req.params.id, req.body.status);
  logger.info('Delivery status changed', { adminId: req.user.id, orderId: order.id, status: order.status });
  res.json({ order: await present(order, { withCustomer: true }) });
}
