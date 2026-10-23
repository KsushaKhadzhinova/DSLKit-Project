const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createDiagramStore } = require('../src/models/diagram.model');

const make = (title, priority, owner) => ({ title, notation: 'UML', sourceCode: 'a -> b', priority, owner });

let server;
let base;

before(async () => {
  const store = createDiagramStore([]);
  [make('delta', 'low', 'anna'), make('alpha', 'high', 'boris'), make('charlie', 'normal', 'anna'), make('bravo', 'high', 'carol'), make('echo', 'low', 'dina')].forEach((fields) => store.create(fields));
  server = createApp(store).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const get = async (query = '') => {
  const res = await fetch(`${base}/diagrams${query}`);
  return { res, body: await res.json() };
};
const titles = (body) => body.map((d) => d.title);

test('without parameters the whole list comes by id and X-Total-Count holds its size', async () => {
  const { res, body } = await get();
  assert.deepEqual(titles(body), ['delta', 'alpha', 'charlie', 'bravo', 'echo']);
  assert.equal(res.headers.get('x-total-count'), '5');
});

test('limit and offset cut a page, the total stays the full size', async () => {
  const { res, body } = await get('?limit=2&offset=1');
  assert.deepEqual(titles(body), ['alpha', 'charlie']);
  assert.equal(res.headers.get('x-total-count'), '5');
  assert.deepEqual(titles((await get('?offset=4')).body), ['echo']);
  assert.deepEqual((await get('?offset=50')).body, []);
});

test('sort and order arrange the list, ties keep the order of ids', async () => {
  assert.deepEqual(titles((await get('?sort=title')).body), ['alpha', 'bravo', 'charlie', 'delta', 'echo']);
  assert.deepEqual(titles((await get('?sort=title&order=DESC')).body), ['echo', 'delta', 'charlie', 'bravo', 'alpha']);
  assert.deepEqual(titles((await get('?sort=priority&order=asc')).body), ['alpha', 'bravo', 'delta', 'echo', 'charlie']);
  assert.deepEqual(titles((await get('?sort=id&order=desc&limit=2')).body), ['echo', 'bravo']);
});

test('paging works on the sorted list', async () => {
  assert.deepEqual(titles((await get('?sort=title&limit=2&offset=2')).body), ['charlie', 'delta']);
});

test('bad or huge values and unknown fields get 400 with the list of problems', async () => {
  const bad = ['?limit=0', '?limit=101', '?limit=abc', '?limit=-1', '?limit=1e9', '?limit=99999999999999999999', '?offset=-1', '?offset=2000000', '?offset=0x10', '?sort=password', '?sort=title;drop', '?order=up', '?limit=1&limit=2'];
  for (const query of bad) {
    const { res, body } = await get(query);
    assert.equal(res.status, 400, query);
    assert.ok(Array.isArray(body.details) && body.details.length > 0, query);
  }
  const { body } = await get('?limit=0&sort=x&order=y');
  assert.deepEqual(
    body.details.map((d) => d.field),
    ['limit', 'sort', 'order'],
  );
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

test('?q= finds a part of the title ignoring case and surrounding spaces', async () => {
  const { res, body } = await get('?q=%20AL%20');
  assert.deepEqual(titles(body), ['alpha']);
  assert.equal(res.headers.get('x-total-count'), '1');
  assert.deepEqual(titles((await get('?q=a&notation=UML&sort=title')).body), ['alpha', 'bravo', 'charlie', 'delta']);
});

test('a bad notation or search text is refused with 400 and a list of problems', async () => {
  for (const query of ['?notation=XYZ', '?notation=', '?notation=UML&notation=ERD', '?q=', '?q=%20%20', `?q=${'a'.repeat(81)}`, '?q=a&q=b']) {
    const { res, body } = await get(query);
    assert.equal(res.status, 400, query);
    assert.ok(body.details.length > 0, query);
  }
});
