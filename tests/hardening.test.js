// Phase 6 tests: bad input, security basics, stress, and logging safety. Run with: npm test
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-tests-only';
process.env.DATA_FILE = path.join(os.tmpdir(), `grocify-hardening-test-${process.pid}-${Date.now()}.json`);

const { default: createApp } = await import('../server/app.js');
const store = await import('../server/data/localStore.js');
const { default: bcrypt } = await import('bcryptjs');

let server, base, adminToken, categoryId;
const addr = { line: '12 MG Road', city: 'Davangere', pincode: '577006' };

const raw = (method, url, { token, body, headers } = {}) =>
  fetch(base + url, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body });
const call = async (method, url, { token, body, headers } = {}) => {
  const res = await raw(method, url, { token, body: body ? JSON.stringify(body) : undefined, headers: { 'Content-Type': 'application/json', ...headers } });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null, headers: res.headers };
};

const newCustomer = async (name) => (await call('POST', '/auth/register', { body: { name, email: `${name.toLowerCase()}@test.local`, password: 'password123' } })).data.token;
const newProduct = async (name, stock, price = 100) =>
  (await call('POST', '/products', { token: adminToken, body: { name, description: name, categoryId, price, stock, lowStockLimit: 1 } })).data.product;

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

test('malformed and oversized request bodies are rejected cleanly', async () => {
  let r = await raw('POST', '/auth/login', { body: '{"email": ', headers: { 'Content-Type': 'application/json' } });
  assert.equal(r.status, 400);
  const body = await r.json();
  assert.ok(body.error);
  assert.equal(JSON.stringify(body).includes('node_modules'), false, 'no stack traces');

  r = await raw('POST', '/auth/register', { body: JSON.stringify({ name: 'x'.repeat(200000) }), headers: { 'Content-Type': 'application/json' } });
  assert.equal(r.status, 413);
});

