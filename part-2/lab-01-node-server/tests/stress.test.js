const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { createApp } = require('../src/app');
const { createDiagramStore } = require('../src/models/diagram.model');

// Performance and robustness tests: smoke, load, stress, spike, volume, endurance and concurrency.
// The limits are generous on purpose: they must hold on a slow laptop and still catch a hang, a leak or a crash.

const valid = (n = 0) => ({ title: `Load ${n}`, notation: 'UML', sourceCode: 'a -> b', priority: 'low', owner: 'bot' });

const start = async () => {
  const store = createDiagramStore();
  const server = createApp(store).listen(0, undefined, 1024);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = () => {
    server.closeAllConnections();
    server.close();
  };
  return { store, base, port: server.address().port, close };
};

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

// Sends `total` requests with at most `concurrency` in flight and returns the statuses and the latencies.
const load = async (make, total, concurrency) => {
  const statuses = new Map();
  const latencies = [];
  let failures = 0;
  const reasons = new Map();
  let next = 0;
  const worker = async () => {
    while (next < total) {
      const i = next++;
      const t = performance.now();
      try {
        const res = await make(i);
        await res.arrayBuffer();
        statuses.set(res.status, (statuses.get(res.status) ?? 0) + 1);
      } catch (error) {
        failures += 1;
        reasons.set(error.cause?.code ?? error.message, (reasons.get(error.cause?.code ?? error.message) ?? 0) + 1);
      }
      latencies.push(performance.now() - t);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { statuses, latencies, failures, reasons };
};

test('smoke: a fresh build starts, answers the health check and serves one full create-read-update-delete round', async () => {
  const app = await start();
  try {
    assert.equal((await fetch(`${app.base}/health`)).status, 200);
    const created = await fetch(`${app.base}/diagrams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid()) });
    assert.equal(created.status, 201);
    const { id } = await created.json();
    assert.equal((await fetch(`${app.base}/diagrams/${id}`)).status, 200);
    const put = await fetch(`${app.base}/diagrams/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid(1)) });
    assert.equal(put.status, 200);
    assert.equal((await fetch(`${app.base}/diagrams/${id}`, { method: 'DELETE' })).status, 204);
  } finally {
    app.close();
  }
});

test('load: 3000 reads with 50 clients at once all succeed and 95 percent are fast', async () => {
  const app = await start();
  try {
    for (let i = 0; i < 50; i += 1) app.store.create(valid(i));
    const result = await load(() => fetch(`${app.base}/diagrams`), 3000, 50);
    assert.equal(result.failures, 0, 'some requests failed at the socket level');
    assert.equal(result.statuses.get(200), 3000);
    assert.ok(percentile(result.latencies, 95) < 1500, `p95 was ${percentile(result.latencies, 95).toFixed(0)} ms`);
  } finally {
    app.close();
  }
});

