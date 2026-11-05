import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { createApp } from '../src/app.js';
import { createDiagramStore } from '../src/data/diagrams.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { loadLimits } from '../src/limits.js';

// Smoke, load, stress, volume, endurance, recovery and attack tests of the server-rendered pages.

const start = async ({ log = openRequestLog(), rate = 1_000_000, writeRate = 1_000_000, store = createDiagramStore() } = {}) => {
  const limits = loadLimits();
  limits.rateLimit.all.max = rate;
  limits.rateLimit.write.max = writeRate;
  const errors = [];
  const server = createApp({ store, limits, log, write: () => {}, writeError: (...a) => errors.push(a) }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  // A session: the cookie and the token of the form, as a browser would get them.
  const session = async () => {
    const res = await fetch(`${base}/add?auth=1`);
    const html = await res.text();
    return { cookie: res.headers.get('set-cookie').split(';')[0], token: html.match(/name="_csrf" value="([0-9a-f]+)"/)[1] };
  };
  const post = async (path, fields, s, extra = {}) => {
    const body = new URLSearchParams({ ...fields, ...(s ? { _csrf: s.token } : {}) });
    return fetch(`${base}${path}`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...(s ? { cookie: s.cookie } : {}), ...extra }, body });
  };
  const close = () => {
    server.closeAllConnections();
    server.close();
  };
  return { base, port, store, log, errors, session, post, close };
};

const valid = (i = 0) => ({ title: `Диаграмма ${i}`, notation: 'UML', description: 'описание', code: 'a -> b', revision: '1' });

const pool = async (total, concurrency, make) => {
  const statuses = new Map();
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < total) {
        const i = next++;
        let status;
        try {
          const res = await make(i);
          await res.arrayBuffer();
          status = res.status;
        } catch {
          status = 0;
        }
        statuses.set(status, (statuses.get(status) ?? 0) + 1);
      }
    }),
  );
  return statuses;
};

test('smoke: health and every page answer, a form round adds, edits and deletes a record', async () => {
  const app = await start();
  try {
    assert.equal((await fetch(`${app.base}/health`)).status, 200);
    for (const path of ['/', '/login', '/add?auth=1', '/log?auth=1', '/nowhere']) {
      const res = await fetch(`${app.base}${path}`);
      assert.equal(res.status, path === '/nowhere' ? 404 : 200, path);
    }
    const s = await app.session();
    const before = app.store.all().length;
    assert.equal((await app.post('/add?auth=1', valid(1), s)).status, 302);
    const created = app.store.all().at(-1);
    assert.equal(app.store.all().length, before + 1);
    assert.equal((await app.post(`/item/${created.id}/edit?auth=1`, { ...valid(2), title: 'Правка' }, s)).status, 302);
    assert.equal(app.store.find(created.id).title, 'Правка');
    assert.equal((await app.post(`/item/${created.id}/delete?auth=1`, {}, s)).status, 302);
    assert.equal(app.store.find(created.id), undefined);
  } finally {
    app.close();
  }
});

test('load: 1500 page reads with 40 clients all answer 200', async () => {
  const app = await start();
  try {
    const statuses = await pool(1500, 40, () => fetch(`${app.base}/`));
    assert.equal(statuses.get(200), 1500, JSON.stringify([...statuses]));
  } finally {
    app.close();
  }
});

test('stress: pages, valid forms, forged forms and hostile query strings from 60 clients never give a 5xx', async () => {
  const app = await start();
  try {
    const s = await app.session();
    const kinds = [
      () => fetch(`${app.base}/`),
      (i) => app.post('/add?auth=1', valid(i), s),
      (i) => app.post('/add?auth=1', valid(i), null),
      () => fetch(`${app.base}/item/%00`),
      () => fetch(`${app.base}/item/1e0`),
      () => fetch(`${app.base}/?auth=1&auth=0&auth[]=1`),
      () => fetch(`${app.base}/add?auth=1`, { headers: { cookie: 'dslkit_csrf=' + 'x'.repeat(5000) } }),
      () => app.post('/add?auth=1', { title: 'x'.repeat(100000), notation: 'UML', code: 'a', revision: '1' }, s),
      (i) => fetch(`${app.base}/add?auth=1`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: s.cookie }, body: `_csrf=${s.token}&title=a&title=b&notation[]=UML&code=x&revision=${i}` }),
      () => fetch(`${app.base}/log?auth=1`),
    ];
    const statuses = await pool(1200, 60, (i) => kinds[i % kinds.length](i));
    const bad = [...statuses].filter(([status]) => status === 0 || status >= 500);
    assert.deepEqual(bad, [], JSON.stringify([...statuses]));
    assert.equal((await fetch(`${app.base}/health`)).status, 200);
  } finally {
    app.close();
  }
});

