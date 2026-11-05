const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, createCaller } = require('./helpers');

const valid = { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 0, owner: 'carol', tags: ['auth'] };
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
});

const raw = (method, path, body, type = 'application/json') => fetch(ctx.base + path, { method, headers: type ? { 'Content-Type': type } : {}, body });

test('POST answers 400 for an empty body', async () => {
  assert.equal((await raw('POST', '/diagrams', '')).status, 400);
});

test('POST answers 400 for truncated JSON', async () => {
  const res = await raw('POST', '/diagrams', '{"title": "Login');
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /JSON/);
});

test('POST answers 400 for JSON null, an array, a string and a number', async () => {
  for (const body of ['null', '[]', '"text"', '42']) assert.equal((await raw('POST', '/diagrams', body)).status, 400, body);
});

test('POST answers 400 for a body that is not JSON content', async () => {
  assert.equal((await raw('POST', '/diagrams', JSON.stringify(valid), 'text/plain')).status, 400);
});

test('POST answers 400 for a nested object where a string is expected', async () => {
  let nested = 'x';
  for (let i = 0; i < 50; i += 1) nested = { a: nested };
  const { res } = await call('POST', '/diagrams', { ...valid, title: nested });
  assert.equal(res.status, 400);
});

test('POST answers 400 for numbers and booleans in text fields', async () => {
  for (const title of [123, true, ['a']]) assert.equal((await call('POST', '/diagrams', { ...valid, title })).res.status, 400, String(title));
});

test('POST answers 400 for empty, tab-only and space-only titles', async () => {
  for (const title of ['', '   ', '\t\t', '\n']) assert.equal((await call('POST', '/diagrams', { ...valid, title })).res.status, 400, JSON.stringify(title));
});

test('POST answers 400 for a title one character over the limit', async () => {
  const { res } = await call('POST', '/diagrams', { ...valid, title: 'x'.repeat(81) });
  assert.equal(res.status, 400);
});

test('POST accepts emoji and right-to-left text and returns them unchanged', async () => {
  const title = 'Схема \u{1F600} שלום';
  const { res, body } = await call('POST', '/diagrams', { ...valid, title });
  assert.equal(res.status, 201);
  assert.equal(body.title, title);
});

test('POST answers 400 or stores a NUL character without a 500', async () => {
  const { res } = await call('POST', '/diagrams', { ...valid, title: 'a\u0000b' });
  assert.ok(res.status === 201 || res.status === 400, String(res.status));
});

test('POST answers 400 for priority -1, 1.5, a numeric string, a boolean and a number above the maximum', async () => {
  for (const priority of [-1, 1.5, '1', true, 3, 2147483648]) {
    assert.equal((await call('POST', '/diagrams', { ...valid, priority })).res.status, 400, String(priority));
  }
});

test('POST answers 400 for a priority written as 1e309 in the raw JSON', async () => {
  const body = JSON.stringify(valid).replace('"priority":0', '"priority":1e309');
  assert.equal((await raw('POST', '/diagrams', body)).status, 400);
});

test('POST answers 400 for a notation outside the list', async () => {
  assert.equal((await call('POST', '/diagrams', { ...valid, notation: 'Paint' })).res.status, 400);
});

test('POST ignores forged id, owner-like and timestamp fields that are not in the schema', async () => {
  const { res, body } = await call('POST', '/diagrams', {
    ...valid,
    id: MISSING_ID,
    _id: MISSING_ID,
    role: 'admin',
    createdAt: '2000-01-01',
    comments: [{ author: 'x', text: 'y' }],
  });
  assert.equal(res.status, 201);
  assert.notEqual(body.id, MISSING_ID);
  assert.notEqual(body.createdAt, '2000-01-01T00:00:00.000Z');
  assert.deepEqual(body.comments, []);
});

test('POST stores an operator-looking text as plain text and never as a query operator', async () => {
  const { res, body } = await call('POST', '/diagrams', { ...valid, title: "' OR 1=1 --", sourceCode: '{"$ne":null}' });
  assert.equal(res.status, 201);
  assert.equal(body.title, "' OR 1=1 --");
  assert.equal((await call('POST', '/diagrams', { ...valid, title: { $ne: null } })).res.status, 400);
});

