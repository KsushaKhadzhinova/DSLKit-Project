import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { createApp } from '../src/app.js';
import { createStores } from '../src/store.js';

// Smoke, load, stress, spike, volume, endurance, rate-limit recovery and concurrency tests of the in-memory REST API.

const start = async (options = {}) => {
  const clock = { time: 1_000_000 };
  const server = createApp({ stores: createStores(), writeError: () => {}, limit: { windowMs: 60000, max: 1_000_000 }, now: () => clock.time, ...options }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const call = (method, path, body) =>
    fetch(`${base}/api${path}`, { method, headers: body === undefined ? {} : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const close = async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  };
  return { base, port, call, clock, close };
};

const pool = async (total, concurrency, make) => {
  const statuses = new Map();
  const latencies = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < total) {
        const i = next++;
        const t = performance.now();
        let status;
        try {
          const res = await make(i);
          await res.arrayBuffer();
          status = res.status;
        } catch {
          status = 0;
        }
        latencies.push(performance.now() - t);
        statuses.set(status, (statuses.get(status) ?? 0) + 1);
      }
    }),
  );
  latencies.sort((a, b) => a - b);
  return { statuses, p95: latencies[Math.floor(latencies.length * 0.95)] };
};

const diagram = (i, projectId = 1) => ({ title: `Диаграмма ${i}`, notation: 'UML', code: 'a -> b', projectId });

test('smoke: health, one list per resource and a full round on a diagram', async () => {
  const app = await start();
  try {
    assert.equal((await fetch(`${app.base}/health`)).status, 200);
    for (const resource of ['users', 'projects', 'diagrams']) assert.equal((await app.call('GET', `/${resource}`)).status, 200);
    const created = await app.call('POST', '/diagrams', diagram(1));
    assert.equal(created.status, 201);
    const body = await created.json();
    const id = (body.data ?? body).id;
    assert.equal((await app.call('GET', `/diagrams/${id}`)).status, 200);
    assert.equal((await app.call('PATCH', `/diagrams/${id}`, { title: 'renamed' })).status, 200);
    assert.equal((await app.call('DELETE', `/diagrams/${id}`)).status, 204);
    assert.equal((await app.call('GET', `/diagrams/${id}`)).status, 404);
  } finally {
    await app.close();
  }
});

test('load: 3000 list reads with 50 clients all answer 200 and stay quick', async () => {
  const app = await start();
  try {
    const result = await pool(3000, 50, () => app.call('GET', '/diagrams?limit=20&sort=-title'));
    assert.equal(result.statuses.get(200), 3000, JSON.stringify([...result.statuses]));
    assert.ok(result.p95 < 1500, `p95 ${result.p95.toFixed(0)} ms`);
  } finally {
    await app.close();
  }
});

