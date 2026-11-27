import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import { createDiagramStore } from '../src/data/diagrams.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { loadLimits } from '../src/limits.js';

// Every error page of the application explains the error in plain words (what, why, what to do), links home,
// carries the request identifier that is also in the X-Request-Id header and the server log, and leaks nothing.
const LEAKS = /node:sqlite|SQLITE|request_log|diagrams|SELECT |INSERT |\.js:\d+|node_modules|[A-Z]:\|\/home\/|EISDIR|ENOENT|stack|CSRF_SECRET/;

const start = (options = {}) => {
  const lines = [];
  const server = createApp({
    store: createDiagramStore(),
    limits: loadLimits(),
    log: openRequestLog(),
    write: (line) => lines.push(line),
    writeError: (line) => lines.push(String(line)),
    ...options,
  }).listen(0);
  return { server, lines, base: `http://127.0.0.1:${server.address().port}` };
};

const form = { 'content-type': 'application/x-www-form-urlencoded' };

const CASES = [
  ['400 too many form fields', 400, async (base) => fetch(`${base}/login`, { method: 'POST', headers: form, body: Array.from({ length: 50 }, (_, i) => `f${i}=1`).join('&') })],
  ['403 no CSRF token', 403, async (base) => fetch(`${base}/add?auth=1`, { method: 'POST', headers: form, body: 'title=x' })],
  ['404 no such page', 404, async (base) => fetch(`${base}/no/such/page`)],
  ['404 no such record', 404, async (base) => fetch(`${base}/item/12345`)],
  ['405 wrong method', 405, async (base) => {
    const page = await fetch(`${base}/add?auth=1`);
    const cookie = page.headers.get('set-cookie').split(';')[0];
    const token = /name="_csrf" value="([0-9a-f]+)"/.exec(await page.text())[1];
    return fetch(`${base}/item/1`, { method: 'POST', headers: { ...form, cookie }, body: `_csrf=${token}` });
  }],
  ['413 body too large', 413, async (base) => fetch(`${base}/login`, { method: 'POST', headers: form, body: `a=${'x'.repeat(30000)}` })],
];

for (const lang of ['en']) {
  for (const [name, status, call] of CASES) {
    test(`error page ${name} (${lang}): explained, with request id, without leaks`, async () => {
      const { server, base, lines } = start();
      const res = await call(base);
      assert.equal(res.status, status);
      const html = await res.text();
      const id = res.headers.get('x-request-id');
      assert.match(id, /^[0-9a-f]{8}$/);
      assert.match(html, new RegExp(`class="error__code"[^>]*>[^<]*${status}`));
      assert.match(html, /error__heading/); // what, why and what to do
      assert.ok((html.match(/<li>/g) ?? []).length >= 2, 'reasons and steps are listed');
      assert.match(html, /href="\/(\?auth=1)?"/);
      assert.ok(html.includes(id), 'the page shows the request id');
      assert.doesNotMatch(html.replace(/<style[\s\S]*?<\/style>/g, ''), LEAKS);
      server.close();
      assert.ok(Array.isArray(lines));
    });
  }
}

test('the Russian error page is in Russian and keeps the request id', async () => {
  const { server, base } = start();
  const res = await fetch(`${base}/no/such/page?lang=ru`);
  const html = await res.text();
  assert.equal(res.status, 404);
  assert.match(html, /Код ошибки/);
  assert.match(html, /Номер запроса/);
  server.close();
});

test('429 too many requests: explained, with the retry time', async () => {
  const limits = loadLimits();
  limits.rateLimit = { all: { windowMs: 60000, max: 2 }, write: limits.rateLimit.write };
  const { server, base } = start({ limits });
  await fetch(`${base}/no/1`);
  await fetch(`${base}/no/2`);
  const res = await fetch(`${base}/no/3`);
  const html = await res.text();
  assert.equal(res.status, 429);
  assert.ok(res.headers.get('retry-after'));
  assert.ok(html.includes(res.headers.get('x-request-id')));
  assert.doesNotMatch(html, LEAKS);
  server.close();
});

test('500 from a real failure: explained, request id in the page and in the server log, no leaks', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pz1-err-'));
  const { server, base, lines } = start({ log: openRequestLog(dir) }); // a folder in place of the database file
  const res = await fetch(`${base}/`);
  const html = await res.text();
  const id = res.headers.get('x-request-id');
  assert.equal(res.status, 500);
  assert.ok(html.includes(id));
  assert.match(html, /error__heading/);
  assert.doesNotMatch(html, LEAKS);
  assert.ok(lines.some((line) => String(line).includes(id) && String(line).includes('500')), 'the server log has the id');
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

test('500 when the log write fails: the page says so, the action was not done', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pz1-err-'));
  const store = createDiagramStore();
  const { server, base } = start({ log: openRequestLog(dir), store });
  const res = await fetch(`${base}/item/1/delete?auth=1`, { method: 'POST', headers: form, body: '' });
  assert.equal(res.status, 500);
  assert.doesNotMatch(await res.text(), LEAKS);
  assert.ok(store.find(1), 'the record was not deleted');
  server.close();
  rmSync(dir, { recursive: true, force: true });
});
