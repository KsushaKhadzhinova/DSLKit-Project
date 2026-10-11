import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { bytesByType, cacheInfo, compareRows, cookieRows, headerRows, pick, report, securityRows, slowestPhase, summary, timingRows } from './analyze-har.js';
import { bars, figures } from './figures.js';
import { HEADER_DOCS, T } from './i18n.js';

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

test('summary and bytesByType ignore unknown transfer size', () => {
  const e = entry();
  e.response._transferSize = -1;
  assert.equal(summary(har([e])).bytes, 0);
  assert.deepEqual(bytesByType([e, entry()]), { document: 10 });
});

test('pick returns document, script and xhr only when present', () => {
  assert.deepEqual(
    pick(normal.log.entries).map((e) => e._resourceType),
    ['document', 'script', 'xhr'],
  );
  assert.deepEqual(
    pick([entry()]).map((e) => e._resourceType),
    ['document'],
  );
});

test('headerRows skips pseudo headers, limits rows, clips and escapes values', () => {
  const rows = headerRows([h(':path', '/'), h('Accept', 'a|b'), h('x-unknown', 'y'.repeat(100)), h('server', 'cf')], 'ru', 3);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], ['`Accept`', 'a\\|b', HEADER_DOCS.ru.accept]);
  assert.deepEqual(rows[1], ['`x-unknown`', `${'y'.repeat(77)}...`, '—']);
  assert.equal(headerRows([h('a', '1'), h('b', '2')]).length, 2);
  assert.equal(headerRows([h('Accept', '1')], 'en')[0][2], HEADER_DOCS.en.accept);
});

test('cacheInfo reads cache headers and max-age', () => {
  const e = entry();
  e.response.headers = [h('Cache-Control', 'public, max-age=86400'), h('ETag', '"1"'), h('Last-Modified', 'Mon')];
  assert.deepEqual(cacheInfo(e), { cacheControl: 'public, max-age=86400', etag: '"1"', lastModified: 'Mon', maxAge: 86400 });
  assert.deepEqual(cacheInfo(entry()), { cacheControl: undefined, etag: undefined, lastModified: undefined, maxAge: undefined });
});

test('securityRows marks absent headers in both languages', () => {
  const e = entry();
  e.response.headers = [h('Strict-Transport-Security', 'max-age=1')];
  assert.deepEqual(securityRows(e), [
    ['`content-security-policy`', 'отсутствует'],
    ['`strict-transport-security`', 'max-age=1'],
    ['`x-frame-options`', 'отсутствует'],
    ['`x-content-type-options`', 'отсутствует'],
  ]);
  assert.equal(securityRows(e, 'en')[0][1], 'absent');
});

test('cookieRows lists request and response cookies', () => {
  const e = entry();
  e.request.cookies = [{ name: 'a' }];
  e.response.cookies = [{ name: 'b' }];
  assert.deepEqual(cookieRows([e, entry()]), [
    ['a', 'Cookie', 'https://x.test/'],
    ['b', 'Set-Cookie', 'https://x.test/'],
  ]);
  assert.deepEqual(cookieRows(normal.log.entries), []);
});

test('timingRows and slowestPhase handle missing phases', () => {
  const e = entry();
  assert.deepEqual(
    timingRows(e).map((r) => r[1]),
    ['—', '1 мс', '2 мс', '—', '0 мс', '5 мс', '3 мс'],
  );
  assert.equal(timingRows(e, 'en')[1][1], '1 ms');
  assert.equal(slowestPhase(e), 'Waiting (TTFB)');
  assert.equal(slowestPhase(entry({ timings: {} })), '—');
});

test('compareRows shows a slower page on Fast 3G', () => {
  const rows = compareRows(normal, fast);
  assert.deepEqual(
    rows.map((r) => r[0]),
    ['requests', 'transferred', 'dcl', 'onload', 'ttfb'],
  );
  assert.ok(rows[3][2] > rows[3][1]);
});

test('i18n dictionaries have the same keys in both languages', () => {
  assert.deepEqual(Object.keys(HEADER_DOCS.ru), Object.keys(HEADER_DOCS.en));
  assert.deepEqual(Object.keys(T.ru), Object.keys(T.en));
  assert.deepEqual(Object.keys(T.ru.captions), Object.keys(T.en.captions));
  assert.deepEqual(Object.keys(T.ru.figures), Object.keys(T.en.figures));
});

test('report in both languages with captions and numbering', () => {
  const ru = report(normal, fast);
  assert.match(ru, /#### 3\.3\.1 Сводка загрузки/);
  assert.match(ru, /Таблица 1 – Сводные показатели загрузки страницы/);
  assert.match(ru, /Таблица 2 – Количество запросов по типам ресурсов/);
  assert.match(ru, /Cookie не передавались/);
  assert.match(ru, /Сравнение обычной сети и Fast 3G/);
  const en = report(normal, undefined, 'en', '3.4');
  assert.match(en, /#### 3\.4\.1 Load summary/);
  assert.match(en, /Table 1 – Page load summary/);
  assert.match(en, /No cookies passed in either direction\./);
  assert.doesNotMatch(en, /Fast 3G/);
});

test('report lists cookies and fills missing cache headers', () => {
  const e = entry();
  e.request.cookies = [{ name: 'sid' }];
  const out = report(har([e]), fast);
  assert.match(out, /\| sid \| Cookie \|/);
  assert.match(out, /\| https:\/\/x\.test\/ \| — \| — \| — \| — \|/);
});

test('bars scale to the largest value and survive all zeros', () => {
  assert.match(
    bars(
      [
        ['a', 10],
        ['b', 5],
      ],
      'шт.',
    ),
    /width="380".*width="190"/,
  );
  assert.match(bars([['a', 0]], 'x'), /width="0"/);
  assert.match(bars([['<a>', 1]], 'x'), /&lt;a&gt;/);
});

test('figures build four charts for each language', () => {
  const ru = figures(normal, fast);
  assert.deepEqual(Object.keys(ru), ['fig-1-types.svg', 'fig-2-bytes.svg', 'fig-3-timing.svg', 'fig-4-load.svg']);
  assert.match(ru['fig-4-load.svg'], /onLoad, обычная сеть/);
  assert.match(figures(normal, fast, 'en')['fig-4-load.svg'], /onLoad, regular network/);
});

test('cli writes the analysis and the figures', async () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'figs-')), 'nested');
  process.argv.splice(2, 4, file('draw-io-normal.har'), file('draw-io-fast3g.har'), 'en', dir);
  await import('./cli.js');
  assert.match(readFileSync(join(dir, 'analysis.md'), 'utf8'), /Comparison of the regular network and Fast 3G/);
  assert.equal(readdirSync(dir).length, 5);
});
