// Phase 4 tests: orders, payment, inventory, concurrency. Run with: npm test
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-tests-only';
process.env.DATA_FILE = path.join(os.tmpdir(), `grocify-orders-test-${process.pid}-${Date.now()}.json`);

const { default: createApp } = await import('../server/app.js');
const store = await import('../server/data/localStore.js');
const { default: bcrypt } = await import('bcryptjs');

let server, base, adminToken, categoryId;
const addr = { line: '12 MG Road', city: 'Davangere', pincode: '577006' };

const call = async (method, url, { token, body, headers } = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
};

async function newCustomer(name) {
  const r = await call('POST', '/auth/register', { body: { name, email: `${name.toLowerCase()}@test.local`, password: 'password123' } });
  return r.data.token;
}
async function newProduct(name, stock, price = 100, lowStockLimit = 2) {
  const r = await call('POST', '/products', { token: adminToken, body: { name, description: name, categoryId, price, stock, lowStockLimit } });
  return r.data.product;
}
const stockOf = async (id) => (await call('GET', `/products/${id}`)).data.product.stock;
const addToCart = (token, productId, quantity = 1) => call('POST', '/cart/items', { token, body: { productId, quantity } });
const checkout = (token, key) => call('POST', '/orders', { token, body: { address: addr }, headers: key ? { 'Idempotency-Key': key } : {} });

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

test('checkout needs items and an address', async () => {
  const t = await newCustomer('Empty');
  assert.equal((await checkout(t)).status, 400); // empty cart
  const p = await newProduct('Pear', 10);
  await addToCart(t, p.id);
  const r = await call('POST', '/orders', { token: t, body: {} }); // no address and none on profile
  assert.equal(r.status, 400);
});

test('placing an order: ID format, total, stock reduced, cart cleared', async () => {
  const t = await newCustomer('Asha');
  const p = await newProduct('Apple', 10, 100);
  await addToCart(t, p.id, 3);
  const r = await checkout(t);
  assert.equal(r.status, 201);
  assert.match(r.data.order.id, /^ORD-\d{8}-[A-Z0-9]{4}-0001$/);
  assert.equal(r.data.order.total, 300);
  assert.equal(r.data.order.status, 'Payment Pending');
  assert.equal(r.data.order.idempotencyKey, undefined);
  assert.equal(await stockOf(p.id), 7);
  assert.equal((await call('GET', '/cart', { token: t })).data.lines.length, 0);
});

test('order IDs are unique per customer and sequential', async () => {
  const t = await newCustomer('Ravi');
  const p = await newProduct('Grapes', 20);
  const ids = [];
  for (let i = 0; i < 3; i++) {
    await addToCart(t, p.id);
    ids.push((await checkout(t)).data.order.id);
  }
  assert.deepEqual(ids.map((id) => id.slice(-4)), ['0001', '0002', '0003']);
  assert.equal(new Set(ids).size, 3);

  const other = await newCustomer('Meena');
  await addToCart(other, p.id);
  const otherId = (await checkout(other)).data.order.id;
  assert.ok(!ids.includes(otherId));
  assert.notEqual(otherId.split('-')[2], ids[0].split('-')[2], 'customers have different codes');
});

test('double-click safety: same Idempotency-Key creates one order', async () => {
  const t = await newCustomer('Double');
  const p = await newProduct('Guava', 10);
  await addToCart(t, p.id, 2);
  const a = await checkout(t, 'key-123');
  const b = await checkout(t, 'key-123');
  assert.equal(a.status, 201);
  assert.equal(b.status, 200);
  assert.equal(a.data.order.id, b.data.order.id);
  assert.equal(await stockOf(p.id), 8, 'stock reduced once');
});

test('two customers race for the last item: exactly one wins', async () => {
  const a = await newCustomer('RaceA');
  const b = await newCustomer('RaceB');
  const p = await newProduct('LastOne', 1);
  await addToCart(a, p.id);
  await addToCart(b, p.id);
  const [ra, rb] = await Promise.all([checkout(a), checkout(b)]);
  assert.deepEqual([ra.status, rb.status].sort(), [201, 409]);
  assert.equal(await stockOf(p.id), 0, 'stock never goes negative');
});

