const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./harness');

const valid = { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 'low' };
const strip = ({ createdAt, updatedAt, ...rest }) => rest;

let app;
let alice;
let bob;
let admin;
let aliceId;
let bobId;

before(async () => {
  app = await startServer();
  alice = await app.tokenFor('alice@example.com');
  bob = await app.tokenFor('bob@example.com');
  admin = await app.tokenFor('admin@example.com', 'admin');
  aliceId = (await app.models.User.findOne({ where: { email: 'alice@example.com' } })).id;
  bobId = (await app.models.User.findOne({ where: { email: 'bob@example.com' } })).id;
});
after(() => app.close());

beforeEach(async () => {
  await app.models.Diagram.destroy({ where: {} });
  await app.models.Diagram.create({ title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> end', priority: 'high', ownerId: aliceId });
});

const firstId = async () => (await app.models.Diagram.findOne()).id;

test('every /diagrams route answers 401 without a token', async () => {
  const routes = [
    ['GET', '/diagrams'],
    ['GET', '/diagrams/1'],
    ['POST', '/diagrams'],
    ['PUT', '/diagrams/1'],
    ['DELETE', '/diagrams/1'],
  ];
  for (const [method, path] of routes) {
    assert.equal((await app.call(method, path, { body: valid })).res.status, 401, `${method} ${path}`);
  }
});

test('GET /diagrams returns the list', async () => {
  const { res, body } = await app.call('GET', '/diagrams', { token: bob });
  assert.equal(res.status, 200);
  assert.equal(body.length, 1);
  assert.equal(body[0].title, 'Order processing');
});

test('GET /diagrams/:id returns one diagram, 404 when missing', async () => {
  const found = await app.call('GET', `/diagrams/${await firstId()}`, { token: bob });
  assert.equal(found.res.status, 200);
  assert.equal(found.body.ownerId, aliceId);
  const missing = await app.call('GET', '/diagrams/9999', { token: bob });
  assert.equal(missing.res.status, 404);
  assert.match(missing.body.error, /not found/);
});

test('GET /diagrams/:id answers 400 for ids that are not plain positive integers', async () => {
  for (const id of ['abc', '0', '-3', '1.5', '0x1', '1e0', '%201', '01', '2147483648', '99999999999999999999']) {
    const { res, body } = await app.call('GET', `/diagrams/${id}`, { token: alice });
    assert.equal(res.status, 400, id);
    assert.match(body.error, /positive integer/);
  }
});

test('POST /diagrams creates a diagram owned by the caller, answers 201 with Location', async () => {
  const { res, body } = await app.call('POST', '/diagrams', { token: bob, body: { ...valid, ownerId: 999, owner: 'someone@else.com', id: 500 } });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), `/diagrams/${body.id}`);
  assert.notEqual(body.id, 500);
  assert.deepEqual(strip({ ...body, id: undefined }), { ...valid, id: undefined, ownerId: bobId });
});

test('POST /diagrams defaults the priority and drops unknown fields', async () => {
  const { priority, ...rest } = valid;
  const { res, body } = await app.call('POST', '/diagrams', { token: alice, body: { ...rest, admin: true } });
  assert.equal(res.status, 201);
  assert.equal(body.priority, 'normal');
  assert.equal('admin' in body, false);
});

test('POST /diagrams answers 400 with details for invalid data', async () => {
  const { res, body } = await app.call('POST', '/diagrams', { token: alice, body: { title: ' ', notation: 'XYZ', sourceCode: 5 } });
  assert.equal(res.status, 400);
  assert.equal(body.error, 'Invalid diagram data');
  assert.deepEqual(body.details.map((d) => d.field).sort(), ['notation', 'sourceCode', 'title']);
});

test('POST /diagrams answers 400 for a body that is not an object and for malformed JSON', async () => {
  for (const payload of [[], undefined]) {
    const { res, body } = await app.call('POST', '/diagrams', { token: alice, body: payload });
    assert.equal(res.status, 400);
    assert.equal(body.error, 'Request body must be a JSON object');
  }
  const bad = await app.call('POST', '/diagrams', { token: alice, body: {}, raw: '{"title": ' });
  assert.equal(bad.res.status, 400);
  assert.equal(bad.body.error, 'Malformed JSON in request body');
});

test('a body over the size limit answers 413', async () => {
  const { res } = await app.call('POST', '/diagrams', { token: alice, body: { ...valid, sourceCode: 'x'.repeat(200 * 1024) } });
  assert.equal(res.status, 413);
});

