// Phase 3 API tests. Run with: npm test
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-tests-only';
process.env.DATA_FILE = path.join(os.tmpdir(), `grocify-test-${Date.now()}.json`);

const { default: createApp } = await import('../server/app.js');
const store = await import('../server/data/localStore.js');
const { default: bcrypt } = await import('bcryptjs');

let server, base;
const call = async (method, url, { token, body } = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
};

let adminToken, customerToken, otherToken, categoryId, productId;

before(async () => {
  store._reset();
  await store.createUser({ name: 'Admin', email: 'admin@test.local', role: 'admin', passwordHash: await bcrypt.hash('adminpass123', 4) });
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  server.close();
  fs.rmSync(process.env.DATA_FILE, { force: true });
});

test('register, duplicate email, weak password', async () => {
  let r = await call('POST', '/auth/register', { body: { name: 'Asha', email: 'asha@test.local', password: 'password123' } });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, 'customer');
  assert.equal(r.data.user.passwordHash, undefined);
  customerToken = r.data.token;

  r = await call('POST', '/auth/register', { body: { name: 'Asha', email: 'ASHA@test.local', password: 'password123' } });
  assert.equal(r.status, 409);

  r = await call('POST', '/auth/register', { body: { name: 'X', email: 'x@test.local', password: 'short' } });
  assert.equal(r.status, 400);

  r = await call('POST', '/auth/register', { body: { name: 'Ravi', email: 'ravi@test.local', password: 'password123', role: 'admin' } });
  assert.equal(r.data.user.role, 'customer', 'cannot self-register as admin');
  otherToken = r.data.token;
});

test('login success and failure', async () => {
  let r = await call('POST', '/auth/login', { body: { email: 'admin@test.local', password: 'adminpass123' } });
  assert.equal(r.status, 200);
  adminToken = r.data.token;
  r = await call('POST', '/auth/login', { body: { email: 'admin@test.local', password: 'wrong-password' } });
  assert.equal(r.status, 401);
  r = await call('POST', '/auth/login', { body: { email: 'nobody@test.local', password: 'whatever123' } });
  assert.equal(r.status, 401);
});

test('protected routes need a token', async () => {
  assert.equal((await call('GET', '/auth/me')).status, 401);
  assert.equal((await call('GET', '/cart')).status, 401);
  assert.equal((await call('GET', '/auth/me', { token: 'garbage' })).status, 401);
});

test('profile and delivery address update', async () => {
  const r = await call('PUT', '/auth/profile', { token: customerToken, body: { name: 'Asha K', phone: '9999999999', address: { line: '12 MG Road', city: 'Davangere', pincode: '577006' } } });
  assert.equal(r.status, 200);
  const me = await call('GET', '/auth/me', { token: customerToken });
  assert.equal(me.data.user.address.city, 'Davangere');
});

test('customer cannot manage products or categories; admin can', async () => {
  let r = await call('POST', '/categories', { token: customerToken, body: { name: 'Fruits' } });
  assert.equal(r.status, 403);
  r = await call('POST', '/categories', { token: adminToken, body: { name: 'Fruits' } });
  assert.equal(r.status, 201);
  categoryId = r.data.category.id;

  r = await call('POST', '/products', { token: customerToken, body: {} });
  assert.equal(r.status, 403);
  r = await call('POST', '/products', { token: adminToken, body: { name: 'Apple', description: 'Red apples', categoryId, price: 100, stock: 5, lowStockLimit: 2 } });
  assert.equal(r.status, 201);
  productId = r.data.product.id;
  assert.equal(r.data.product.availability, 'in_stock');

  r = await call('POST', '/products', { token: adminToken, body: { name: 'Bad', categoryId, price: -1, stock: 1 } });
  assert.equal(r.status, 400);
});

test('browse by category and search show price, description, availability', async () => {
  await call('POST', '/products', { token: adminToken, body: { name: 'Mango', description: 'Sweet', categoryId, price: 150, stock: 0 } });
  const cat2 = (await call('POST', '/categories', { token: adminToken, body: { name: 'Dairy' } })).data.category;
  await call('POST', '/products', { token: adminToken, body: { name: 'Milk', description: 'Toned', categoryId: cat2.id, price: 56, stock: 3 } });

  let r = await call('GET', `/products?category=${categoryId}`);
  assert.deepEqual(r.data.products.map((p) => p.name).sort(), ['Apple', 'Mango']);
  r = await call('GET', '/products?q=milk');
  assert.equal(r.data.products.length, 1);
  assert.equal(r.data.products[0].availability, 'low_stock'); // stock 3 <= default limit 10
  r = await call('GET', '/products?q=mango');
  assert.equal(r.data.products[0].availability, 'out_of_stock');
});

test('cart: add, total, update quantity, stock limits, remove', async () => {
  let r = await call('POST', '/cart/items', { token: customerToken, body: { productId, quantity: 2 } });
  assert.equal(r.status, 201);
  assert.equal(r.data.total, 200);

  r = await call('POST', '/cart/items', { token: customerToken, body: { productId } }); // adds 1 more
  assert.equal(r.data.lines[0].quantity, 3);
  assert.equal(r.data.total, 300);

  r = await call('PATCH', `/cart/items/${productId}`, { token: customerToken, body: { quantity: 99 } });
  assert.equal(r.status, 409); // more than stock (5)

  r = await call('PATCH', `/cart/items/${productId}`, { token: customerToken, body: { quantity: 5 } });
  assert.equal(r.data.total, 500);

  const mango = (await call('GET', '/products?q=mango')).data.products[0];
  r = await call('POST', '/cart/items', { token: customerToken, body: { productId: mango.id } });
  assert.equal(r.status, 409); // out of stock

  r = await call('DELETE', `/cart/items/${productId}`, { token: customerToken });
  assert.equal(r.data.lines.length, 0);
  assert.equal(r.data.total, 0);
});

test('carts are separate per customer', async () => {
  await call('POST', '/cart/items', { token: customerToken, body: { productId, quantity: 1 } });
  const r = await call('GET', '/cart', { token: otherToken });
  assert.equal(r.data.lines.length, 0);
});

test('deleted product disappears from catalogue and cart', async () => {
  let r = await call('DELETE', `/products/${productId}`, { token: adminToken });
  assert.equal(r.status, 204);
  r = await call('GET', `/products/${productId}`);
  assert.equal(r.status, 404);
  r = await call('GET', '/cart', { token: customerToken });
  assert.equal(r.data.lines.length, 0);
});

test('admin cannot use customer cart', async () => {
  assert.equal((await call('GET', '/cart', { token: adminToken })).status, 403);
});
