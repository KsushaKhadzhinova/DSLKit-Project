const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createDiagramStore } = require('../src/models/diagram.model');

const limits = require('../limits.json');
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

test('GET /diagrams returns the list', async () => {
  const { res, body } = await call('GET', '/diagrams');
  assert.equal(res.status, 200);
  assert.equal(body.length, 1);
  assert.equal(body[0].title, 'Order processing');
});

test('GET /diagrams/:id returns one diagram', async () => {
  const { res, body } = await call('GET', `/diagrams/${store.findAll()[0].id}`);
  assert.equal(res.status, 200);
  assert.equal(body.owner, 'anna');
});

test('GET /diagrams/:id answers 404 for a missing diagram', async () => {
  const { res, body } = await call('GET', '/diagrams/9999');
  assert.equal(res.status, 404);
  assert.match(body.error, /not found/);
});

test('GET /diagrams/:id answers 400 for a non-numeric id', async () => {
  for (const id of ['abc', '0', '-3', '1.5', '0x1', '1e0', '%201', '01', '99999999999999999999']) {
    const { res, body } = await call('GET', `/diagrams/${id}`);
    assert.equal(res.status, 400, id);
    assert.match(body.error, /positive integer/);
  }
});

test('POST /diagrams creates a diagram, answers 201 with Location', async () => {
  const { res, body } = await call('POST', '/diagrams', valid);
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), `/diagrams/${body.id}`);
  assert.deepEqual({ ...body, id: undefined }, { ...valid, id: undefined });
  assert.equal(store.findById(body.id).title, 'Login flow');
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
  const id = store.findAll()[0].id;
  const { res, body } = await call('PUT', `/diagrams/${id}`, valid);
  assert.equal(res.status, 200);
  assert.deepEqual(body, { id, ...valid });
  assert.equal(store.findAll().length, 1);
});

test('PUT /diagrams/:id answers 404 for a missing diagram and 400 for invalid data', async () => {
  assert.equal((await call('PUT', '/diagrams/9999', valid)).res.status, 404);
  const id = store.findAll()[0].id;
  assert.equal((await call('PUT', `/diagrams/${id}`, { title: 'only title' })).res.status, 400);
  assert.equal((await call('PUT', '/diagrams/abc', valid)).res.status, 400);
});

test('DELETE /diagrams/:id answers 204, then 404 for the same id', async () => {
  const id = store.findAll()[0].id;
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
  t.mock.method(store, 'findAll', () => {
    throw new Error('secret internals');
  });
  const { res, body } = await call('GET', '/diagrams');
  assert.equal(res.status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
});

test('an id in the body is ignored on POST and PUT', async () => {
  const created = await call('POST', '/diagrams', { ...valid, id: 500 });
  assert.notEqual(created.body.id, 500);
  const id = store.findAll()[0].id;
  const replaced = await call('PUT', `/diagrams/${id}`, { ...valid, id: 500 });
  assert.equal(replaced.body.id, id);
  assert.equal(store.findById(500), undefined);
});

test('PUT stores the new state, which GET then returns', async () => {
  const id = store.findAll()[0].id;
  await call('PUT', `/diagrams/${id}`, valid);
  assert.deepEqual((await call('GET', `/diagrams/${id}`)).body, { id, ...valid });
});

test('a body over the size limit answers 413', async () => {
  const { res, body } = await call('POST', '/diagrams', { ...valid, sourceCode: 'x'.repeat(200 * 1024) });
  assert.equal(res.status, 413);
  assert.ok(body.error);
});

test('unsupported methods answer 405 with an Allow header', async () => {
  for (const [method, path, allow] of [
    ['PATCH', '/diagrams/1', 'GET, PUT, DELETE, HEAD, OPTIONS'],
    ['POST', '/diagrams/1', 'GET, PUT, DELETE, HEAD, OPTIONS'],
    ['DELETE', '/diagrams', 'GET, POST, HEAD, OPTIONS'],
    ['PUT', '/diagrams', 'GET, POST, HEAD, OPTIONS'],
  ]) {
    const { res, body } = await call(method, path, valid);
    assert.equal(res.status, 405, `${method} ${path}`);
    assert.equal(res.headers.get('allow'), allow);
    assert.match(body.error, /not allowed/);
  }
});

test('a title, owner or source of only spaces or tabs is rejected like an empty one', async () => {
  for (const blank of ['', ' ', '   ', '\t\n ', '\u00a0\u2003']) {
    const { res, body } = await call('POST', '/diagrams', { ...valid, title: blank, owner: blank, sourceCode: blank });
    assert.equal(res.status, 400, JSON.stringify(blank));
    assert.deepEqual(
      body.details.map((d) => d.field),
      ['title', 'sourceCode', 'owner'],
    );
  }
});

test('the length limits from limits.json are enforced after trimming and spaces are cut from title and owner', async () => {
  const { title, owner, sourceCode } = limits;
  const tooLong = await call('POST', '/diagrams', { ...valid, title: 'x'.repeat(title + 1), owner: 'o'.repeat(owner + 1), sourceCode: 's'.repeat(sourceCode + 1) });
  assert.equal(tooLong.res.status, 400);
  assert.deepEqual(
    tooLong.body.details.map((d) => d.message),
    [`must be at most ${title} characters`, `must be at most ${sourceCode} characters`, `must be at most ${owner} characters`],
  );
  const edge = await call('POST', '/diagrams', { ...valid, title: `  ${'x'.repeat(title)}  `, owner: ` ${'o'.repeat(owner)} `, sourceCode: 's'.repeat(sourceCode) });
  assert.equal(edge.res.status, 201);
  assert.equal(edge.body.title.length, title);
  assert.equal(edge.body.owner.length, owner);
});

test('a field of the wrong type is a 400, never a crash', async () => {
  for (const bad of [123, true, null, {}, [], ['a']]) {
    const { res } = await call('POST', '/diagrams', { ...valid, title: bad, sourceCode: bad, owner: bad, notation: bad, priority: bad === null ? 'low' : bad });
    assert.equal(res.status, 400, JSON.stringify(bad));
  }
});

test('a body that is not JSON data answers 400, an empty body too', async () => {
  for (const raw of ['null', '"text"', '5', '[]', '{"title":', '']) {
    const { res } = await call('POST', '/diagrams', {}, raw);
    assert.equal(res.status, 400, JSON.stringify(raw));
  }
});

test('a request with a body in another Content-Type answers 415', async () => {
  for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'application/xml']) {
    const res = await fetch(`${base}/diagrams`, { method: 'POST', headers: { 'Content-Type': type }, body: JSON.stringify(valid) });
    assert.equal(res.status, 415, type);
    assert.match((await res.json()).error, /application\/json/);
  }
  const put = await fetch(`${base}/diagrams/1`, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: 'x' });
  assert.equal(put.status, 415);
  const ok = await fetch(`${base}/diagrams`, { method: 'POST', headers: { 'Content-Type': 'Application/JSON; charset=utf-8' }, body: JSON.stringify(valid) });
  assert.equal(ok.status, 201);
});

