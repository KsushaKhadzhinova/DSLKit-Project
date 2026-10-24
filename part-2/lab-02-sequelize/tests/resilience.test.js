const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { createApp } = require('../src/app');
const { createModels } = require('../src/models');
const { createTempDatabase } = require('./helpers');

// Smoke, load, stress, volume, recovery, chaos, integrity and i18n tests of the real server over a migrated SQLite file.

const boot = async () => {
  const db = createTempDatabase();
  db.cli('db:migrate');
  const models = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  // A temporary file: fsync on every write would measure the disk of the computer, not the server.
  await models.sequelize.query('PRAGMA synchronous = OFF');
  const server = createApp(models).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const call = async (method, path, body, raw) => {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body === undefined && raw === undefined ? {} : { 'Content-Type': 'application/json' },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    return { res, status: res.status, body: json, text };
  };
  const close = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    server.closeAllConnections();
    server.close();
    await models.sequelize.close().catch(() => {});
    db.cleanup();
  };
  return { db, models, port, call, close };
};

const diagram = (n = 0, extra = {}) => ({ title: `Диаграмма ${n}`, notation: 'UML', sourceCode: 'a -> b', priority: 'low', owner: 'bot', ...extra });

const pool = async (total, concurrency, make) => {
  const statuses = new Map();
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < total) {
        const i = next++;
        const status = await make(i).catch(() => 0);
        statuses.set(status, (statuses.get(status) ?? 0) + 1);
      }
    }),
  );
  return statuses;
};

test('smoke: health and a full round on a project and a diagram', async () => {
  const app = await boot();
  try {
    assert.equal((await app.call('GET', '/health')).status, 200);
    const project = await app.call('POST', '/projects', { name: 'Smoke' });
    assert.equal(project.status, 201);
    const created = await app.call('POST', '/diagrams', diagram(1, { projectId: project.body.id }));
    assert.equal(created.status, 201);
    assert.equal((await app.call('GET', `/projects/${project.body.id}/diagrams`)).body.length, 1);
    assert.equal((await app.call('PATCH', `/diagrams/${created.body.id}`, { title: 'Новое' })).status, 200);
    assert.equal((await app.call('DELETE', `/diagrams/${created.body.id}`)).status, 204);
  } finally {
    await app.close();
  }
});

test('load and stress: 40 clients send reads, writes, deletes and hostile requests and no answer is a 5xx', async () => {
  const app = await boot();
  try {
    for (let i = 0; i < 30; i += 1) await app.call('POST', '/diagrams', diagram(i));
    const kinds = [
      () => app.call('GET', '/diagrams?limit=10&sort=title'),
      (i) => app.call('POST', '/diagrams', diagram(i)),
      () => app.call('POST', '/diagrams', undefined, '{broken'),
      (i) => app.call('PUT', `/diagrams/${(i % 30) + 1}`, diagram(i)),
      (i) => app.call('DELETE', `/diagrams/${(i % 30) + 1}`),
      () => app.call('GET', '/diagrams?sort=id;DROP TABLE Diagrams'),
      () => app.call('GET', '/projects/999/diagrams'),
      () => app.call('POST', '/diagrams', diagram(0, { projectId: 99999 })),
      () => app.call('GET', '/diagrams?q=%25_%00'),
    ];
    const statuses = await pool(900, 40, async (i) => (await kinds[i % kinds.length](i)).status);
    const bad = [...statuses].filter(([status]) => status === 0 || status >= 500);
    assert.deepEqual(bad, [], JSON.stringify([...statuses]));
    assert.equal((await app.call('GET', '/health')).status, 200);
  } finally {
    await app.close();
  }
});

