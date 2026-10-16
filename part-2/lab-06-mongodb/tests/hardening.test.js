const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, createCaller } = require('./helpers');
const { createApp } = require('../src/app');
const { errorHandler } = require('../src/middleware/error-handler');

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
  await models.RequestLog.deleteMany({});
  await models.Diagram.create([
    { title: 'Order', notation: 'BPMN', sourceCode: 'a', owner: 'anna', priority: 2, comments: [{ author: 'boris', text: 'one' }, { author: 'dina', text: 'two' }] },
    { title: 'Login', notation: 'UML', sourceCode: 'b', owner: 'carol', priority: 0 },
    { title: 'Flow', notation: 'BPMN', sourceCode: 'c', owner: 'anna', priority: 1, comments: [{ author: 'boris', text: 'three' }] },
  ]);
});

test('security headers are set and the framework name is hidden', async () => {
  const { res } = await call('GET', '/diagrams');
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('every request is written to the request log collection, control characters removed', async () => {
  await call('GET', '/diagrams?tag=a%0Afake%0Dline');
  const [entry] = await models.RequestLog.find({}).lean();
  assert.equal(entry.method, 'GET');
  assert.ok(!/[\r\n]/.test(entry.path));
  assert.ok(entry.createdAt instanceof Date);
});

test('a failed log write shows 500 and does not leak the reason', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(models.RequestLog, 'create', async () => {
    throw new Error('disk is full: secret');
  });
  const { res, body } = await call('GET', '/diagrams');
  assert.equal(res.status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
});

test('without a database connection the API answers 503, not a crash or a hang', async () => {
  const server = createApp(models, { isReady: () => false }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const response = await fetch(`http://localhost:${server.address().port}/diagrams`);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /unavailable/);
  server.close();
});

test('Mongoose error texts are not sent to the client', async (t) => {
  t.mock.method(models.Diagram, 'find', () => {
    const error = new Error('Diagram validation failed: secretField: nope');
    error.name = 'ValidationError';
    error.errors = { secretField: {} };
    throw error;
  });
  const { res, body } = await call('GET', '/diagrams');
  assert.equal(res.status, 400);
  assert.equal(body.error, 'Invalid data');
  assert.ok(!JSON.stringify(body).includes('Diagram validation'));
});

test('an unknown status of a server error is hidden too', () => {
  let sent;
  const res = { status: (code) => ({ json: (payload) => (sent = { code, payload }) }) };
  const error = Object.assign(new Error('upstream secret'), { status: 502 });
  const log = console.error;
  console.error = () => {};
  errorHandler(error, {}, res, () => {});
  console.error = log;
  assert.deepEqual(sent, { code: 502, payload: { error: 'Internal server error' } });
});

test('aggregation: GET /diagrams/stats groups by notation', async () => {
  const { res, body } = await call('GET', '/diagrams/stats');
  assert.equal(res.status, 200);
  assert.deepEqual(body, [
    { count: 2, avgPriority: 1.5, comments: 3, notation: 'BPMN' },
    { count: 1, avgPriority: 0, comments: 0, notation: 'UML' },
  ]);
  assert.equal((await call('POST', '/diagrams/stats', {})).res.status, 405);
});

test('search in the nested field: ?commentAuthor= matches comments.author', async () => {
  assert.equal((await call('GET', '/diagrams?commentAuthor=boris')).body.length, 2);
  assert.equal((await call('GET', '/diagrams?commentAuthor=dina&owner=anna')).body.length, 1);
  assert.equal((await call('GET', '/diagrams?commentAuthor=nobody')).body.length, 0);
  for (const query of ['commentAuthor[$ne]=x', 'commentAuthor=%20', 'commentAuthor=' + 'x'.repeat(61)]) {
    assert.equal((await call('GET', `/diagrams?${query}`)).res.status, 400, query);
  }
});

test('comments.author index is declared', async () => {
  const names = (await models.Diagram.listIndexes()).map((index) => index.name);
  assert.ok(names.includes('comments.author_1'));
});

test('limit and skip page the list and reject huge or odd values', async () => {
  assert.equal((await call('GET', '/diagrams?limit=2')).body.length, 2);
  assert.equal((await call('GET', '/diagrams?limit=2&skip=2')).body.length, 1);
  for (const query of ['limit=0', 'limit=101', 'limit=-1', 'limit=1e3', 'limit=99999999999999999999', 'skip=100001', 'skip=abc', 'limit[$gt]=1', 'limit=1&limit=2']) {
    assert.equal((await call('GET', `/diagrams?${query}`)).res.status, 400, query);
  }
});

test('$where, $ne and $gt in query and body never reach MongoDB', async () => {
  for (const query of ['owner[$where]=1', 'tag[$gt]=a', 'commentAuthor[$ne]=a', '$where=1']) {
    assert.equal((await call('GET', `/diagrams?${query}`)).res.status, 400, query);
  }
  const valid = { title: 't', notation: 'UML', sourceCode: 's', owner: 'o' };
  for (const bad of [{ title: { $ne: null } }, { owner: { $gt: '' } }, { sourceCode: { $where: 'sleep(5000)' } }, { tags: [{ $ne: 1 }] }]) {
    assert.equal((await call('POST', '/diagrams', { ...valid, ...bad })).res.status, 400, JSON.stringify(bad));
  }
});
