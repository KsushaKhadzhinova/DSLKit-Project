import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { HEADER_DOCS, cacheInfo, compareRows, cookieRows, headerRows, pick, report, securityRows, slowestPhase, summary, timingRows } from './analyze-har.js';

const file = (n) => fileURLToPath(new URL(`./data/${n}`, import.meta.url));
const load = (n) => JSON.parse(readFileSync(file(n), 'utf8'));
const normal = load('draw-io-normal.har');
const fast = load('draw-io-fast3g.har');

const entry = (o = {}) => ({
  _resourceType: 'document',
  request: { method: 'GET', url: 'https://x.test/', headers: [], cookies: [] },
  response: { status: 200, statusText: 'OK', httpVersion: 'HTTP/2.0', headers: [], cookies: [], _transferSize: 10 },
  timings: { dns: 1, connect: 2, ssl: -1, send: 0, wait: 5, receive: 3 },
  ...o,
});
const har = (entries) => ({ log: { entries, pages: [{ pageTimings: { onContentLoad: 7, onLoad: 9 } }] } });
const h = (name, value) => ({ name, value });

test('summary of the recorded draw.io load', () => {
  const s = summary(normal);
  assert.equal(s.requests, 17);
  assert.deepEqual(s.types, { document: 1, stylesheet: 3, script: 8, xhr: 3, image: 2 });
  assert.equal(s.protocol, 'HTTP/2.0');
  assert.equal(s.onLoad, 4393);
  assert.ok(s.bytes > 6e6);
});

test('summary ignores unknown transfer size', () => {
  const e = entry();
  e.response._transferSize = -1;
  assert.equal(summary(har([e])).bytes, 0);
});

test('pick returns document, script and xhr only when present', () => {
  assert.deepEqual(pick(normal.log.entries).map((e) => e._resourceType), ['document', 'script', 'xhr']);
  assert.deepEqual(pick([entry()]).map((e) => e._resourceType), ['document']);
});

test('headerRows skips pseudo headers, limits rows, clips and escapes values', () => {
  const rows = headerRows([h(':path', '/'), h('Accept', 'a|b'), h('x-unknown', 'y'.repeat(100)), h('server', 'cf')], 3);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], ['`Accept`', 'a\\|b', HEADER_DOCS.accept]);
  assert.deepEqual(rows[1], ['`x-unknown`', `${'y'.repeat(77)}...`, '—']);
  assert.equal(headerRows([h('a', '1'), h('b', '2')]).length, 2);
});

test('cacheInfo reads cache headers and max-age', () => {
  const e = entry();
  e.response.headers = [h('Cache-Control', 'public, max-age=86400'), h('ETag', '"1"'), h('Last-Modified', 'Mon')];
  assert.deepEqual(cacheInfo(e), { cacheControl: 'public, max-age=86400', etag: '"1"', lastModified: 'Mon', maxAge: 86400 });
  assert.deepEqual(cacheInfo(entry()), { cacheControl: undefined, etag: undefined, lastModified: undefined, maxAge: undefined });
});

test('securityRows marks absent headers', () => {
  const e = entry();
  e.response.headers = [h('Strict-Transport-Security', 'max-age=1')];
  assert.deepEqual(securityRows(e), [['`content-security-policy`', 'отсутствует'], ['`strict-transport-security`', 'max-age=1'], ['`x-frame-options`', 'отсутствует'], ['`x-content-type-options`', 'отсутствует']]);
});

test('cookieRows lists request and response cookies', () => {
  const e = entry();
  e.request.cookies = [{ name: 'a' }];
  e.response.cookies = [{ name: 'b' }];
  assert.deepEqual(cookieRows([e, entry()]), [['a', 'Cookie', 'https://x.test/'], ['b', 'Set-Cookie', 'https://x.test/']]);
  assert.deepEqual(cookieRows(normal.log.entries), []);
});

test('timingRows and slowestPhase handle missing phases', () => {
  const e = entry();
  assert.deepEqual(timingRows(e).map((r) => r[1]), ['—', '1 мс', '2 мс', '—', '0 мс', '5 мс', '3 мс']);
  assert.equal(slowestPhase(e), 'Waiting (TTFB)');
  assert.equal(slowestPhase(entry({ timings: {} })), '—');
});

test('compareRows shows a slower page on Fast 3G', () => {
  const rows = compareRows(normal, fast);
  assert.equal(rows.length, 5);
  assert.ok(rows[3][2] > rows[3][1]);
});

test('report with and without comparison and cookies', () => {
  const one = report(normal);
  assert.match(one, /## Сводка/);
  assert.match(one, /### Request headers/);
  assert.match(one, /Cookie не передавались/);
  assert.doesNotMatch(one, /Fast 3G/);
  const e = entry();
  e.request.cookies = [{ name: 'sid' }];
  const two = report(har([e]), fast);
  assert.match(two, /\| sid \| Cookie \|/);
  assert.match(two, /Сравнение: обычная сеть и Fast 3G/);
});

test('cli prints the report for two HAR files', async () => {
  const log = mock.method(console, 'log', () => {});
  process.argv.push(file('draw-io-normal.har'), file('draw-io-fast3g.har'));
  await import('./cli.js');
  assert.match(log.mock.calls[0].arguments[0], /Сравнение/);
  log.mock.restore();
});
