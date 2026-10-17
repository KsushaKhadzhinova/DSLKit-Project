const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./harness');

let app;
let token;

before(async () => {
  app = await startServer();
  token = await app.tokenFor('carol@example.com');
  const owner = await app.models.User.findOne({ where: { email: 'carol@example.com' } });
  for (const title of ['Order processing', 'Billing schema', 'Login flow', 'ORDER archive']) {
    await app.models.Diagram.create({ title, notation: 'UML', sourceCode: 'a -> b', ownerId: owner.id });
  }
});
after(() => app.close());

const titles = (body) => body.map((d) => d.title);

const ORIGIN = 'http://localhost:5178';

test('a response to the allowed origin names it, and Vary: Origin is always sent', async () => {
  const { res } = await app.call('GET', '/diagrams', { token, headers: { Origin: ORIGIN } });
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  assert.match(res.headers.get('vary'), /Origin/);
});

test('another origin and a request without Origin get no allow header, but still Vary', async () => {
  for (const headers of [{ Origin: 'https://evil.example' }, {}]) {
    const { res } = await app.call('GET', '/diagrams', { token, headers });
    assert.equal(res.headers.get('access-control-allow-origin'), null);
    assert.match(res.headers.get('vary'), /Origin/);
  }
});

test('a preflight request from the allowed origin answers 204 with methods and headers, without a token', async () => {
  const { res } = await app.call('OPTIONS', '/diagrams/1', { headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'PUT' } });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(res.headers.get('access-control-allow-methods'), 'GET, POST, PUT, DELETE, OPTIONS');
  assert.equal(res.headers.get('access-control-allow-headers'), 'Content-Type, Authorization');
});

test('a preflight request from another origin gets 204 without any allow header', async () => {
  const { res } = await app.call('OPTIONS', '/diagrams/1', { headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'PUT' } });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
  assert.equal(res.headers.get('access-control-allow-methods'), null);
});

test('the allowed origin can be changed in the settings, and * is refused', async () => {
  const other = await startServer({ corsOrigin: 'https://dslkit.example' });
  const { res } = await other.call('GET', '/missing', { headers: { Origin: 'https://dslkit.example' } });
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://dslkit.example');
  await other.close();
  const { createCors } = require('../src/middleware/cors');
  assert.throws(() => createCors('*'), /one exact origin/);
});

test('GET /diagrams?search= keeps titles that contain the text, ignoring case in SQLite', async () => {
  const { res, body } = await app.call('GET', '/diagrams?search=order', { token });
  assert.equal(res.status, 200);
  assert.deepEqual(titles(body), ['Order processing', 'ORDER archive']);
});

test('an empty or blank search returns every diagram', async () => {
  assert.equal((await app.call('GET', '/diagrams?search=', { token })).body.length, 4);
  assert.equal((await app.call('GET', '/diagrams?search=%20%20', { token })).body.length, 4);
});

test('a search that matches nothing returns an empty list', async () => {
  assert.deepEqual((await app.call('GET', '/diagrams?search=zzz', { token })).body, []);
});

test('a search that is not a string or is too long answers 400', async () => {
  for (const query of ['search=a&search=b', `search=${'x'.repeat(81)}`]) {
    const { res, body } = await app.call('GET', `/diagrams?${query}`, { token });
    assert.equal(res.status, 400, query);
    assert.match(body.error, /search must be a string/);
  }
});

test('a search with quotes is only a parameter and does not break the query', async () => {
  const { res, body } = await app.call('GET', `/diagrams?search=${encodeURIComponent("' OR 1=1 --")}`, { token });
  assert.equal(res.status, 200);
  assert.deepEqual(body, []);
});
