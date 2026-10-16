// Renders real API exchanges to PNG files with headless Chrome (puppeteer-core), no desktop capture.
// Run from part-2/lab-06-mongodb:  node shots/shots.mjs
// Needs a mongod binary (MONGOMS_SYSTEM_BINARY) and an installed Chrome (CHROME_PATH or the default paths).
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app');
const models = require('../src/models');
const { Diagram } = models;

const outDir = fileURLToPath(new URL('../figures/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const chromePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => p && existsSync(p));
if (!chromePath) throw new Error('Chrome not found, set CHROME_PATH');

if (process.env.MONGOMS_SYSTEM_BINARY && !existsSync(process.env.MONGOMS_SYSTEM_BINARY)) delete process.env.MONGOMS_SYSTEM_BINARY;
const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri('dslkit'));
await Diagram.init();
const server = createApp(models).listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://localhost:${server.address().port}`;

const seed = async () => {
  await Diagram.deleteMany({});
  await Diagram.create([
    { title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> check stock -> pay -> ship -> end', priority: 2, owner: 'anna', tags: ['shop', 'process'], comments: [{ author: 'boris', text: 'Add a refund branch' }] },
    { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server: login', priority: 1, owner: 'carol', tags: ['auth'] },
    { title: 'Customers and orders', notation: 'ERD', sourceCode: 'Customer ||--o{ Order', priority: 0, owner: 'anna', tags: ['shop', 'database'] },
  ]);
};
const idOf = async (title) => String((await Diagram.findOne({ title }))._id);

// Performs a real request and returns what the page shows.
const exchange = async (method, path, payload, raw) => {
  const res = await fetch(base + path, {
    method,
    headers: payload === undefined && raw === undefined ? {} : { 'Content-Type': 'application/json' },
    body: raw ?? (payload === undefined ? undefined : JSON.stringify(payload)),
  });
  const text = await res.text();
  return {
    method,
    url: `http://localhost:3000${path}`,
    sent: raw ?? (payload === undefined ? '' : JSON.stringify(payload, null, 2)),
    status: `${res.status} ${res.statusText}`,
    ok: res.status < 400,
    location: res.headers.get('location'),
    received: text ? JSON.stringify(JSON.parse(text), null, 2) : '(empty body)',
    json: text ? JSON.parse(text) : undefined,
  };
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const panel = (e) => `
<section>
  <div class="line"><b class="m ${e.method}">${e.method}</b><span class="url">${esc(e.url)}</span></div>
  ${e.sent ? `<div class="label">Request body</div><pre>${esc(e.sent)}</pre>` : ''}
  <div class="label">Response <span class="st ${e.ok ? 'good' : 'bad'}">${esc(e.status)}</span>${e.location ? ` <span class="loc">Location: ${esc(e.location)}</span>` : ''}</div>
  <pre>${esc(e.received)}</pre>
</section>`;

const page = (heading, body) => `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:24px;background:#f4f5f7;font:14px/1.45 Segoe UI,Arial,sans-serif;color:#1d2330;width:960px}
h1{font-size:18px;margin:0 0 14px}
section{background:#fff;border:1px solid #d5d9e0;border-radius:8px;padding:14px 16px;margin-bottom:14px}
.line{display:flex;gap:10px;align-items:center;margin-bottom:8px}
.m{padding:2px 8px;border-radius:4px;color:#fff;font-size:12px}
.GET{background:#2a7de1}.POST{background:#2e9e5b}.PUT{background:#d98a1b}.DELETE{background:#cf3a3a}
.url{font:13px Consolas,monospace}
.label{font-size:12px;color:#5a6270;margin:8px 0 4px}
pre{margin:0;background:#101521;color:#dbe4f5;padding:10px 12px;border-radius:6px;font:12.5px/1.4 Consolas,monospace;white-space:pre-wrap;word-break:break-word}
.st{font-weight:600;padding:1px 8px;border-radius:4px}.good{background:#d9f2e3;color:#14683a}.bad{background:#fbdcdc;color:#9b1c1c}
.loc{font:12px Consolas,monospace;color:#5a6270}
.note{font-size:12.5px;color:#5a6270;margin:-6px 0 12px}
</style><h1>${esc(heading)}</h1>${body}`;

const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });
const browserPage = await browser.newPage();
await browserPage.setViewport({ width: 1010, height: 600, deviceScaleFactor: 1.5 });

const shoot = async (name, heading, body) => {
  await browserPage.setContent(page(heading, body), { waitUntil: 'load' });
  await browserPage.screenshot({ path: join(outDir, name), fullPage: true });
  console.log('saved', name);
};

const valid = { title: 'Release plan', notation: 'UML', sourceCode: 'dev -> qa -> prod', priority: 1, owner: 'dina', tags: ['planning', 'web'] };

await seed();
await shoot('01-get-list.png', 'GET /diagrams: список диаграмм', panel(await exchange('GET', '/diagrams')));
await shoot('02-get-one.png', 'GET /diagrams/:id: одна диаграмма', panel(await exchange('GET', `/diagrams/${await idOf('Login flow')}`)));
await shoot('03-post-create.png', 'POST /diagrams: создание диаграммы', panel(await exchange('POST', '/diagrams', valid)));
await shoot('04-put-replace.png', 'PUT /diagrams/:id: замена полей, комментарии сохраняются', panel(await exchange('PUT', `/diagrams/${await idOf('Order processing')}`, { ...valid, title: 'Order processing v2', owner: 'anna' })));

const delId = await idOf('Customers and orders');
await shoot('05-delete.png', 'DELETE /diagrams/:id: удаление и повторное удаление', panel(await exchange('DELETE', `/diagrams/${delId}`)) + panel(await exchange('DELETE', `/diagrams/${delId}`)));

const nestedId = await idOf('Login flow');
const added = await exchange('POST', `/diagrams/${nestedId}/comments`, { author: 'boris', text: 'Add a second factor step' });
await shoot('06-comment-add.png', 'POST /diagrams/:id/comments: добавление элемента в массив ($push)', panel(added));
const commentId = added.json.comments[0].id;
await shoot('07-comment-edit.png', 'PUT /diagrams/:id/comments/:commentId: изменение элемента массива ($set с позиционным оператором)', panel(await exchange('PUT', `/diagrams/${nestedId}/comments/${commentId}`, { text: 'Second factor step added' })));
await shoot('08-comment-delete.png', 'DELETE /diagrams/:id/comments/:commentId: удаление элемента массива ($pull)', panel(await exchange('DELETE', `/diagrams/${nestedId}/comments/${commentId}`)));

await seed();
await shoot('09-filter-by-tag.png', 'GET /diagrams?tag=shop&owner=anna: фильтр по массиву тегов и владельцу', panel(await exchange('GET', '/diagrams?tag=shop&owner=anna')));

const rawDoc = await Diagram.collection.findOne({ title: 'Order processing' });
await shoot(
  '10-mongo-document.png',
  'Документ коллекции diagrams в MongoDB: вложенные теги и комментарии',
  `<section><div class="label">db.diagrams.findOne({ title: 'Order processing' })</div><pre>${esc(JSON.stringify(rawDoc, null, 2))}</pre></section>`,
);

await shoot('11-validation-error.png', 'POST /diagrams: ошибки проверки данных', panel(await exchange('POST', '/diagrams', { title: '   ', notation: 'XYZ', sourceCode: 5, priority: 3, owner: '', tags: ['ok', ''] })));
await shoot(
  '12-limits.png',
  'POST /diagrams: превышение пределов из limits.json',
  panel(await exchange('POST', '/diagrams', { ...valid, title: 'x'.repeat(81), tags: Array.from({ length: 21 }, (_, i) => `tag${i}`) })),
);
await shoot('13-injection-body.png', 'POST /diagrams: оператор {"$ne": null} в теле запроса отклонён', panel(await exchange('POST', '/diagrams', { ...valid, title: { $ne: null }, owner: { $gt: '' } })));
await shoot(
  '14-injection-query.png',
  'GET /diagrams: операторы в параметрах запроса отклонены',
  panel(await exchange('GET', '/diagrams?owner[$ne]=nobody')) + panel(await exchange('GET', '/diagrams?tag=a&tag=b')),
);
await shoot(
  '15-not-found-and-bad-id.png',
  'Неизвестный и некорректный идентификатор',
  panel(await exchange('GET', '/diagrams/64b7f0c2a1b2c3d4e5f60718')) + panel(await exchange('GET', '/diagrams/abc')),
);

await browser.close();
server.close();
await mongoose.disconnect();
await mongod.stop();