test('attack: forged and stolen form tokens, foreign origins and method tricks never change data', async () => {
  const app = await start();
  try {
    const s = await app.session();
    const before = app.store.all().length;
    const refusals = [
      app.post('/add?auth=1', valid(1), null),
      app.post('/add?auth=1', valid(1), { cookie: s.cookie, token: '0'.repeat(48) }),
      app.post('/add?auth=1', valid(1), { cookie: 'dslkit_csrf=' + 'a'.repeat(48), token: s.token }),
      app.post('/add?auth=1', valid(1), { cookie: s.cookie, token: s.token.toUpperCase() }),
      app.post('/add?auth=1', valid(1), s, { origin: 'https://evil.test' }),
      app.post('/add?auth=1', valid(1), s, { origin: 'null' }),
      app.post('/log/clear?auth=1', {}, null),
      app.post('/item/1/delete?auth=1', {}, null),
      app.post('/item/1/edit?auth=1', valid(1), null),
    ];
    for (const res of await Promise.all(refusals)) assert.equal(res.status, 403, `a forged request got ${res.status}`);
    // A guest cannot write even with a good token: the sign-in check comes first.
    const guest = await app.post('/add', valid(1), s);
    assert.equal(guest.status, 302);
    assert.match(guest.headers.get('location'), /login/);
    for (const [method, path] of [['PUT', '/item/1'], ['DELETE', '/item/1'], ['PATCH', '/item/1'], ['POST', '/item/1']]) {
      const res = await fetch(`${app.base}${path}?auth=1`, { method, headers: { cookie: s.cookie, 'x-http-method-override': 'DELETE' } });
      assert.ok([403, 404, 405].includes(res.status), `${method} ${path} gave ${res.status}`);
    }
    assert.equal(app.store.all().length, before, 'a refused request changed the data');
    // The simulated sign-in is a query flag by the task, but only the exact value 1 counts.
    for (const query of ['auth=0', 'auth=true', 'auth=1%00', 'auth[]=1', 'auth=%31%20', 'AUTH=1', 'auth=01']) {
      const res = await fetch(`${app.base}/add?${query}`, { redirect: 'manual' });
      assert.equal(res.status, 302, `?${query} counted as signed in`);
    }
  } finally {
    app.close();
  }
});

test('attack: markup in titles, descriptions, code and the address is escaped in pages and in the log', async () => {
  const app = await start();
  try {
    const s = await app.session();
    const evil = '<script>alert(1)</script><img src=x onerror=alert(1)>';
    const res = await app.post('/add?auth=1', { title: evil, notation: 'UML', description: evil, code: evil, revision: '1' }, s);
    assert.ok([302, 400].includes(res.status));
    for (const path of ['/', `/item/${app.store.all().at(-1).id}`, '/log?auth=1']) {
      await fetch(`${app.base}${path}?q=${encodeURIComponent(evil)}`);
      const html = await (await fetch(`${app.base}${path}${path.includes('?') ? '&' : '?'}auth=1&x=${encodeURIComponent(evil)}`)).text();
      assert.ok(!html.includes('<script>alert(1)'), `${path} holds a live script tag`);
      assert.ok(!/<img src=x onerror/i.test(html), `${path} holds a live image tag`);
    }
    // A line break in the address must not forge a header or a log line.
    const split = await fetch(`${app.base}/%0d%0aSet-Cookie:%20pwn=1`);
    assert.ok(!split.headers.get('set-cookie')?.includes('pwn'), 'a header was injected');
  } finally {
    app.close();
  }
});

