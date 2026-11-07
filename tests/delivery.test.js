// Phase 5 tests: delivery tracking, notifications, admin customers/payments/reports. Run with: npm test
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-tests-only';
process.env.DATA_FILE = path.join(os.tmpdir(), `grocify-delivery-test-${process.pid}-${Date.now()}.json`);

const { default: createApp } = await import('../server/app.js');
const store = await import('../server/data/localStore.js');
const { buildSalesReport } = await import('../server/controllers/adminController.js');
const { default: bcrypt } = await import('bcryptjs');

let server, base, adminToken, categoryId;
const addr = { line: '12 MG Road', city: 'Davangere', pincode: '577006' };

const call = async (method, url, { token, body } = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
};

const newCustomer = async (name) => (await call('POST', '/auth/register', { body: { name, email: `${name.toLowerCase()}@test.local`, password: 'password123' } })).data.token;
const newProduct = async (name, stock, price = 100) =>
  (await call('POST', '/products', { token: adminToken, body: { name, description: name, categoryId, price, stock, lowStockLimit: 1 } })).data.product;

// Customer buys `qty` of a product and (optionally) pays. Returns the order.
async function buy(token, product, qty = 1, { pay = true } = {}) {
  await call('POST', '/cart/items', { token, body: { productId: product.id, quantity: qty } });
  const order = (await call('POST', '/orders', { token, body: { address: addr } })).data.order;
  if (pay) await call('POST', `/orders/${order.id}/pay`, { token, body: { method: 'UPI' } });
  return order;
}
const notes = async (token) => (await call('GET', '/notifications', { token })).data;

before(async () => {
  store._reset();
  await store.createUser({ name: 'Admin', email: 'admin@test.local', role: 'admin', passwordHash: await bcrypt.hash('adminpass123', 4) });
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
  adminToken = (await call('POST', '/auth/login', { body: { email: 'admin@test.local', password: 'adminpass123' } })).data.token;
  categoryId = (await call('POST', '/categories', { token: adminToken, body: { name: 'Fruits' } })).data.category.id;
});

after(() => {
  server.close();
  fs.rmSync(process.env.DATA_FILE, { force: true });
});

test('paying creates a delivery record the customer can track', async () => {
  const t = await newCustomer('Tracker');
  const p = await newProduct('Apple', 10);
  const order = await buy(t, p);
  const r = await call('GET', `/orders/${order.id}`, { token: t });
  assert.equal(r.data.order.delivery.status, 'Order Placed');
  assert.equal(r.data.order.delivery.assignedTo, null);
  assert.equal(r.data.order.delivery.history.length, 1);
});

test('unpaid orders have no delivery and cannot be assigned or advanced', async () => {
  const t = await newCustomer('Unpaid');
  const p = await newProduct('Pear', 10);
  const order = await buy(t, p, 1, { pay: false });
  assert.equal((await call('GET', `/orders/${order.id}`, { token: t })).data.order.delivery, null);
  assert.equal((await call('POST', `/admin/orders/${order.id}/assign`, { token: adminToken, body: { assignedTo: 'Ravi' } })).status, 409);
  assert.equal((await call('PATCH', `/admin/orders/${order.id}/status`, { token: adminToken, body: { status: 'Packed' } })).status, 409);
});

