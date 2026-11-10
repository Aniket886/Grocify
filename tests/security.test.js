// Security regression tests added by the 2026-11-10 audit (docs/SECURITY_AUDIT_REPORT.md).
// Each test names the finding it guards. Run with: npm test
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.TEST_PAYMENT_PROVIDER = 'gateway';
process.env.JWT_SECRET = 'test-secret-for-tests-only';
process.env.DATA_FILE = path.join(os.tmpdir(), `grocify-security-test-${process.pid}-${Date.now()}.json`);
process.env.CLIENT_URL = 'https://shop.example';
process.env.CORS_ORIGINS = 'https://partner.example';
process.env.PAYMENT_GATEWAY_URL = 'http://gateway.invalid';
process.env.PAYMENT_GATEWAY_KEY_ID = 'test_key_sample';
process.env.PAYMENT_GATEWAY_SECRET = 'test_secret_sample';
process.env.PAYMENT_WEBHOOK_SECRET = 'whsec_sample_webhook_secret_key_12345';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { default: createApp, corsOptionsFor } = await import('../server/app.js');
const { default: env } = await import('../server/config/env.js');
const store = await import('../server/data/localStore.js');
const { ensureAccounts, KNOWN_DEFAULT_PASSWORDS } = await import('../server/services/bootstrap.js');
const { gatewayMismatch } = await import('../server/controllers/paymentsController.js');
const { safeBaseUrl, renderIndexHtml, looksLikeFile, buildCsp } = await import('../server/utils/html.js');
const { default: bcrypt } = await import('bcryptjs');

// ---- a fake payment gateway: the server's own fetch() calls to it are answered from this table ----
const realFetch = globalThis.fetch;
const gatewayOrders = new Map(); // gateway order number -> record
const gatewayCalls = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (!u.startsWith(process.env.PAYMENT_GATEWAY_URL)) return realFetch(url, opts);
  const { pathname } = new URL(u);
  gatewayCalls.push(`${opts.method || 'GET'} ${pathname}`);
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  let m;
  if ((m = /^\/pay\/([^/]+)\/utr$/.exec(pathname))) {
    const rec = gatewayOrders.get(decodeURIComponent(m[1]));
    return rec ? json(200, { success: true, data: rec }) : json(404, { message: 'Not found' });
  }
  if ((m = /^\/api\/v1\/orders\/([^/]+)$/.exec(pathname))) {
    const key = decodeURIComponent(m[1]);
    const rec = gatewayOrders.get(key) || [...gatewayOrders.values()].find((r) => r.client_order_id === key);
    return rec ? json(200, { data: rec }) : json(404, { message: 'Not found' });
  }
  return json(404, { message: 'Not found' });
};

let server, base, adminToken, categoryId;
const addr = { line: '12 MG Road', city: 'Davangere', pincode: '577006' };
const raw = (method, url, { token, body, headers } = {}) =>
  realFetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
const call = async (method, url, opts) => {
  const res = await raw(method, url, opts);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
};
const register = async (name, password = 'password123') => (await call('POST', '/auth/register', { body: { name, email: `${name.toLowerCase()}@test.local`, password } })).data;
const newProduct = async (name, price, stock = 50) =>
  (await call('POST', '/products', { token: adminToken, body: { name, description: name, categoryId, price, stock, lowStockLimit: 1 } })).data.product;
const placeOrder = async (token, product, quantity = 1) => {
  await call('POST', '/cart/items', { token, body: { productId: product.id, quantity } });
  return (await call('POST', '/orders', { token, body: { address: addr } })).data.order;
};
const quietLogger = () => { const lines = []; const f = (level) => (msg, meta) => lines.push({ level, msg, meta }); return { lines, info: f('info'), warn: f('warn'), error: f('error') }; };

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
  globalThis.fetch = realFetch;
  fs.rmSync(process.env.DATA_FILE, { force: true });
});

