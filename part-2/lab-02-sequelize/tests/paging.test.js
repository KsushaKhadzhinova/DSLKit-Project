const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createModels } = require('../src/models');
const { createTempDatabase } = require('./helpers');

const db = createTempDatabase();
let server;
let base;
let models;

before(async () => {
  db.cli('db:migrate');
  models = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  const rows = [
    ['delta', 'low', 'anna'],
    ['alpha', 'high', 'boris'],
    ['charlie', 'normal', 'anna'],
    ['bravo', 'high', 'carol'],
    ['echo', 'low', 'dina'],
  ];
  for (const [title, priority, owner] of rows) await models.Diagram.create({ title, notation: 'UML', sourceCode: 'a -> b', priority, owner });
  server = createApp(models).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await new Promise((resolve) => setTimeout(resolve, 150));
  await models.sequelize.close();
  db.cleanup();
});

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

test('limit and offset are applied by the database, the total stays the full size', async () => {
  const { res, body } = await get('?limit=2&offset=1');
  assert.deepEqual(titles(body), ['alpha', 'charlie']);
  assert.equal(res.headers.get('x-total-count'), '5');
  assert.deepEqual(titles((await get('?offset=4')).body), ['echo']);
  assert.deepEqual((await get('?offset=50')).body, []);
});

test('sort and order arrange the list, ties keep the order of ids', async () => {
  assert.deepEqual(titles((await get('?sort=title')).body), ['alpha', 'bravo', 'charlie', 'delta', 'echo']);
  assert.deepEqual(titles((await get('?sort=title&order=DESC')).body), ['echo', 'delta', 'charlie', 'bravo', 'alpha']);
  assert.deepEqual(titles((await get('?sort=priority&order=asc&limit=2')).body), ['alpha', 'bravo']);
  assert.deepEqual(titles((await get('?sort=createdAt&order=desc&limit=1')).body), ['echo']);
});

test('paging works on the sorted list', async () => {
  assert.deepEqual(titles((await get('?sort=title&limit=2&offset=2')).body), ['charlie', 'delta']);
});

test('bad or huge values and unknown fields get 400 with the list of problems', async () => {
  const bad = ['?limit=0', '?limit=101', '?limit=abc', '?limit=-1', '?limit=1e9', '?limit=99999999999999999999', '?offset=-1', '?offset=2000000', '?sort=password', '?sort=title;drop', '?order=up', '?limit=1&limit=2'];
  for (const query of bad) {
    const { res, body } = await get(query);
    assert.equal(res.status, 400, query);
    assert.ok(Array.isArray(body.details) && body.details.length > 0, query);
  }
});
