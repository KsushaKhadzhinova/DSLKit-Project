import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createApp } from '../src/app.js';
import { createJournal, journaling } from '../src/journal.js';
import { createStores } from '../src/store.js';

const start = async (options) => {
  const errors = [];
  const stores = createStores();
  const server = createApp({ stores, writeError: (...a) => errors.push(a), ...options }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const stop = async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  };
  return { base, errors, stores, stop };
};

const json = { 'content-type': 'application/json' };
const broken = () => {
  throw new Error('disk is full');
};

test('every request is written to the journal table with its method, path and final status', async () => {
  const journal = createJournal();
  const { base, stop } = await start({ journal });
  try {
    await fetch(`${base}/api/users`);
    await fetch(`${base}/api/users/999`);
    await fetch(`${base}/api/users`, { method: 'POST', headers: json, body: JSON.stringify({ name: 'Grace', email: 'grace@example.com' }) });
    const rows = journal.recent(10).reverse();
    assert.deepEqual(
      rows.map((r) => [r.method, r.path, r.status]),
      [
        ['GET', '/api/users', 200],
        ['GET', '/api/users/999', 404],
        ['POST', '/api/users', 201],
      ],
    );
    assert.match(rows[0].created_at, /^\d{4}-\d\d-\d\dT/);
    assert.ok(rows[0].ip.length > 0);
    assert.equal(journal.recent().length, 3);
  } finally {
    await stop();
    journal.close();
  }
});

test('the health probe is not journaled and keeps working', async () => {
  const journal = createJournal();
  const { base, stop } = await start({ journal });
  try {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal(journal.recent().length, 0);
  } finally {
    await stop();
    journal.close();
  }
});

// The teacher's rule: if the journal cannot be written the system must not go on silently. The answer is a 5xx in
// the one error format and the journaled action is NOT carried out.
test('a failed journal write answers 500 and the action is not carried out', async () => {
  const journal = { ...createJournal(), begin: broken };
  const { base, errors, stores, stop } = await start({ journal });
  try {
    const before = stores.users.all().length;
    const res = await fetch(`${base}/api/users`, { method: 'POST', headers: json, body: JSON.stringify({ name: 'Grace', email: 'grace@example.com' }) });
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), { error: { code: 'journal_unavailable', message: 'The request journal is unavailable, the request was not carried out' } });
    assert.ok(!text.includes('disk is full'));
    assert.ok(!text.includes(' at '));
    assert.equal(stores.users.all().length, before);
    assert.equal(errors.length, 1);
    assert.match(errors[0][0], /^\[journal\] cannot write "POST" "\/api\/users"$/);
    assert.equal(errors[0][1].message, 'disk is full');
    // reads, unknown routes and bad requests are refused too: nothing runs without a journal entry
    for (const path of ['/api/users', '/api/nothing', '/api/users/abc']) assert.equal((await fetch(base + path)).status, 500, path);
    assert.equal((await fetch(`${base}/health`)).status, 200);
  } finally {
    await stop();
  }
});

test('a really closed database table also refuses the request with 500', async () => {
  const journal = createJournal();
  const { base, stores, stop } = await start({ journal });
  try {
    journal.close();
    const before = stores.projects.all().length;
    const res = await fetch(`${base}/api/projects`, { method: 'POST', headers: json, body: JSON.stringify({ name: 'X', ownerId: 1 }) });
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error.code, 'journal_unavailable');
    assert.equal(stores.projects.all().length, before);
  } finally {
    await stop();
  }
});

test('a failure to record the final status is reported but the answer is not changed', async () => {
  const journal = { ...createJournal(), finish: broken };
  const { base, errors, stop } = await start({ journal });
  try {
    assert.equal((await fetch(`${base}/api/users`)).status, 200);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(errors.length, 1);
    assert.equal(errors[0][0], '[journal] cannot record the status');
  } finally {
    await stop();
  }
});

test('a very long path is cut before it is stored', () => {
  const journal = createJournal();
  const res = new EventEmitter();
  journaling(journal)({ method: 'GET', originalUrl: `/${'a'.repeat(1000)}`, ip: '1.2.3.4' }, res, () => {});
  assert.equal(journal.recent(1)[0].path.length, 300);
  journal.close();
});

test('a request without an address is journaled as unknown', () => {
  const journal = createJournal();
  const res = Object.assign(new EventEmitter(), { statusCode: 204 });
  journaling(journal)({ method: 'GET', originalUrl: '/x' }, res, () => {});
  res.emit('finish');
  assert.deepEqual(
    (({ ip, status }) => ({ ip, status }))(journal.recent(1)[0]),
    { ip: 'unknown', status: 204 },
  );
  journal.close();
});

test('the journal file survives a restart', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'pz2-journal-'));
  try {
    const first = createJournal(join(dir, 'j.sqlite'));
    first.finish(first.begin({ method: 'GET', path: '/a', ip: 'x' }), 200);
    first.close();
    const second = createJournal(join(dir, 'j.sqlite'));
    assert.equal(second.recent().length, 1);
    second.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a journal that cannot be opened fails loudly', () => {
  assert.throws(() => createJournal('Z:/no/such/folder/j.sqlite'));
});
