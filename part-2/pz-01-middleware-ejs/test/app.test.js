import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createDiagramStore, validateDiagram } from '../src/data/diagrams.js';
import { createRequestLog } from '../src/middleware/requestLogger.js';
import { serverError } from '../src/middleware/errorHandlers.js';

const start = async () => {
  const lines = [];
  const waiters = [];
  const errors = [];
  const log = createRequestLog(3);
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
  assert.equal(log.all()[0].url, '/item/1');
  assert.match(await (await fetch(`${base}/log`)).text(), /\/item\/1/);
});

test('request log keeps only the newest rows', () => {
  const log = createRequestLog(2);
  [1, 2, 3].forEach((n) => log.add({ n }));
  assert.deepEqual(log.all(), [{ n: 3 }, { n: 2 }]);
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
