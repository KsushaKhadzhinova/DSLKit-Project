import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { createDiagramStore } from '../src/data/diagrams.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { loadLimits } from '../src/limits.js';

// Golden (contract) tests: the status, the key headers and the whole HTML of every page are compared with a stored
// copy in test/golden/. Run `UPDATE_GOLDEN=1 npm test` after a deliberate change of a page and read the diff.
const GOLDEN = fileURLToPath(new URL('./golden/', import.meta.url));
const FIXED_NOW = Date.parse('2026-11-27T12:00:00.000Z');

const normalize = (html) =>
  html
    .replace(/name="_csrf" value="[0-9a-f]+"/g, 'name="_csrf" value="TOKEN"')
    .replace(/\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3} UTC/g, 'TIME')
    .replace(/\r\n/g, '\n');

const check = (name, actual) => {
  const file = `${GOLDEN}${name}.html`;
  if (process.env.UPDATE_GOLDEN || !existsSync(file)) {
    mkdirSync(GOLDEN, { recursive: true });
    writeFileSync(file, actual);
  }
  assert.equal(actual, readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), `${name} differs from test/golden/${name}.html`);
};

const start = (options = {}) => {
  const server = createApp({
    store: createDiagramStore(() => FIXED_NOW),
    limits: loadLimits(),
    log: openRequestLog(),
    now: () => FIXED_NOW,
    write: () => {},
    writeError: () => {},
    ...options,
  }).listen(0);
  return { server, base: `http://127.0.0.1:${server.address().port}` };
};

const PAGES = [
  ['list', '/', 200],
  ['list-ru', '/?lang=ru', 200],
  ['detail', '/item/1', 200],
  ['detail-missing', '/item/999', 404],
  ['detail-bad-id', '/item/0x1', 404],
  ['add-form', '/add?auth=1', 200],
  ['edit-form', '/item/2/edit?auth=1', 200],
  ['login', '/login', 200],
  ['not-found', '/no/such/page', 404],
];

for (const [name, path, status] of PAGES) {
  test(`golden: ${name} (${path}) answers ${status} with the stored page`, async () => {
    const { server, base } = start();
    const res = await fetch(base + path, { redirect: 'manual' });
    assert.equal(res.status, status);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    check(name, normalize(await res.text()));
    server.close();
  });
}

test('golden: guests are redirected from the protected pages to /login', async () => {
  const { server, base } = start();
  for (const path of ['/add', '/log', '/item/1/edit', '/log/download']) {
    const res = await fetch(base + path, { redirect: 'manual' });
    assert.equal(res.status, 302, path);
    assert.equal(res.headers.get('location'), '/login', path);
  }
  server.close();
});

test('golden: the health check, the exact JSON', async () => {
  const { server, base } = start();
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
  server.close();
});

test('golden: the 500 page of a real failure (the log database cannot be opened)', async () => {
  const { server, base } = start({ log: openRequestLog(fileURLToPath(new URL('./golden/', import.meta.url))) }); // a folder in place of the file
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 500);
  const html = normalize(await res.text());
  assert.doesNotMatch(html, /EISDIR|node:sqlite|\.js:\d+|at \w+ \(/);
  check('server-error', html);
  server.close();
});

test('golden: the log page shows the request that was just recorded', async () => {
  const { server, base } = start();
  await fetch(`${base}/?auth=1`);
  const res = await fetch(`${base}/log?auth=1`);
  assert.equal(res.status, 200);
  const html = normalize(await res.text());
  assert.match(html, /GET/);
  assert.match(html, /auth=\*\*\*/);
  server.close();
});
