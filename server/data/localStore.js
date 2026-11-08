// Local development data store (JSON file). Same async shape a Firestore store would have,
// so it can be swapped for Firebase later without changing controllers.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import env from '../config/env.js';
import { DELIVERY_STATUSES, ASSIGNMENT_REQUIRED_FROM } from '../utils/constants.js';

let db = null;

function load() {
  if (db) return db;
  try {
    db = JSON.parse(fs.readFileSync(env.dataFile, 'utf8'));
  } catch {
    db = { users: [], categories: [], products: [], carts: {} };
  }
  db.orders = db.orders || [];
  db.payments = db.payments || [];
  db.deliveries = db.deliveries || [];
  db.notifications = db.notifications || [];
  return db;
}

function save() {
  fs.mkdirSync(path.dirname(env.dataFile), { recursive: true });
  const payload = JSON.stringify(db, null, 2);
  try {
    const tmpFile = env.dataFile + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
    fs.writeFileSync(tmpFile, payload, 'utf8');
    fs.renameSync(tmpFile, env.dataFile);
  } catch {
    fs.writeFileSync(env.dataFile, payload, 'utf8');
  }
}

const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export function customerCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(4), (b) => chars[b % chars.length]).join('');
}

// ---------- users ----------
export async function findUserByEmail(email) {
  return load().users.find((u) => u.email === email.toLowerCase()) || null;
}
export async function findUserById(id) {
  return load().users.find((u) => u.id === id) || null;
}
export async function createUser(data) {
  const d = load();
  // customerCode is part of every order ID, so it must be unique across customers.
  let code = customerCode();
  while (d.users.some((u) => u.customerCode === code)) code = customerCode();
  const user = { id: newId(), orderSeq: 0, customerCode: code, createdAt: now(), ...data, email: data.email.toLowerCase() };
  d.users.push(user);
  save();
  return user;
}
export async function updateUser(id, patch) {
  const u = load().users.find((x) => x.id === id);
  if (!u) return null;
  Object.assign(u, patch);
  save();
  return u;
}
export async function deleteUser(id) {
  const d = load();
  const idx = d.users.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  d.users.splice(idx, 1);
  if (d.carts && d.carts[id]) delete d.carts[id];
  if (d.notifications) {
    d.notifications = d.notifications.filter((n) => n.userId !== id);
  }
  save();
  return true;
}

export async function listCustomers() {
  return load().users.filter((u) => u.role === 'customer');
}

// ---------- categories ----------
export async function listCategories() {
  return [...load().categories].sort((a, b) => a.name.localeCompare(b.name));
}
export async function getCategory(id) {
  return load().categories.find((c) => c.id === id) || null;
}
export async function createCategory(name) {
  const c = { id: newId(), name };
  load().categories.push(c);
  save();
  return c;
}
export async function updateCategory(id, name) {
  const c = load().categories.find((x) => x.id === id);
  if (!c) return null;
  c.name = name;
  save();
  return c;
}
export async function deleteCategory(id) {
  const d = load();
  d.categories = d.categories.filter((c) => c.id !== id);
  save();
}
export async function categoryHasProducts(id) {
  return load().products.some((p) => p.categoryId === id && p.isActive);
}

// ---------- products ----------
export async function listProducts({ categoryId, q, includeInactive } = {}) {
  const term = (q || '').trim().toLowerCase();
  return load()
    .products.filter((p) => (includeInactive ? true : p.isActive))
    .filter((p) => (categoryId ? p.categoryId === categoryId : true))
    .filter((p) => (term ? p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term) : true))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export async function getProduct(id) {
  return load().products.find((p) => p.id === id) || null;
}
export async function createProduct(data) {
  const p = { id: newId(), isActive: true, createdAt: now(), ...data };
  load().products.push(p);
  save();
  return p;
}
export async function updateProduct(id, patch) {
  const p = load().products.find((x) => x.id === id);
  if (!p) return null;
  Object.assign(p, patch);
  save();
  return p;
}
// "Delete" hides the product so old orders keep working.
export async function deleteProduct(id) {
  return updateProduct(id, { isActive: false });
}

// ---------- carts: { [userId]: { [productId]: quantity } } ----------
export async function getCart(userId) {
  return { ...(load().carts[userId] || {}) };
}
export async function setCartItem(userId, productId, quantity) {
  const d = load();
  d.carts[userId] = d.carts[userId] || {};
  d.carts[userId][productId] = quantity;
  save();
}
export async function removeCartItem(userId, productId) {
  const d = load();
  if (d.carts[userId]) delete d.carts[userId][productId];
  save();
}

