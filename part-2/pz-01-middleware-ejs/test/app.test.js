import { test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createDiagramStore, validateDiagram } from '../src/data/diagrams.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { requestLogger } from '../src/middleware/requestLogger.js';
import { loadLimits } from '../src/limits.js';
import { serverError } from '../src/middleware/errorHandlers.js';

const start = async () => {
  const lines = [];
  const waiters = [];
  const errors = [];
  const log = openRequestLog();
  const server = createApp({
    log,
    write: (l) => {
      lines.push(l);
      waiters.splice(0).forEach((resolve) => resolve());
    },
    writeError: (...a) => errors.push(a),
  }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const nextLine = () => new Promise((resolve) => waiters.push(resolve));
  return { base, lines, nextLine, errors, log, close: () => server.close() };
};

const withServer = (name, fn) =>
  test(name, async () => {
    const ctx = await start();
    try {
      await fn(ctx);
    } finally {
      ctx.close();
    }
  });

const post = (url, body) =>
  fetch(url, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });

withServer('home lists the seeded diagrams', async ({ base }) => {
  const res = await fetch(`${base}/`);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /Order service sequence/);
  assert.match(html, /Guest/);
});

withServer('detail page shows one item, unknown id gives 404', async ({ base }) => {
  assert.match(await (await fetch(`${base}/item/2`)).text(), /Approval workflow/);
  const res = await fetch(`${base}/item/99`);
  assert.equal(res.status, 404);
  assert.match(await res.text(), /404/);
});

withServer('unknown URL renders the 404 page', async ({ base }) => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
  assert.match(await res.text(), /page not found/);
});

withServer('add form redirects guests to /login and opens with ?auth=1', async ({ base }) => {
  const guest = await fetch(`${base}/add`, { redirect: 'manual' });
  assert.equal(guest.status, 302);
  assert.equal(guest.headers.get('location'), '/login');
  assert.equal((await post(`${base}/add`, { title: 'x', notation: 'UML' })).status, 302);
  const owner = await fetch(`${base}/add?auth=1`);
  assert.equal(owner.status, 200);
  assert.match(await owner.text(), /Owner/);
  assert.match(await (await fetch(`${base}/login`)).text(), /auth=1/);
});

withServer('POST /add stores the item and redirects to the list', async ({ base }) => {
  const res = await post(`${base}/add?auth=1`, { title: 'New <b>one</b>', notation: 'DFD', description: 'd', code: 'c' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/?auth=1');
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /New &lt;b&gt;one&lt;\/b&gt;/);
  assert.match(await (await fetch(`${base}/item/4`)).text(), /DFD/);
});

withServer('invalid input re-renders the form with 400 and keeps values', async ({ base }) => {
  const res = await post(`${base}/add?auth=1`, { title: '  ', notation: 'nope', description: 'keep me' });
  const html = await res.text();
  assert.equal(res.status, 400);
  assert.match(html, /Title is required/);
  assert.match(html, /Choose a notation/);
  assert.match(html, /keep me/);
  assert.equal((await post(`${base}/add?auth=1`, {})).status, 400);
});

withServer('logger writes to console and to the in-memory table', async ({ base, lines, log, nextLine }) => {
  const logged = nextLine();
  await fetch(`${base}/item/1`);
  await logged;
  assert.match(lines.at(-1), /GET \/item\/1 200 \d+ms/);
  assert.equal(log.recent(5)[0].url, '/item/1');
  assert.equal(log.recent(5)[0].status, 200);
  assert.match(await (await fetch(`${base}/log`)).text(), /\/item\/1/);
});

test('request log is a SQLite table that keeps method, url, time, status and duration', () => {
  const log = openRequestLog();
  const id = log.start({ time: '2026-01-01T00:00:00.000Z', method: 'GET', url: '/a' });
  log.start({ time: '2026-01-01T00:00:01.000Z', method: 'POST', url: '/b' });
  log.finish(id, 200, 5);
  const rows = log.recent(1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].url, '/b');
  assert.deepEqual(log.recent(5)[1], { id, time: '2026-01-01T00:00:00.000Z', method: 'GET', url: '/a', status: 200, ms: 5 });
  log.close();
});