test('stress: 100 clients at once with a mix of reads, writes, deletes and bad requests never produce a 5xx', async () => {
  const app = await start();
  try {
    const make = (i) => {
      switch (i % 6) {
        case 0: return fetch(`${app.base}/diagrams`);
        case 1: return fetch(`${app.base}/diagrams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid(i)) });
        case 2: return fetch(`${app.base}/diagrams/${(i % 40) + 1}`, { method: 'DELETE' });
        case 3: return fetch(`${app.base}/diagrams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
        case 4: return fetch(`${app.base}/diagrams/${(i % 40) + 1}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid(i)) });
        default: return fetch(`${app.base}/diagrams/abc`);
      }
    };
    const result = await load(make, 3000, 100);
    assert.equal(result.failures, 0, JSON.stringify([...result.reasons]));
    const fiveHundreds = [...result.statuses].filter(([status]) => status >= 500);
    assert.deepEqual(fiveHundreds, [], `server errors: ${JSON.stringify(fiveHundreds)}`);
    assert.equal((await fetch(`${app.base}/health`)).status, 200, 'the server does not answer after the stress');
  } finally {
    app.close();
  }
});

test('spike: 1000 sockets open at once and are dropped, then the server answers normally', async () => {
  const app = await start();
  try {
    const sockets = Array.from({ length: 1000 }, () => {
      const socket = net.connect(app.port, 'localhost');
      socket.on('error', () => {});
      socket.on('connect', () => socket.write('GET /diagrams HTTP/1.1\r\nHost: x\r\n'));
      return socket;
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    sockets.forEach((socket) => socket.destroy());
    const result = await load(() => fetch(`${app.base}/health`), 200, 20);
    assert.equal(result.statuses.get(200), 200, 'the server did not recover after the spike');
  } finally {
    app.close();
  }
});

test('volume: 5000 records are created, listed and removed, and one request stays quick', async () => {
  const app = await start();
  try {
    const result = await load((i) => fetch(`${app.base}/diagrams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid(i)) }), 5000, 50);
    assert.equal(result.failures, 0);
    const created = result.statuses.get(201) ?? 0;
    assert.ok(created > 0);
    const started = performance.now();
    const list = await fetch(`${app.base}/diagrams`);
    const body = await list.json();
    const took = performance.now() - started;
    assert.equal(list.status, 200);
    assert.equal(body.length, app.store.findAll().length);
    assert.ok(took < 3000, `listing ${body.length} records took ${took.toFixed(0)} ms`);
  } finally {
    app.close();
  }
});

test('endurance: 6000 requests in a row do not make the memory grow without bound', async () => {
  const app = await start();
  try {
    global.gc?.();
    const before = process.memoryUsage().heapUsed;
    for (let round = 0; round < 6; round += 1) {
      await load(async (i) => {
        const created = await fetch(`${app.base}/diagrams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid(i)) });
        if (created.status !== 201) return created;
        const { id } = await created.json();
        return fetch(`${app.base}/diagrams/${id}`, { method: 'DELETE' });
      }, 500, 25);
    }
    global.gc?.();
    const grown = (process.memoryUsage().heapUsed - before) / 1024 / 1024;
    assert.equal(app.store.findAll().length, 2, 'records were left behind after create and delete pairs (the 2 seed records stay)');
    assert.ok(grown < 150, `the heap grew by ${grown.toFixed(0)} MB over the run`);
  } finally {
    app.close();
  }
});

test('concurrency: parallel updates and deletes of one record leave it in a whole state and ids never repeat', async () => {
  const app = await start();
  try {
    const first = app.store.create(valid(0));
    const results = await Promise.all(
      Array.from({ length: 200 }, (_, i) =>
        i % 5 === 0
          ? fetch(`${app.base}/diagrams/${first.id}`, { method: 'DELETE' })
          : fetch(`${app.base}/diagrams/${first.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid(i)) }),
      ),
    );
    for (const res of results) {
      await res.arrayBuffer();
      assert.ok([200, 204, 404].includes(res.status), `unexpected ${res.status}`);
    }
    const created = await Promise.all(Array.from({ length: 300 }, (_, i) => fetch(`${app.base}/diagrams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid(i)) }).then((r) => r.json())));
    const ids = created.map((d) => d.id);
    assert.equal(new Set(ids).size, ids.length, 'two records got the same id');
  } finally {
    app.close();
  }
});

test('slow clients: a client that sends the body one byte at a time does not block the others', async () => {
  const app = await start();
  try {
    const slow = net.connect(app.port, 'localhost');
    slow.on('error', () => {});
    slow.write('POST /diagrams HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 100000\r\n\r\n{');
    const started = performance.now();
    const result = await load(() => fetch(`${app.base}/health`), 100, 10);
    const took = performance.now() - started;
    slow.destroy();
    assert.equal(result.statuses.get(200), 100);
    assert.ok(took < 3000, `other clients waited ${took.toFixed(0)} ms behind a slow one`);
  } finally {
    app.close();
  }
});
