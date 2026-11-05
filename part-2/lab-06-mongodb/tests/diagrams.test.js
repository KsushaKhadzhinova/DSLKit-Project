const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, createCaller } = require('./helpers');

const valid = { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 0, owner: 'carol', tags: ['auth'] };
const MISSING_ID = '64b7f0c2a1b2c3d4e5f60718';
const stamps = { id: undefined, createdAt: undefined, updatedAt: undefined, comments: undefined };

let ctx;
let call;
let models;

const firstId = async () => String((await models.Diagram.findOne())._id);

before(async () => {
  ctx = await startTestServer();
  models = ctx.models;
  call = createCaller(ctx.base);
});

after(() => ctx.stop());

beforeEach(async () => {
  await models.Diagram.deleteMany({});
  await models.Diagram.create({ title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> end', priority: 2, owner: 'anna', tags: ['shop'] });
});

test('GET /diagrams returns the list', async () => {
  const { res, body } = await call('GET', '/diagrams');
  assert.equal(res.status, 200);
  assert.equal(body.length, 1);
  assert.equal(body[0].title, 'Order processing');
  assert.deepEqual(body[0].tags, ['shop']);
  assert.deepEqual(body[0].comments, []);
});

test('responses use "id" and hide _id and __v', async () => {
  const { body } = await call('GET', '/diagrams');
  assert.match(body[0].id, /^[0-9a-f]{24}$/);
  assert.equal('_id' in body[0], false);
  assert.equal('__v' in body[0], false);
});

test('GET /diagrams/:id returns one diagram', async () => {
  const { res, body } = await call('GET', `/diagrams/${await firstId()}`);
  assert.equal(res.status, 200);
  assert.equal(body.owner, 'anna');
});

test('GET /diagrams/:id answers 404 for a missing diagram', async () => {
  const { res, body } = await call('GET', `/diagrams/${MISSING_ID}`);
  assert.equal(res.status, 404);
  assert.match(body.error, /not found/);
});

test('GET /diagrams/:id answers 400 for an id that is not an ObjectId', async () => {
  for (const id of ['abc', '1', '-3', '0x1', '%20', '64b7f0c2a1b2c3d4e5f6071', '64b7f0c2a1b2c3d4e5f607180', '64b7f0c2a1b2c3d4e5f6071g']) {
    const { res, body } = await call('GET', `/diagrams/${id}`);
    assert.equal(res.status, 400, id);
    assert.match(body.error, /ObjectId/);
  }
});

test('POST /diagrams creates a diagram, answers 201 with Location', async () => {
  const { res, body } = await call('POST', '/diagrams', valid);
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), `/diagrams/${body.id}`);
  assert.deepEqual({ ...body, ...stamps }, { ...valid, ...stamps });
  assert.equal((await models.Diagram.findById(body.id)).title, 'Login flow');
});

test('POST /diagrams defaults priority and tags and drops unknown fields', async () => {
  const { priority, tags, ...rest } = valid;
  const { res, body } = await call('POST', '/diagrams', { ...rest, admin: true, comments: [{ author: 'x', text: 'y' }] });
  assert.equal(res.status, 201);
  assert.equal(body.priority, 1);
  assert.deepEqual(body.tags, []);
  assert.deepEqual(body.comments, []);
  assert.equal('admin' in body, false);
});

test('POST /diagrams answers 400 with details for invalid data', async () => {
  const { res, body } = await call('POST', '/diagrams', { title: ' ', notation: 'XYZ', sourceCode: 5, tags: ['ok', ''] });
  assert.equal(res.status, 400);
  assert.equal(body.error, 'Invalid diagram data');
  assert.deepEqual(body.details.map((d) => d.field).sort(), ['notation', 'owner', 'sourceCode', 'tags', 'title']);
});

test('POST /diagrams answers 400 for a body that is not an object', async () => {
  for (const payload of [[], undefined]) {
    const { res, body } = await call('POST', '/diagrams', payload);
    assert.equal(res.status, 400);
    assert.equal(body.error, 'Request body must be a JSON object');
  }
  for (const payload of [null, 'text', 7]) {
    assert.equal((await call('POST', '/diagrams', payload)).res.status, 400);
  }
});

test('POST /diagrams answers 400 for malformed JSON', async () => {
  const { res, body } = await call('POST', '/diagrams', {}, '{"title": ');
  assert.equal(res.status, 400);
  assert.equal(body.error, 'Malformed JSON in request body');
});

test('PUT /diagrams/:id replaces the diagram fields and keeps the comments', async () => {
  const id = await firstId();
  await call('POST', `/diagrams/${id}/comments`, { author: 'boris', text: 'keep me' });
  const { res, body } = await call('PUT', `/diagrams/${id}`, valid);
  assert.equal(res.status, 200);
  assert.deepEqual({ ...body, ...stamps }, { ...valid, ...stamps });
  assert.equal(body.id, id);
  assert.equal(body.comments.length, 1);
  assert.equal(await models.Diagram.countDocuments(), 1);
});

test('PUT /diagrams/:id answers 404 for a missing diagram and 400 for invalid data', async () => {
  assert.equal((await call('PUT', `/diagrams/${MISSING_ID}`, valid)).res.status, 404);
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
  t.mock.method(models.Diagram, 'find', () => {
    throw new Error('secret internals');
  });
  const { res, body } = await call('GET', '/diagrams');
  assert.equal(res.status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
});

test('an id in the body is ignored on POST and PUT', async () => {
  const created = await call('POST', '/diagrams', { ...valid, id: MISSING_ID });
  assert.notEqual(created.body.id, MISSING_ID);
  const id = await firstId();
  const replaced = await call('PUT', `/diagrams/${id}`, { ...valid, id: MISSING_ID });
  assert.equal(replaced.body.id, id);
  assert.equal(await models.Diagram.findById(MISSING_ID), null);
});

test('PUT stores the new state, which GET then returns', async () => {
  const id = await firstId();
  await call('PUT', `/diagrams/${id}`, valid);
  const { body } = await call('GET', `/diagrams/${id}`);
  assert.deepEqual({ ...body, ...stamps }, { ...valid, ...stamps });
});

test('a body over the size limit answers 413', async () => {
  const { res, body } = await call('POST', '/diagrams', { ...valid, sourceCode: 'x'.repeat(200 * 1024) });
  assert.equal(res.status, 413);
  assert.ok(body.error);
});

test('unsupported methods answer 405 with an Allow header', async () => {
  for (const [method, path, allow] of [
    ['POST', '/diagrams/1', 'GET, PUT, PATCH, DELETE'],
    ['DELETE', '/diagrams', 'GET, POST'],
    ['PUT', '/diagrams', 'GET, POST'],
    ['GET', `/diagrams/${MISSING_ID}/comments`, 'POST'],
    ['PATCH', `/diagrams/${MISSING_ID}/comments/${MISSING_ID}`, 'PUT, DELETE'],
  ]) {
    const { res, body } = await call(method, path, method === 'GET' ? undefined : valid);
    assert.equal(res.status, 405, `${method} ${path}`);
    assert.equal(res.headers.get('allow'), allow);
    assert.match(body.error, /not allowed/);
  }
});