test('request log survives reopening a file and creates missing folders', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pz1-'));
  const file = join(dir, 'nested', 'log.db');
  const first = openRequestLog(file);
  first.start({ time: 't', method: 'GET', url: '/kept' });
  first.close();
  const second = openRequestLog(file);
  assert.equal(second.recent(1)[0].url, '/kept');
  second.close();
  rmSync(dir, { recursive: true, force: true });
});

test('a database that cannot be opened shows the styled 500 page with a clear message', async () => {
  const errors = [];
  const log = openRequestLog(join('package.json', 'blocked', 'log.db'));
  const server = createApp({ log, write: () => {}, writeError: (...a) => errors.push(a) }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/`);
  const html = await res.text();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  assert.equal(res.status, 500);
  assert.match(html, /<link rel="stylesheet"/);
  assert.match(html, /request log table could not be written/);
  assert.match(errors[0][0], /GET \//);
});

test('a failing finish update is reported on the console but does not break the response', async () => {
  const lines = [];
  const log = {
    start: () => 1,
    finish: () => {
      throw new Error('disk full');
    },
  };
  const handlers = {};
  requestLogger(log, (l) => lines.push(l))({ method: 'GET', originalUrl: '/x' }, { statusCode: 200, on: (e, f) => (handlers[e] = f) }, () => {});
  handlers.finish();
  assert.match(lines[0], /could not finish row 1: disk full/);
  assert.match(lines[1], /GET \/x 200/);
});

test('limits are read from limits.json', () => {
  const limits = loadLimits();
  assert.equal(typeof limits.title.maxLength, 'number');
  assert.equal(limits.revision.min, 0);
});

withServer('the footer links to the 500 demo page', async ({ base }) => {
  assert.match(await (await fetch(`${base}/`)).text(), /href="\/boom"/);
});

test('the fallback page is sent when the 500 template itself fails', () => {
  const sent = {};
  const res = {
    locals: {},
    headersSent: false,
    status: () => res,
    render: (view, locals, done) => done(new Error('template broken')),
    type: () => res,
    send: (body) => (sent.body = body),
  };
  serverError(() => {})(new Error('x'), { method: 'GET', originalUrl: '/' }, res);
  assert.match(sent.body, /500 – server error/);
  assert.match(sent.body, /style.css/);
});

withServer('an error is logged and shows the 500 page', async ({ base, errors }) => {
  const res = await fetch(`${base}/boom`);
  assert.equal(res.status, 500);
  assert.match(await res.text(), /server error/);
  assert.match(errors[0][0], /GET \/boom/);
});

test('error handler ends the response when headers were already sent', () => {
  let ended = false;
  serverError(() => {})(new Error('x'), { method: 'GET', originalUrl: '/' }, { headersSent: true, end: () => (ended = true) });
  assert.equal(ended, true);
});

test('store and validation helpers', () => {
  const store = createDiagramStore();
  assert.equal(store.all().length, 3);
  assert.equal(store.add({ title: 't', notation: 'UML' }).id, 4);
  assert.equal(store.find(4).title, 't');
  assert.deepEqual(validateDiagram({ title: 'ok', notation: 'ERD' }), {});
  assert.match(validateDiagram({ title: 'x'.repeat(81), notation: 'ERD' }).title, /80/);
});

withServer('missing body, repeated keys and bad JSON-like input give 400, not 500', async ({ base }) => {
  const noBody = await fetch(`${base}/add?auth=1`, { method: 'POST' });
  assert.equal(noBody.status, 400);
  const repeated = await post(
    `${base}/add?auth=1`,
    new URLSearchParams([
      ['title', 'a'],
      ['title', 'b'],
      ['notation', 'UML'],
    ]),
  );
  assert.equal(repeated.status, 400);
});

withServer('errors that carry a 4xx status keep it', async ({ base }) => {
  const res = await fetch(`${base}/add?auth=1`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'title=' + 'x'.repeat(200000),
  });
  assert.equal(res.status, 413);
  assert.match(await res.text(), /Bad request/);
});

test('a file that is not a database is rejected and the connection is closed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pz1-'));
  const file = join(dir, 'broken.db');
  writeFileSync(file, 'this is not a sqlite database, '.repeat(50));
  const log = openRequestLog(file);
  assert.throws(() => log.start({ time: 't', method: 'GET', url: '/' }));
  assert.doesNotThrow(() => log.close());
  rmSync(dir, { recursive: true, force: true });
});
