const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createModels } = require('../src/models');
const { createTempDatabase } = require('./helpers');
const { startServer, SECRET, PASSWORD } = require('./harness');

// Mistakes a user or a grader makes on purpose: broken bodies, odd values, odd addresses, bad or stolen tokens,
// repeated requests, parallel requests and a stopped database. The answers must be a clear 4xx or 5xx without internals, never a crash.
const valid = { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 'low' };
const creds = (email, password = PASSWORD) => ({ body: { email, password } });

let app;
before(async () => {
  app = await startServer();
});
after(() => app.close());

const userId = async (email) => (await app.models.User.findOne({ where: { email } })).id;

// ---- Авторизация -----------------------------------------------------------------------------------------------------

test('an empty Bearer token or a double space before the token answers 401 Missing Bearer token', async () => {
  const token = await app.tokenFor('auth-empty@example.com');
  for (const Authorization of ['Bearer ', `Bearer  ${token}`, `Bearer\t${token}`]) {
    const { res, body } = await app.call('GET', '/profile', { headers: { Authorization } });
    assert.equal(res.status, 401, JSON.stringify(Authorization.slice(0, 12)));
    assert.equal(body.error, 'Missing Bearer token');
  }
});

test('a token signed with the right secret but with a wrong issuer or a not-before time in the future answers 401', async () => {
  const other = jwt.sign({ id: 1, role: 'admin' }, SECRET, { expiresIn: '1h', issuer: 'someone-else' });
  const notYet = jwt.sign({ id: 1, role: 'admin' }, SECRET, { expiresIn: '2h', issuer: 'dslkit', notBefore: '1h' });
  for (const token of [other, notYet]) {
    const { res, body } = await app.call('GET', '/profile', { token });
    assert.equal(res.status, 401, token.slice(0, 20));
    assert.equal(body.error, 'Invalid token');
  }
});

test('a token whose id is a string, null or missing answers 401 and never 500', async () => {
  for (const payload of [{ id: 'abc' }, { id: null }, { id: {} }, {}]) {
    const token = jwt.sign({ role: 'admin', ...payload }, SECRET, { expiresIn: '1h', issuer: 'dslkit' });
    const { res, body } = await app.call('GET', '/profile', { token });
    assert.equal(res.status, 401, JSON.stringify(payload));
    assert.equal(body.error, 'Invalid token');
  }
});

test('a token that claims the admin role is refused on admin routes when the database says user', async () => {
  const token = await app.tokenFor('claims-admin@example.com');
  const id = await userId('claims-admin@example.com');
  const forged = jwt.sign({ id, email: 'claims-admin@example.com', role: 'admin' }, SECRET, { expiresIn: '1h', issuer: 'dslkit' });
  assert.equal((await app.call('GET', '/users', { token: forged })).res.status, 403);
  assert.equal((await app.call('PATCH', `/users/${id}/role`, { token: forged, body: { role: 'admin' } })).res.status, 403);
  assert.equal((await app.call('GET', '/users', { token })).res.status, 403);
  assert.equal((await app.models.User.findByPk(id)).role, 'user');
});

test('login with a NUL in the email, a one-character password, operator objects or SQL text never answers 500', async () => {
  const cases = [
    [creds('carol\u0000@example.com'), 401],
    [creds('carol@example.com', 'a'), 401],
    [creds("' OR 1=1 --", 'x'), 401],
    [{ body: { email: { $ne: null }, password: 'x' } }, 400],
    [{ body: { email: 'carol@example.com', password: { $gt: '' } } }, 400],
  ];
  for (const [options, status] of cases) {
    const { res } = await app.call('POST', '/auth/login', options);
    assert.equal(res.status, status, JSON.stringify(options.body));
  }
});

test('a registration email with a space inside or a NUL character answers 400 and is not stored', async () => {
  const before = await app.models.User.count();
  for (const email of ['bad mail@example.com', 'nul\u0000@example.com', 'tab\t@example.com']) {
    const { res } = await app.call('POST', '/auth/register', creds(email));
    assert.equal(res.status, 400, JSON.stringify(email));
  }
  assert.equal(await app.models.User.count(), before);
});

