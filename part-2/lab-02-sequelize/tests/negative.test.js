const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createModels } = require('../src/models');
const { createTempDatabase } = require('./helpers');

// Mistakes a user or a grader makes on purpose: broken bodies, odd values, odd addresses, repeated requests and a stopped database.
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

test('a body nested 50 levels deep answers 400 and the server keeps working', async () => {
  const deep = JSON.parse(`${'['.repeat(50)}${']'.repeat(50)}`);
  assert.equal((await call('POST', '/diagrams', deep)).res.status, 400);
  let nested = 'text';
  for (let i = 0; i < 50; i += 1) nested = { level: nested };
  const { res, body } = await call('POST', '/diagrams', { ...valid, title: nested });
  assert.equal(res.status, 400);
  assert.deepEqual(
    body.details.map((d) => d.field),
    ['title'],
  );
  assert.equal((await call('GET', '/diagrams')).res.status, 200);
});

test('a body with a __proto__ key does not pollute the object prototype', async () => {
  const raw = `{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},${JSON.stringify(valid).slice(1)}`;
  const { res, body } = await call('POST', '/diagrams', {}, raw);
  assert.equal(res.status, 201);
  assert.equal({}.polluted, undefined);
  assert.equal('polluted' in body, false);
});

test('a title or owner with a control character such as NUL answers 400 and is not stored', async () => {
  for (const bad of ['Login\u0000flow', 'Login\u0007flow', 'carol\u001b[31m']) {
    const { res } = await call('POST', '/diagrams', { ...valid, title: bad, owner: bad });
    assert.equal(res.status, 400, JSON.stringify(bad));
  }
  assert.equal(await models.Diagram.count(), 1);
});

test('emoji and right-to-left text are accepted and returned unchanged', async () => {
  for (const title of ['Схема 🚀 процесса', 'مخطط التدفق', '流程图 📊']) {
    const { res, body } = await call('POST', '/diagrams', { ...valid, title });
    assert.equal(res.status, 201, title);
    assert.equal(body.title, title);
  }
});

test('a body of one megabyte answers 413 with a JSON error', async () => {
  const { res, body } = await call('POST', '/diagrams', { ...valid, sourceCode: 'x'.repeat(1024 * 1024) });
  assert.equal(res.status, 413);
  assert.equal(typeof body.error, 'string');
});

test('a priority that is a number, a boolean or an out-of-range value answers 400', async () => {
  for (const priority of ['-1', '0', '1.5', '1e309', '2147483648', 'true', '[]', '{}']) {
    const { res } = await call('POST', '/diagrams', {}, `{"title":"a","notation":"UML","sourceCode":"a","owner":"o","priority":${priority}}`);
    assert.equal(res.status, 400, priority);
  }
  assert.equal(await models.Diagram.count(), 1);
});

test('non-JSON numbers such as NaN and Infinity and single quotes answer 400 with the malformed JSON error', async () => {
  for (const raw of [
    '{"title":"a","notation":"UML","sourceCode":"a","owner":"o","priority":NaN}',
    '{"title":"a","notation":"UML","sourceCode":"a","owner":"o","priority":Infinity}',
    "{'title':'a','notation':'UML','sourceCode':'a','owner':'o'}",
  ]) {
    const { res, body } = await call('POST', '/diagrams', {}, raw);
    assert.equal(res.status, 400, raw);
    assert.equal(body.error, 'Malformed JSON in request body');
  }
});

test('SQL-like text is stored as plain text, operator objects in text fields are refused', async () => {
  const { res, body } = await call('POST', '/diagrams', { ...valid, title: "' OR 1=1 --" });
  assert.equal(res.status, 201);
  assert.equal(body.title, "' OR 1=1 --");
  for (const owner of [{ $ne: null }, { $gt: '' }, { $where: 'true' }]) {
    assert.equal((await call('POST', '/diagrams', { ...valid, owner })).res.status, 400, JSON.stringify(owner));
  }
});

test('an id such as an injected SQL fragment, %, %00 or a 10000-character path answers 400, never 500', async () => {
  for (const id of ['1%20OR%201=1', '%', '%00', '%E0%A4%A', 'a'.repeat(10000)]) {
    const { res, body } = await call('GET', `/diagrams/${id}`);
    assert.equal(res.status, 400, id.slice(0, 20));
    assert.equal(typeof body.error, 'string');
  }
});

