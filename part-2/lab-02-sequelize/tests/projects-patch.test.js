const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createModels } = require('../src/models');
const { createTempDatabase } = require('./helpers');

const limits = require('../limits.json');
const valid = { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server', priority: 'low', owner: 'carol' };

const db = createTempDatabase();
let server;
let base;
let models;

before(async () => {
  db.cli('db:migrate');
  models = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  server = createApp(models).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await models.sequelize.close();
  db.cleanup();
});

beforeEach(async () => {
  await models.Diagram.destroy({ where: {} });
  await models.Project.destroy({ where: {} });
});

const call = async (method, path, body, raw) => {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  return { res, body: text ? JSON.parse(text) : undefined };
};

const makeDiagram = async (fields = {}) => (await call('POST', '/diagrams', { ...valid, ...fields })).body;
const makeProject = async (name = 'Billing') => (await call('POST', '/projects', { name })).body;

// Revision: a number that is never negative.

test('the revision defaults to 0 and is stored and returned as a number', async () => {
  const created = await makeDiagram();
  assert.equal(created.revision, 0);
  const { body } = await call('POST', '/diagrams', { ...valid, revision: 7 });
  assert.equal(body.revision, 7);
  assert.equal((await call('GET', `/diagrams/${body.id}`)).body.revision, 7);
});

test('a revision below 0, above the limit, fractional or not a number is refused with 400 everywhere', async () => {
  const id = (await makeDiagram()).id;
  const bad = [-1, -0.5, 1.5, 100001, 1e20, 2 ** 53, '5', '', null, true, [], {}, 'abc'];
  for (const revision of bad) {
    for (const [method, path] of [
      ['POST', '/diagrams'],
      ['PUT', `/diagrams/${id}`],
      ['PATCH', `/diagrams/${id}`],
    ]) {
      const { res, body } = await call(method, path, { ...valid, revision });
      assert.equal(res.status, 400, `${method} ${JSON.stringify(revision)}`);
      assert.deepEqual(
        body.details.map((d) => d.field),
        ['revision'],
      );
    }
  }
});

test('a number too large for JSON to hold (1e999) and the limits themselves are handled', async () => {
  const id = (await makeDiagram()).id;
  const raw = JSON.stringify({ ...valid }).replace('}', ',"revision":1e999}');
  assert.equal((await call('PATCH', `/diagrams/${id}`, {}, raw)).res.status, 400);
  assert.equal((await call('PATCH', `/diagrams/${id}`, { revision: 0 })).res.status, 200);
  const top = await call('PATCH', `/diagrams/${id}`, { revision: limits.revisionMax });
  assert.equal(top.body.revision, limits.revisionMax);
  assert.equal((await call('PATCH', `/diagrams/${id}`, { revision: limits.revisionMax + 1 })).res.status, 400);
});

test('the list can be sorted by revision, numbers compare as numbers', async () => {
  for (const revision of [10, 9, 100]) await makeDiagram({ revision });
  const { body } = await call('GET', '/diagrams?sort=revision&order=desc');
  assert.deepEqual(
    body.map((d) => d.revision),
    [100, 10, 9],
  );
});

// PATCH.

test('PATCH changes only the sent fields and keeps the rest', async () => {
  const created = await makeDiagram({ revision: 3 });
  const { res, body } = await call('PATCH', `/diagrams/${created.id}`, { title: '  New title  ', revision: 4 });
  assert.equal(res.status, 200);
  assert.equal(body.title, 'New title');
  assert.equal(body.revision, 4);
  assert.equal(body.owner, 'carol');
  assert.equal(body.priority, 'low');
  assert.equal(body.createdAt, created.createdAt);
  assert.equal((await models.Diagram.findByPk(created.id)).title, 'New title');
});

test('PATCH is checked like PUT: bad values, empty body, unknown fields, wrong types, missing and odd ids', async () => {
  const id = (await makeDiagram()).id;
  const bad = await call('PATCH', `/diagrams/${id}`, { title: '   ', notation: 'XYZ', priority: 'urgent' });
  assert.equal(bad.res.status, 400);
  assert.deepEqual(
    bad.body.details.map((d) => d.field),
    ['title', 'notation', 'priority'],
  );
  for (const body of [{}, { admin: true }, { id: 5, createdAt: 'x' }]) {
    assert.equal((await call('PATCH', `/diagrams/${id}`, body)).res.status, 400, JSON.stringify(body));
  }
  for (const raw of ['[]', 'null', '"text"', '5']) {
    assert.equal((await call('PATCH', `/diagrams/${id}`, {}, raw)).res.status, 400, raw);
  }
  assert.equal((await call('PATCH', '/diagrams/9999', { title: 'x' })).res.status, 404);
  assert.equal((await call('PATCH', '/diagrams/abc', { title: 'x' })).res.status, 400);
  assert.equal((await models.Diagram.findByPk(id)).title, 'Login flow');
});

test('PATCH cannot change the id and PATCH on a collection answers 405', async () => {
  const created = await makeDiagram();
  const { body } = await call('PATCH', `/diagrams/${created.id}`, { owner: 'dan', id: 99 });
  assert.equal(body.id, created.id);
  assert.equal((await call('PATCH', '/diagrams', { title: 'x' })).res.status, 405);
});

// Project: one-to-many and uniqueness.

test('a project is created with 201 and a Location, listed, read and deleted', async () => {
  const { res, body } = await call('POST', '/projects', { name: '  Billing  ' });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), `/projects/${body.id}`);
  assert.equal(body.name, 'Billing');
  assert.equal((await call('GET', `/projects/${body.id}`)).body.name, 'Billing');
  const list = await call('GET', '/projects?sort=name&order=desc');
  assert.equal(list.res.headers.get('x-total-count'), '1');
  assert.equal(list.body.length, 1);
  assert.equal((await call('DELETE', `/projects/${body.id}`)).res.status, 204);
  assert.equal((await call('GET', `/projects/${body.id}`)).res.status, 404);
  assert.equal((await call('DELETE', `/projects/${body.id}`)).res.status, 404);
});

