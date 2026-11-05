const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const mongoose = require('mongoose');
const { startTestServer, createCaller } = require('./helpers');

// Smoke, load, stress, volume, concurrency, recovery and NoSQL-injection tests over a real throwaway MongoDB.

let ctx;
let call;
let models;

before(async () => {
  ctx = await startTestServer();
  models = ctx.models;
  call = createCaller(ctx.base);
});

after(() => ctx.stop());

beforeEach(async () => {
  await models.Diagram.deleteMany({});
});

const diagram = (n = 0, extra = {}) => ({ title: `Диаграмма ${n}`, notation: 'UML', sourceCode: 'a -> b', priority: 1, owner: 'bot', tags: ['load'], ...extra });

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

const status = async (method, path, body, raw) => (await call(method, path, body, raw).catch(() => ({ res: { status: 0 } }))).res.status;

test('smoke: a full round on a diagram, a comment, the count and the statistics', async () => {
  const created = await call('POST', '/diagrams', diagram(1));
  assert.equal(created.res.status, 201);
  const id = created.body.id;
  assert.equal((await call('POST', `/diagrams/${id}/comments`, { author: 'anna', text: 'ok' })).res.status, 201);
  assert.equal((await call('GET', `/diagrams/${id}`)).res.status, 200);
  assert.equal((await call('GET', '/diagrams/count')).res.status, 200);
  assert.equal((await call('GET', '/diagrams/stats')).res.status, 200);
  assert.equal((await call('PATCH', `/diagrams/${id}`, { title: 'Новое' })).res.status, 200);
  assert.equal((await call('DELETE', `/diagrams/${id}`)).res.status, 204);
});

test('load and stress: reads, writes, aggregations and hostile requests from 40 clients never give a 5xx', async () => {
  await models.Diagram.insertMany(Array.from({ length: 50 }, (_, i) => diagram(i)));
  const ids = (await models.Diagram.find().limit(20)).map((d) => String(d._id));
  const kinds = [
    () => status('GET', '/diagrams?limit=10&sort=title'),
    (i) => status('POST', '/diagrams', diagram(i)),
    () => status('POST', '/diagrams', undefined, '{broken'),
    (i) => status('PATCH', `/diagrams/${ids[i % 20]}`, { title: `P${i}` }),
    (i) => status('POST', `/diagrams/${ids[i % 20]}/comments`, { author: 'a', text: `c${i}` }),
    () => status('GET', '/diagrams/stats'),
    () => status('GET', '/diagrams/count?tag=load'),
    () => status('GET', '/diagrams?title[$ne]=x&owner[$gt]='),
    () => status('GET', '/diagrams?limit=-1&skip=abc'),
    () => status('GET', '/diagrams/%00'),
    (i) => status('DELETE', `/diagrams/${ids[i % 20]}`),
  ];
  const statuses = await pool(1100, 40, (i) => kinds[i % kinds.length](i));
  const bad = [...statuses].filter(([code]) => code === 0 || code >= 500);
  assert.deepEqual(bad, [], JSON.stringify([...statuses]));
  assert.equal((await call('GET', '/diagrams/count')).res.status, 200);
});

test('NoSQL injection: operator objects in bodies and queries are refused or ignored, never executed', async () => {
  await models.Diagram.create(diagram(1, { title: 'secret one', owner: 'anna' }));
  await models.Diagram.create(diagram(2, { title: 'secret two', owner: 'boris' }));
  const operators = [
    '/diagrams?owner[$ne]=zzz',
    '/diagrams?owner[$regex]=.*',
    '/diagrams?title[$gt]=',
    '/diagrams?tag[$in][]=load',
    '/diagrams?$where=sleep(5000)',
    '/diagrams?q[$ne]=x',
    '/diagrams/count?owner[$ne]=zzz',
    '/diagrams?sort[$meta]=x',
    '/diagrams?limit[$gt]=0',
  ];
  for (const path of operators) {
    const started = performance.now();
    const { res, body } = await call('GET', path);
    assert.ok(res.status === 400 || (res.status === 200 && !Array.isArray(body)) || (res.status === 200 && body.length <= 2), `${path} gave ${res.status}`);
    assert.ok(res.status < 500, `${path} gave ${res.status}`);
    assert.ok(performance.now() - started < 3000, `${path} was slow`);
  }
  for (const owner of [{ $ne: 'x' }, { $gt: '' }, { $regex: '.*' }, ['a', 'b'], null, 5]) {
    const created = await call('POST', '/diagrams', diagram(3, { owner }));
    assert.equal(created.res.status, 400, `an owner of ${JSON.stringify(owner)} was accepted`);
  }
  const target = await models.Diagram.findOne({ owner: 'anna' });
  for (const patch of [{ $set: { owner: 'hacked' } }, { 'comments.0.text': 'x' }, { __proto__: { admin: true }, title: 'ok' }, { $inc: { priority: 99 } }, { _id: '64b7f0c2a1b2c3d4e5f60718' }]) {
    const { res } = await call('PATCH', `/diagrams/${target._id}`, patch);
    assert.ok(res.status < 500, `a patch of ${JSON.stringify(patch)} gave ${res.status}`);
  }
  const after = await models.Diagram.findById(target._id);
  assert.equal(after.owner, 'anna');
  assert.equal(String(after._id), String(target._id));
  assert.ok(after.priority <= 2, 'an operator in a patch changed the priority');
});