test('unknown routes return JSON 404 and security headers are set', async () => {
  const r = await call('GET', '/does-not-exist');
  assert.equal(r.status, 404);
  assert.equal(r.headers.get('x-powered-by'), null);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

test('every response carries a request ID', async () => {
  const r = await call('GET', '/health');
  assert.ok(r.headers.get('x-request-id'));
  const echo = await call('GET', '/health', { headers: { 'X-Request-Id': 'abc-123' } });
  assert.equal(echo.headers.get('x-request-id'), 'abc-123');
});

test('health check reports the version from package.json', async () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const r = await call('GET', '/health');
  assert.equal(r.data.ok, true);
  assert.equal(r.data.version, pkg.version);
  assert.match(r.data.version, /^\d+\.\d+\.\d+$/);
});

test('secrets never appear in responses', async () => {
  const t = await newCustomer('Leaky');
  const p = await newProduct('Apple', 5);
  await call('POST', '/cart/items', { token: t, body: { productId: p.id } });
  const order = (await call('POST', '/orders', { token: t, body: { address: addr }, headers: { 'Idempotency-Key': 'secret-key-1' } })).data.order;
  await call('POST', `/orders/${order.id}/pay`, { token: t, body: { method: 'UPI' } });

  const responses = [
    await call('POST', '/auth/login', { body: { email: 'leaky@test.local', password: 'password123' } }),
    await call('GET', '/auth/me', { token: t }),
    await call('GET', '/orders', { token: t }),
    await call('GET', `/orders/${order.id}`, { token: t }),
    await call('GET', '/admin/customers', { token: adminToken }),
    await call('GET', '/admin/orders', { token: adminToken }),
    await call('GET', '/admin/payments', { token: adminToken }),
  ];
  for (const r of responses) {
    const s = JSON.stringify(r.data);
    assert.equal(s.includes('passwordHash'), false);
    assert.equal(s.includes('$2'), false, 'no bcrypt hash');
    assert.equal(s.includes('secret-key-1'), false, 'no idempotency key');
  }
});

test('bad input is rejected with 400, not 500', async () => {
  const t = await newCustomer('Fuzzer');
  const p = await newProduct('Pear', 5);
  const cases = [
    ['POST', '/auth/login', { email: { $ne: null }, password: 'x' }],
    ['POST', '/auth/login', { email: 'a@b.co', password: { $ne: null } }],
    ['POST', '/auth/register', { name: 'n'.repeat(500), email: 'long@test.local', password: 'password123' }],
    ['POST', '/auth/register', { name: 'Okay', email: 'not-an-email', password: 'password123' }],
    ['POST', '/auth/register', null],
  ];
  for (const [m, u, b] of cases) {
    const r = await call(m, u, { body: b });
    assert.ok(r.status >= 400 && r.status < 500, `${u} ${JSON.stringify(b)} gave ${r.status}`);
  }
  const bad = [
    { name: 'X', categoryId, price: 'abc', stock: 1 },
    { name: 'X', categoryId, price: 1, stock: 1.5 },
    { name: 'X', categoryId, price: 1, stock: -1 },
    { name: 'X', categoryId: 'nope', price: 1, stock: 1 },
    { name: '', categoryId, price: 1, stock: 1 },
  ];
  for (const b of bad) assert.equal((await call('POST', '/products', { token: adminToken, body: b })).status, 400, JSON.stringify(b));

  for (const q of [0, -3, 1.5, 'two', null]) {
    const r = await call('POST', '/cart/items', { token: t, body: { productId: p.id, quantity: q } });
    if (q === null) continue; // null falls back to the default of 1
    assert.equal(r.status, 400, `quantity ${q}`);
  }
  assert.equal((await call('POST', '/cart/items', { token: t, body: { productId: p.id, quantity: 1e9 } })).status, 409);
  assert.equal((await call('POST', '/cart/items', { token: t, body: { productId: 'missing' } })).status, 404);
  await call('POST', '/cart/items', { token: t, body: { productId: p.id } });
  assert.equal((await call('POST', '/orders', { token: t, body: { address: { line: 'x'.repeat(500), city: 'c', pincode: '1' } } })).status, 400);
  assert.equal((await call('POST', '/orders', { token: t, body: { address: addr }, headers: { 'Idempotency-Key': 'k'.repeat(200) } })).status, 400);
});

test('nobody can escalate to admin or change their email through the profile', async () => {
  const t = await newCustomer('Sneaky');
  await call('PUT', '/auth/profile', { token: t, body: { name: 'Sneaky', role: 'admin', email: 'admin@test.local' } });
  const me = (await call('GET', '/auth/me', { token: t })).data.user;
  assert.equal(me.role, 'customer');
  assert.equal(me.email, 'sneaky@test.local');
  assert.equal((await call('GET', '/admin/customers', { token: t })).status, 403);
});

test('forged, wrong-secret and orphaned tokens are refused', async () => {
  const user = await store.findUserByEmail('admin@test.local');
  const forged = jwt.sign({ sub: user.id }, 'some-other-secret');
  assert.equal((await call('GET', '/admin/customers', { token: forged })).status, 401);
  const alg = jwt.sign({ sub: user.id }, '', { algorithm: 'none' });
  assert.equal((await call('GET', '/admin/customers', { token: alg })).status, 401);
  const orphan = jwt.sign({ sub: 'no-such-user' }, process.env.JWT_SECRET);
  assert.equal((await call('GET', '/auth/me', { token: orphan })).status, 401);
  const expired = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: -10 });
  assert.equal((await call('GET', '/auth/me', { token: expired })).status, 401);
});

test('money math stays exact (3 x 0.10 is 0.30)', async () => {
  const t = await newCustomer('Penny');
  const p = await newProduct('Sweet', 10, 0.1);
  const cart = (await call('POST', '/cart/items', { token: t, body: { productId: p.id, quantity: 3 } })).data;
  assert.equal(cart.total, 0.3);
  const order = (await call('POST', '/orders', { token: t, body: { address: addr } })).data.order;
  assert.equal(order.total, 0.3);
});