test('delivery moves one step at a time, needs an assignee to ship, and notifies the customer', async () => {
  const t = await newCustomer('Flow');
  const p = await newProduct('Mango', 10);
  const order = await buy(t, p);
  const status = (s) => call('PATCH', `/admin/orders/${order.id}/status`, { token: adminToken, body: { status: s } });

  assert.equal((await status('Delivered')).status, 409, 'cannot skip steps');
  assert.equal((await status('Order Placed')).status, 409, 'cannot repeat or go back');
  assert.equal((await status('Packed')).status, 200);
  assert.equal((await status('Shipped')).status, 409, 'needs an assigned delivery person');

  assert.equal((await call('POST', `/admin/orders/${order.id}/assign`, { token: adminToken, body: { assignedTo: '' } })).status, 400);
  assert.equal((await call('POST', `/admin/orders/${order.id}/assign`, { token: adminToken, body: { assignedTo: 'Ravi Kumar' } })).status, 200);
  assert.equal((await status('Shipped')).status, 200);
  assert.equal((await status('Out for Delivery')).status, 200);
  const done = await status('Delivered');
  assert.equal(done.status, 200);
  assert.equal(done.data.order.status, 'Delivered');
  assert.equal((await status('Delivered')).status, 409, 'already delivered');

  const tracked = (await call('GET', `/orders/${order.id}`, { token: t })).data.order;
  assert.deepEqual(tracked.delivery.history.map((h) => h.status), ['Order Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered']);
  assert.equal(tracked.delivery.assignedTo, 'Ravi Kumar');
  assert.equal((await call('POST', `/orders/${order.id}/cancel`, { token: t })).status, 409, 'delivered order cannot be cancelled');

  const n = (await notes(t)).notifications;
  const delivery = n.filter((x) => x.type === 'delivery_update').map((x) => x.message);
  assert.equal(delivery.length, 4);
  assert.ok(delivery.some((m) => m.includes('Out for Delivery')));
  assert.ok(delivery.some((m) => m.includes('delivered')));
});

test('customers cannot use admin delivery or report endpoints', async () => {
  const t = await newCustomer('Nosy');
  for (const [m, u] of [['GET', '/admin/deliveries'], ['GET', '/admin/customers'], ['GET', '/admin/payments'], ['GET', '/admin/reports/sales']]) {
    assert.equal((await call(m, u, { token: t })).status, 403, u);
  }
  assert.equal((await call('PATCH', '/admin/orders/x/status', { token: t, body: { status: 'Packed' } })).status, 403);
  assert.equal((await call('GET', '/admin/deliveries')).status, 401);
});

test('notifications cover order confirmation, payment status (success, failure, expiry) and delivery', async () => {
  const t = await newCustomer('Notified');
  const p = await newProduct('Grapes', 10);

  await call('POST', '/cart/items', { token: t, body: { productId: p.id, quantity: 1 } });
  const order = (await call('POST', '/orders', { token: t, body: { address: addr } })).data.order;
  await call('POST', `/orders/${order.id}/pay`, { token: t, body: { method: 'Card', outcome: 'failure' } });
  await call('POST', `/orders/${order.id}/pay`, { token: t, body: { method: 'Card' } });

  const types = (await notes(t)).notifications.map((n) => n.type);
  assert.ok(types.includes('order_confirmation'));
  assert.equal(types.filter((x) => x === 'payment_status').length, 2); // one failure, one success

  // expiry
  const slow = await buy(t, p, 1, { pay: false });
  await store.expireUnpaidOrders(Date.now() + 16 * 60000);
  const after = (await notes(t)).notifications;
  assert.ok(after.some((n) => n.orderId === slow.id && n.message.includes('cancelled')));
});

test('notifications: own only, unread count, mark read', async () => {
  const a = await newCustomer('ReaderA');
  const b = await newCustomer('ReaderB');
  const p = await newProduct('Lime', 10);
  await buy(a, p);

  let r = await notes(a);
  assert.ok(r.unreadCount >= 2);
  assert.equal((await notes(b)).notifications.length, 0, 'B sees none of A\'s');

  const first = r.notifications[0];
  assert.equal((await call('POST', `/notifications/${first.id}/read`, { token: b })).status, 404, 'cannot touch another customer\'s');
  assert.equal((await call('POST', `/notifications/${first.id}/read`, { token: a })).status, 200);
  assert.equal((await notes(a)).unreadCount, r.unreadCount - 1);

  await call('POST', '/notifications/read-all', { token: a });
  assert.equal((await notes(a)).unreadCount, 0);
  assert.equal((await call('GET', '/notifications', { token: adminToken })).status, 403, 'admin has no customer inbox');
});