// ------------------------------------------------------------------ F-01 login bypass
test('F-01: a wrong password never logs in and never rewrites the stored password', async () => {
  await register('Owner', 'correct-horse-9');
  const before = (await store.findUserByEmail('owner@test.local')).passwordHash;
  for (const guess of ['anything-at-all', 'aniket123', '123456', 'x'.repeat(40)]) {
    assert.equal((await call('POST', '/auth/login', { body: { email: 'owner@test.local', password: guess } })).status, 401, guess);
  }
  assert.equal((await store.findUserByEmail('owner@test.local')).passwordHash, before, 'hash unchanged');
  assert.equal((await call('POST', '/auth/login', { body: { email: 'owner@test.local', password: 'correct-horse-9' } })).status, 200);
});

test('F-01: logging in with an unknown email never creates an account', async () => {
  const users = (await store.listUsers()).length;
  const r = await call('POST', '/auth/login', { body: { email: 'nobody-here@test.local', password: 'some-long-password' } });
  assert.equal(r.status, 401);
  assert.equal(r.data.error, 'Incorrect email or password');
  assert.equal((await store.listUsers()).length, users);
  assert.equal(await store.findUserByEmail('nobody-here@test.local'), null);
});

test('F-01: the login code has no special case for any email address', () => {
  const src = fs.readFileSync(path.join(root, 'server/controllers/authController.js'), 'utf8');
  assert.equal(/@gmail\.com|@grocify\.test/.test(src), false, 'no hardcoded address');
  assert.equal(/createUser/.test(src.slice(src.indexOf('export async function login'), src.indexOf('export async function me'))), false, 'login never creates users');
});

// ------------------------------------------------------------------ F-02 default credentials
test('F-02: no account is created from built-in credentials', async () => {
  const fake = { users: [], async findUserByEmail(e) { return this.users.find((u) => u.email === e) || null; }, async listUsers() { return this.users; }, async listAdmins() { return this.users.filter((u) => u.role === 'admin'); }, async createUser(d) { const u = { id: String(this.users.length + 1), ...d }; this.users.push(u); return u; }, async updateUser(id, patch) { return Object.assign(this.users.find((u) => u.id === id), patch); } };
  const log = quietLogger();
  const r = await ensureAccounts({ store: fake, env: { seedAdminEmail: '', seedAdminPassword: '' }, logger: log });
  assert.equal(r.created, false);
  assert.equal(fake.users.length, 0, 'nothing created without SEED_ADMIN_*');
  assert.ok(log.lines.some((l) => l.level === 'warn' && /No admin account/.test(l.msg)));

  const weak = await ensureAccounts({ store: fake, env: { seedAdminEmail: 'boss@test.local', seedAdminPassword: KNOWN_DEFAULT_PASSWORDS[0] }, logger: quietLogger() });
  assert.equal(weak.created, false, 'a known default password is refused');
  assert.equal(fake.users.length, 0);

  const ok = await ensureAccounts({ store: fake, env: { seedAdminEmail: 'boss@test.local', seedAdminPassword: 'a-strong-admin-pass' }, logger: quietLogger() });
  assert.equal(ok.created, true);
  assert.equal(fake.users[0].role, 'admin');
  assert.ok(await bcrypt.compare('a-strong-admin-pass', fake.users[0].passwordHash));
});