test('volume: 1500 diagrams are paged without gaps, searched and aggregated quickly', async () => {
  await models.Diagram.insertMany(Array.from({ length: 1500 }, (_, i) => diagram(i, { tags: [`t${i % 10}`], priority: i % 3 })));
  const seen = new Set();
  for (let skip = 0; skip < 1500; skip += 100) {
    const { res, body } = await call('GET', `/diagrams?limit=100&skip=${skip}&sort=title`);
    assert.equal(res.status, 200);
    for (const d of body) {
      assert.ok(!seen.has(d.id), `id ${d.id} came twice`);
      seen.add(d.id);
    }
  }
  assert.equal(seen.size, 1500);
  const started = performance.now();
  const stats = await call('GET', '/diagrams/stats');
  assert.equal(stats.res.status, 200);
  assert.ok(performance.now() - started < 3000, 'the aggregation over 1500 documents was slow');
  const count = await call('GET', '/diagrams/count');
  assert.equal(count.body.count ?? count.body.total ?? Object.values(count.body)[0], 1500);
});

test('concurrency: 150 parallel comments on one diagram stay within the limit of 100 and none is lost below it', async () => {
  const { body: created } = await call('POST', '/diagrams', diagram(1));
  const results = await Promise.all(Array.from({ length: 150 }, (_, i) => status('POST', `/diagrams/${created.id}/comments`, { author: `a${i}`, text: `text ${i}` })));
  const ok = results.filter((code) => code === 201).length;
  const refused = results.filter((code) => code === 400 || code === 409 || code === 422 || code === 429).length;
  assert.equal(results.filter((code) => code >= 500 || code === 0).length, 0, JSON.stringify(results));
  const stored = await models.Diagram.findById(created.id);
  assert.ok(stored.comments.length <= 100, `${stored.comments.length} comments are stored, over the limit of 100`);
  assert.equal(stored.comments.length, ok, 'the number of stored comments differs from the number of 201 answers');
  assert.equal(ok + refused, 150);
  const ids = new Set(stored.comments.map((c) => String(c._id)));
  assert.equal(ids.size, stored.comments.length, 'two comments got the same id');
});

test('data integrity: parallel PATCH requests keep a whole document with a valid priority and the creation time', async () => {
  const { body: created } = await call('POST', '/diagrams', diagram(1));
  const patches = [{ title: 'А' }, { priority: 2 }, { notation: 'BPMN' }, { tags: ['x', 'y'] }];
  await Promise.all(Array.from({ length: 80 }, (_, i) => call('PATCH', `/diagrams/${created.id}`, patches[i % 4])));
  const { body } = await call('GET', `/diagrams/${created.id}`);
  assert.equal(body.id, created.id);
  assert.equal(body.createdAt, created.createdAt);
  assert.ok([1, 2].includes(body.priority));
  assert.ok(['UML', 'BPMN'].includes(body.notation));
});

test('chaos: connections cut in the middle of a request leave the server working', async () => {
  const port = new URL(ctx.base).port;
  const body = JSON.stringify(diagram(1));
  for (let i = 0; i < 50; i += 1) {
    const socket = net.connect(port, '127.0.0.1');
    socket.on('error', () => {});
    socket.write(`POST /diagrams HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: ${body.length}\r\n\r\n${body.slice(0, i % body.length)}`);
    setTimeout(() => socket.destroy(), 5);
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal((await call('GET', '/diagrams')).res.status, 200);
});

test('recovery: without the database the server answers 503 without internals, and works again after reconnecting', async () => {
  await call('POST', '/diagrams', diagram(1));
  const { host, port, name } = mongoose.connection;
  const uri = `mongodb://${host}:${port}/${name}`;
  await mongoose.disconnect();
  for (const [method, path, body] of [['GET', '/diagrams'], ['POST', '/diagrams', diagram(2)], ['GET', '/diagrams/stats']]) {
    const { res, body: answer } = await call(method, path, body);
    assert.ok([500, 503].includes(res.status), `${method} ${path} gave ${res.status}`);
    assert.ok(!/mongo|ECONN|\.js:|node_modules/i.test(JSON.stringify(answer ?? {})), `${method} ${path} leaked: ${JSON.stringify(answer).slice(0, 120)}`);
  }
  await mongoose.connect(uri);
  assert.equal((await call('GET', '/diagrams')).res.status, 200, 'the server did not recover');
});

test('i18n: Cyrillic, emoji, right-to-left and combining marks survive a round trip and are searchable', async () => {
  for (const title of ['Заказ №5 — оплата', '注文処理フロー', 'مخطط التسجيل', 'Café ☕', '👨‍👩‍👧‍👦 семья', 'é combining']) {
    const created = await call('POST', '/diagrams', diagram(0, { title }));
    assert.equal(created.res.status, 201, `${title} gave ${created.res.status}`);
    assert.equal((await call('GET', `/diagrams/${created.body.id}`)).body.title, title);
  }
});
