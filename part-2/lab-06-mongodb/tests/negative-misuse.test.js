const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, createCaller } = require('./helpers');
const { createApp } = require('../src/app');

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

const raw = (method, path, body, type = 'application/json') =>
  fetch(ctx.base + path, { method, headers: type ? { 'Content-Type': type } : {}, body });

const createOne = async (fields = {}) => (await call('POST', '/diagrams', { ...valid, ...fields })).body;

test('POST answers 400 for an empty JSON object', async () => {
  const { res, body } = await call('POST', '/diagrams', {});
  assert.equal(res.status, 400);
  assert.ok(body.details.some(({ field }) => field === 'title'));
});

test('POST answers 400 for a body sent without a Content-Type header', async () => {
  const res = await raw('POST', '/diagrams', JSON.stringify(valid), '');
  assert.equal(res.status, 400);
});

test('POST answers 400 for a form-encoded body', async () => {
  const res = await raw('POST', '/diagrams', 'title=Login&notation=UML', 'application/x-www-form-urlencoded');
  assert.equal(res.status, 400);
});

test('POST answers 400 for JSON with NaN, which JSON does not allow', async () => {
  const res = await raw('POST', '/diagrams', JSON.stringify(valid).replace('"priority":0', '"priority":NaN'));
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /JSON/);
});

test('POST answers 400 for a notation written in lower case', async () => {
  assert.equal((await call('POST', '/diagrams', { ...valid, notation: 'uml' })).res.status, 400);
});

test('POST answers 400 for a title made only of non-breaking spaces', async () => {
  assert.equal((await call('POST', '/diagrams', { ...valid, title: '   ' })).res.status, 400);
});

test('POST accepts a title of exactly 80 characters', async () => {
  assert.equal((await call('POST', '/diagrams', { ...valid, title: 'x'.repeat(80) })).res.status, 201);
});

test('POST counts an emoji as two characters against the title limit', async () => {
  assert.equal((await call('POST', '/diagrams', { ...valid, title: '\u{1F600}'.repeat(40) })).res.status, 201);
  assert.equal((await call('POST', '/diagrams', { ...valid, title: '\u{1F600}'.repeat(41) })).res.status, 400);
});

test('POST answers 201 or 400 for a NUL character inside a tag, never 500', async () => {
  const { res } = await call('POST', '/diagrams', { ...valid, tags: ['a\u0000b'] });
  assert.ok(res.status === 201 || res.status === 400, String(res.status));
});

test('POST answers 201 and keeps the last value when a key is repeated in the JSON', async () => {
  const body = '{"title":"Draft","notation":"UML","sourceCode":"s","owner":"o","title":"Login flow"}';
  const res = await raw('POST', '/diagrams', body);
  assert.equal(res.status, 201);
  assert.equal((await res.json()).title, 'Login flow');
});

test('POST ignores a 50-level nested field that is not in the schema', async () => {
  let deep = 'x';
  for (let i = 0; i < 50; i += 1) deep = { a: deep };
  const { res, body } = await call('POST', '/diagrams', { ...valid, extra: deep });
  assert.equal(res.status, 201);
  assert.equal(body.extra, undefined);
});

test('POST answers 400 for a priority of 9007199254740993, beyond the safe integer range', async () => {
  const body = JSON.stringify(valid).replace('"priority":0', '"priority":9007199254740993');
  assert.equal((await raw('POST', '/diagrams', body)).status, 400);
});

test('POST answers 400 for 21 tags, one over the limit, and the tags stay unsaved', async () => {
  const tags = Array.from({ length: 21 }, (_, i) => `t${i}`);
  assert.equal((await call('POST', '/diagrams', { ...valid, tags })).res.status, 400);
  assert.equal(await models.Diagram.countDocuments(), 0);
});

test('POST answers 400 for a body with a __proto__ key that carries no diagram fields', async () => {
  const res = await raw('POST', '/diagrams', '{"__proto__":{"admin":true}}');
  assert.equal(res.status, 400);
});

test('PUT answers 400 for 21 tags, one over the limit', async () => {
  const created = await createOne();
  const tags = Array.from({ length: 21 }, (_, i) => `t${i}`);
  assert.equal((await call('PUT', `/diagrams/${created.id}`, { ...valid, tags })).res.status, 400);
});

test('PUT ignores a forged id in the body and keeps the record id', async () => {
  const created = await createOne();
  const { res, body } = await call('PUT', `/diagrams/${created.id}`, { ...valid, id: MISSING_ID, title: 'Renamed' });
  assert.equal(res.status, 200);
  assert.equal(body.id, created.id);
  assert.equal(body.title, 'Renamed');
});

test('PATCH answers 400 for an empty JSON object', async () => {
  const created = await createOne();
  assert.equal((await call('PATCH', `/diagrams/${created.id}`, {})).res.status, 400);
});

test('PATCH answers 400 for a notation outside the list', async () => {
  const created = await createOne();
  assert.equal((await call('PATCH', `/diagrams/${created.id}`, { notation: 'Paint' })).res.status, 400);
});

test('PATCH answers 400 for a __proto__ key instead of a 500', async () => {
  const created = await createOne();
  const res = await raw('PATCH', `/diagrams/${created.id}`, '{"__proto__":{"x":1}}');
  assert.equal(res.status, 400);
  assert.equal((await models.Diagram.findById(created.id)).title, valid.title);
});

test('PATCH on a deleted record answers 404', async () => {
  const created = await createOne();
  await call('DELETE', `/diagrams/${created.id}`);
  assert.equal((await call('PATCH', `/diagrams/${created.id}`, { priority: 1 })).res.status, 404);
});