test('GET list answers 400 for NoSQL operators in the query string', async () => {
  for (const query of [
    'owner[$ne]=x',
    'owner[$gt]=',
    'tag[$regex]=.*',
    'owner=a&owner=b',
    'limit=-1',
    'limit=0',
    'limit=1e3',
    'skip=abc',
    'limit=99999999999999999999',
  ]) {
    assert.equal((await call('GET', `/diagrams?${query}`)).res.status, 400, query);
  }
});

test('GET by a malformed id answers 400 without reaching the database', async () => {
  for (const id of ['abc', '-1', '0', '1.5', '1e3', '0x1', '%25', '%00', '99999999999999999999', '%20', 'a'.repeat(5000)]) {
    assert.equal((await call('GET', `/diagrams/${id}`)).res.status, 400, id.slice(0, 20));
  }
});

test('an unknown route answers 404 with a JSON error', async () => {
  const { res, body } = await call('GET', '/nothing/here');
  assert.equal(res.status, 404);
  assert.ok(body.error);
});

test('an unsupported method answers 405 with an Allow header', async () => {
  const { res } = await call('DELETE', '/diagrams');
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'GET, POST');
});

test('a body one megabyte over the limit answers 413', async () => {
  const { res } = await call('POST', '/diagrams', { ...valid, sourceCode: 'x'.repeat(1024 * 1024) });
  assert.equal(res.status, 413);
});

test('two identical POST requests create two records', async () => {
  await call('POST', '/diagrams', valid);
  await call('POST', '/diagrams', valid);
  assert.equal(await models.Diagram.countDocuments(), 2);
});

test('a repeated PUT leaves the same result as the first one', async () => {
  const { body: created } = await call('POST', '/diagrams', valid);
  const first = await call('PUT', `/diagrams/${created.id}`, { ...valid, title: 'Same' });
  const second = await call('PUT', `/diagrams/${created.id}`, { ...valid, title: 'Same' });
  assert.equal(second.res.status, 200);
  assert.equal(second.body.title, first.body.title);
  assert.equal(await models.Diagram.countDocuments(), 1);
});

test('PUT without required fields answers 400', async () => {
  const { body: created } = await call('POST', '/diagrams', valid);
  assert.equal((await call('PUT', `/diagrams/${created.id}`, { title: 'Only title' })).res.status, 400);
});

test('DELETE twice answers 204 and then 404, and the record is gone for GET and PUT', async () => {
  const { body: created } = await call('POST', '/diagrams', valid);
  assert.equal((await call('DELETE', `/diagrams/${created.id}`)).res.status, 204);
  assert.equal((await call('DELETE', `/diagrams/${created.id}`)).res.status, 404);
  assert.equal((await call('GET', `/diagrams/${created.id}`)).res.status, 404);
  assert.equal((await call('PUT', `/diagrams/${created.id}`, valid)).res.status, 404);
});

test('parallel PATCH requests to one record all answer 200 and leave a valid record', async () => {
  const { body: created } = await call('POST', '/diagrams', valid);
  const replies = await Promise.all([0, 1, 2, 1, 0].map((priority) => call('PATCH', `/diagrams/${created.id}`, { priority })));
  assert.ok(replies.every(({ res }) => res.status === 200));
  assert.ok([0, 1, 2].includes((await call('GET', `/diagrams/${created.id}`)).body.priority));
});

test('a comment with a blank author or a too long text answers 400', async () => {
  const { body: created } = await call('POST', '/diagrams', valid);
  assert.equal((await call('POST', `/diagrams/${created.id}/comments`, { author: '  ', text: 'x' })).res.status, 400);
  assert.equal((await call('POST', `/diagrams/${created.id}/comments`, { author: 'a', text: 'x'.repeat(1001) })).res.status, 400);
});

test('a comment on a missing diagram answers 404', async () => {
  assert.equal((await call('POST', `/diagrams/${MISSING_ID}/comments`, { author: 'a', text: 'x' })).res.status, 404);
});

test('with the database closed the API answers 503 without internal details', async () => {
  const mongoose = require('mongoose');
  const { createApp } = require('../src/app');
  const server = createApp(models, { isReady: () => false }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const res = await fetch(`http://localhost:${server.address().port}/diagrams`);
    assert.equal(res.status, 503);
    const text = await res.text();
    assert.ok(!/mongo|stack|at /i.test(text), text);
    assert.equal(mongoose.connection.readyState, 1);
  } finally {
    server.close();
  }
});