// ---------- orders and payments ----------
// IMPORTANT: createOrderFromCart, applyPayment, cancelPendingOrder and expireUnpaidOrders each run
// as ONE uninterrupted step (no await inside), so two requests can never interleave.
// With Firestore, each of these becomes a runTransaction() with the same steps.
const fail = (message, status) => Object.assign(new Error(message), { status });
const round2 = (n) => Math.round(n * 100) / 100;
const pad = (n) => String(n).padStart(4, '0');
const dateStamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

function restoreStock(order) {
  for (const item of order.items) {
    const p = load().products.find((x) => x.id === item.productId);
    if (p) p.stock += item.quantity;
  }
}

// Adds an in-app notification. Called inside the same step as the change it describes,
// so a notification can never be missed or sent for something that did not happen.
function notify(userId, type, message, orderId) {
  load().notifications.push({ id: newId(), userId, type, message, orderId, read: false, createdAt: now() });
}

function cancelOrderRecord(order, reason) {
  restoreStock(order);
  order.status = 'Cancelled';
  order.paymentStatus = 'cancelled';
  order.cancelReason = reason;
  order.cancelledAt = now();
  notify(order.userId, 'payment_status', `Order ${order.id} was cancelled: ${reason.charAt(0).toLowerCase()}${reason.slice(1)}. Your items were released.`, order.id);
}

// Order ID: ORD-<date>-<customerCode>-<per-customer sequence>. The sequence is bumped in the same step
// that writes the order, so IDs never repeat for a customer and different customers never collide.
export async function createOrderFromCart(userId, address, idempotencyKey, timeoutMinutes) {
  const d = load();
  if (idempotencyKey) {
    const existing = d.orders.find((o) => o.userId === userId && o.idempotencyKey === idempotencyKey);
    if (existing) return { order: existing, created: false, lowStock: [] }; // double-click / retry
  }
  const user = d.users.find((u) => u.id === userId);
  const entries = Object.entries(d.carts[userId] || {});
  if (entries.length === 0) throw fail('Your cart is empty', 400);

  // 1) Check everything first, change nothing yet.
  const lines = entries.map(([productId, qty]) => {
    const p = d.products.find((x) => x.id === productId);
    if (!p || !p.isActive) throw fail('An item in your cart is no longer available', 409);
    if (p.stock <= 0) throw fail(`${p.name} is out of stock`, 409);
    if (p.stock < qty) throw fail(`Only ${p.stock} of ${p.name} available`, 409);
    return { p, qty };
  });

  // 2) All good: reduce stock, write the order, bump the counter, clear the cart.
  const lowStock = [];
  const items = lines.map(({ p, qty }) => {
    p.stock -= qty;
    if (p.stock <= p.lowStockLimit) lowStock.push({ productId: p.id, name: p.name, stock: p.stock, limit: p.lowStockLimit });
    return { productId: p.id, name: p.name, price: p.price, quantity: qty };
  });
  user.orderSeq += 1;
  const order = {
    id: `ORD-${dateStamp()}-${user.customerCode}-${pad(user.orderSeq)}`,
    userId,
    items,
    address,
    total: round2(items.reduce((s, i) => s + i.price * i.quantity, 0)),
    status: 'Payment Pending',
    paymentStatus: 'pending',
    createdAt: now(),
    expiresAt: new Date(Date.now() + timeoutMinutes * 60000).toISOString(),
    idempotencyKey: idempotencyKey || null,
  };
  d.orders.push(order);
  d.carts[userId] = {};
  notify(userId, 'order_confirmation', `Order ${order.id} placed for ₹${order.total}. Complete the payment to confirm it.`, order.id);
  save();
  return { order, created: true, lowStock };
}

// Unpaid orders are cancelled after the timeout and their stock is released.
export async function expireUnpaidOrders(nowMs = Date.now()) {
  const d = load();
  const expired = d.orders.filter((o) => o.status === 'Payment Pending' && Date.parse(o.expiresAt) <= nowMs);
  expired.forEach((o) => cancelOrderRecord(o, 'Payment not completed in time'));
  if (expired.length) save();
  return expired.map((o) => o.id);
}

export async function cancelPendingOrder(orderId, reason) {
  const o = load().orders.find((x) => x.id === orderId);
  if (!o) throw fail('Order not found', 404);
  if (o.status !== 'Payment Pending') throw fail('Only unpaid orders can be cancelled', 409);
  cancelOrderRecord(o, reason);
  save();
  return o;
}