test('a second project with the same name answers 409, a different name is fine', async () => {
  await makeProject('Billing');
  const duplicate = await call('POST', '/projects', { name: 'Billing' });
  assert.equal(duplicate.res.status, 409);
  assert.equal(duplicate.body.error, 'Value already exists');
  assert.deepEqual(duplicate.body.details, [{ field: 'name', message: 'must be unique' }]);
  assert.equal((await call('POST', '/projects', { name: '  Billing  ' })).res.status, 409);
  assert.equal((await call('POST', '/projects', { name: 'Orders' })).res.status, 201);
  assert.equal(await models.Project.count(), 2);
});

test('a project name is checked: empty, spaces, wrong type, too long, control characters, not an object', async () => {
  for (const name of ['', '   ', '\t\n', 5, null, undefined, [], {}, 'x'.repeat(limits.projectName + 1), 'bad\u0000name']) {
    const { res, body } = await call('POST', '/projects', { name });
    assert.equal(res.status, 400, JSON.stringify(name));
    assert.equal(body.details[0].field, 'name');
  }
  for (const raw of ['[]', 'null', '"x"']) assert.equal((await call('POST', '/projects', {}, raw)).res.status, 400, raw);
  assert.equal((await call('POST', '/projects', { name: 'x'.repeat(limits.projectName) })).res.status, 201);
});

test('a diagram belongs to a project, and the project lists its diagrams with paging', async () => {
  const project = await makeProject();
  const other = await makeProject('Orders');
  for (const title of ['a', 'b', 'c']) await makeDiagram({ title, projectId: project.id });
  await makeDiagram({ title: 'z', projectId: other.id });
  await makeDiagram({ title: 'free' });
  assert.equal((await call('GET', `/projects/${project.id}/diagrams`)).body.length, 3);
  const page = await call('GET', `/projects/${project.id}/diagrams?limit=2&offset=1&sort=title`);
  assert.deepEqual(
    page.body.map((d) => d.title),
    ['b', 'c'],
  );
  assert.equal(page.res.headers.get('x-total-count'), '3');
  assert.equal((await call('GET', '/projects/9999/diagrams')).res.status, 404);
  assert.equal((await call('GET', '/projects/abc/diagrams')).res.status, 400);
  assert.equal((await call('GET', `/projects/${project.id}/diagrams?limit=0`)).res.status, 400);
  assert.equal((await call('GET', '/diagrams')).body.find((d) => d.title === 'free').projectId, null);
});

test('a diagram cannot point to a project that does not exist, in POST, PUT and PATCH', async () => {
  const id = (await makeDiagram()).id;
  for (const [method, path] of [
    ['POST', '/diagrams'],
    ['PUT', `/diagrams/${id}`],
    ['PATCH', `/diagrams/${id}`],
  ]) {
    const { res, body } = await call(method, path, { ...valid, projectId: 9999 });
    assert.equal(res.status, 400, method);
    assert.deepEqual(body.details, [{ field: 'projectId', message: 'project 9999 does not exist' }]);
  }
  for (const projectId of [0, -1, 1.5, '1', 2147483648, true, []]) {
    assert.equal((await call('PATCH', `/diagrams/${id}`, { projectId })).res.status, 400, JSON.stringify(projectId));
  }
});

test('PATCH moves a diagram to a project and back to none, PUT without projectId clears it', async () => {
  const project = await makeProject();
  const id = (await makeDiagram()).id;
  assert.equal((await call('PATCH', `/diagrams/${id}`, { projectId: project.id })).body.projectId, project.id);
  assert.equal((await call('PATCH', `/diagrams/${id}`, { projectId: null })).body.projectId, null);
  await call('PATCH', `/diagrams/${id}`, { projectId: project.id });
  assert.equal((await call('PUT', `/diagrams/${id}`, valid)).body.projectId, null);
});

test('deleting a project keeps its diagrams and clears their projectId', async () => {
  const project = await makeProject();
  const diagram = await makeDiagram({ projectId: project.id });
  assert.equal((await call('DELETE', `/projects/${project.id}`)).res.status, 204);
  assert.equal((await call('GET', `/diagrams/${diagram.id}`)).body.projectId, null);
});

test('project routes answer 405 for other methods and a bad id gives 400', async () => {
  const project = await makeProject();
  assert.equal((await call('PUT', `/projects/${project.id}`, { name: 'x' })).res.status, 405);
  assert.equal((await call('PATCH', '/projects', { name: 'x' })).res.status, 405);
  assert.equal((await call('POST', `/projects/${project.id}/diagrams`, valid)).res.status, 405);
  assert.equal((await call('GET', '/projects/0')).res.status, 400);
  assert.equal((await call('DELETE', '/projects/99999999999')).res.status, 400);
});

test('a real database failure gives 500 without internals: the table is gone while the server runs', async (t) => {
  t.mock.method(console, 'error', () => {});
  await models.sequelize.query('DROP TABLE RequestLogs');
  try {
    const { res, body } = await call('GET', '/diagrams');
    assert.equal(res.status, 500);
    assert.deepEqual(body, { error: 'Internal server error' });
  } finally {
    db.cli('db:migrate:undo:all');
    db.cli('db:migrate');
  }
});