test('PUT is idempotent: the same request twice leaves the same state and answers the same', async () => {
  const id = store.findAll()[0].id;
  const first = await call('PUT', `/diagrams/${id}`, valid);
  const second = await call('PUT', `/diagrams/${id}`, valid);
  assert.equal(first.res.status, 200);
  assert.equal(second.res.status, 200);
  assert.deepEqual(first.body, second.body);
  assert.equal(store.findAll().length, 1);
});

test('POST is not idempotent: the same request twice creates two records with different ids', async () => {
  const first = await call('POST', '/diagrams', valid);
  const second = await call('POST', '/diagrams', valid);
  assert.notEqual(first.body.id, second.body.id);
  assert.equal(second.res.headers.get('location'), `/diagrams/${second.body.id}`);
});

test('HEAD answers like GET without a body and OPTIONS lists the methods with 204', async () => {
  const head = await fetch(`${base}/diagrams`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.match(head.headers.get('content-type'), /json/);
  assert.equal((await fetch(`${base}/diagrams/9999`, { method: 'HEAD' })).status, 404);
  for (const [path, allow] of [
    ['/diagrams', 'GET, POST, HEAD, OPTIONS'],
    ['/diagrams/1', 'GET, PUT, DELETE, HEAD, OPTIONS'],
  ]) {
    const res = await fetch(base + path, { method: 'OPTIONS' });
    assert.equal(res.status, 204, path);
    assert.equal(res.headers.get('allow'), allow);
  }
});

test('security headers are set on every answer, errors included, and the framework is not named', async () => {
  for (const path of ['/diagrams', '/nothing']) {
    const res = await fetch(base + path);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
    assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
    assert.equal(res.headers.get('x-powered-by'), null);
  }
});

test('a malformed percent sequence in the path does not crash the server', async () => {
  const { res } = await call('GET', '/diagrams/%E0%A4%A');
  assert.ok([400, 404].includes(res.status));
});

test('the 413 limit comes from limits.json', async () => {
  assert.equal(limits.bodyBytes, '100kb');
  const raw = JSON.stringify({ ...valid, sourceCode: 'x'.repeat(100 * 1024 - 200) });
  assert.ok(raw.length < 100 * 1024);
  assert.equal((await call('POST', '/diagrams', {}, raw)).res.status, 400);
});
