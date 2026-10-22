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

test('?notation= keeps one notation and X-Total-Count counts the filtered list', async () => {
  const { res, body } = await get('?notation=UML&limit=2');
  assert.equal(body.length, 2);
  assert.ok(body.every((d) => d.notation === 'UML'));
  assert.equal(res.headers.get('x-total-count'), '5');
  const none = await get('?notation=BPMN');
  assert.deepEqual(none.body, []);
  assert.equal(none.res.headers.get('x-total-count'), '0');
});

test('?q= finds a part of the title ignoring case, and % and _ are plain characters', async () => {
  const { res, body } = await get('?q=%20AL%20');
  assert.deepEqual(titles(body), ['alpha']);
  assert.equal(res.headers.get('x-total-count'), '1');
  assert.deepEqual(titles((await get('?q=a&notation=UML&sort=title')).body), ['alpha', 'bravo', 'charlie', 'delta']);
  assert.deepEqual((await get('?q=%25')).body, []);
  assert.deepEqual((await get('?q=_')).body, []);
});

test('a bad notation or search text is refused with 400 and a list of problems', async () => {
  for (const query of ['?notation=XYZ', '?notation=', '?notation=UML&notation=ERD', '?q=', '?q=%20%20', `?q=${'a'.repeat(81)}`, '?q=a&q=b']) {
    const { res, body } = await get(query);
    assert.equal(res.status, 400, query);
    assert.ok(body.details.length > 0, query);
  }
});
