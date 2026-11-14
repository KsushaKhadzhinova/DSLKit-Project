const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, createCaller } = require('./helpers');

const MISSING_ID = '64b7f0c2a1b2c3d4e5f60718';

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
  await models.Diagram.create([
    { title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> payment -> end', priority: 2, owner: 'anna', tags: ['shop'] },
    { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 0, owner: 'carol', tags: ['auth'] },
    { title: 'Catalog schema', notation: 'ERD', sourceCode: 'product 1..* review', priority: 1, owner: 'anna', tags: ['shop'] },
  ]);
  await models.Diagram.init();
});

const firstId = async () => String((await models.Diagram.findOne({ title: 'Login flow' }))._id);

test('PATCH changes only the sent fields and keeps the rest', async () => {
  const id = await firstId();
  const { res, body } = await call('PATCH', `/diagrams/${id}`, { priority: 2 });
  assert.equal(res.status, 200);
  assert.equal(body.priority, 2);
  assert.equal(body.title, 'Login flow');
  assert.equal(body.owner, 'carol');
});

test('PATCH keeps the comments of the diagram', async () => {
  const id = await firstId();
  await call('POST', `/diagrams/${id}/comments`, { author: 'bob', text: 'looks fine' });
  const { body } = await call('PATCH', `/diagrams/${id}`, { title: 'Sign in flow' });
  assert.equal(body.title, 'Sign in flow');
  assert.equal(body.comments.length, 1);
});

test('PATCH answers 400 for an empty object, an invalid value and a non-object body', async () => {
  const id = await firstId();
  assert.equal((await call('PATCH', `/diagrams/${id}`, {})).res.status, 400);
  assert.equal((await call('PATCH', `/diagrams/${id}`, { priority: 9 })).res.status, 400);
  assert.equal((await call('PATCH', `/diagrams/${id}`, [1])).res.status, 400);
  assert.equal((await call('PATCH', `/diagrams/${id}`, { color: 'red' })).res.status, 400);
});

test('PATCH answers 404 for a missing diagram and 400 for a bad identifier', async () => {
  assert.equal((await call('PATCH', `/diagrams/${MISSING_ID}`, { priority: 1 })).res.status, 404);
  assert.equal((await call('PATCH', '/diagrams/abc', { priority: 1 })).res.status, 400);
});

test('sorting by title ascending and by priority descending', async () => {
  const byTitle = await call('GET', '/diagrams?sort=title');
  assert.deepEqual(
    byTitle.body.map((d) => d.title),
    ['Catalog schema', 'Login flow', 'Order processing'],
  );
  const byPriority = await call('GET', '/diagrams?sort=-priority');
  assert.deepEqual(
    byPriority.body.map((d) => d.priority),
    [2, 1, 0],
  );
});

test('an unknown sort field answers 400', async () => {
  const { res, body } = await call('GET', '/diagrams?sort=password');
  assert.equal(res.status, 400);
  assert.equal(body.details[0].field, 'sort');
});

test('the list carries the total count in X-Total-Count, ignoring limit', async () => {
  const { res, body } = await call('GET', '/diagrams?limit=1');
  assert.equal(body.length, 1);
  assert.equal(res.headers.get('x-total-count'), '3');
});

test('GET /diagrams/count returns the number of records and respects filters', async () => {
  assert.deepEqual((await call('GET', '/diagrams/count')).body, { count: 3 });
  assert.deepEqual((await call('GET', '/diagrams/count?owner=anna')).body, { count: 2 });
  assert.equal((await call('POST', '/diagrams/count', {})).res.status, 405);
});

test('the text index finds diagrams by a word in the title or the source', async () => {
  assert.ok((await models.Diagram.listIndexes()).some((index) => index.name === 'title_text_sourceCode_text'));
  const byTitle = await call('GET', '/diagrams?q=login');
  assert.deepEqual(
    byTitle.body.map((d) => d.title),
    ['Login flow'],
  );
  const bySource = await call('GET', '/diagrams?q=payment');
  assert.equal(bySource.body.length, 1);
  assert.equal((await call('GET', '/diagrams?q=zzzzzz')).body.length, 0);
});

test('the search text cannot carry an operator', async () => {
  const { res } = await call('GET', '/diagrams?q[$ne]=x');
  assert.equal(res.status, 400);
});