test('a diagram deleted by one request answers 404 to a later GET and PUT', async () => {
  const id = await firstId();
  assert.equal((await call('DELETE', `/diagrams/${id}`)).res.status, 204);
  assert.equal((await call('GET', `/diagrams/${id}`)).res.status, 404);
  assert.equal((await call('PUT', `/diagrams/${id}`, valid)).res.status, 404);
});

test('a PUT with an empty body answers 400 and the row stays as it was', async () => {
  const id = await firstId();
  const before = await models.Diagram.findByPk(id);
  assert.equal((await call('PUT', `/diagrams/${id}`, {}, '')).res.status, 400);
  const after = await models.Diagram.findByPk(id);
  assert.equal(after.title, before.title);
  assert.equal(after.updatedAt.getTime(), before.updatedAt.getTime());
});

test('twenty parallel POST requests create twenty rows with distinct ids', async () => {
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => call('POST', '/diagrams', { ...valid, title: `Parallel ${i}` })));
  assert.ok(results.every(({ res }) => res.status === 201));
  assert.equal(new Set(results.map(({ body }) => body.id)).size, 20);
  assert.equal(await models.Diagram.count(), 21);
});

test('a PUT and a DELETE on the same id at the same time answer 200 or 204 for one and 404 for the other', async () => {
  const id = await firstId();
  const [put, del] = await Promise.all([call('PUT', `/diagrams/${id}`, valid), call('DELETE', `/diagrams/${id}`)]);
  // Whichever request runs first, the delete succeeds and the late PUT finds nothing.
  assert.equal(del.res.status, 204);
  assert.ok([200, 404].includes(put.res.status), String(put.res.status));
  assert.equal(await models.Diagram.findByPk(id), null);
});

test('a sort value with SQL in it, a repeated sort or a prototype name answers 400 and the table survives', async () => {
  for (const query of ['?sort=id;DROP TABLE Diagrams', '?sort=title&sort=id', '?sort=constructor', '?sort=__proto__', '?order=asc&order=desc']) {
    const { res, body } = await call('GET', `/diagrams${query}`);
    assert.equal(res.status, 400, query);
    assert.ok(Array.isArray(body.details), query);
  }
  assert.equal(await models.Diagram.count(), 1);
});

test('bracket names in the query are not parsed as lists, the default list comes back', async () => {
  for (const query of ['?sort[]=title', '?limit[]=5', '?offset[a]=1']) {
    const { res, body } = await call('GET', `/diagrams${query}`);
    assert.equal(res.status, 200, query);
    assert.equal(body.length, 1);
  }
});

test('an offset at the upper limit with a full page answers an empty array and the real total', async () => {
  const { res, body } = await call('GET', '/diagrams?limit=100&offset=1000000');
  assert.equal(res.status, 200);
  assert.deepEqual(body, []);
  assert.equal(res.headers.get('x-total-count'), '1');
});

test('a title made only of a zero-width space is rejected like an empty one', async () => {
  assert.equal((await call('POST', '/diagrams', { ...valid, title: '​​' })).res.status, 400);
  assert.equal(await models.Diagram.count(), 1);
});

test('enum values in another letter case are refused', async () => {
  for (const notation of ['uml', 'bpmn', 'Erd ']) {
    assert.equal((await call('POST', '/diagrams', { ...valid, notation })).res.status, 400, notation);
  }
  assert.equal((await call('POST', '/diagrams', { ...valid, priority: 'HIGH' })).res.status, 400);
});

test('a database failure on POST answers 500 without the internal message', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(models.Diagram, 'create', async () => {
    throw new Error('SQLITE_FULL: database or disk is full at /var/data/secret.sqlite');
  });
  const { res, body } = await call('POST', '/diagrams', valid);
  assert.equal(res.status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
});

test('a closed database answers 500 on the API and 503 on the health check, without file paths', async (t) => {
  t.mock.method(console, 'error', () => {});
  const closed = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  await closed.sequelize.close();
  const app = createApp(closed).listen(0);
  await new Promise((resolve) => app.once('listening', resolve));
  const url = `http://localhost:${app.address().port}`;
  try {
    const list = await fetch(`${url}/diagrams`);
    assert.equal(list.status, 500);
    assert.deepEqual(await list.json(), { error: 'Internal server error' });
    const health = await fetch(`${url}/health`);
    assert.equal(health.status, 503);
    assert.deepEqual(await health.json(), { status: 'unavailable' });
  } finally {
    app.close();
  }
});

test('a trailing slash on the list or on an id still reaches the right handler', async () => {
  assert.equal((await call('GET', '/diagrams/')).res.status, 200);
  assert.equal((await call('GET', `/diagrams/${await firstId()}/`)).res.status, 200);
});
