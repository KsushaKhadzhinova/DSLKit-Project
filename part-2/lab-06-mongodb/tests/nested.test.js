const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, createCaller } = require('./helpers');

const MISSING_ID = '64b7f0c2a1b2c3d4e5f60718';

let ctx;
let call;
let models;
let id;

before(async () => {
  ctx = await startTestServer();
  models = ctx.models;
  call = createCaller(ctx.base);
});

after(() => ctx.stop());

beforeEach(async () => {
  await models.Diagram.deleteMany({});
  await models.Diagram.create([
    { title: 'Order processing', notation: 'BPMN', sourceCode: 'a', owner: 'anna', tags: ['shop', 'process'] },
    { title: 'Login flow', notation: 'UML', sourceCode: 'b', owner: 'carol', tags: ['auth'] },
    { title: 'Customers', notation: 'ERD', sourceCode: 'c', owner: 'anna', tags: ['shop', 'database'] },
  ]);
  id = String((await models.Diagram.findOne({ title: 'Login flow' }))._id);
});

const addComment = (author = 'boris', text = 'Looks good') => call('POST', `/diagrams/${id}/comments`, { author, text });

test('GET /diagrams?tag= finds diagrams whose tags array contains the value', async () => {
  const { body } = await call('GET', '/diagrams?tag=shop');
  assert.deepEqual(body.map((d) => d.title), ['Order processing', 'Customers']);
  assert.deepEqual((await call('GET', '/diagrams?tag=nothing')).body, []);
});

test('GET /diagrams?owner=&tag= combines filters', async () => {
  const { body } = await call('GET', '/diagrams?owner=anna&tag=database');
  assert.deepEqual(body.map((d) => d.title), ['Customers']);
});

test('POST /diagrams/:id/comments pushes a subdocument into the array', async () => {
  const { res, body } = await addComment();
  assert.equal(res.status, 201);
  assert.equal(body.comments.length, 1);
  assert.match(body.comments[0].id, /^[0-9a-f]{24}$/);
  assert.equal(body.comments[0].author, 'boris');
  assert.ok(body.comments[0].createdAt);
  await addComment('dina', 'Second');
  const stored = await models.Diagram.findById(id);
  assert.deepEqual(stored.comments.map((c) => c.text), ['Looks good', 'Second']);
});

test('POST comments answers 400 for invalid data, 404 for a missing diagram', async () => {
  const bad = await call('POST', `/diagrams/${id}/comments`, { author: ' ' });
  assert.equal(bad.res.status, 400);
  assert.deepEqual(bad.body.details.map((d) => d.field), ['author', 'text']);
  assert.equal((await call('POST', `/diagrams/${MISSING_ID}/comments`, { author: 'a', text: 't' })).res.status, 404);
  assert.equal((await call('POST', '/diagrams/abc/comments', { author: 'a', text: 't' })).res.status, 400);
});

test('PUT comment updates one element inside the array with the positional operator', async () => {
  await addComment('boris', 'first');
  const second = (await addComment('dina', 'second')).body.comments[1];
  const { res, body } = await call('PUT', `/diagrams/${id}/comments/${second.id}`, { text: 'edited' });
  assert.equal(res.status, 200);
  assert.deepEqual(body.comments.map((c) => c.text), ['first', 'edited']);
  assert.equal(body.comments[1].author, 'dina');
});

test('PUT comment answers 404 for an unknown comment and 400 for bad input', async () => {
  assert.equal((await call('PUT', `/diagrams/${id}/comments/${MISSING_ID}`, { text: 'x' })).res.status, 404);
  const added = (await addComment()).body.comments[0];
  assert.equal((await call('PUT', `/diagrams/${id}/comments/${added.id}`, { text: '' })).res.status, 400);
  assert.equal((await call('PUT', `/diagrams/${id}/comments/nope`, { text: 'x' })).res.status, 400);
  // a comment of another diagram is not reachable through this diagram
  const other = String((await models.Diagram.findOne({ title: 'Customers' }))._id);
  assert.equal((await call('PUT', `/diagrams/${other}/comments/${added.id}`, { text: 'x' })).res.status, 404);
});

test('DELETE comment pulls the element out of the array', async () => {
  const [first] = (await addComment('boris', 'first')).body.comments;
  await addComment('dina', 'second');
  const { res, body } = await call('DELETE', `/diagrams/${id}/comments/${first.id}`);
  assert.equal(res.status, 200);
  assert.deepEqual(body.comments.map((c) => c.text), ['second']);
  assert.equal((await call('DELETE', `/diagrams/${id}/comments/${first.id}`)).res.status, 404);
});

test('deleting a diagram removes its comments with it (they are part of the document)', async () => {
  await addComment();
  await call('DELETE', `/diagrams/${id}`);
  assert.equal(await models.Diagram.countDocuments({ 'comments.author': 'boris' }), 0);
});

test('the model itself rejects values outside the lists, even without the HTTP checks', async () => {
  const base = { title: 't', sourceCode: 's', owner: 'o' };
  await assert.rejects(models.Diagram.create({ ...base, notation: 'XYZ' }), { name: 'ValidationError' });
  await assert.rejects(models.Diagram.create({ ...base, notation: 'UML', priority: 'urgent' }), { name: 'ValidationError' });
  await assert.rejects(models.Diagram.create({ ...base, notation: 'UML', comments: [{ author: 'a' }] }), { name: 'ValidationError' });
  const ok = await models.Diagram.create({ ...base, notation: 'UML' });
  assert.equal(ok.priority, 'normal');
  assert.deepEqual([...ok.tags], []);
});

test('indexes on owner and tags are declared', async () => {
  const names = (await models.Diagram.listIndexes()).map((index) => index.name);
  assert.ok(names.includes('owner_1'));
  assert.ok(names.includes('tags_1'));
});

test('Mongoose validation errors raised after the HTTP checks answer 400', async (t) => {
  t.mock.method(models.Diagram, 'create', async () => {
    await new models.Diagram({}).validate();
  });
  const { res, body } = await call('POST', '/diagrams', { title: 't', notation: 'UML', sourceCode: 's', owner: 'o' });
  assert.equal(res.status, 400);
  assert.ok(body.error);
});