test('F-02: an admin still on a default password is rotated when a real one is configured, otherwise reported', async () => {
  const mk = async () => ({ users: [
    { id: 'a1', email: 'admin@grocify.test', role: 'admin', passwordHash: await bcrypt.hash(KNOWN_DEFAULT_PASSWORDS[0], 4) },
    { id: 'c1', email: 'someone@test.local', role: 'customer', passwordHash: await bcrypt.hash(KNOWN_DEFAULT_PASSWORDS[1], 4) },
    { id: 'c2', email: 'fine@test.local', role: 'customer', passwordHash: await bcrypt.hash('a-perfectly-good-one', 4) },
  ], async findUserByEmail(e) { return this.users.find((u) => u.email === e) || null; }, async listUsers() { return this.users; }, async listAdmins() { return this.users.filter((u) => u.role === 'admin'); }, async createUser(d) { const u = { id: 'n', ...d }; this.users.push(u); return u; }, async updateUser(id, patch) { return Object.assign(this.users.find((u) => u.id === id), patch); } });

  const s1 = await mk();
  const log1 = quietLogger();
  const r1 = await ensureAccounts({ store: s1, env: { seedAdminEmail: '', seedAdminPassword: '' }, logger: log1 });
  assert.deepEqual(r1.atRisk.sort(), ['a1', 'c1']);
  assert.deepEqual(r1.rotated, []);
  assert.ok(log1.lines.filter((l) => l.level === 'error').length >= 2);
  assert.equal(JSON.stringify(log1.lines).includes('@'), false, 'no email addresses in these log lines');

  const s2 = await mk();
  const r2 = await ensureAccounts({ store: s2, env: { seedAdminEmail: 'admin@grocify.test', seedAdminPassword: 'new-strong-admin-pass' }, logger: quietLogger() });
  assert.deepEqual(r2.rotated, ['a1']);
  assert.deepEqual(r2.atRisk, ['c1'], 'a customer password cannot be chosen for them; it is reported');
  const admin = s2.users.find((u) => u.id === 'a1');
  assert.equal(await bcrypt.compare(KNOWN_DEFAULT_PASSWORDS[0], admin.passwordHash), false);
  assert.ok(await bcrypt.compare('new-strong-admin-pass', admin.passwordHash));
  assert.equal(admin.tokenVersion, 1, 'old sessions signed out');
});