test('stress: valid and hostile requests from 100 clients never give a 5xx or a dropped socket', async () => {
  const app = await start();
  try {
    const kinds = [
      (i) => app.call('GET', `/diagrams?q=${encodeURIComponent('диа')}&page=${(i % 5) + 1}`),
      (i) => app.call('POST', '/diagrams', diagram(i)),
      () => fetch(`${app.base}/api/diagrams`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{broken' }),
      (i) => app.call('PATCH', `/diagrams/${(i % 20) + 1}`, { status: 'published' }),
      (i) => app.call('DELETE', `/diagrams/${(i % 20) + 1}`),
      () => app.call('GET', '/users?sort=constructor&limit=-5'),
      () => app.call('GET', '/projects/1/diagrams'),
      () => app.call('GET', '/diagrams/%00'),
      (i) => app.call('PUT', `/users/${(i % 2) + 1}`, { name: 'x'.repeat(5000) }),
    ];
    const result = await pool(2700, 100, (i) => kinds[i % kinds.length](i));
    const bad = [...result.statuses].filter(([status]) => status === 0 || status >= 500);
    assert.deepEqual(bad, [], JSON.stringify([...result.statuses]));
    assert.equal((await fetch(`${app.base}/health`)).status, 200);
  } finally {
    await app.close();
  }
});

test('spike: 1000 half-open sockets are dropped and the API answers again', async () => {
  const app = await start();
  try {
    const sockets = Array.from({ length: 1000 }, () => {
      const socket = net.connect(app.port, '127.0.0.1');
      socket.on('error', () => {});
      socket.on('connect', () => socket.write('POST /api/diagrams HTTP/1.1\r\nHost: x\r\nContent-Length: 50\r\n\r\n{'));
      return socket;
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    sockets.forEach((socket) => socket.destroy());
    // The operating system needs a moment to free 1000 closed connections; the API must be back within a second.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const result = await pool(200, 20, () => app.call('GET', '/users'));
    assert.equal(result.statuses.get(200), 200, JSON.stringify([...result.statuses]));
  } finally {
    await app.close();
  }
});

test('volume: 4000 diagrams are created, the last page is right and one list stays quick', async () => {
  const app = await start();
  try {
    const result = await pool(4000, 40, (i) => app.call('POST', '/diagrams', diagram(i, (i % 2) + 1)));
    const created = result.statuses.get(201) ?? 0;
    assert.equal(created, 4000, JSON.stringify([...result.statuses]));
    const t = performance.now();
    const res = await app.call('GET', '/diagrams?limit=100&page=40');
    const body = await res.json();
    assert.equal(body.meta.total, 4003);
    assert.equal(body.data.length, 100);
    assert.ok(performance.now() - t < 2000, 'a page of a big collection was slow');
    const found = await (await app.call('GET', `/diagrams?q=${encodeURIComponent('Диаграмма 3999')}`)).json();
    assert.ok(found.data.length >= 1);
  } finally {
    await app.close();
  }
});

test('endurance: 6000 create and delete pairs leave nothing behind and the heap stays flat', async () => {
  const app = await start();
  try {
    global.gc?.();
    const before = process.memoryUsage().heapUsed;
    const startTotal = (await (await app.call('GET', '/diagrams')).json()).meta.total;
    await pool(3000, 30, async (i) => {
      const created = await app.call('POST', '/diagrams', diagram(i));
      if (created.status !== 201) return created;
      const body = await created.json();
      return app.call('DELETE', `/diagrams/${(body.data ?? body).id}`);
    });
    global.gc?.();
    const endTotal = (await (await app.call('GET', '/diagrams')).json()).meta.total;
    assert.equal(endTotal, startTotal, 'records were left behind');
    assert.ok((process.memoryUsage().heapUsed - before) / 1024 / 1024 < 150, 'the heap grew a lot');
  } finally {
    await app.close();
  }
});

test('recovery of the rate limit: a flood gets 429, the health check stays open, and the quota returns with the next window', async () => {
  const app = await start({ limit: { windowMs: 60000, max: 50 } });
  try {
    const flood = await pool(300, 20, () => app.call('GET', '/users'));
    assert.equal(flood.statuses.get(200), 50, JSON.stringify([...flood.statuses]));
    assert.equal(flood.statuses.get(429), 250);
    assert.equal((await fetch(`${app.base}/health`)).status, 200, 'the health check shared the quota');
    app.clock.time += 60001;
    assert.equal((await app.call('GET', '/users')).status, 200, 'the quota did not return');
  } finally {
    await app.close();
  }
});

test('concurrency: parallel replace, patch and delete of one record leave whole data and unique ids', async () => {
  const app = await start();
  try {
    const first = await (await app.call('POST', '/diagrams', diagram(0))).json();
    const id = (first.data ?? first).id;
    const results = await Promise.all(
      Array.from({ length: 150 }, (_, i) => {
        if (i % 7 === 0) return app.call('DELETE', `/diagrams/${id}`);
        if (i % 2 === 0) return app.call('PATCH', `/diagrams/${id}`, { status: 'published' });
        return app.call('PUT', `/diagrams/${id}`, diagram(i));
      }),
    );
    for (const res of results) {
      await res.arrayBuffer();
      assert.ok([200, 204, 404].includes(res.status), `unexpected ${res.status}`);
    }
    const created = await Promise.all(Array.from({ length: 200 }, (_, i) => app.call('POST', '/diagrams', diagram(i)).then((r) => r.json())));
    const ids = created.map((c) => (c.data ?? c).id);
    assert.equal(new Set(ids).size, ids.length, 'two records got the same id');
  } finally {
    await app.close();
  }
});