test('admin can list deliveries by status', async () => {
  const t = await newCustomer('Lister');
  const p = await newProduct('Plum', 10);
  const order = await buy(t, p);
  const all = await call('GET', '/admin/deliveries', { token: adminToken });
  assert.ok(all.data.orders.some((o) => o.id === order.id));
  assert.deepEqual(all.data.statuses, ['Order Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered']);
  const packed = await call('GET', '/admin/deliveries?status=Packed', { token: adminToken });
  assert.equal(packed.data.orders.some((o) => o.id === order.id), false);
  assert.equal((await call('GET', '/admin/deliveries?status=Nonsense', { token: adminToken })).status, 400);
});

test('admin sees customers (with order counts) and payments', async () => {
  const t = await newCustomer('Spender');
  const p = await newProduct('Fig', 20, 50);
  await buy(t, p, 2);              // paid 100
  await buy(t, p, 1, { pay: false });
  const c = (await call('GET', '/admin/customers', { token: adminToken })).data.customers.find((x) => x.name === 'Spender');
  assert.equal(c.orderCount, 2);
  assert.equal(c.totalSpent, 100);
  assert.equal(c.passwordHash, undefined);

  const pays = (await call('GET', '/admin/payments', { token: adminToken })).data.payments.filter((x) => x.customer === 'Spender');
  assert.equal(pays.length, 1);
  assert.equal(pays[0].status, 'success');
  assert.ok(pays[0].transactionId);
});

test('sales report: totals, status, per day, top products, date filter', () => {
  const o = (id, day, status, paymentStatus, items) => ({
    id, createdAt: `${day}T10:00:00.000Z`, status, paymentStatus,
    total: items.reduce((s, i) => s + i.price * i.quantity, 0), items,
  });
  const orders = [
    o('1', '2026-11-01', 'Delivered', 'paid', [{ productId: 'a', name: 'Apple', price: 100, quantity: 2 }]),
    o('2', '2026-11-01', 'Order Placed', 'paid', [{ productId: 'a', name: 'Apple', price: 100, quantity: 1 }, { productId: 'm', name: 'Milk', price: 50, quantity: 4 }]),
    o('3', '2026-11-02', 'Payment Pending', 'pending', [{ productId: 'a', name: 'Apple', price: 100, quantity: 9 }]),
    o('4', '2026-11-03', 'Cancelled', 'cancelled', [{ productId: 'm', name: 'Milk', price: 50, quantity: 1 }]),
  ];
  const r = buildSalesReport(orders);
  assert.equal(r.totals.orders, 4);
  assert.equal(r.totals.paidOrders, 2);
  assert.equal(r.totals.revenue, 500);              // 200 + 300; pending and cancelled excluded
  assert.equal(r.totals.averageOrderValue, 250);
  assert.equal(r.totals.pendingPayment, 1);
  assert.equal(r.totals.cancelled, 1);
  assert.equal(r.byStatus['Order Placed'], 1);
  assert.deepEqual(r.byDay.map((d) => [d.date, d.orders, d.revenue]), [['2026-11-01', 2, 500], ['2026-11-02', 1, 0], ['2026-11-03', 1, 0]]);
  assert.deepEqual(r.topProducts.map((p) => [p.name, p.quantity]), [['Milk', 4], ['Apple', 3]]);

  const filtered = buildSalesReport(orders, { from: '2026-11-02', to: '2026-11-03' });
  assert.equal(filtered.totals.orders, 2);
  assert.equal(filtered.totals.revenue, 0);
});

test('sales report endpoint validates dates', async () => {
  assert.equal((await call('GET', '/admin/reports/sales', { token: adminToken })).status, 200);
  assert.equal((await call('GET', '/admin/reports/sales?from=yesterday', { token: adminToken })).status, 400);
  assert.equal((await call('GET', '/admin/reports/sales?from=2026-12-01&to=2026-11-01', { token: adminToken })).status, 400);
});
