import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createDiagramStore } from '../src/data/diagrams.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { createApp } from '../src/app.js';
import { loadLimits } from '../src/limits.js';

const input = { title: 'T', notation: 'UML', description: 'D', code: '', revision: 1 };
const tmp = () => mkdtempSync(join(tmpdir(), 'pz1-store-'));

test('diagrams are rows of a database table: seeded once, kept across connections', () => {
  const dir = tmp();
  const file = join(dir, 'db.sqlite');
  const first = createDiagramStore(Date.now, file);
  assert.equal(first.all().length, 3);
  first.add(input);
  first.close();
  first.close(); // a second close is harmless
  const second = createDiagramStore(Date.now, file);
  assert.equal(second.all().length, 4); // the sample records are not seeded again
  second.close();
  rmSync(dir, { recursive: true, force: true });
});

test('the creation time is strictly increasing, even when the clock stands still or goes back', () => {
  const store = createDiagramStore(() => 1000);
  const a = store.add(input);
  const b = store.add(input);
  assert.ok(Date.parse(b.createdAt) > Date.parse(a.createdAt));
  store.close();
});

test('update, remove and find report a missing record without throwing', () => {
  const store = createDiagramStore();
  assert.equal(store.find(999), undefined);
  assert.equal(store.update(999, input), undefined);
  assert.equal(store.remove(999), false);
  assert.equal(store.update(1, { ...input, title: 'New' }).title, 'New');
  assert.equal(store.remove(1), true);
  store.close();
});

test('the table keeps at most 5000 records, the oldest go first', () => {
  const store = createDiagramStore();
  for (let i = 0; i < 5005; i += 1) store.add(input);
  const all = store.all();
  assert.equal(all.length, 5000);
  assert.equal(all[0].id > 1, true);
  store.close();
});

test('a database that cannot be opened is a UserError that ends on the 500 page', async () => {
  const dir = tmp();
  const store = createDiagramStore(Date.now, dir); // a folder stands in the place of the file
  assert.throws(() => store.all(), { userCode: 'log-path-is-folder' });
  rmSync(dir, { recursive: true, force: true });
});

test('a damaged row (wrong type) is a database failure, not a crash', () => {
  const dir = tmp();
  const file = join(dir, 'db.sqlite');
  const store = createDiagramStore(Date.now, file);
  store.all();
  const raw = new DatabaseSync(file);
  raw.exec("DROP TABLE diagrams; CREATE TABLE diagrams (id INTEGER PRIMARY KEY, title, notation, description, code, revision, created_at); INSERT INTO diagrams VALUES (1, 'x', 'UML', 'd', '', 'oops', 'now')");
  raw.close();
  store.close();
  const again = createDiagramStore(Date.now, file);
  assert.throws(() => again.all(), { userCode: 'log-database-unavailable' });
  again.close();
  rmSync(dir, { recursive: true, force: true });
});

test('a failed insert rolls back and leaves the table as it was', () => {
  const dir = tmp();
  const file = join(dir, 'db.sqlite');
  const store = createDiagramStore(Date.now, file);
  const before = store.all().length;
  assert.throws(() => store.add({ ...input, revision: -1 })); // the CHECK constraint refuses it
  assert.equal(store.all().length, before);
  store.add(input); // and the connection is usable afterwards
  assert.equal(store.all().length, before + 1);
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const serve = (store, log) => {
  const errors = [];
  const server = createApp({ store, limits: loadLimits(), log, write: () => {}, writeError: (...a) => errors.push(a) }).listen(0);
  return { server, base: `http://127.0.0.1:${server.address().port}`, errors };
};

test('the diagram database fails while the server runs: the list answers the styled 500, the health check stays up', async () => {
  const dir = tmp();
  const file = join(dir, 'db.sqlite');
  const store = createDiagramStore(Date.now, file);
  const { server, base } = serve(store, openRequestLog());
  assert.equal((await fetch(`${base}/`)).status, 200);
  const raw = new DatabaseSync(file);
  raw.exec('ALTER TABLE diagrams RENAME TO diagrams_gone');
  raw.close();
  const res = await fetch(`${base}/`);
  const html = await res.text();
  assert.equal(res.status, 500);
  assert.match(html, /500/);
  assert.doesNotMatch(html, /node:sqlite|at .*\.js:\d+|diagrams_gone/);
  assert.equal((await fetch(`${base}/health`)).status, 200);
  server.close();
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

test('when the request log cannot be written, the action is NOT done and the page is the styled 500', async () => {
  const store = createDiagramStore();
  const log = openRequestLog(tmp()); // a folder in place of the file: every write fails
  const { server, base } = serve(store, log);
  const before = store.all().length;
  const page = await fetch(`${base}/add?auth=1`);
  assert.equal(page.status, 500);
  const res = await fetch(`${base}/add?auth=1`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'title=x' });
  assert.equal(res.status, 500);
  assert.equal(store.all().length, before);
  server.close();
});
