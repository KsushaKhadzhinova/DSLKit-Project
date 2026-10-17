const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createModels } = require('../src/models');
const { createTempDatabase } = require('./helpers');

// Protocol details taught in module 1: status codes, idempotency, Content-Type, HEAD and OPTIONS, security headers, the request log.
const valid = { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 'low', owner: 'carol' };

const db = createTempDatabase();
let server;
let base;
let models;

const firstId = async () => (await models.Diagram.findOne()).id;
const pause = () => new Promise((resolve) => setTimeout(resolve, 150));

before(async () => {
  db.cli('db:migrate');
  models = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  server = createApp(models).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await pause();
  await models.sequelize.close();
  db.cleanup();
});

beforeEach(async () => {
  await models.Diagram.destroy({ where: {} });
  await models.Diagram.create({ title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> end', priority: 'high', owner: 'anna' });
});

const call = async (method, path, body, raw) => {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  return { res, body: text ? JSON.parse(text) : undefined };
};

test('a title, owner or source of only spaces, tabs or no-break spaces is rejected like an empty one', async () => {
  for (const blank of ['', ' ', '\t\n ', '  ']) {
    const { res, body } = await call('POST', '/diagrams', { ...valid, title: blank, owner: blank, sourceCode: blank });
    assert.equal(res.status, 400, JSON.stringify(blank));
    assert.deepEqual(
      body.details.map((d) => d.field),
      ['title', 'sourceCode', 'owner'],
    );
  }
});

test('a field of the wrong type is a 400, never a crash', async () => {
  for (const bad of [123, true, null, {}, [], ['a']]) {
    const { res } = await call('POST', '/diagrams', { ...valid, title: bad, sourceCode: bad, owner: bad, notation: bad, priority: bad === null ? 'low' : bad });
    assert.equal(res.status, 400, JSON.stringify(bad));
  }
});

test('a body that is not a JSON object answers 400, an empty body too', async () => {
  for (const raw of ['null', '"text"', '5', '[]', '{"title":', '']) {
    assert.equal((await call('POST', '/diagrams', {}, raw)).res.status, 400, JSON.stringify(raw));
  }
});

test('a request with a body in another Content-Type answers 415', async () => {
  for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'application/xml']) {
    const res = await fetch(`${base}/diagrams`, { method: 'POST', headers: { 'Content-Type': type }, body: JSON.stringify(valid) });
    assert.equal(res.status, 415, type);
  }
  const put = await fetch(`${base}/diagrams/1`, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: 'x' });
  assert.equal(put.status, 415);
  const ok = await fetch(`${base}/diagrams`, { method: 'POST', headers: { 'Content-Type': 'Application/JSON; charset=utf-8' }, body: JSON.stringify(valid) });
  assert.equal(ok.status, 201);
});

test('PUT is idempotent: the same request twice leaves one record in the same state', async () => {
  const id = await firstId();
  const first = await call('PUT', `/diagrams/${id}`, valid);
  const second = await call('PUT', `/diagrams/${id}`, valid);
  assert.equal(first.res.status, 200);
  assert.equal(second.res.status, 200);
  assert.deepEqual({ ...first.body, updatedAt: 0 }, { ...second.body, updatedAt: 0 });
  assert.equal(await models.Diagram.count(), 1);
});

test('POST is not idempotent: the same request twice creates two records', async () => {
  const first = await call('POST', '/diagrams', valid);
  const second = await call('POST', '/diagrams', valid);
  assert.notEqual(first.body.id, second.body.id);
  assert.equal(await models.Diagram.count(), 3);
});

test('HEAD answers like GET without a body and OPTIONS lists the methods with 204', async () => {
  const head = await fetch(`${base}/diagrams`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal((await fetch(`${base}/diagrams/9999`, { method: 'HEAD' })).status, 404);
  const options = await fetch(`${base}/diagrams/1`, { method: 'OPTIONS' });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('allow'), 'GET, PUT, DELETE, HEAD, OPTIONS');
});

test('security headers are set on every answer and the framework is not named', async () => {
  for (const path of ['/diagrams', '/nothing']) {
    const res = await fetch(base + path);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
    assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
    assert.equal(res.headers.get('x-powered-by'), null);
  }
});

test('every request is written to the RequestLog table with its status, and the query string is not stored', async () => {
  await models.RequestLog.destroy({ where: {} });
  await call('GET', '/diagrams?token=secret');
  await call('GET', '/nothing');
  // The status is written after the response is sent, so the rows are read once it had time to land.
  await pause();
  const rows = await models.RequestLog.findAll({ order: [['id', 'ASC']] });
  assert.deepEqual(
    rows.map((r) => [r.method, r.path, r.status]),
    [
      ['GET', '/diagrams', 200],
      ['GET', '/nothing', 404],
    ],
  );
  assert.ok(rows.every((r) => r.ip && r.createdAt));
});

test('control characters in the path cannot forge a log line', async () => {
  await models.RequestLog.destroy({ where: {} });
  await fetch(`${base}/a%0d%0aGET%20/forged%0a${'x'.repeat(500)}`);
  await pause();
  const [row] = await models.RequestLog.findAll();
  assert.doesNotMatch(row.path, /[\r\n]/);
  assert.equal(row.path.length, 200);
});

test('when the log cannot be written the client gets 500 without internals', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(models.RequestLog, 'create', async () => {
    throw new Error('disk is full');
  });
  const { res, body } = await call('GET', '/diagrams');
  assert.equal(res.status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
});

test('a database failure in a route also gives 500 without internals', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(models.Diagram, 'findAll', async () => {
    throw new Error('connection lost: password=hunter2');
  });
  const { res, body } = await call('GET', '/diagrams');
  assert.equal(res.status, 500);
  assert.equal(JSON.stringify(body).includes('hunter2'), false);
});