test('PUT by the owner replaces the diagram, keeps the owner and ignores a body id', async () => {
  const id = await firstId();
  const { res, body } = await app.call('PUT', `/diagrams/${id}`, { token: alice, body: { ...valid, id: 500, ownerId: bobId } });
  assert.equal(res.status, 200);
  assert.deepEqual(strip(body), { id, ...valid, ownerId: aliceId });
  assert.deepEqual(strip((await app.call('GET', `/diagrams/${id}`, { token: bob })).body), strip(body));
  assert.equal(await app.models.Diagram.findByPk(500), null);
});

test('PUT answers 404 for a missing diagram and 400 for invalid data', async () => {
  assert.equal((await app.call('PUT', '/diagrams/9999', { token: alice, body: valid })).res.status, 404);
  assert.equal((await app.call('PUT', `/diagrams/${await firstId()}`, { token: alice, body: { title: 'only title' } })).res.status, 400);
  assert.equal((await app.call('PUT', '/diagrams/abc', { token: alice, body: valid })).res.status, 400);
});

test('another user gets 403 on PUT and DELETE, an admin may change any diagram', async () => {
  const id = await firstId();
  assert.equal((await app.call('PUT', `/diagrams/${id}`, { token: bob, body: valid })).res.status, 403);
  assert.equal((await app.call('DELETE', `/diagrams/${id}`, { token: bob })).res.status, 403);
  assert.equal((await app.call('GET', `/diagrams/${id}`, { token: bob })).body.title, 'Order processing');
  assert.equal((await app.call('PUT', `/diagrams/${id}`, { token: admin, body: valid })).res.status, 200);
  assert.equal((await app.call('DELETE', `/diagrams/${id}`, { token: admin })).res.status, 204);
});

test('DELETE answers 204, then 404 for the same id', async () => {
  const id = await firstId();
  const first = await app.call('DELETE', `/diagrams/${id}`, { token: alice });
  assert.equal(first.res.status, 204);
  assert.equal(first.body, undefined);
  assert.equal((await app.call('DELETE', `/diagrams/${id}`, { token: alice })).res.status, 404);
  assert.equal((await app.call('GET', '/diagrams', { token: alice })).body.length, 0);
});

test('unsupported methods answer 405 with an Allow header', async () => {
  for (const [method, path, allow] of [
    ['PATCH', '/diagrams/1', 'GET, PUT, DELETE, HEAD, OPTIONS'],
    ['POST', '/diagrams/1', 'GET, PUT, DELETE, HEAD, OPTIONS'],
    ['DELETE', '/diagrams', 'GET, POST, HEAD, OPTIONS'],
    ['PUT', '/diagrams', 'GET, POST, HEAD, OPTIONS'],
  ]) {
    const { res, body } = await app.call(method, path, { token: alice, body: valid });
    assert.equal(res.status, 405, `${method} ${path}`);
    assert.equal(res.headers.get('allow'), allow);
    assert.match(body.error, /not allowed/);
  }
});

test('an unknown route answers 404 as JSON', async () => {
  const { res, body } = await app.call('GET', '/projects');
  assert.equal(res.status, 404);
  assert.equal(body.error, 'Route GET /projects not found');
});

test('an unexpected failure answers 500 without leaking the message', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(app.models.Diagram, 'findAll', async () => {
    throw new Error('secret internals');
  });
  const { res, body } = await app.call('GET', '/diagrams', { token: alice });
  assert.equal(res.status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
});

test('the title is trimmed before saving', async () => {
  const { res, body } = await app.call('POST', '/diagrams', { token: alice, body: { ...valid, title: '  Spaced  ' } });
  assert.equal(res.status, 201);
  assert.equal(body.title, 'Spaced');
});

test('text fields at the limit are accepted, one character more is rejected with 400', async () => {
  for (const [field, max] of Object.entries({ title: 80, sourceCode: 10000 })) {
    assert.equal((await app.call('POST', '/diagrams', { token: alice, body: { ...valid, [field]: 'x'.repeat(max) } })).res.status, 201, field);
    const { res, body } = await app.call('POST', '/diagrams', { token: alice, body: { ...valid, [field]: 'x'.repeat(max + 1) } });
    assert.equal(res.status, 400, field);
    assert.deepEqual(body.details, [{ field, message: `must be at most ${max} characters` }]);
  }
});

test('a value that is only longer because of surrounding spaces is accepted', async () => {
  assert.equal((await app.call('POST', '/diagrams', { token: alice, body: { ...valid, title: ` ${'x'.repeat(80)} ` } })).res.status, 201);
});

test('the largest INTEGER id is accepted and simply not found', async () => {
  assert.equal((await app.call('GET', '/diagrams/2147483647', { token: alice })).res.status, 404);
});

test('a body over 100 kb answers 413', async () => {
  const raw = JSON.stringify({ ...valid, sourceCode: 'y'.repeat(101 * 1024) });
  assert.equal((await app.call('POST', '/diagrams', { token: alice, body: {}, raw })).res.status, 413);
});
