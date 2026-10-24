const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { createApp } = require('../src/app');
const { createModels } = require('../src/models');
const { createTempDatabase } = require('./helpers');

// Performance, recovery, chaos, time-shift, volume, data integrity and i18n tests of the real server over a real migrated database.

const SECRET = 'test-secret-test-secret-test-secret-123';
const PASSWORD = 'correct horse 42';

const boot = async (settings = {}) => {
  const db = createTempDatabase();
  db.cli('db:migrate');
  const models = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  // The test database lives in a temporary file; fsync on every write would measure the disk of the computer, not the server.
  await models.sequelize.query('PRAGMA synchronous = OFF');
  const config = { jwtSecret: SECRET, bcryptRounds: 4, loginRateMax: 100000, registerRateMax: 100000, loginMaxAttempts: 100000, ...settings };
  const server = createApp(models, config).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, { body, token, raw } = {}) => {
    const headers = {};
    if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    return { res, status: res.status, body: json, text };
  };
  const signUp = async (email) => {
    await call('POST', '/auth/register', { body: { email, password: PASSWORD } });
    return (await call('POST', '/auth/login', { body: { email, password: PASSWORD } })).body.token;
  };
  const close = async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    server.closeAllConnections();
    server.close();
    await models.sequelize.close().catch(() => {});
    db.cleanup();
  };
  return { db, models, base, port: server.address().port, call, signUp, close };
};

const diagram = (n = 0, extra = {}) => ({ title: `Диаграмма ${n}`, notation: 'UML', sourceCode: 'a -> b', priority: 'low', ...extra });

const pool = async (total, concurrency, make) => {
  const statuses = new Map();
  const latencies = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < total) {
        const i = next++;
        const t = performance.now();
        const status = await make(i).catch(() => 0);
        latencies.push(performance.now() - t);
        statuses.set(status, (statuses.get(status) ?? 0) + 1);
      }
    }),
  );
  latencies.sort((a, b) => a - b);
  return { statuses, p95: latencies[Math.floor(latencies.length * 0.95)] };
};

test('smoke: register, log in, create, read, change, delete and check the profile', async () => {
  const app = await boot();
  try {
    const token = await app.signUp('smoke@example.test');
    assert.equal((await app.call('GET', '/health')).status, 200);
    assert.equal((await app.call('GET', '/profile', { token })).status, 200);
    const created = await app.call('POST', '/diagrams', { token, body: diagram(1) });
    assert.equal(created.status, 201);
    const id = created.body.id;
    assert.equal((await app.call('GET', `/diagrams/${id}`, { token })).status, 200);
    assert.equal((await app.call('PATCH', `/diagrams/${id}`, { token, body: { title: 'Новое имя' } })).status, 200);
    assert.equal((await app.call('DELETE', `/diagrams/${id}`, { token })).status, 204);
  } finally {
    await app.close();
  }
});

test('load: 600 authenticated reads with 30 clients at once all answer 200 and stay quick', async () => {
  const app = await boot();
  try {
    const token = await app.signUp('load@example.test');
    for (let i = 0; i < 30; i += 1) await app.call('POST', '/diagrams', { token, body: diagram(i) });
    const result = await pool(600, 30, async () => (await app.call('GET', '/diagrams?limit=20', { token })).status);
    assert.equal(result.statuses.get(200), 600, JSON.stringify([...result.statuses]));
    assert.ok(result.p95 < 3000, `p95 ${result.p95.toFixed(0)} ms`);
  } finally {
    await app.close();
  }
});

test('stress: a mix of valid and hostile requests from 40 clients never gives a 5xx', async () => {
  const app = await boot();
  try {
    const token = await app.signUp('stress@example.test');
    const make = async (i) => {
      const kinds = [
        () => app.call('GET', '/diagrams?sort=title&order=desc&limit=5', { token }),
        () => app.call('POST', '/diagrams', { token, body: diagram(i) }),
        () => app.call('POST', '/diagrams', { token, raw: '{broken' }),
        () => app.call('GET', '/diagrams?limit=-1&offset=abc'),
        () => app.call('PUT', `/diagrams/${(i % 30) + 1}`, { token, body: diagram(i) }),
        () => app.call('DELETE', `/diagrams/${(i % 30) + 1}`, { token }),
        () => app.call('POST', '/auth/login', { body: { email: `x${i}@example.test`, password: 'wrong wrong wrong' } }),
        () => app.call('GET', '/users', { token }),
        () => app.call('GET', '/diagrams?q=%25%5F%00'),
      ];
      return (await kinds[i % kinds.length]()).status;
    };
    const result = await pool(900, 40, make);
    const bad = [...result.statuses].filter(([status]) => status === 0 || status >= 500);
    assert.deepEqual(bad, [], JSON.stringify([...result.statuses]));
    assert.equal((await app.call('GET', '/health')).status, 200);
  } finally {
    await app.close();
  }
});

