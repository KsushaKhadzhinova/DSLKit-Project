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