test('two parallel DELETE requests answer 204 and 404, never 500', async () => {
  const created = await createOne();
  const statuses = await Promise.all([call('DELETE', `/diagrams/${created.id}`), call('DELETE', `/diagrams/${created.id}`)]);
  assert.deepEqual(statuses.map(({ res }) => res.status).sort(), [204, 404]);
});

test('PUT on the collection answers 405 with an Allow header', async () => {
  const { res } = await call('PUT', '/diagrams', valid);
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'GET, POST');
});

test('GET comments answers 405 because comments are only added with POST', async () => {
  const created = await createOne();
  const { res } = await call('GET', `/diagrams/${created.id}/comments`);
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'POST');
});

test('GET by an id of 23 or 25 characters answers 400', async () => {
  const created = await createOne();
  const id = String(created.id);
  for (const path of [id.slice(1), `${id}a`]) assert.equal((await call('GET', `/diagrams/${path}`)).res.status, 400, path);
});

test('GET by a 24-character id with non-hex characters or encoded dots answers 400', async () => {
  for (const path of ['g'.repeat(24), '%2e%2e%2f%2e%2e%2fetc%2fpasswd']) assert.equal((await call('GET', `/diagrams/${path}`)).res.status, 400, path);
});

test('GET by an upper-case id of a missing record answers 404', async () => {
  assert.equal((await call('GET', `/diagrams/${MISSING_ID.toUpperCase()}`)).res.status, 404);
});

test('an unknown route with an 8000-character path answers 404 with a JSON error', async () => {
  const { res, body } = await call('GET', `/nothing/${'a'.repeat(8000)}`);
  assert.equal(res.status, 404);
  assert.ok(body.error);
});

test('GET list answers 400 for query keys named like object members, not 500', async () => {
  for (const query of ['constructor=1', 'toString=1', 'hasOwnProperty=1', '__proto__=1']) {
    assert.equal((await call('GET', `/diagrams?${query}`)).res.status, 400, query);
  }
});

test('GET list answers 400 for an unknown query key', async () => {
  assert.equal((await call('GET', '/diagrams?colour=red')).res.status, 400);
});

test('GET list answers 400 for a sort value outside the list', async () => {
  for (const query of ['sort=--title', 'sort=', 'sort=title;drop', 'sort=$title']) {
    assert.equal((await call('GET', `/diagrams?${query}`)).res.status, 400, query);
  }
});

test('GET list answers 400 for paging values written as 1e309, 1.5 or a 20-digit skip', async () => {
  for (const query of ['limit=1e309', 'limit=1.5', 'skip=1e309', 'skip=99999999999999999999']) {
    assert.equal((await call('GET', `/diagrams?${query}`)).res.status, 400, query);
  }
});

test('GET list answers 400 for a search text longer than 60 characters', async () => {
  assert.equal((await call('GET', `/diagrams?q=${'x'.repeat(61)}`)).res.status, 400);
});

test('GET /diagrams/count answers 400 for NoSQL operators in the query string', async () => {
  for (const query of ['owner[$ne]=x', 'tag[$gt]=', 'owner[$regex]=.*']) {
    assert.equal((await call('GET', `/diagrams/count?${query}`)).res.status, 400, query);
  }
});

test('a comment on a diagram that already holds 100 comments answers 400', async () => {
  const comments = Array.from({ length: 100 }, () => ({ author: 'a', text: 't' }));
  const created = (await models.Diagram.create({ ...valid, comments })).toJSON();
  const { res, body } = await call('POST', `/diagrams/${created.id}/comments`, { author: 'b', text: 'one more' });
  assert.equal(res.status, 400);
  assert.match(body.error, /100 comments/);
  assert.equal((await models.Diagram.findById(created.id)).comments.length, 100);
});

test('a comment with exactly 1000 characters of text is accepted', async () => {
  const created = await createOne();
  const { res } = await call('POST', `/diagrams/${created.id}/comments`, { author: 'a', text: 't'.repeat(1000) });
  assert.equal(res.status, 201);
});

test('a comment with a NUL character in the author answers 201 or 400, never 500', async () => {
  const created = await createOne();
  const { res } = await call('POST', `/diagrams/${created.id}/comments`, { author: 'a\u0000', text: 'x' });
  assert.ok(res.status === 201 || res.status === 400, String(res.status));
});

test('PUT with a malformed comment id answers 400', async () => {
  const created = await createOne();
  assert.equal((await call('PUT', `/diagrams/${created.id}/comments/abc`, { text: 'x' })).res.status, 400);
});

test('DELETE of the same comment twice answers 200 and then 404', async () => {
  const seeded = await models.Diagram.create({ ...valid, comments: [{ author: 'a', text: 't' }] });
  const created = { id: String(seeded._id) };
  const commentId = seeded.comments[0]._id;
  assert.equal((await call('DELETE', `/diagrams/${created.id}/comments/${commentId}`)).res.status, 200);
  assert.equal((await call('DELETE', `/diagrams/${created.id}/comments/${commentId}`)).res.status, 404);
});

test('with the database closed POST, GET by id and DELETE answer 503 with only an error field', async () => {
  const server = createApp(models, { isReady: () => false }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://localhost:${server.address().port}`;
  try {
    const requests = [
      fetch(`${base}/diagrams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid) }),
      fetch(`${base}/diagrams/${MISSING_ID}`),
      fetch(`${base}/diagrams/${MISSING_ID}`, { method: 'DELETE' }),
    ];
    for (const res of await Promise.all(requests)) {
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.deepEqual(Object.keys(body), ['error']);
      assert.ok(!/mongo|stack|\bat\b/i.test(JSON.stringify(body)), JSON.stringify(body));
    }
  } finally {
    server.close();
  }
});