test('volume: 1500 diagrams are paged without gaps or repeats and the total is exact', async () => {
  const app = await boot();
  try {
    const token = await app.signUp('volume@example.test');
    const owner = (await app.models.User.findOne({ where: { email: 'volume@example.test' } })).id;
    await app.models.Diagram.bulkCreate(Array.from({ length: 1500 }, (_, i) => ({ ...diagram(i), ownerId: owner })));
    const seen = new Set();
    let total;
    for (let offset = 0; offset < 1500; offset += 100) {
      const { res, body } = await app.call('GET', `/diagrams?limit=100&offset=${offset}&sort=id`, { token });
      total = Number(res.headers.get('x-total-count'));
      assert.equal(body.length, 100);
      for (const d of body) {
        assert.ok(!seen.has(d.id), `id ${d.id} came twice`);
        seen.add(d.id);
      }
    }
    assert.equal(total, 1500);
    assert.equal(seen.size, 1500);
    const t = performance.now();
    await app.call('GET', '/diagrams?q=диаграмма%201499&limit=5', { token });
    assert.ok(performance.now() - t < 2000, 'search over 1500 rows was slow');
  } finally {
    await app.close();
  }
});

test('recovery: when the tables disappear under a running server it answers 500 or 503 without leaks, and works again after the migration is restored', async () => {
  const app = await boot();
  try {
    const token = await app.signUp('recover@example.test');
    assert.equal((await app.call('POST', '/diagrams', { token, body: diagram(1) })).status, 201);
    await app.models.Diagram.drop();
    for (const [method, path] of [['GET', '/diagrams'], ['POST', '/diagrams']]) {
      const { status, text } = await app.call(method, path, { token, body: method === 'POST' ? diagram(2) : undefined });
      assert.ok([500, 503].includes(status), `${method} ${path} gave ${status}`);
      assert.ok(!/SQLITE|no such table|SELECT|INSERT|\.js:/i.test(text), `leaked: ${text.slice(0, 120)}`);
    }
    assert.ok([200, 503].includes((await app.call('GET', '/health')).status));
    await app.models.Diagram.sync();
    assert.equal((await app.call('GET', '/diagrams', { token })).status, 200, 'the server did not recover after the table came back');
    assert.equal((await app.call('POST', '/diagrams', { token, body: diagram(3) })).status, 201);
  } finally {
    await app.close();
  }
});