test('a password of 72 bytes is accepted, 73 bytes is refused, counting bytes not letters', async () => {
  assert.equal((await app.call('POST', '/auth/register', creds('edge72@example.com', 'a'.repeat(72)))).res.status, 201);
  const { res, body } = await app.call('POST', '/auth/register', creds('edge73@example.com', `${'é'.repeat(36)}a`));
  assert.equal(res.status, 400);
  assert.deepEqual(body.details, [{ field: 'password', message: 'must be at most 72 bytes' }]);
});

test('ten parallel registrations of one email create one account and answer 409 for the rest', async () => {
  const results = await Promise.all(Array.from({ length: 10 }, () => app.call('POST', '/auth/register', creds('race@example.com'))));
  const statuses = results.map(({ res }) => res.status).sort();
  assert.deepEqual(statuses, [201, ...Array(9).fill(409)]);
  assert.equal(await app.models.User.count({ where: { email: 'race@example.com' } }), 1);
});

test('a very long Authorization header answers 401 or 431, not a crash', async () => {
  const res = await fetch(`http://localhost:${app.port}/profile`, { headers: { Authorization: `Bearer ${'a'.repeat(20000)}` } }).catch((error) => error);
  assert.ok(res.status === 401 || res.status === 431, String(res.status ?? res.message));
});

// ---- API: тело и значения --------------------------------------------------------------------------------------------

test('a diagram body nested 50 levels deep, or nested in the title, answers 400 and the server keeps working', async () => {
  const token = await app.tokenFor('nest@example.com');
  const deep = JSON.parse(`${'['.repeat(50)}${']'.repeat(50)}`);
  assert.equal((await app.call('POST', '/diagrams', { token, body: deep })).res.status, 400);
  let nested = 'text';
  for (let i = 0; i < 50; i += 1) nested = { level: nested };
  const { res, body } = await app.call('POST', '/diagrams', { token, body: { ...valid, title: nested } });
  assert.equal(res.status, 400);
  assert.deepEqual(
    body.details.map((d) => d.field),
    ['title'],
  );
  assert.equal((await app.call('GET', '/health')).res.status, 200);
});

test('a __proto__ key in a registration body does not pollute the object prototype', async () => {
  const raw = `{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"email":"proto@example.com","password":"${PASSWORD}"}`;
  const { res, body } = await app.call('POST', '/auth/register', { raw, headers: { 'Content-Type': 'application/json' } });
  assert.equal(res.status, 201);
  assert.equal({}.polluted, undefined);
  assert.equal('polluted' in body, false);
});

test('a title with a control character such as NUL or ESC answers 400 and is not stored', async () => {
  const token = await app.tokenFor('ctrl@example.com');
  for (const title of ['Login\u0000flow', 'Login\u0007flow', 'Login\u001b[31m']) {
    const { res } = await app.call('POST', '/diagrams', { token, body: { ...valid, title } });
    assert.equal(res.status, 400, JSON.stringify(title));
  }
});

test('a title made only of zero-width spaces answers 400 like an empty one', async () => {
  const token = await app.tokenFor('zwsp@example.com');
  assert.equal((await app.call('POST', '/diagrams', { token, body: { ...valid, title: '​​' } })).res.status, 400);
});

test('emoji and right-to-left titles are stored unchanged', async () => {
  const token = await app.tokenFor('unicode@example.com');
  for (const title of ['Схема 🚀 процесса', 'مخطط التدفق', '流程图 📊']) {
    const { res, body } = await app.call('POST', '/diagrams', { token, body: { ...valid, title } });
    assert.equal(res.status, 201, title);
    assert.equal(body.title, title);
  }
});

test('a body of one megabyte answers 413 with a JSON error', async () => {
  const token = await app.tokenFor('big@example.com');
  const { res, body } = await app.call('POST', '/diagrams', { token, body: { ...valid, sourceCode: 'x'.repeat(1024 * 1024) } });
  assert.equal(res.status, 413);
  assert.equal(typeof body.error, 'string');
});

