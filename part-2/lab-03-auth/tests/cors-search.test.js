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

test('every response names the allowed origin of the React client', async () => {
  const { res } = await app.call('GET', '/diagrams', { token });
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5178');
  assert.match(res.headers.get('vary'), /Origin/);
});

test('a preflight request answers 204 with the allowed methods and headers, without a token', async () => {
  const { res } = await app.call('OPTIONS', '/diagrams/1', { headers: { Origin: 'http://localhost:5178', 'Access-Control-Request-Method': 'PUT' } });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-methods'), 'GET, POST, PUT, DELETE, OPTIONS');
  assert.equal(res.headers.get('access-control-allow-headers'), 'Content-Type, Authorization');
});

test('the allowed origin can be changed in the settings', async () => {
  const other = await startServer({ corsOrigin: 'https://dslkit.example' });
  const { res } = await other.call('GET', '/missing');
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://dslkit.example');
  await other.close();
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