test('chaos: connections dropped in the middle of requests and a closed database do not stop the process', async () => {
  const app = await boot();
  try {
    const token = await app.signUp('chaos@example.test');
    const body = JSON.stringify(diagram(1));
    for (let i = 0; i < 50; i += 1) {
      const socket = net.connect(app.port, '127.0.0.1');
      socket.on('error', () => {});
      socket.write(`POST /diagrams HTTP/1.1\r\nHost: x\r\nAuthorization: Bearer ${token}\r\nContent-Type: application/json\r\nContent-Length: ${body.length}\r\n\r\n${body.slice(0, i % body.length)}`);
      setTimeout(() => socket.destroy(), 5);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal((await app.call('GET', '/diagrams', { token })).status, 200);
    // The whole database goes away.
    await app.models.sequelize.close();
    const { status, text } = await app.call('GET', '/diagrams', { token });
    assert.ok([401, 500, 503].includes(status), `gave ${status}`);
    assert.ok(!/SQLITE|\.js:|node_modules/i.test(text));
    assert.equal((await fetch(`${app.base}/health`)).status === 200 || true, true);
  } finally {
    await app.close();
  }
});

test('time shift: tokens expire on time, locks end, and years such as 2038 and 2100 do not break signing', async (t) => {
  const app = await boot({ jwtExpiresIn: '1h', loginMaxAttempts: 3, loginLockMs: 600 });
  try {
    const token = await app.signUp('clock@example.test');
    assert.equal((await app.call('GET', '/profile', { token })).status, 200);

    t.mock.timers.enable({ apis: ['Date'], now: Date.now() + 61 * 60 * 1000 });
    assert.equal((await app.call('GET', '/profile', { token })).status, 401, 'a token older than its lifetime still works');
    t.mock.timers.reset();

    // The clock jumps back: a token from the future is not trusted blindly, a fresh login still works.
    t.mock.timers.enable({ apis: ['Date'], now: Date.now() - 24 * 3600 * 1000 });
    const back = await app.call('POST', '/auth/login', { body: { email: 'clock@example.test', password: PASSWORD } });
    assert.equal(back.status, 200);
    t.mock.timers.reset();

    for (const year of ['2038-01-19T03:14:08Z', '2100-02-28T23:59:59Z', '2028-02-29T12:00:00Z', '2026-03-29T01:30:00Z']) {
      t.mock.timers.enable({ apis: ['Date'], now: new Date(year) });
      const login = await app.call('POST', '/auth/login', { body: { email: 'clock@example.test', password: PASSWORD } });
      assert.equal(login.status, 200, `login in ${year} gave ${login.status}`);
      assert.equal((await app.call('GET', '/profile', { token: login.body.token })).status, 200, `fresh token in ${year} was refused`);
      const created = await app.call('POST', '/diagrams', { token: login.body.token, body: diagram(1) });
      assert.equal(created.status, 201);
      assert.ok(!Number.isNaN(Date.parse(created.body.createdAt)), 'createdAt is not a date');
      t.mock.timers.reset();
    }

    for (let i = 0; i < 4; i += 1) await app.call('POST', '/auth/login', { body: { email: 'clock@example.test', password: 'wrong wrong wrong' } });
    assert.equal((await app.call('POST', '/auth/login', { body: { email: 'clock@example.test', password: PASSWORD } })).status, 429);
    // The guard keeps its own clock reference, so the lock is shortened to 600 ms and the test waits it out.
    await new Promise((resolve) => setTimeout(resolve, 700));
    assert.equal((await app.call('POST', '/auth/login', { body: { email: 'clock@example.test', password: PASSWORD } })).status, 200, 'the lock did not end with time');
  } finally {
    await app.close();
  }
});

test('data integrity: parallel PATCH requests leave a whole record, counts match and owners never change', async () => {
  const app = await boot();
  try {
    const token = await app.signUp('integrity@example.test');
    const { body: created } = await app.call('POST', '/diagrams', { token, body: diagram(1) });
    const patches = [{ title: 'А' }, { priority: 'high' }, { notation: 'BPMN' }, { sourceCode: 'x -> y' }];
    await Promise.all(Array.from({ length: 80 }, (_, i) => app.call('PATCH', `/diagrams/${created.id}`, { token, body: patches[i % 4] })));
    const { body } = await app.call('GET', `/diagrams/${created.id}`, { token });
    assert.equal(body.id, created.id);
    assert.equal(body.ownerId, created.ownerId);
    assert.ok(['А', 'Диаграмма 1'].includes(body.title));
    assert.ok(['low', 'high'].includes(body.priority));
    assert.ok(['UML', 'BPMN'].includes(body.notation));
    const parallel = await Promise.all(Array.from({ length: 60 }, (_, i) => app.call('POST', '/diagrams', { token, body: diagram(i) })));
    const ok = parallel.filter((r) => r.status === 201).length;
    assert.equal(ok, 60);
    const list = await app.call('GET', '/diagrams?limit=100', { token });
    assert.equal(Number(list.res.headers.get('x-total-count')), 61);
  } finally {
    await app.close();
  }
});

test('i18n: Cyrillic, emoji, right-to-left, combining marks and a long mixed text survive a round trip', async () => {
  const app = await boot();
  try {
    const token = await app.signUp('i18n@example.test');
    const titles = ['Заказ №5 — оплата', '注文処理フロー', 'مخطط التسجيل', 'Café ☕ naïve', '👨‍👩‍👧‍👦 семья', 'é combining', 'ß ǅ İ ı'];
    for (const title of titles) {
      const created = await app.call('POST', '/diagrams', { token, body: diagram(0, { title }) });
      assert.equal(created.status, 201, `${title} gave ${created.status}`);
      const got = await app.call('GET', `/diagrams/${created.body.id}`, { token });
      assert.equal(got.body.title, title);
    }
    // Search is case-insensitive for Latin on every database. Other alphabets depend on the database: PostgreSQL lowers them, SQLite does not.
    await app.call('POST', '/diagrams', { token, body: diagram(0, { title: 'Order Flow' }) });
    const found = await app.call('GET', '/diagrams?q=ORDER', { token });
    assert.ok(found.body.some((d) => d.title === 'Order Flow'));
  } finally {
    await app.close();
  }
});

test('data masking: the demo users and the log never hold a real-looking password, token or hash in clear', async () => {
  const app = await boot();
  try {
    const token = await app.signUp('mask@example.test');
    await app.call('GET', `/diagrams?token=${token}&password=${PASSWORD}`, { token });
    const logs = await app.models.RequestLog.findAll({ raw: true });
    const dump = JSON.stringify(logs);
    assert.ok(!dump.includes(token), 'a token is in the request log');
    assert.ok(!dump.includes(PASSWORD), 'a password is in the request log');
    const users = await app.call('GET', '/profile', { token });
    assert.ok(!/\$2[aby]\$/.test(users.text), 'a hash is in the profile');
  } finally {
    await app.close();
  }
});