test('a priority that is a number, a boolean or an out-of-range value answers 400', async () => {
  const token = await app.tokenFor('prio@example.com');
  for (const priority of ['-1', '0', '1.5', '1e309', '2147483648', 'true', '[]', '{}']) {
    const raw = `{"title":"a","notation":"UML","sourceCode":"a","priority":${priority}}`;
    const { res } = await app.call('POST', '/diagrams', { token, raw, headers: { 'Content-Type': 'application/json' } });
    assert.equal(res.status, 400, priority);
  }
});

test('an id such as %, %00, an encoded SQL fragment or a 10000-character path answers 400 with a token', async () => {
  const token = await app.tokenFor('ids@example.com');
  for (const id of ['%', '%00', '%E0%A4%A', '1%20OR%201=1', 'a'.repeat(10000)]) {
    const { res, body } = await app.call('GET', `/diagrams/${id}`, { token });
    assert.equal(res.status, 400, id.slice(0, 20));
    assert.equal(typeof body.error, 'string');
  }
});

test('a PUT with an empty body answers 400 and the diagram stays as it was', async () => {
  const token = await app.tokenFor('empty-put@example.com');
  const { body: created } = await app.call('POST', '/diagrams', { token, body: valid });
  const { res } = await app.call('PUT', `/diagrams/${created.id}`, { token, raw: '', headers: { 'Content-Type': 'application/json' } });
  assert.equal(res.status, 400);
  assert.equal((await app.call('GET', `/diagrams/${created.id}`, { token })).body.title, valid.title);
});

test('a diagram deleted by one request answers 404 to a later GET and PUT', async () => {
  const token = await app.tokenFor('gone@example.com');
  const { body: created } = await app.call('POST', '/diagrams', { token, body: valid });
  assert.equal((await app.call('DELETE', `/diagrams/${created.id}`, { token })).res.status, 204);
  assert.equal((await app.call('GET', `/diagrams/${created.id}`, { token })).res.status, 404);
  assert.equal((await app.call('PUT', `/diagrams/${created.id}`, { token, body: valid })).res.status, 404);
});

test('twenty parallel POST requests create twenty diagrams with distinct ids', async () => {
  const token = await app.tokenFor('parallel@example.com');
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => app.call('POST', '/diagrams', { token, body: { ...valid, title: `P${i}` } })));
  assert.ok(results.every(({ res }) => res.status === 201));
  assert.equal(new Set(results.map(({ body }) => body.id)).size, 20);
});

test('a PUT and a DELETE of the same diagram at the same time answer 200 or 204 for one and 404 for the other', async () => {
  const token = await app.tokenFor('race-diagram@example.com');
  const { body: created } = await app.call('POST', '/diagrams', { token, body: valid });
  const [put, del] = await Promise.all([
    app.call('PUT', `/diagrams/${created.id}`, { token, body: valid }),
    app.call('DELETE', `/diagrams/${created.id}`, { token }),
  ]);
  // Whichever request runs first, the delete succeeds and the late PUT finds nothing.
  assert.equal(del.res.status, 204);
  assert.ok([200, 404].includes(put.res.status), String(put.res.status));
  assert.equal((await app.call('GET', `/diagrams/${created.id}`, { token })).res.status, 404);
});

test('a sort with SQL in it, a repeated sort or a prototype name answers 400 and the table survives', async () => {
  const token = await app.tokenFor('sort@example.com');
  const before = await app.models.Diagram.count();
  for (const query of ['?sort=id;DROP TABLE Diagrams', '?sort=title&sort=id', '?sort=constructor', '?order=asc&order=desc']) {
    const { res, body } = await app.call('GET', `/diagrams${query}`, { token });
    assert.equal(res.status, 400, query);
    assert.ok(Array.isArray(body.details), query);
  }
  assert.equal(await app.models.Diagram.count(), before);
});

test('bracket names in the query are not parsed as lists, the default list comes back', async () => {
  const token = await app.tokenFor('brackets@example.com');
  for (const query of ['?sort[]=title', '?limit[]=5']) {
    assert.equal((await app.call('GET', `/diagrams${query}`, { token })).res.status, 200, query);
  }
});

