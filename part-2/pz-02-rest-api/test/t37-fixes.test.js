import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApp, LIMITS } from '../src/app.js';
import { createStores, monotonicClock } from '../src/store.js';

// The teacher asks every record to show its own creation time, so two records never look the same.
test('monotonicClock never returns the same instant twice, even inside one millisecond', () => {
  const clock = monotonicClock(() => 1_700_000_000_000);
  const stamps = Array.from({ length: 50 }, () => clock());
  assert.equal(new Set(stamps).size, 50);
  assert.deepEqual([...stamps].sort(), stamps);
});

test('monotonicClock follows the real clock when it moves forward', () => {
  let real = 1_700_000_000_000;
  const clock = monotonicClock(() => real);
  const first = clock();
  real += 5000;
  assert.equal(clock(), new Date(real).toISOString());
  assert.notEqual(first, clock());
});

test('the seeded records and new records all have different creation times', async () => {
  const stores = createStores();
  const server = createApp({ stores }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    for (const body of [{ name: 'A', email: 'a@example.com' }, { name: 'B', email: 'b@example.com' }]) {
      await fetch(`${base}/users`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    }
    const all = [...stores.users.all(), ...stores.projects.all(), ...stores.diagrams.all()].map((item) => item.createdAt);
    assert.equal(new Set(all).size, all.length);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

// All limits live in limits.json, including the page sizes of lists.
test('the page size limits come from limits.json', async () => {
  const file = JSON.parse(readFileSync(new URL('../limits.json', import.meta.url), 'utf8'));
  assert.equal(file.defaultPageSize, 20);
  assert.equal(file.maxPageSize, 100);
  assert.equal(LIMITS.maxPageSize, 100);
  const server = createApp({ stores: createStores() }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const ok = await (await fetch(`${base}/users?limit=${file.maxPageSize}`)).json();
    assert.equal(ok.meta.limit, 100);
    const tooBig = await fetch(`${base}/users?limit=${file.maxPageSize + 1}`);
    assert.equal(tooBig.status, 400);
    assert.equal((await (await fetch(`${base}/users`)).json()).meta.limit, file.defaultPageSize);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
