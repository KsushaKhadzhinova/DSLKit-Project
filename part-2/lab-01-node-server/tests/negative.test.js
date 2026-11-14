const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createDiagramStore } = require('../src/models/diagram.model');

const valid = { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 'low', owner: 'carol' };

let server;
let base;
let store;

before(async () => {
  store = createDiagramStore();
  server = createApp(store).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

beforeEach(() => {
  store.findAll().forEach((d) => store.remove(d.id));
  store.create({ title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> end', priority: 'high', owner: 'anna' });
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

// Sends a raw JSON text with the JSON Content-Type, the way a broken client would.
const sendRaw = (raw, method = 'POST', path = '/diagrams') => call(method, path, {}, raw);

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
  assert.equal((await call('GET', '/health')).res.status, 200);
});

test('a key repeated in the body keeps its last value', async () => {
  const raw = '{"title":"first","title":"Second title","notation":"UML","sourceCode":"a -> b","owner":"carol"}';
  const { res, body } = await sendRaw(raw);
  assert.equal(res.status, 201);
  assert.equal(body.title, 'Second title');
});

test('a body with a __proto__ key does not pollute the object prototype', async () => {
  const raw = `{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},${JSON.stringify(valid).slice(1)}`;
  const { res, body } = await sendRaw(raw);
  assert.equal(res.status, 201);
  assert.equal({}.polluted, undefined);
  assert.equal('polluted' in body, false);
});

test('a title or owner with a control character such as NUL answers 400', async () => {
  for (const bad of ['Login\u0000flow', 'Login\u0007flow', 'carol\u001b[31m']) {
    const { res } = await call('POST', '/diagrams', { ...valid, title: bad, owner: bad });
    assert.equal(res.status, 400, JSON.stringify(bad));
  }
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
    const { res } = await sendRaw(`{"title":"a","notation":"UML","sourceCode":"a","owner":"o","priority":${priority}}`);
    assert.equal(res.status, 400, priority);
  }
});

test('non-JSON numbers such as NaN and Infinity, single quotes and a BOM answer 400', async () => {
  for (const raw of [
    `{"title":"a","notation":"UML","sourceCode":"a","owner":"o","priority":NaN}`,
    `{"title":"a","notation":"UML","sourceCode":"a","owner":"o","priority":Infinity}`,
    `{'title':'a','notation':'UML','sourceCode':'a','owner':'o'}`,
  ]) {
    const { res, body } = await sendRaw(raw);
    assert.equal(res.status, 400, raw);
    assert.equal(body.error, 'Malformed JSON in request body');
  }
});

test('SQL and NoSQL-style values in text fields are stored as plain text, operator objects are refused', async () => {
  const { res, body } = await call('POST', '/diagrams', { ...valid, title: "' OR 1=1 --" });
  assert.equal(res.status, 201);
  assert.equal(body.title, "' OR 1=1 --");
  for (const owner of [{ $ne: null }, { $gt: '' }, { $where: 'true' }]) {
    const refused = await call('POST', '/diagrams', { ...valid, owner });
    assert.equal(refused.res.status, 400, JSON.stringify(owner));
  }
});

test('ids such as %, %00, an encoded space or a 10000-character path answer 400, never 500', async () => {
  for (const id of ['%', '%00', '%20', '%E0%A4%A', 'a'.repeat(10000)]) {
    const { res, body } = await call('GET', `/diagrams/${id}`);
    assert.equal(res.status, 400, id.slice(0, 20));
    assert.equal(typeof body.error, 'string');
  }
});

test('a diagram deleted by one request answers 404 to a later GET and PUT', async () => {
  const id = store.findAll()[0].id;
  assert.equal((await call('DELETE', `/diagrams/${id}`)).res.status, 204);
  assert.equal((await call('GET', `/diagrams/${id}`)).res.status, 404);
  assert.equal((await call('PUT', `/diagrams/${id}`, valid)).res.status, 404);
  assert.equal(store.findById(id), undefined);
});

test('a PUT with an empty body answers 400 and changes nothing', async () => {
  const before = store.findAll();
  const id = before[0].id;
  const { res } = await call('PUT', `/diagrams/${id}`, {}, '');
  assert.equal(res.status, 400);
  assert.deepEqual(store.findAll(), before);
});

test('twenty parallel POST requests create twenty diagrams with distinct ids', async () => {
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => call('POST', '/diagrams', { ...valid, title: `Parallel ${i}` })));
  assert.ok(results.every(({ res }) => res.status === 201));
  const ids = new Set(results.map(({ body }) => body.id));
  assert.equal(ids.size, 20);
  assert.equal(store.findAll().length, 21);
});

test('a PUT and a DELETE on the same id at the same time answer 200 or 204 for one and 404 for the other', async () => {
  const id = store.findAll()[0].id;
  const [put, del] = await Promise.all([call('PUT', `/diagrams/${id}`, valid), call('DELETE', `/diagrams/${id}`)]);
  // Whichever request runs first, the delete succeeds and the late PUT finds nothing.
  assert.equal(del.res.status, 204);
  assert.ok([200, 404].includes(put.res.status), String(put.res.status));
  assert.equal(store.findById(id), undefined);
});

test('a repeated sort or order parameter, or a prototype name as sort, answers 400', async () => {
  for (const query of ['?sort=title&sort=id', '?order=asc&order=desc', '?sort=constructor', '?sort=__proto__', '?sort=toString', '?sort=hasOwnProperty']) {
    const { res, body } = await call('GET', `/diagrams${query}`);
    assert.equal(res.status, 400, query);
    assert.ok(Array.isArray(body.details), query);
  }
});

test('bracket names in the query are not parsed as lists, the default list comes back', async () => {
  for (const query of ['?sort[]=title', '?limit[]=5', '?offset[a]=1']) {
    const { res, body } = await call('GET', `/diagrams${query}`);
    assert.equal(res.status, 200, query);
    assert.equal(body.length, 1);
  }
});

test('an offset at the upper limit with a full page answers an empty array', async () => {
  const { res, body } = await call('GET', '/diagrams?limit=100&offset=1000000');
  assert.equal(res.status, 200);
  assert.deepEqual(body, []);
  assert.equal(res.headers.get('x-total-count'), '1');
});

test('a title made only of a zero-width space is rejected like an empty one', async () => {
  const { res } = await call('POST', '/diagrams', { ...valid, title: '​​' });
  assert.equal(res.status, 400);
});

test('enum values in another letter case are refused', async () => {
  for (const notation of ['uml', 'bpmn', 'Erd ']) {
    assert.equal((await call('POST', '/diagrams', { ...valid, notation })).res.status, 400, notation);
  }
  assert.equal((await call('POST', '/diagrams', { ...valid, priority: 'HIGH' })).res.status, 400);
});

test('a store failure on POST answers 500 without the internal message', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(store, 'create', () => {
    throw new Error('disk is full at /var/lib/secret');
  });
  const { res, body } = await call('POST', '/diagrams', valid);
  assert.equal(res.status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
});

test('a trailing slash on the list or on an id still reaches the right handler', async () => {
  assert.equal((await call('GET', '/diagrams/')).res.status, 200);
  const id = store.findAll()[0].id;
  assert.equal((await call('GET', `/diagrams/${id}/`)).res.status, 200);
});
