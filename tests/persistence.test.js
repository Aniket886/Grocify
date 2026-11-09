import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

process.env.NODE_ENV = 'test';
process.env.DATA_FILE = path.join(os.tmpdir(), `grocify-persist-test-${process.pid}-${Date.now()}.json`);

const store = await import('../server/data/localStore.js');

// Minimal in-memory stand-in for a pg Pool holding the single app_state row.
function fakePool() {
  const state = { row: null, writes: 0 };
  return {
    state,
    async query(sql, params) {
      if (/^CREATE TABLE/i.test(sql)) return { rows: [] };
      if (/^SELECT/i.test(sql)) return { rows: state.row ? [{ data: JSON.parse(state.row) }] : [] };
      if (/^INSERT/i.test(sql)) { state.row = params[0]; state.writes++; return { rows: [] }; }
      throw new Error(`unexpected query: ${sql}`);
    },
  };
}

test('user profile, address and orders survive a restart when Postgres storage is used', async () => {
  const pool = fakePool();
  await store.initStore(pool);

  const user = await store.createUser({
    name: 'Test User', email: 'persist@test.dev', phone: '+91 90000 00000', role: 'customer',
    address: { line: '1 Test Street', city: 'Testville', pincode: '560001' }, passwordHash: 'x',
  });
  await store.flushStore();
  assert.ok(pool.state.writes >= 1);

  // "Redeploy": a brand-new process would read the same row back.
  const saved = JSON.parse(pool.state.row);
  const restored = saved.users.find((u) => u.id === user.id);
  assert.equal(restored.phone, '+91 90000 00000');
  assert.deepEqual(restored.address, { line: '1 Test Street', city: 'Testville', pincode: '560001' });
  assert.ok(Array.isArray(saved.orders) && Array.isArray(saved.payments));
});

test('file storage is not touched when Postgres storage is active', async () => {
  assert.equal(fs.existsSync(process.env.DATA_FILE), false);
});