test('stress: 20 customers race for 5 units, exactly 5 orders succeed', async () => {
  const p = await newProduct('Limited', 5);
  const tokens = await Promise.all(Array.from({ length: 20 }, (_, i) => newCustomer(`Racer${i}`)));
  await Promise.all(tokens.map((t) => call('POST', '/cart/items', { token: t, body: { productId: p.id } })));
  const results = await Promise.all(tokens.map((t) => call('POST', '/orders', { token: t, body: { address: addr } })));

  const won = results.filter((r) => r.status === 201);
  assert.equal(won.length, 5);
  assert.equal(results.filter((r) => r.status === 409).length, 15);
  assert.equal(new Set(won.map((r) => r.data.order.id)).size, 5, 'all order IDs distinct');
  assert.equal((await call('GET', `/products/${p.id}`)).data.product.stock, 0, 'stock exactly 0, never negative');
});

test('stress: one customer double-submits 10 times with one key, one order', async () => {
  const t = await newCustomer('Clicker');
  const p = await newProduct('Click', 50);
  await call('POST', '/cart/items', { token: t, body: { productId: p.id, quantity: 2 } });
  const results = await Promise.all(Array.from({ length: 10 }, () => call('POST', '/orders', { token: t, body: { address: addr }, headers: { 'Idempotency-Key': 'one-key' } })));
  assert.equal(new Set(results.map((r) => r.data.order.id)).size, 1);
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal((await call('GET', `/products/${p.id}`)).data.product.stock, 48, 'stock reduced once');
});

test('admin lowering stock after items are in a cart is respected at checkout', async () => {
  const t = await newCustomer('Squeezed');
  const p = await newProduct('Shrinking', 10);
  await call('POST', '/cart/items', { token: t, body: { productId: p.id, quantity: 8 } });
  await call('PUT', `/products/${p.id}`, { token: adminToken, body: { name: 'Shrinking', description: 'x', categoryId, price: 100, stock: 3, lowStockLimit: 1 } });
  const r = await call('POST', '/orders', { token: t, body: { address: addr } });
  assert.equal(r.status, 409);
  assert.match(r.data.error, /Only 3/);
  assert.equal((await call('GET', `/products/${p.id}`)).data.product.stock, 3, 'nothing was reserved');
});

test('cancelling twice is refused and stock is only restored once', async () => {
  const t = await newCustomer('Twice2');
  const p = await newProduct('Once', 10);
  await call('POST', '/cart/items', { token: t, body: { productId: p.id, quantity: 4 } });
  const order = (await call('POST', '/orders', { token: t, body: { address: addr } })).data.order;
  const both = await Promise.all([call('POST', `/orders/${order.id}/cancel`, { token: t }), call('POST', `/orders/${order.id}/cancel`, { token: t })]);
  assert.deepEqual(both.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await call('GET', `/products/${p.id}`)).data.product.stock, 10);
});

test('logging code never writes passwords, tokens or card data', () => {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../server');
  const files = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p);
    }
  })(dir);
  let logCalls = 0;
  for (const f of files) {
    const calls = fs.readFileSync(f, 'utf8').match(/(?:logger|req\.log)\.\w+\([\s\S]*?\);/g) || [];
    logCalls += calls.length;
    for (const c of calls) {
      // Check what is logged (the data), not the human-readable message text.
      const data = c.replace(/^[^(]*\(\s*(['"`])(?:\\.|(?!\1).)*\1/, '').replace(/transactionId/g, '');
      assert.equal(/password|token(?!en)|secret|cvv|card ?number|req\.body\b/i.test(data), false, `${path.basename(f)}: ${c}`);
    }
  }
  assert.ok(logCalls >= 20, `the scan only found ${logCalls} log calls, so it is not looking in the right place`);
});
