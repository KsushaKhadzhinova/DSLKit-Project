import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOpenApi } from '../src/openapi.js';
import { listItems } from '../src/resource.js';
import { createCollection } from '../src/store.js';

test('a resource the document knows nothing special about declares no 409 and no hidden list schema', () => {
  const doc = buildOpenApi({ notes: { text: { type: 'string', required: true, max: 10 } } });
  assert.equal(doc.paths['/notes'].post.responses['409'], undefined);
  assert.equal(doc.paths['/notes/{id}'].delete.responses['409'], undefined);
  assert.equal(doc.components.schemas.NoteListItem, undefined);
  assert.equal(doc.paths['/notes'].get.responses['200'].content['application/json'].schema.properties.data.items.$ref, '#/components/schemas/Note');
});

test('a search skips a text field that a record does not have', () => {
  const schema = { title: { type: 'string' }, code: { type: 'string' } };
  const found = listItems([{ id: 1, title: 'Alpha' }, { id: 2, title: 'Beta', code: 'alpha' }], schema, { q: 'beta' });
  assert.deepEqual(found.data.map((item) => item.id), [2]);
});

test('a collection without a clock stamps real ISO dates', () => {
  const collection = createCollection([{ id: 1, name: 'a' }]);
  assert.match(collection.find(1).createdAt, /^\d{4}-\d\d-\d\dT/);
  assert.match(collection.create({ name: 'b' }).createdAt, /^\d{4}-\d\d-\d\dT/);
});

// The comparator of `sort` has a branch for each outcome (text, greater, smaller, equal). Which of them a request
// reaches depends on the order the engine compares pairs, so they are covered here with fixed data, not by chance.
test('sort orders text, numbers and equal keys the same way every time', () => {
  const schema = { name: { type: 'string' }, rank: { type: 'integer' } };
  const items = [
    { id: 1, name: 'b', rank: 2 },
    { id: 2, name: 'a', rank: 2 },
    { id: 3, name: 'c', rank: 1 },
    { id: 4, name: 'a', rank: 3 },
  ];
  const ids = (sort) => listItems(items, schema, { sort }).data.map((item) => item.id);
  assert.deepEqual(ids('rank'), [3, 1, 2, 4]);
  assert.deepEqual(ids('-rank'), [4, 1, 2, 3]);
  assert.deepEqual(ids('name'), [2, 4, 1, 3]);
  assert.deepEqual(ids('-name'), [3, 1, 2, 4]);
  assert.deepEqual(ids('id'), [1, 2, 3, 4]);
  assert.deepEqual(listItems([...items].reverse(), schema, { sort: 'rank' }).data.map((item) => item.id), [3, 1, 2, 4]);
});

test('a resource router without any hooks still validates, stores and removes', async () => {
  const { default: express } = await import('express');
  const { createResourceRouter } = await import('../src/resource.js');
  const collection = createCollection([]);
  const app = express();
  app.use(express.json());
  app.use('/things', createResourceRouter({ label: 'Thing', collection, schema: { name: { type: 'string', required: true, max: 5 } } }));
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/things`;
  const send = (method, url, body) => fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
  try {
    assert.equal((await send('POST', '', { name: 'toolongname' })).status, 400);
    assert.equal((await send('POST', '', { name: 'ok' })).status, 201);
    assert.equal((await send('PUT', '/1', { name: 'new' })).status, 200);
    assert.equal((await send('PATCH', '/1', { name: 'newer' })).status, 200);
    assert.equal((await send('DELETE', '/1')).status, 204);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
