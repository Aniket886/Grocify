import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

process.env.NODE_ENV = 'test';
process.env.TEST_PAYMENT_PROVIDER = 'gateway';
process.env.JWT_SECRET = 'test-secret-for-tests-only';
process.env.DATA_FILE = path.join(os.tmpdir(), `grocify-gateway-test-${Date.now()}.json`);
process.env.PAYMENT_PROVIDER = 'gateway';
process.env.PAYMENT_GATEWAY_URL = 'http://127.0.0.1:8000';
process.env.PAYMENT_GATEWAY_KEY_ID = 'test_key_sample';
process.env.PAYMENT_GATEWAY_SECRET = 'test_secret_sample';
process.env.PAYMENT_WEBHOOK_SECRET = 'whsec_sample_webhook_secret_key_12345';

const { default: createApp } = await import('../server/app.js');
const store = await import('../server/data/localStore.js');
const { default: gatewayProvider } = await import('../server/payments/gatewayProvider.js');
const { default: bcrypt } = await import('bcryptjs');

let server, base;
const call = async (method, url, { token, body, headers = {} } = {}) => {
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
  const res = await fetch(base + url, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};

let customerToken, adminToken, categoryId, productId, testOrder;

before(async () => {
  store._reset();
  await store.createUser({
    name: 'Admin',
    email: 'admin@test.local',
    role: 'admin',
    passwordHash: await bcrypt.hash('adminpass123', 4),
  });

  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;

  const adminLogin = await call('POST', '/auth/login', { body: { email: 'admin@test.local', password: 'adminpass123' } });
  adminToken = adminLogin.data.token;

  const regRes = await call('POST', '/auth/register', { body: { name: 'Customer One', email: 'cust1@test.local', password: 'pass123456' } });
  customerToken = regRes.data.token;

  const catRes = await call('POST', '/categories', { token: adminToken, body: { name: 'Fruits' } });
  categoryId = catRes.data.category.id;

  const prodRes = await call('POST', '/products', {
    token: adminToken,
    body: { name: 'Mango', description: 'Fresh Mango', categoryId, price: 100, stock: 50 },
  });
  productId = prodRes.data.product.id;

  await call('POST', '/cart/items', { token: customerToken, body: { productId, quantity: 2 } });
  const orderRes = await call('POST', '/orders', {
    token: customerToken,
    body: { address: { line: '123 MG Road', city: 'Davangere', pincode: '577004' } },
  });
  testOrder = orderRes.data.order;
});

after(() => {
  if (server) server.close();
  fs.rmSync(process.env.DATA_FILE, { force: true });
});

test('gateway signature verification: valid, expired, and tampered', () => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const body = JSON.stringify({ event: 'order.paid', event_id: 'evt-1' });
  const nowSec = Math.floor(Date.now() / 1000);

  // 1. Valid signature
  const validSig = crypto.createHmac('sha256', secret).update(`${nowSec}.${body}`).digest('hex');
  const validRes = gatewayProvider.verifyWebhookSignature({
    signatureHeader: `t=${nowSec},v1=${validSig}`,
    rawBody: body,
    secret,
  });
  assert.equal(validRes.valid, true);

  // 2. Expired timestamp (> 300 seconds)
  const expiredTimestamp = nowSec - 400;
  const expiredSig = crypto.createHmac('sha256', secret).update(`${expiredTimestamp}.${body}`).digest('hex');
  const expiredRes = gatewayProvider.verifyWebhookSignature({
    signatureHeader: `t=${expiredTimestamp},v1=${expiredSig}`,
    rawBody: body,
    secret,
  });
  assert.equal(expiredRes.valid, false);
  assert.match(expiredRes.reason, /tolerance window/);

  // 3. Tampered payload
  const tamperedRes = gatewayProvider.verifyWebhookSignature({
    signatureHeader: `t=${nowSec},v1=${validSig}`,
    rawBody: JSON.stringify({ event: 'order.paid', event_id: 'evt-tampered' }),
    secret,
  });
  assert.equal(tamperedRes.valid, false);
  assert.match(tamperedRes.reason, /Signature mismatch/);

  // 4. Wrong secret
  const wrongSecretRes = gatewayProvider.verifyWebhookSignature({
    signatureHeader: `t=${nowSec},v1=${validSig}`,
    rawBody: body,
    secret: 'wrong_secret',
  });
  assert.equal(wrongSecretRes.valid, false);
});

test('webhook: reject invalid signature', async () => {
  const body = JSON.stringify({ event: 'order.paid' });
  const res = await call('POST', '/payments/webhook', {
    body,
    headers: { 'X-Signature': 't=12345,v1=badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb' },
  });
  assert.equal(res.status, 401);
});

test('webhook: process valid order.paid event and mark order as Order Placed', async () => {
  assert.equal(testOrder.status, 'Payment Pending');

  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const eventId = `evt-${Date.now()}`;
  const nowSec = Math.floor(Date.now() / 1000);
  const webhookPayload = JSON.stringify({
    event_id: eventId,
    event_sequence: 1,
    occurred_at: new Date().toISOString(),
    event: 'order.paid',
    data: {
      order_id: 'GATEWAY_ORD_9999',
      client_order_id: testOrder.id,
      amount: '200.00',
      status: 'paid',
      utr: 'UTR123456789012',
    },
  });

  const sig = crypto.createHmac('sha256', secret).update(`${nowSec}.${webhookPayload}`).digest('hex');

  const res = await call('POST', '/payments/webhook', {
    body: webhookPayload,
    headers: {
      'X-Signature': `t=${nowSec},v1=${sig}`,
      'X-Event': 'order.paid',
      'X-Event-Id': eventId,
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.received, true);

  // Check order is updated in store
  const updatedOrder = await store.getOrder(testOrder.id);
  assert.equal(updatedOrder.status, 'Order Placed');
  assert.equal(updatedOrder.paymentStatus, 'paid');

  // Verify delivery record was created
  const delivery = await store.getDelivery(testOrder.id);
  assert.ok(delivery);
  assert.equal(delivery.status, 'Order Placed');
});

test('webhook: duplicate event delivery is idempotent', async () => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const eventId = 'duplicate-event-id-test';
  const nowSec = Math.floor(Date.now() / 1000);
  const webhookPayload = JSON.stringify({
    event_id: eventId,
    event: 'order.paid',
    data: { client_order_id: testOrder.id, utr: 'UTR999' },
  });
  const sig = crypto.createHmac('sha256', secret).update(`${nowSec}.${webhookPayload}`).digest('hex');

  // First call
  const res1 = await call('POST', '/payments/webhook', {
    body: webhookPayload,
    headers: { 'X-Signature': `t=${nowSec},v1=${sig}`, 'X-Event-Id': eventId },
  });
  assert.equal(res1.status, 200);

  // Second call with same event_id
  const res2 = await call('POST', '/payments/webhook', {
    body: webhookPayload,
    headers: { 'X-Signature': `t=${nowSec},v1=${sig}`, 'X-Event-Id': eventId },
  });
  assert.equal(res2.status, 200);
  assert.equal(res2.data.deduplicated, true);
});

test('payments/config reports provider as gateway', async () => {
  const res = await call('GET', '/payments/config');
  assert.equal(res.status, 200);
  assert.equal(res.data.provider, 'gateway');
  assert.equal(res.data.gatewayUrl, 'http://127.0.0.1:8000');
});