test('failed payment can be retried; success confirms the order', async () => {
  const t = await newCustomer('Payer');
  const p = await newProduct('Mango', 10, 50);
  await addToCart(t, p.id, 2);
  const order = (await checkout(t)).data.order;

  let r = await call('POST', `/orders/${order.id}/pay`, { token: t, body: { method: 'Bitcoin' } });
  assert.equal(r.status, 400);

  r = await call('POST', `/orders/${order.id}/pay`, { token: t, body: { method: 'UPI', outcome: 'failure' } });
  assert.equal(r.status, 402);
  assert.equal(r.data.payment.status, 'failed');
  assert.equal(r.data.order.status, 'Payment Pending');

  r = await call('POST', `/orders/${order.id}/pay`, { token: t, body: { method: 'Card', cardNumber: '4111111111111111', cvv: '123' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.order.status, 'Order Placed');
  assert.equal(r.data.order.paymentStatus, 'paid');
  assert.equal(r.data.payment.status, 'success');
  assert.ok(r.data.payment.transactionId);
  assert.equal(r.data.payment.amount, 100);
  assert.equal(JSON.stringify(r.data).includes('4111'), false, 'card number is not stored or echoed');
  assert.equal(JSON.stringify(await store.listPaymentsForOrder(order.id)).includes('4111'), false);

  r = await call('POST', `/orders/${order.id}/pay`, { token: t, body: { method: 'UPI' } });
  assert.equal(r.status, 409, 'cannot pay twice');
  const got = await call('GET', `/orders/${order.id}`, { token: t });
  assert.equal(got.data.order.payment.transactionId.startsWith('MOCK-'), true);
  assert.equal(got.data.order.attempts, 2);
});

test('simultaneous double payment records one success only', async () => {
  const t = await newCustomer('Twice');
  const p = await newProduct('Lime', 10);
  await addToCart(t, p.id);
  const order = (await checkout(t)).data.order;
  const results = await Promise.all([
    call('POST', `/orders/${order.id}/pay`, { token: t, body: { method: 'UPI' } }),
    call('POST', `/orders/${order.id}/pay`, { token: t, body: { method: 'UPI' } }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const payments = await store.listPaymentsForOrder(order.id);
  assert.equal(payments.filter((x) => x.status === 'success').length, 1);
});

test('cancel an unpaid order restores stock; paid order cannot be cancelled', async () => {
  const t = await newCustomer('Canceller');
  const p = await newProduct('Plum', 10);
  await addToCart(t, p.id, 4);
  const order = (await checkout(t)).data.order;
  assert.equal(await stockOf(p.id), 6);
  let r = await call('POST', `/orders/${order.id}/cancel`, { token: t });
  assert.equal(r.status, 200);
  assert.equal(r.data.order.status, 'Cancelled');
  assert.equal(await stockOf(p.id), 10);
  r = await call('POST', `/orders/${order.id}/pay`, { token: t, body: { method: 'UPI' } });
  assert.equal(r.status, 409);

  await addToCart(t, p.id);
  const paid = (await checkout(t)).data.order;
  await call('POST', `/orders/${paid.id}/pay`, { token: t, body: { method: 'UPI' } });
  assert.equal((await call('POST', `/orders/${paid.id}/cancel`, { token: t })).status, 409);
});

test('unpaid orders expire and release stock', async () => {
  const t = await newCustomer('Slow');
  const p = await newProduct('Kiwi', 5);
  await addToCart(t, p.id, 5);
  const order = (await checkout(t)).data.order;
  assert.equal(await stockOf(p.id), 0);
  const expired = await store.expireUnpaidOrders(Date.now() + 16 * 60000); // pretend 16 minutes passed
  assert.ok(expired.includes(order.id));
  assert.equal(await stockOf(p.id), 5);
  const r = await call('POST', `/orders/${order.id}/pay`, { token: t, body: { method: 'UPI' } });
  assert.equal(r.status, 409);
  assert.equal((await call('GET', `/orders/${order.id}`, { token: t })).data.order.status, 'Cancelled');
});

test('inventory: admin sees stock and low-stock items; customers cannot', async () => {
  const t = await newCustomer('Viewer');
  const p = await newProduct('Lychee', 2, 10, 5); // 2 <= limit 5
  let r = await call('GET', '/inventory?lowOnly=true', { token: adminToken });
  assert.equal(r.status, 200);
  const row = r.data.products.find((x) => x.id === p.id);
  assert.equal(row.isLowStock, true);
  assert.ok(row.categoryName);
  assert.equal((await call('GET', '/inventory', { token: t })).status, 403);
  assert.equal((await call('GET', '/inventory')).status, 401);
});

test('order privacy and admin order management', async () => {
  const a = await newCustomer('OwnerA');
  const b = await newCustomer('OwnerB');
  const p = await newProduct('Fig', 10);
  await addToCart(a, p.id);
  const order = (await checkout(a)).data.order;

  assert.equal((await call('GET', `/orders/${order.id}`, { token: b })).status, 404);
  assert.equal((await call('POST', `/orders/${order.id}/pay`, { token: b, body: { method: 'UPI' } })).status, 404);
  assert.equal((await call('POST', `/orders/${order.id}/cancel`, { token: b })).status, 404);
  const mine = await call('GET', '/orders', { token: b });
  assert.equal(mine.data.orders.some((o) => o.id === order.id), false);

  assert.equal((await call('GET', '/admin/orders', { token: a })).status, 403);
  const all = await call('GET', '/admin/orders?status=Payment%20Pending', { token: adminToken });
  const found = all.data.orders.find((o) => o.id === order.id);
  assert.ok(found);
  assert.equal(found.customer.name, 'OwnerA');
  assert.equal((await call('GET', `/orders/${order.id}`, { token: adminToken })).status, 200);

  assert.equal((await call('POST', '/orders', { token: adminToken, body: { address: addr } })).status, 403, 'admin is not a customer');
});
