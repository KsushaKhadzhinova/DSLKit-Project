const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, createCaller } = require('./helpers');
const limits = require('../limits.json');

const valid = { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 1, owner: 'carol', tags: ['auth'] };

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
  await models.Diagram.create({ ...valid, owner: 'anna' });
});

const rejected = async (path, method, payload) => {
  const { res, body } = await call(method, path, payload);
  assert.equal(res.status, 400, JSON.stringify(payload));
  assert.ok(body.error);
  return body;
};

test('operator objects in the body are rejected, not passed to MongoDB', async () => {
  for (const field of ['title', 'owner', 'sourceCode', 'notation', 'priority']) {
    await rejected('/diagrams', 'POST', { ...valid, [field]: { $ne: null } });
  }
  await rejected('/diagrams', 'POST', { ...valid, tags: { $ne: null } });
  await rejected('/diagrams', 'POST', { ...valid, tags: [{ $gt: '' }] });
  assert.equal(await models.Diagram.countDocuments(), 1);
});

test('operator objects in query parameters answer 400', async () => {
  for (const query of ['owner[$ne]=x', 'tag[$gt]=', 'owner[$regex]=.*', 'tag=', 'owner=%20', 'tag=a&tag=b']) {
    await rejected(`/diagrams?${query}`, 'GET');
  }
});

test('a plain string that looks like an operator is only a value', async () => {
  const { res, body } = await call('GET', '/diagrams?owner=$ne&tag=$where');
  assert.equal(res.status, 200);
  assert.deepEqual(body, []);
  assert.equal((await call('GET', '/diagrams?owner=anna')).body.length, 1);
});

test('operators in a body cannot reach the update: unknown keys are dropped', async () => {
  const id = String((await models.Diagram.findOne())._id);
  const { res, body } = await call('PUT', `/diagrams/${id}`, { ...valid, $set: { owner: 'hacker' }, 'comments.0.text': 'x', __proto__: { admin: true } });
  assert.equal(res.status, 200);
  assert.equal(body.owner, 'carol');
  assert.equal(await models.Diagram.countDocuments({ owner: 'hacker' }), 0);
});

test('limits come from limits.json and are enforced by the API', async () => {
  const bad = [
    { title: 'x'.repeat(limits.title + 1) },
    { title: '   ' },
    { owner: '\t\n' },
    { owner: 'x'.repeat(limits.owner + 1) },
    { sourceCode: 'x'.repeat(limits.sourceCode + 1) },
    { tags: Array.from({ length: limits.tags + 1 }, (_, i) => `t${i}`) },
    { tags: ['x'.repeat(limits.tag + 1)] },
    { tags: ['  '] },
  ];
  for (const patch of bad) await rejected('/diagrams', 'POST', { ...valid, ...patch });
  const edge = { title: 'x'.repeat(limits.title), owner: 'o'.repeat(limits.owner), tags: Array.from({ length: limits.tags }, () => 't'.repeat(limits.tag)) };
  assert.equal((await call('POST', '/diagrams', { ...valid, ...edge })).res.status, 201);
});

test('priority must be an integer inside the limits', async () => {
  for (const priority of [-1, limits.priorityMax + 1, 1.5, '1', true, [1]]) {
    await rejected('/diagrams', 'POST', { ...valid, priority });
  }
  for (const priority of [limits.priorityMin, limits.priorityMax]) {
    assert.equal((await call('POST', '/diagrams', { ...valid, priority })).body.priority, priority);
  }
});

test('comment fields are capped and cannot be operator objects', async () => {
  const id = String((await models.Diagram.findOne())._id);
  const url = `/diagrams/${id}/comments`;
  await rejected(url, 'POST', { author: 'a'.repeat(limits.author + 1), text: 't' });
  await rejected(url, 'POST', { author: 'a', text: 't'.repeat(limits.commentText + 1) });
  await rejected(url, 'POST', { author: { $ne: 1 }, text: 't' });
  await rejected(url, 'POST', { author: 'a', text: '   ' });
});

test('the model enforces the same limits when the HTTP checks are bypassed', async () => {
  const base = { ...valid };
  await assert.rejects(models.Diagram.create({ ...base, title: 'x'.repeat(limits.title + 1) }), { name: 'ValidationError' });
  await assert.rejects(models.Diagram.create({ ...base, priority: -1 }), { name: 'ValidationError' });
  await assert.rejects(models.Diagram.create({ ...base, priority: 0.5 }), { name: 'ValidationError' });
  await assert.rejects(models.Diagram.create({ ...base, tags: Array.from({ length: limits.tags + 1 }, (_, i) => `t${i}`) }), { name: 'ValidationError' });
  const comments = Array.from({ length: limits.comments + 1 }, () => ({ author: 'a', text: 't' }));
  await assert.rejects(models.Diagram.create({ ...base, comments }), { name: 'ValidationError' });
});

test('sanitizeFilter turns an operator sent as a value into a CastError', async () => {
  await assert.rejects(models.Diagram.find({ owner: { $ne: 'nobody' } }), { name: 'CastError' });
  assert.equal((await models.Diagram.find({ owner: 'anna' })).length, 1);
});

test('every diagram carries its creation time', async () => {
  const { body } = await call('GET', '/diagrams');
  assert.ok(!Number.isNaN(Date.parse(body[0].createdAt)));
});

test('a body above 100 kb answers 413', async () => {
  const { res } = await call('POST', '/diagrams', { ...valid, sourceCode: 'x'.repeat(101 * 1024) });
  assert.equal(res.status, 413);
});
