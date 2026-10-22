const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./harness');

let app;
let token;

before(async () => {
  app = await startServer();
  token = await app.tokenFor('paging@example.com');
  const rows = [
    ['delta', 'low'],
    ['alpha', 'high'],
    ['charlie', 'normal'],
    ['bravo', 'high'],
    ['echo', 'low'],
  ];
  for (const [title, priority] of rows) await app.call('POST', '/diagrams', { token, body: { title, notation: 'UML', sourceCode: 'a -> b', priority } });
});
after(() => app.close());

const get = (query = '') => app.call('GET', `/diagrams${query}`, { token });
const titles = (body) => body.map((d) => d.title);

test('without parameters the whole list comes by id and X-Total-Count holds its size', async () => {
  const { res, body } = await get();
  assert.deepEqual(titles(body), ['delta', 'alpha', 'charlie', 'bravo', 'echo']);
  assert.equal(res.headers.get('x-total-count'), '5');
});

test('limit and offset are applied by the database, the total stays the full size', async () => {
  const { res, body } = await get('?limit=2&offset=1');
  assert.deepEqual(titles(body), ['alpha', 'charlie']);
  assert.equal(res.headers.get('x-total-count'), '5');
  assert.deepEqual(titles((await get('?offset=4')).body), ['echo']);
  assert.deepEqual((await get('?offset=50')).body, []);
});

test('sort and order arrange the list', async () => {
  assert.deepEqual(titles((await get('?sort=title')).body), ['alpha', 'bravo', 'charlie', 'delta', 'echo']);
  assert.deepEqual(titles((await get('?sort=title&order=DESC&limit=2')).body), ['echo', 'delta']);
});

test('bad or huge values and unknown fields get 400 with the list of problems', async () => {
  const bad = [
    '?limit=0',
    '?limit=101',
    '?limit=abc',
    '?limit=-1',
    '?limit=1e9',
    '?limit=99999999999999999999',
    '?offset=-1',
    '?offset=2000000',
    '?sort=passwordHash',
    '?sort=title;drop',
    '?order=up',
    '?limit=1&limit=2',
  ];
  for (const query of bad) {
    const { res, body } = await get(query);
    assert.equal(res.status, 400, query);
    assert.ok(Array.isArray(body.details) && body.details.length > 0, query);
  }
});
