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

// Opens the form like a browser does and returns the CSRF cookie and the token from the hidden field.
const session = async (base) => {
  const res = await fetch(`${base}/add?auth=1`);
  const html = await res.text();
  return { cookie: res.headers.get('set-cookie').split(';')[0], token: html.match(/name="_csrf" value="([0-9a-f]+)"/)[1] };
};

// Posts a form with a valid CSRF cookie and token unless `csrf: false` is given.
const post = async (url, body, { csrf = true, headers = {} } = {}) => {
  const fields = body instanceof URLSearchParams ? body : new URLSearchParams(body);
  const cookie = {};
  if (csrf) {
    const { cookie: value, token } = await session(new URL(url).origin);
    fields.set('_csrf', token);
    cookie.cookie = value;
  }
  return fetch(url, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...cookie, ...headers }, body: fields });
};

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
  assert.match(await res.text(), /Page not found/);
});

withServer('add form redirects guests to /login and opens with ?auth=1', async ({ base }) => {
  const guest = await fetch(`${base}/add`, { redirect: 'manual' });
  assert.equal(guest.status, 302);
  assert.equal(guest.headers.get('location'), '/login');
  assert.equal((await post(`${base}/add`, { title: 'x', notation: 'UML', description: 'd', revision: '1' })).status, 302);
  const owner = await fetch(`${base}/add?auth=1`);
  assert.equal(owner.status, 200);
  assert.match(await owner.text(), /Owner/);
  assert.match(await (await fetch(`${base}/login`)).text(), /auth=1/);
  assert.equal((await fetch(`${base}/log`, { redirect: 'manual' })).status, 302);
});

withServer('POST /add stores the item and redirects to the list', async ({ base }) => {
  const res = await post(`${base}/add?auth=1`, { title: 'New <b>one</b>', notation: 'DFD', description: 'd', code: 'c', revision: '2' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/?auth=1');
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /New &lt;b&gt;one&lt;\/b&gt;/);
  const detail = await (await fetch(`${base}/item/4`)).text();
  assert.match(detail, /DFD/);
  assert.match(detail, /Revision/);
  assert.match(detail, /<time datetime="\d{4}-\d{2}-\d{2}T[^"]+Z">/);
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
  assert.match(await (await fetch(`${base}/log?auth=1`)).text(), /\/item\/1/);
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
  assert.match(sent.body, /server error/);
  assert.match(sent.body, /dslkit.css/);
});

test('a database that stops while the server runs shows the styled 500 page', async () => {
  const errors = [];
  const log = openRequestLog(join(tmpdir(), `dslkit-stop-${process.pid}.db`));
  const server = createApp({ log, write: () => {}, writeError: (...a) => errors.push(a) }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/`)).status, 200);
  log.close();
  const res = await fetch(`${base}/`);
  const html = await res.text();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  assert.equal(res.status, 500);
  assert.match(html, /Server error/);
  assert.match(errors[0][0], /GET \//);
});

test('error handler ends the response when headers were already sent', () => {
  let ended = false;
  serverError(() => {})(new Error('x'), { method: 'GET', originalUrl: '/' }, { headersSent: true, end: () => (ended = true) });
  assert.equal(ended, true);
});

test('store hands out a unique, increasing creation time', () => {
  const store = createDiagramStore(() => Date.parse('2026-10-05T00:00:00.000Z'));
  const first = store.add({ title: 'a', notation: 'UML', description: 'd', code: '', revision: 0 });
  const second = store.add({ title: 'b', notation: 'UML', description: 'd', code: '', revision: 0 });
  assert.equal(first.id, 4);
  assert.equal(store.find(4).title, 'a');
  assert.equal(first.createdAt, '2026-10-05T00:00:00.000Z');
  assert.equal(second.createdAt, '2026-10-05T00:00:00.001Z');
  const times = store.all().map((item) => item.createdAt);
  assert.equal(new Set(times).size, times.length);
  assert.equal(createDiagramStore().all().length, 3);
});

const limits = loadLimits();
const valid = { title: 'ok', notation: 'ERD', description: 'd', code: '', revision: '0' };

test('validation accepts a correct form and enforces limits from limits.json', () => {
  assert.deepEqual(validateDiagram(valid, limits), {});
  assert.match(validateDiagram({ ...valid, title: 'x'.repeat(limits.title.maxLength + 1) }, limits).title, /at most 80/);
  assert.match(validateDiagram({ ...valid, description: 'x'.repeat(limits.description.maxLength + 1) }, limits).description, /at most 500/);
  assert.match(validateDiagram({ ...valid, code: 'x'.repeat(limits.code.maxLength + 1) }, limits).code, /at most 5000/);
  assert.deepEqual(validateDiagram({ ...valid, title: 'x'.repeat(limits.title.maxLength) }, limits), {});
});

test('validation rejects empty values and numeric fields below zero', () => {
  assert.match(validateDiagram({ ...valid, title: '' }, limits).title, /required/);
  assert.match(validateDiagram({ ...valid, description: '' }, limits).description, /required/);
  assert.match(validateDiagram({ ...valid, revision: '' }, limits).revision, /required/);
  for (const revision of ['-1', '1.5', '1e3', 'abc', '100001']) {
    assert.match(validateDiagram({ ...valid, revision }, limits).revision, /whole number from 0 to 100000/, revision);
  }
  assert.deepEqual(validateDiagram({ ...valid, revision: '100000' }, limits), {});
});

withServer('whitespace-only, too long and negative values are refused with 400', async ({ base }) => {
  const send = (fields) => post(`${base}/add?auth=1`, { ...valid, ...fields });
  const blank = await send({ title: '   	 ', description: '  ' });
  const html = await blank.text();
  assert.equal(blank.status, 400);
  assert.match(html, /Title is required/);
  assert.match(html, /Description is required/);
  assert.equal((await send({ title: 'x'.repeat(81) })).status, 400);
  const negative = await send({ revision: '-5' });
  assert.equal(negative.status, 400);
  assert.match(await negative.text(), /whole number from 0 to 100000/);
  assert.equal((await send({})).status, 302);
});

withServer('the form carries the limits from limits.json as attributes', async ({ base }) => {
  const html = await (await fetch(`${base}/add?auth=1`)).text();
  assert.match(html, /maxlength="80"/);
  assert.match(html, /maxlength="500"/);
  assert.match(html, /min="0" max="100000"/);
});

withServer('every record shows its creation time on the list', async ({ base }) => {
  const html = await (await fetch(`${base}/`)).text();
  const times = html.match(/<time datetime="[^"]+"/g);
  assert.equal(times.length, 3);
  assert.equal(new Set(times).size, 3);
});

withServer('missing body, repeated keys and bad JSON-like input give 400, not 500', async ({ base }) => {
  const { cookie, token } = await session(base);
  const noBody = await fetch(`${base}/add?auth=1`, { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: `_csrf=${token}` });
  assert.equal(noBody.status, 400);
  assert.equal((await fetch(`${base}/add?auth=1`, { method: 'POST' })).status, 403);
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
  assert.match(await res.text(), /Request too large/);
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