test('volume: 1500 diagrams in one project, paged without gaps, and deleting the project keeps the diagrams', async () => {
  const app = await boot();
  try {
    const project = (await app.call('POST', '/projects', { name: 'Big' })).body;
    await app.models.Diagram.bulkCreate(Array.from({ length: 1500 }, (_, i) => ({ ...diagram(i), projectId: project.id })));
    const seen = new Set();
    for (let offset = 0; offset < 1500; offset += 250) {
      const { res, body } = await app.call('GET', `/diagrams?limit=100&offset=${offset}&sort=id`);
      assert.equal(res.status, 200);
      for (const d of body) {
        assert.ok(!seen.has(d.id), `id ${d.id} came twice`);
        seen.add(d.id);
      }
    }
    assert.equal((await app.call('DELETE', `/projects/${project.id}`)).status, 204);
    assert.equal(await app.models.Diagram.count(), 1500, 'deleting the project deleted its diagrams');
    assert.equal(await app.models.Diagram.count({ where: { projectId: project.id } }), 0, 'diagrams still point to a deleted project');
  } finally {
    await app.close();
  }
});

test('recovery: when the table disappears the server answers 500 or 503 without leaks, and works again after it returns', async () => {
  const app = await boot();
  try {
    await app.models.Diagram.drop();
    const { status, text } = await app.call('GET', '/diagrams');
    assert.ok([500, 503].includes(status), `gave ${status}`);
    assert.ok(!/SQLITE|no such table|SELECT|\.js:/i.test(text), `leaked: ${text.slice(0, 120)}`);
    await app.models.Diagram.sync();
    assert.equal((await app.call('GET', '/diagrams')).status, 200);
  } finally {
    await app.close();
  }
});

test('chaos: connections cut in the middle of a request and a closed database do not stop the process', async () => {
  const app = await boot();
  try {
    const body = JSON.stringify(diagram(1));
    for (let i = 0; i < 50; i += 1) {
      const socket = net.connect(app.port, '127.0.0.1');
      socket.on('error', () => {});
      socket.write(`POST /diagrams HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: ${body.length}\r\n\r\n${body.slice(0, i % body.length)}`);
      setTimeout(() => socket.destroy(), 5);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal((await app.call('GET', '/diagrams')).status, 200);
    await app.models.sequelize.close();
    const { status, text } = await app.call('GET', '/diagrams');
    assert.ok([500, 503].includes(status), `gave ${status}`);
    assert.ok(!/SQLITE|\.js:|node_modules/i.test(text));
  } finally {
    await app.close();
  }
});

test('data integrity: parallel PATCH requests keep a whole record and parallel POSTs make unique ids', async () => {
  const app = await boot();
  try {
    const { body: created } = await app.call('POST', '/diagrams', diagram(1));
    const patches = [{ title: 'А' }, { priority: 'high' }, { notation: 'BPMN' }, { sourceCode: 'x -> y' }];
    await Promise.all(Array.from({ length: 80 }, (_, i) => app.call('PATCH', `/diagrams/${created.id}`, patches[i % 4])));
    const { body } = await app.call('GET', `/diagrams/${created.id}`);
    assert.equal(body.id, created.id);
    assert.ok(['А', 'Диаграмма 1'].includes(body.title));
    const parallel = await Promise.all(Array.from({ length: 60 }, (_, i) => app.call('POST', '/diagrams', diagram(i))));
    const ids = parallel.map((r) => r.body.id);
    assert.equal(new Set(ids).size, 60);
  } finally {
    await app.close();
  }
});

test('i18n: Cyrillic, emoji, right-to-left and combining marks survive a round trip', async () => {
  const app = await boot();
  try {
    for (const title of ['Заказ №5 — оплата', '注文処理フロー', 'مخطط التسجيل', 'Café ☕', '👨‍👩‍👧‍👦 семья', 'é combining']) {
      const created = await app.call('POST', '/diagrams', diagram(0, { title }));
      assert.equal(created.status, 201, `${title} gave ${created.status}`);
      assert.equal((await app.call('GET', `/diagrams/${created.body.id}`)).body.title, title);
    }
  } finally {
    await app.close();
  }
});

test('retest: a search text with a NUL or another control character is refused with 400, it used to answer 500', async () => {
  const app = await boot();
  try {
    for (const q of ['%00', 'a%00b', '%07', '%1b%5b31m', '%0a']) {
      const { status, body } = await app.call('GET', `/diagrams?q=${q}`);
      assert.equal(status, 400, `q=${q} gave ${status}`);
      assert.equal(body.details[0].field, 'q');
    }
    assert.equal((await app.call('GET', '/diagrams?q=%D0%B4%D0%B8%D0%B0')).status, 200);
  } finally {
    await app.close();
  }
});