test('F-02: startup and login code contain no hardcoded passwords or personal details', () => {
  for (const f of ['server/index.js', 'server/controllers/authController.js', 'server/config/env.js']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    for (const p of KNOWN_DEFAULT_PASSWORDS) assert.equal(src.includes(p), false, `${f} contains a default password`);
    assert.equal(/bcrypt\.hash\(\s*['"`]/.test(src), false, `${f} hashes a literal password`);
    assert.equal(/@gmail\.com|\+91 \d/.test(src), false, `${f} contains personal contact details`);
  }
});

test('F-02: known default passwords are refused for new accounts', async () => {
  // Only defaults of 8+ characters reach this check; shorter ones already fail the length rule.
  for (const p of KNOWN_DEFAULT_PASSWORDS) {
    const r = await call('POST', '/auth/register', { body: { name: 'Lazy', email: `lazy-${p.length}@test.local`, password: p } });
    assert.equal(r.status, 400, p.length);
  }
});

// ------------------------------------------------------------------ F-03 token secret
test('F-03: without JWT_SECRET the secret is random per process, never a built-in value', () => {
  const run = () => execFileSync(process.execPath, ['-e', "import('./server/config/env.js').then(m=>console.log(m.default.jwtSecret+' '+m.default.jwtSecretGenerated))"], {
    cwd: root, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: '', DATA_FILE: process.env.DATA_FILE },
  }).trim().split(' ');
  const [a, genA] = run();
  const [b] = run();
  assert.equal(genA, 'true');
  assert.match(a, /^[a-f0-9]{96}$/);
  assert.notEqual(a, b, 'two starts give two different secrets');
  const envSrc = fs.readFileSync(path.join(root, 'server/config/env.js'), 'utf8');
  assert.equal(/['"`][A-Za-z0-9_-]{24,}['"`]/.test(envSrc), false, 'no long string literal (a built-in secret) in env.js');
});

test('F-03: tokens signed with a different secret, another algorithm, or "none" are refused', async () => {
  const admin = await store.findUserByEmail('admin@test.local');
  const wrongSecret = jwt.sign({ sub: admin.id }, 'a-secret-the-server-does-not-use');
  assert.equal((await call('GET', '/admin/customers', { token: wrongSecret })).status, 401);
  const hs512 = jwt.sign({ sub: admin.id }, process.env.JWT_SECRET, { algorithm: 'HS512' });
  assert.equal((await call('GET', '/admin/customers', { token: hs512 })).status, 401, 'only HS256 is accepted');
  const none = jwt.sign({ sub: admin.id }, '', { algorithm: 'none' });
  assert.equal((await call('GET', '/admin/customers', { token: none })).status, 401);
  assert.equal((await call('GET', '/admin/customers', { token: adminToken })).status, 200);
});

// ------------------------------------------------------------------ F-04 payment binding
test('F-04: gatewayMismatch accepts only the same order and the same amount', () => {
  const order = { id: 'ORD-1', total: 200 };
  assert.equal(gatewayMismatch({ client_order_id: 'ORD-1', amount: '200.00' }, order), null);
  assert.equal(gatewayMismatch({ client_order_id: 'ORD-1', amount: 200 }, order), null);
  assert.match(gatewayMismatch({ client_order_id: 'ORD-2', amount: '200.00' }, order), /different order/);
  assert.match(gatewayMismatch({ client_order_id: 'ORD-1', amount: '1.00' }, order), /amount/);
  assert.match(gatewayMismatch({ client_order_id: 'ORD-1' }, order), /amount/);
  assert.match(gatewayMismatch({ client_order_id: 'ORD-1', amount: 'abc' }, order), /amount/);
  assert.match(gatewayMismatch(null, order), /no gateway record/);
  assert.equal(gatewayMismatch({ client_order_id: 'ORD-1', amount: '0.30' }, { id: 'ORD-1', total: 0.1 + 0.2 }), null, 'paise-exact comparison');
});

test('F-04: a cheap paid gateway order cannot be used to mark an expensive order as paid', async () => {
  const { token } = await register('Trickster');
  const cheap = await placeOrder(token, await newProduct('Sachet', 1));
  const dear = await placeOrder(token, await newProduct('Hamper', 1499));
  gatewayOrders.set('GW-CHEAP', { order_id: 'GW-CHEAP', client_order_id: cheap.id, amount: '1.00', status: 'paid', utr: '111122223333' });

  const attack = await call('POST', `/payments/verify-utr/${dear.id}`, { token, body: { utr: '111122223333', gatewayOrderId: 'GW-CHEAP' } });
  assert.equal(attack.status, 409);
  assert.equal((await store.getOrder(dear.id)).status, 'Payment Pending', 'the expensive order is still unpaid');
  assert.equal((await store.listPaymentsForOrder(dear.id)).length, 0);

  const honest = await call('POST', `/payments/verify-utr/${cheap.id}`, { token, body: { utr: '111122223333', gatewayOrderId: 'GW-CHEAP' } });
  assert.equal(honest.status, 200);
  assert.equal(honest.data.paid, true);
  assert.equal((await store.getOrder(cheap.id)).status, 'Order Placed');
  assert.equal(JSON.stringify(honest.data).includes('idempotencyKey'), false);
});

test('F-04: right order, wrong amount is refused on every path (UTR, status check, webhook)', async () => {
  const { token } = await register('Underpayer');
  const order = await placeOrder(token, await newProduct('Saffron', 350));
  gatewayOrders.set('GW-UNDER', { order_id: 'GW-UNDER', client_order_id: order.id, amount: '1.00', status: 'paid', utr: '444455556666' });

  assert.equal((await call('POST', `/payments/verify-utr/${order.id}`, { token, body: { utr: '444455556666', gatewayOrderId: 'GW-UNDER' } })).status, 409);
  const st = await call('GET', `/payments/status/${order.id}`, { token });
  assert.equal(st.data.paid, false);

  const payload = JSON.stringify({ event_id: `evt-under-${Date.now()}`, event: 'order.paid', data: { order_id: 'GW-UNDER', client_order_id: order.id, amount: '1.00', status: 'paid', utr: '444455556666' } });
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET).update(`${t}.${payload}`).digest('hex');
  const wh = await realFetch(`${base}/payments/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': `t=${t},v1=${sig}` }, body: payload });
  assert.equal(wh.status, 200);
  assert.equal((await wh.json()).ignored, 'mismatch');
  assert.equal((await store.getOrder(order.id)).status, 'Payment Pending', 'still unpaid after all three attempts');

  gatewayOrders.set('GW-UNDER', { order_id: 'GW-UNDER', client_order_id: order.id, amount: '350.00', status: 'paid', utr: '444455556666' });
  assert.equal((await call('GET', `/payments/status/${order.id}`, { token })).data.paid, true, 'the correct amount settles it');
});

test('F-04: malformed UTR or gateway reference is a 400, not a crash', async () => {
  const { token } = await register('Fuzzer2');
  const order = await placeOrder(token, await newProduct('Tea', 10));
  for (const body of [{ utr: 123456789012 }, { utr: ['123456789012'] }, { utr: '12345' }, {}, { utr: '123456789012', gatewayOrderId: '../admin' }, { utr: '123456789012', gatewayOrderId: { a: 1 } }]) {
    assert.equal((await call('POST', `/payments/verify-utr/${order.id}`, { token, body })).status, 400, JSON.stringify(body));
  }
  assert.equal(gatewayCalls.some((c) => c.includes('admin')), false, 'nothing unsafe reached the gateway');
});

test('F-04: a rejected webhook does not explain why', async () => {
  const r = await call('POST', '/payments/webhook', { body: { event: 'order.paid' }, headers: { 'X-Signature': `t=1,v1=${'a'.repeat(64)}` } });
  assert.equal(r.status, 401);
  assert.deepEqual(Object.keys(r.data), ['error']);
});

// ------------------------------------------------------------------ F-06 CORS
test('F-06: CORS allows only configured origins and never reflects a stranger', async () => {
  const stranger = await raw('GET', '/health', { headers: { Origin: 'https://attacker.example' } });
  assert.equal(stranger.headers.get('access-control-allow-origin'), null);
  assert.equal(stranger.headers.get('access-control-allow-credentials'), null);

  const pre = await realFetch(`${base}/auth/login`, { method: 'OPTIONS', headers: { Origin: 'https://attacker.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
  assert.equal(pre.headers.get('access-control-allow-origin'), null);

  for (const ok of ['https://shop.example', 'https://partner.example']) {
    const r = await raw('GET', '/health', { headers: { Origin: ok } });
    assert.equal(r.headers.get('access-control-allow-origin'), ok);
  }
  // look-alikes of an allowed origin are not allowed
  for (const bad of ['https://shop.example.attacker.example', 'https://attacker.example/?https://shop.example', 'http://shop.example', 'null']) {
    assert.equal((await raw('GET', '/health', { headers: { Origin: bad } })).headers.get('access-control-allow-origin'), null, bad);
  }
  const req = (origin, host) => ({ get: (h) => ({ origin, host }[h.toLowerCase()]) });
  assert.deepEqual(corsOptionsFor(req('https://gmu.example', 'gmu.example')), { origin: 'https://gmu.example', credentials: true }, 'same host is allowed');
  assert.deepEqual(corsOptionsFor(req(undefined, 'gmu.example')), { origin: false });
  assert.equal(env.corsOrigins.includes('*'), false);
});

// ------------------------------------------------------------------ F-07 host header / F-08 CSP / F-16 files
test('F-07: only a clean hostname from request headers reaches the page', () => {
  assert.equal(safeBaseUrl({ host: 'gmu2027.space', proto: 'https' }), 'https://gmu2027.space');
  assert.equal(safeBaseUrl({ host: 'localhost:5000', proto: 'http' }), 'http://localhost:5000');
  assert.equal(safeBaseUrl({ host: 'a.example, b.example', proto: 'https,http' }), 'https://a.example');
  for (const host of ['x"><script>alert(1)</script>', 'evil.example/path', 'evil.example" onload="x', "a'b.example", 'a b.example', '', 'evil.example\r\nX: y', '<svg>', 'evil.example?x', '-bad-.example']) {
    assert.equal(safeBaseUrl({ host, proto: 'https' }), null, JSON.stringify(host));
  }
  assert.equal(safeBaseUrl({ host: 'ok.example', proto: 'javascript' }), null);

  const html = '<meta property="og:image" content="https://gmu2027.space/og-image.jpg" />';
  assert.equal(renderIndexHtml(html, { host: 'shop.example', proto: 'https' }), '<meta property="og:image" content="https://shop.example/og-image.jpg" />');
  const attacked = renderIndexHtml(html, { host: 'x"><script>alert(1)</script>', proto: 'https' });
  assert.equal(attacked, html, 'a hostile header changes nothing');
  assert.equal(attacked.includes('<script>'), false);
});

test('F-08: the CSP allows only this site\'s scripts plus the exact inline script by hash', () => {
  const inline = "(function () { document.documentElement.setAttribute('data-theme', 'dark'); })();";
  const html = `<html><head><script>${inline}</script></head><body><script type="module" src="/assets/index.js"></script></body></html>`;
  const csp = buildCsp(html, { imgOrigins: ['http://127.0.0.1:8000', 'javascript:alert(1)'] });
  const hash = crypto.createHash('sha256').update(inline, 'utf8').digest('base64');
  const script = csp.split('; ').find((d) => d.startsWith('script-src'));
  assert.equal(script, `script-src 'self' 'sha256-${hash}'`);
  assert.equal(/unsafe-inline|unsafe-eval|\*/.test(script), false, 'no unsafe script sources');
  for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", "form-action 'self'", "connect-src 'self'"]) assert.ok(csp.includes(d), d);
  assert.ok(csp.includes('http://127.0.0.1:8000'));
  assert.equal(csp.includes('javascript:'), false);
  assert.notEqual(buildCsp(html.replace('dark', 'light')), csp, 'a changed inline script gets a different hash');
  // A file checked out with Windows line endings must hash the same as the browser sees it (LF).
  const multi = '<script>var a = 1;\nvar b = 2;\n</script>';
  assert.equal(buildCsp(multi.replace(/\n/g, '\r\n')), buildCsp(multi), 'CRLF and LF give the same hash');
});

test('F-16: file-like and hidden paths are not answered with the app shell', async () => {
  for (const p of ['/.env', '/.git/config', '/backup.zip', '/db.sql', '/assets/index-abc.js.map', '/server/data/dev-db.json', '/a/.hidden/x', '/.well-known/security.txt']) assert.equal(looksLikeFile(p), true, p);
  for (const p of ['/', '/products', '/orders/ORD-20261107-AB12-0001/track', '/c/dry-fruits', '/admin/reports', '/products/7a17fb38-1ec5-4803-bd19-9297695d7ac4']) assert.equal(looksLikeFile(p), false, p);
  if (fs.existsSync(path.join(root, 'dist', 'index.html'))) {
    const site = base.replace(/\/api$/, '');
    const env404 = await realFetch(`${site}/.env`);
    assert.equal(env404.status, 404);
    for (const p of ['/', '/index.html', '/products']) {
      const page = await realFetch(`${site}${p}`, { headers: { 'X-Forwarded-Host': 'x"><script>alert(1)</script>' } });
      assert.equal(page.status, 200, p);
      assert.ok(page.headers.get('content-security-policy').includes("script-src 'self' 'sha256-"), `CSP on ${p}`);
      assert.equal((await page.text()).includes('alert(1)'), false, p);
    }
    const moved = await realFetch(`${site}/`, { headers: { 'X-Forwarded-Host': 'shop.example', 'X-Forwarded-Proto': 'https' } });
    assert.ok((await moved.text()).includes('content="https://shop.example/og-image.jpg"'));
  }
});

// ------------------------------------------------------------------ F-09 rate limiting / proxy
test('F-09: payment, password and account routes are rate limited; proxy trust is explicit', async () => {
  const { token } = await register('Limited');
  const order = await placeOrder(token, await newProduct('Rice', 50));
  const checks = [
    await raw('POST', `/payments/verify-utr/${order.id}`, { token, body: { utr: '1' } }),
    await raw('POST', `/orders/${order.id}/pay`, { token, body: { method: 'nope' } }),
    await raw('PUT', '/auth/password', { token, body: {} }),
    await raw('POST', '/auth/login', { body: { email: 'limited@test.local', password: 'wrong-password' } }),
  ];
  for (const r of checks) assert.ok(r.headers.get('ratelimit-limit') || r.headers.get('ratelimit'), `rate-limit headers on ${r.url}`);
  assert.equal(createApp().get('trust proxy'), env.trustProxy);
  const prod = execFileSync(process.execPath, ['-e', "import('./server/config/env.js').then(m=>console.log(JSON.stringify(m.default.trustProxy)))"], { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production', TRUST_PROXY: '' } }).trim();
  assert.equal(prod, '1', 'one proxy hop is trusted in production by default');
});

// ------------------------------------------------------------------ F-10 sessions
test('F-10: changing the password needs the current one and signs out older sessions', async () => {
  const { token: oldToken } = await register('Changer', 'first-password-1');
  const second = (await call('POST', '/auth/login', { body: { email: 'changer@test.local', password: 'first-password-1' } })).data.token;

  assert.equal((await call('PUT', '/auth/password', { token: oldToken, body: { currentPassword: 'wrong', newPassword: 'second-password-2' } })).status, 401);
  assert.equal((await call('PUT', '/auth/password', { token: oldToken, body: { currentPassword: 'first-password-1', newPassword: 'short' } })).status, 400);
  assert.equal((await call('PUT', '/auth/password', { token: oldToken, body: { currentPassword: 'first-password-1', newPassword: 'first-password-1' } })).status, 400);
  assert.equal((await call('PUT', '/auth/password', { body: { currentPassword: 'first-password-1', newPassword: 'second-password-2' } })).status, 401, 'must be logged in');

  const changed = await call('PUT', '/auth/password', { token: oldToken, body: { currentPassword: 'first-password-1', newPassword: 'second-password-2' } });
  assert.equal(changed.status, 200);
  assert.equal(JSON.stringify(changed.data).includes('passwordHash'), false);

  assert.equal((await call('GET', '/auth/me', { token: oldToken })).status, 401, 'the old token is revoked');
  assert.equal((await call('GET', '/auth/me', { token: second })).status, 401, 'other sessions are revoked too');
  assert.equal((await call('GET', '/auth/me', { token: changed.data.token })).status, 200, 'the new token works');
  assert.equal((await call('POST', '/auth/login', { body: { email: 'changer@test.local', password: 'first-password-1' } })).status, 401);
  assert.equal((await call('POST', '/auth/login', { body: { email: 'changer@test.local', password: 'second-password-2' } })).status, 200);
});

// ------------------------------------------------------------------ F-12 delivery self-advance
test('F-12: with demo controls off, a customer cannot advance their own delivery', async () => {
  const { token } = await register('Mover');
  const order = await placeOrder(token, await newProduct('Dal', 150));
  gatewayOrders.set('GW-MOVE', { order_id: 'GW-MOVE', client_order_id: order.id, amount: '150.00', status: 'paid', utr: '777788889999' });
  assert.equal((await call('GET', `/payments/status/${order.id}`, { token })).data.paid, true);

  env.demoDeliveryControls = false;
  try {
    const r = await call('POST', `/orders/${order.id}/progress`, { token, body: { step: 'Delivered' } });
    assert.equal(r.status, 403);
    assert.equal((await store.getDelivery(order.id)).status, 'Order Placed');
  } finally {
    env.demoDeliveryControls = true;
  }
  assert.equal((await call('POST', `/orders/${order.id}/progress`, { token, body: { step: 'Packed' } })).status, 200, 'demo mode still works when enabled');
});

// ------------------------------------------------------------------ F-14 / F-15 / validation
test('F-14: database TLS verification can be switched on and is passed to the driver', () => {
  const src = fs.readFileSync(path.join(root, 'server/data/localStore.js'), 'utf8');
  assert.ok(src.includes('rejectUnauthorized: env.databaseSslVerify'));
  assert.equal(/rejectUnauthorized:\s*false/.test(src), false);
  assert.equal(env.databaseSslVerify, false, 'off unless DATABASE_SSL_VERIFY=true (owner action)');
});

test('F-15: failed logins are logged without the full email address', () => {
  const src = fs.readFileSync(path.join(root, 'server/controllers/authController.js'), 'utf8');
  assert.ok(/Login failed', \{ email: maskEmail\(mail\) \}/.test(src));
  assert.equal(/Account deleted permanently'[^)]*email/.test(src), false);
});

test('validation: numeric limits are enforced (discount cannot exceed 100)', async () => {
  const r = await call('POST', '/products', { token: adminToken, body: { name: 'Bad', categoryId, price: 10, stock: 1, discountPercentage: 500 } });
  assert.equal(r.status, 400);
});