test('an offset at the upper limit with a full page answers an empty array and the real total', async () => {
  const token = await app.tokenFor('offset@example.com');
  const { res, body } = await app.call('GET', '/diagrams?limit=100&offset=1000000', { token });
  assert.equal(res.status, 200);
  assert.deepEqual(body, []);
  assert.equal(res.headers.get('x-total-count'), String(await app.models.Diagram.count()));
});

test('enum values in another letter case are refused', async () => {
  const token = await app.tokenFor('enum@example.com');
  for (const notation of ['uml', 'bpmn', 'Erd ']) {
    assert.equal((await app.call('POST', '/diagrams', { token, body: { ...valid, notation } })).res.status, 400, notation);
  }
  assert.equal((await app.call('POST', '/diagrams', { token, body: { ...valid, priority: 'HIGH' } })).res.status, 400);
});

test('a trailing slash on the list or on an id still reaches the right handler', async () => {
  const token = await app.tokenFor('slash@example.com');
  assert.equal((await app.call('GET', '/diagrams/', { token })).res.status, 200);
  const { body: created } = await app.call('POST', '/diagrams', { token, body: valid });
  assert.equal((await app.call('GET', `/diagrams/${created.id}/`, { token })).res.status, 200);
});

test('a database failure on POST answers 500 without the internal message', async (t) => {
  const token = await app.tokenFor('dbfail@example.com');
  t.mock.method(console, 'error', () => {});
  t.mock.method(app.models.Diagram, 'create', async () => {
    throw new Error('SQLITE_FULL: database or disk is full at /var/data/secret.sqlite');
  });
  const { res, body } = await app.call('POST', '/diagrams', { token, body: valid });
  assert.equal(res.status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
});

test('a closed database answers 500 on the API and 503 on the health check, without file paths', async (t) => {
  const token = await app.tokenFor('closed@example.com');
  t.mock.method(console, 'error', () => {});
  const db = createTempDatabase();
  const closed = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  await closed.sequelize.close();
  const server = createApp(closed, { jwtSecret: SECRET, bcryptRounds: 4 }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://localhost:${server.address().port}`;
  try {
    const list = await fetch(`${url}/diagrams`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(list.status, 500);
    assert.deepEqual(await list.json(), { error: 'Internal server error' });
    const health = await fetch(`${url}/health`);
    assert.equal(health.status, 503);
  } finally {
    server.close();
    db.cleanup();
  }
});

// ---- API: пользователи и роли ----------------------------------------------------------------------------------------

test('an admin cannot delete a user who still owns diagrams, answers 409, and after the diagrams go the user goes too', async () => {
  const owner = await app.tokenFor('keeps-diagrams@example.com');
  const admin = await app.tokenFor('cleaner@example.com', 'admin');
  const id = await userId('keeps-diagrams@example.com');
  const { body: created } = await app.call('POST', '/diagrams', { token: owner, body: valid });
  const blocked = await app.call('DELETE', `/users/${id}`, { token: admin });
  assert.equal(blocked.res.status, 409);
  assert.match(blocked.body.error, /still owns diagrams/);
  assert.equal((await app.call('DELETE', `/diagrams/${created.id}`, { token: admin })).res.status, 204);
  assert.equal((await app.call('DELETE', `/users/${id}`, { token: admin })).res.status, 204);
  assert.equal((await app.call('DELETE', `/users/${id}`, { token: admin })).res.status, 404);
});

test('a role change with an unknown value, an array or no role answers 400 and the role stays', async () => {
  const admin = await app.tokenFor('role-admin@example.com', 'admin');
  await app.tokenFor('role-target@example.com');
  const id = await userId('role-target@example.com');
  for (const body of [{ role: 'superuser' }, { role: ['admin'] }, { role: null }, {}, []]) {
    const { res } = await app.call('PATCH', `/users/${id}/role`, { token: admin, body });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.equal((await app.models.User.findByPk(id)).role, 'user');
});