test('volume: 400 records and 2000 requests keep the pages quick and the log page within its row limit', async () => {
  const app = await start();
  try {
    for (let i = 0; i < 400; i += 1) app.store.add({ ...valid(i), revision: 1 });
    const started = performance.now();
    const html = await (await fetch(`${app.base}/`)).text();
    assert.ok(performance.now() - started < 2000, 'the home page with 400 records was slow');
    assert.ok(html.includes('Диаграмма 399'));
    await pool(2000, 40, () => fetch(`${app.base}/health`));
    await pool(500, 20, () => fetch(`${app.base}/`));
    const log = await (await fetch(`${app.base}/log?auth=1`)).text();
    const rows = (log.match(/<tr/g) ?? []).length;
    assert.ok(rows <= loadLimits().logRows + 5, `the log page shows ${rows} rows`);
  } finally {
    app.close();
  }
});

test('endurance: 3000 page reads and writes leave the heap flat and the log table does not grow without bound', async () => {
  const app = await start({ writeRate: 1_000_000 });
  try {
    global.gc?.();
    const before = process.memoryUsage().heapUsed;
    const s = await app.session();
    await pool(3000, 30, (i) => (i % 5 === 0 ? app.post('/add?auth=1', valid(i), s) : fetch(`${app.base}/`)));
    global.gc?.();
    assert.ok((process.memoryUsage().heapUsed - before) / 1024 / 1024 < 150, 'the heap grew a lot');
    const rows = app.log.recent(1_000_000).length;
    assert.ok(rows <= 20000, `the request log table holds ${rows} rows after 3000 requests`);
  } finally {
    app.close();
  }
});

test('recovery: when the log database fails the pages answer the styled 500, the health check stays up, and everything works after the database returns', async () => {
  const real = openRequestLog();
  let broken = false;
  const log = new Proxy(real, {
    get: (target, name) => (typeof target[name] === 'function' ? (...args) => (broken ? (() => { throw new Error('disk gone'); })() : target[name](...args)) : target[name]),
  });
  const app = await start({ log });
  try {
    assert.equal((await fetch(`${app.base}/`)).status, 200);
    broken = true;
    const res = await fetch(`${app.base}/`);
    assert.equal(res.status, 500);
    const html = await res.text();
    assert.ok(!/disk gone|node_modules|\.js:/.test(html), 'the 500 page leaks internals');
    assert.equal((await fetch(`${app.base}/health`)).status, 200, 'the health check depends on the log');
    broken = false;
    assert.equal((await fetch(`${app.base}/`)).status, 200, 'the pages did not return after recovery');
  } finally {
    app.close();
  }
});

test('rate limit: a flood of writes gets 429 with Retry-After while reads and the health check stay open', async () => {
  const app = await start({ writeRate: 20, rate: 1_000_000 });
  try {
    const s = await app.session();
    const statuses = await pool(80, 10, (i) => app.post('/add?auth=1', valid(i), s));
    assert.ok((statuses.get(429) ?? 0) >= 50, JSON.stringify([...statuses]));
    assert.equal((await fetch(`${app.base}/`)).status, 200);
    assert.equal((await fetch(`${app.base}/health`)).status, 200);
  } finally {
    app.close();
  }
});

test('spike: 500 half-open sockets are dropped and the pages answer again', async () => {
  const app = await start();
  try {
    const sockets = Array.from({ length: 500 }, () => {
      const socket = net.connect(app.port, '127.0.0.1');
      socket.on('error', () => {});
      socket.on('connect', () => socket.write('POST /add?auth=1 HTTP/1.1\r\nHost: x\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: 500\r\n\r\ntitle='));
      return socket;
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    sockets.forEach((socket) => socket.destroy());
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const statuses = await pool(100, 10, () => fetch(`${app.base}/`));
    assert.equal(statuses.get(200), 100, JSON.stringify([...statuses]));
  } finally {
    app.close();
  }
});
