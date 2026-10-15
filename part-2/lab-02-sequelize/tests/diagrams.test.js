const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createModels } = require('../src/models');
const { createTempDatabase } = require('./helpers');

const valid = { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 'low', owner: 'carol' };

const db = createTempDatabase();
let server;
let base;
let models;

const firstId = async () => (await models.Diagram.findOne()).id;

before(async () => {
  db.cli('db:migrate');
  models = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  server = createApp(models).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
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

test('GET /diagrams returns the list', async () => {
  const { res, body } = await call('GET', '/diagrams');
  assert.equal(res.status, 200);
  assert.equal(body.length, 1);
  assert.equal(body[0].title, 'Order processing');
});

test('GET /diagrams/:id returns one diagram', async () => {
  const { res, body } = await call('GET', `/diagrams/${await firstId()}`);
  assert.equal(res.status, 200);
  assert.equal(body.owner, 'anna');
});

test('GET /diagrams/:id answers 404 for a missing diagram', async () => {
  const { res, body } = await call('GET', '/diagrams/9999');
  assert.equal(res.status, 404);
  assert.match(body.error, /not found/);
});

test('GET /diagrams/:id answers 400 for a non-numeric id', async () => {
  for (const id of ['abc', '0', '-3', '1.5']) {
    const { res, body } = await call('GET', `/diagrams/${id}`);
    assert.equal(res.status, 400, id);
    assert.match(body.error, /positive integer/);
  }
});

test('POST /diagrams creates a diagram, answers 201 with Location', async () => {
  const { res, body } = await call('POST', '/diagrams', valid);
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), `/diagrams/${body.id}`);
  assert.deepEqual(
    { ...body, id: undefined, createdAt: undefined, updatedAt: undefined },
    { ...valid, id: undefined, createdAt: undefined, updatedAt: undefined },
  );
  assert.equal((await models.Diagram.findByPk(body.id)).title, 'Login flow');
});

test('POST /diagrams defaults the priority and drops unknown fields', async () => {
  const { priority, ...rest } = valid;
  const { res, body } = await call('POST', '/diagrams', { ...rest, admin: true });
  assert.equal(res.status, 201);
  assert.equal(body.priority, 'normal');
  assert.equal('admin' in body, false);
});

test('POST /diagrams answers 400 with details for invalid data', async () => {
  const { res, body } = await call('POST', '/diagrams', { title: ' ', notation: 'XYZ', sourceCode: 5 });
  assert.equal(res.status, 400);
  assert.equal(body.error, 'Invalid diagram data');
  assert.deepEqual(body.details.map((d) => d.field).sort(), ['notation', 'owner', 'sourceCode', 'title']);
});

test('POST /diagrams answers 400 for a body that is not an object', async () => {
  for (const payload of [[], undefined]) {
    const { res, body } = await call('POST', '/diagrams', payload);
    assert.equal(res.status, 400);
    assert.equal(body.error, 'Request body must be a JSON object');
  }
  // express.json() in strict mode already rejects JSON primitives
  for (const payload of [null, 'text', 7]) {
    assert.equal((await call('POST', '/diagrams', payload)).res.status, 400);
  }
});

test('POST /diagrams answers 400 for malformed JSON', async () => {
  const { res, body } = await call('POST', '/diagrams', {}, '{"title": ');
  assert.equal(res.status, 400);
  assert.equal(body.error, 'Malformed JSON in request body');
});

test('PUT /diagrams/:id replaces the whole diagram', async () => {
  const id = await firstId();
  const { res, body } = await call('PUT', `/diagrams/${id}`, valid);
  assert.equal(res.status, 200);
  assert.deepEqual({ ...body, createdAt: undefined, updatedAt: undefined }, { id, ...valid, createdAt: undefined, updatedAt: undefined });
  assert.equal(await models.Diagram.count(), 1);
});

test('PUT /diagrams/:id answers 404 for a missing diagram and 400 for invalid data', async () => {
  assert.equal((await call('PUT', '/diagrams/9999', valid)).res.status, 404);
  const id = await firstId();
  assert.equal((await call('PUT', `/diagrams/${id}`, { title: 'only title' })).res.status, 400);
  assert.equal((await call('PUT', '/diagrams/abc', valid)).res.status, 400);
});

test('DELETE /diagrams/:id answers 204, then 404 for the same id', async () => {
  const id = await firstId();
  const first = await call('DELETE', `/diagrams/${id}`);
  assert.equal(first.res.status, 204);
  assert.equal(first.body, undefined);
  assert.equal((await call('DELETE', `/diagrams/${id}`)).res.status, 404);
  assert.equal((await call('GET', '/diagrams')).body.length, 0);
});

test('an unknown route answers 404 as JSON', async () => {
  const { res, body } = await call('GET', '/projects');
  assert.equal(res.status, 404);
  assert.equal(body.error, 'Route GET /projects not found');
});

test('an unexpected failure answers 500 without leaking the message', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(models.Diagram, 'findAll', async () => {
    throw new Error('secret internals');
  });
  const { res, body } = await call('GET', '/diagrams');
  assert.equal(res.status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
});
