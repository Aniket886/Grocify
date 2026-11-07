import env from '../config/env.js';
import logger from '../config/logger.js';
import * as store from '../data/localStore.js';
import provider from '../payments/index.js';
import { PAYMENT_METHODS } from '../payments/PaymentProvider.js';
import { badRequest, text } from '../middleware/validate.js';

const timeoutMs = () => env.paymentTimeoutMinutes * 60000;

// Adds the successful payment (if any) so the confirmation page has transaction details.
async function present(order, { withCustomer = false } = {}) {
  const payments = await store.listPaymentsForOrder(order.id);
  const { idempotencyKey, ...safe } = order; // internal field, not for clients
  const out = { ...safe, payment: payments.find((p) => p.status === 'success') || null, attempts: payments.length };
  if (withCustomer) {
    const u = await store.findUserById(order.userId);
    out.customer = u ? { name: u.name, email: u.email, phone: u.phone || '' } : null;
  }
  return out;
}

// Customers can only see their own orders; a wrong ID looks the same as a missing one.
async function loadAccessible(req) {
  await store.expireUnpaidOrders();
  const order = await store.getOrder(req.params.id);
  if (!order || (req.user.role !== 'admin' && order.userId !== req.user.id)) throw badRequest('Order not found', 404);
  return order;
}

function readAddress(body, user) {
  const a = body.address || user.address || {};
  return {
    name: user.name,
    phone: user.phone || '',
    line: text(a.line, 'Delivery address', { max: 200 }),
    city: text(a.city, 'City', { max: 80 }),
    pincode: text(a.pincode, 'PIN code', { max: 10 }),
  };
}

export async function place(req, res) {
  await store.expireUnpaidOrders();
  const address = readAddress(req.body, req.user);
  const key = req.get('Idempotency-Key') || null;
  if (key && key.length > 100) throw badRequest('Idempotency-Key is too long');

  let result;
  try {
    result = await store.createOrderFromCart(req.user.id, address, key, env.paymentTimeoutMinutes);
  } catch (err) {
    if (err.status) logger.warn('Order failed', { userId: req.user.id, reason: err.message });
    throw err;
  }
  const { order, created, lowStock } = result;
  if (created) {
    logger.info('Order created', { userId: req.user.id, orderId: order.id, total: order.total, items: order.items.length });
    order.items.forEach((i) => logger.info('Stock reduced', { orderId: order.id, productId: i.productId, quantity: i.quantity }));
    lowStock.forEach((p) => logger.warn('Low stock', p));
  }
  res.status(created ? 201 : 200).json({ order: await present(order) });
}

export async function listMine(req, res) {
  await store.expireUnpaidOrders();
  const orders = await store.listOrdersByUser(req.user.id);
  res.json({ orders: await Promise.all(orders.map((o) => present(o))) });
}

export async function getOne(req, res) {
  const order = await loadAccessible(req);
  res.json({ order: await present(order, { withCustomer: req.user.role === 'admin' }) });
}

export async function pay(req, res) {
  const order = await loadAccessible(req);
  if (order.userId !== req.user.id) throw badRequest('Order not found', 404);

  const method = req.body.method;
  if (!PAYMENT_METHODS.includes(method)) throw badRequest(`Choose a payment method: ${PAYMENT_METHODS.join(', ')}`);
  if (order.status !== 'Payment Pending') {
    throw badRequest(order.status === 'Cancelled' ? 'This order was cancelled, so it cannot be paid' : 'This order is already paid', 409);
  }

  logger.info('Payment initiated', { orderId: order.id, method, provider: provider.name });
  // Only the method is read from the request. Card or UPI details are never accepted or stored.
  const result = await provider.pay({ order, method, outcome: env.nodeEnv === 'production' ? undefined : req.body.outcome });

  const { order: updated, payment } = await store.applyPayment(order.id, { method, ...result });
  if (payment.status === 'success') logger.info('Payment succeeded', { orderId: order.id, transactionId: payment.transactionId, amount: payment.amount });
  else logger.warn('Payment failed', { orderId: order.id, reason: payment.failureReason });

  // A failed payment is a normal result: the order stays pending and the customer can retry.
  res.status(payment.status === 'success' ? 200 : 402).json({ order: await present(updated), payment });
}

export async function cancel(req, res) {
  const order = await loadAccessible(req);
  const updated = await store.cancelPendingOrder(order.id, req.user.role === 'admin' ? 'Cancelled by admin' : 'Cancelled by customer');
  logger.info('Order cancelled', { orderId: order.id, by: req.user.id });
  res.json({ order: await present(updated) });
}

// ----- admin -----
export async function adminList(req, res) {
  await store.expireUnpaidOrders();
  const orders = await store.listAllOrders({ status: req.query.status });
  res.json({ orders: await Promise.all(orders.map((o) => present(o, { withCustomer: true }))) });
}