export async function getOrder(id) {
  return load().orders.find((o) => o.id === id) || null;
}
export async function listOrdersByUser(userId) {
  return load().orders.filter((o) => o.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function listAllOrders({ status } = {}) {
  return load().orders.filter((o) => (status ? o.status === status : true)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Records one payment attempt. Only one successful payment per order is possible.
export async function applyPayment(orderId, { method, success, transactionId, failureReason }) {
  const d = load();
  const o = d.orders.find((x) => x.id === orderId);
  if (!o) throw fail('Order not found', 404);
  if (o.status === 'Payment Pending' && Date.parse(o.expiresAt) <= Date.now()) {
    cancelOrderRecord(o, 'Payment not completed in time');
    save();
  }
  if (o.status === 'Cancelled') throw fail('This order was cancelled, so it cannot be paid', 409);
  if (o.status !== 'Payment Pending') throw fail('This order is already paid', 409);

  const payment = {
    id: newId(),
    orderId,
    userId: o.userId,
    method,
    status: success ? 'success' : 'failed',
    transactionId,
    amount: o.total,
    failureReason: success ? undefined : failureReason,
    createdAt: now(),
  };
  d.payments.push(payment);
  if (success) {
    o.status = 'Order Placed';
    o.paymentStatus = 'paid';
    o.paidAt = now();
    d.deliveries.push({ orderId: o.id, assignedTo: null, status: 'Order Placed', history: [{ status: 'Order Placed', at: o.paidAt }], updatedAt: o.paidAt });
    notify(o.userId, 'payment_status', `Payment of ₹${payment.amount} received for order ${o.id} (${payment.method}). Your order is confirmed.`, o.id);
  } else {
    notify(o.userId, 'payment_status', `Payment failed for order ${o.id}: ${failureReason || 'declined'}. You can try again.`, o.id);
  }
  save();
  return { order: o, payment };
}
export async function listPaymentsForOrder(orderId) {
  return load().payments.filter((p) => p.orderId === orderId);
}
export async function listAllPayments() {
  return [...load().payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------- delivery ----------
// A delivery record is created when payment succeeds. Statuses move forward one step at a time.
export async function getDelivery(orderId) {
  return load().deliveries.find((x) => x.orderId === orderId) || null;
}
export async function listDeliveries({ status } = {}) {
  return load().deliveries.filter((x) => (status ? x.status === status : true)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function paidOrderAndDelivery(orderId) {
  const d = load();
  const o = d.orders.find((x) => x.id === orderId);
  if (!o) throw fail('Order not found', 404);
  const del = d.deliveries.find((x) => x.orderId === orderId);
  if (!del) throw fail('Only paid orders can be delivered', 409);
  return { o, del };
}

export async function assignDelivery(orderId, assignedTo) {
  const { del } = paidOrderAndDelivery(orderId);
  if (del.status === 'Delivered') throw fail('This order is already delivered', 409);
  del.assignedTo = assignedTo;
  del.updatedAt = now();
  save();
  return del;
}

export async function advanceDelivery(orderId, nextStatus) {
  const { o, del } = paidOrderAndDelivery(orderId);
  const expected = DELIVERY_STATUSES[DELIVERY_STATUSES.indexOf(del.status) + 1];
  if (!expected) throw fail('This order is already delivered', 409);
  if (nextStatus !== expected) throw fail(`The next status must be "${expected}"`, 409);
  if (nextStatus === ASSIGNMENT_REQUIRED_FROM && !del.assignedTo) throw fail('Assign a delivery person before shipping', 409);

  del.status = nextStatus;
  del.history.push({ status: nextStatus, at: now() });
  del.updatedAt = now();
  o.status = nextStatus; // the order shows the same status the customer tracks
  notify(o.userId, 'delivery_update', nextStatus === 'Delivered' ? `Order ${o.id} has been delivered. Enjoy!` : `Order ${o.id} is now: ${nextStatus}.`, o.id);
  save();
  return { order: o, delivery: del };
}

export async function resetDemoDelivery(orderId) {
  const { o, del } = paidOrderAndDelivery(orderId);
  del.status = 'Order Placed';
  del.history = [{ status: 'Order Placed', at: o.paidAt || now() }];
  del.assignedTo = null;
  del.updatedAt = now();
  o.status = 'Order Placed';
  save();
  return { order: o, delivery: del };
}

// ---------- notifications ----------
export async function listNotifications(userId) {
  return load().notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function markNotificationRead(userId, id) {
  const n = load().notifications.find((x) => x.id === id && x.userId === userId);
  if (!n) return null;
  n.read = true;
  save();
  return n;
}
export async function markAllNotificationsRead(userId) {
  load().notifications.filter((n) => n.userId === userId).forEach((n) => { n.read = true; });
  save();
}

// ---------- inventory ----------
export async function listInventory({ lowOnly } = {}) {
  return load()
    .products.filter((p) => p.isActive)
    .filter((p) => (lowOnly ? p.stock <= p.lowStockLimit : true))
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
}

// Test helper
export function _reset() {
  db = { users: [], categories: [], products: [], carts: {}, orders: [], payments: [], deliveries: [], notifications: [] };
  save();
}
