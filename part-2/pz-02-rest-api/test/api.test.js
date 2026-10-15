import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, schemas } from '../src/app.js';
import { listItems } from '../src/resource.js';
import { createStores } from '../src/store.js';

const withApi = (name, fn) =>
  test(name, async () => {
    const errors = [];
    const server = createApp({ stores: createStores(() => '2026-01-01T00:00:00.000Z'), writeError: (...a) => errors.push(a) }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const call = async (method, path, body, raw) => {
      const res = await fetch(base + path, {
        method,
        headers: body === undefined && raw === undefined ? {} : { 'content-type': 'application/json' },
        body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
      });
      const text = await res.text();
      return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
    };
    try {
      await fn({ call, errors, base });
    } finally {
      server.close();
    }
  });

withApi('lists are paginated and carry meta', async ({ call }) => {
  const res = await call('GET', '/diagrams');
  assert.equal(res.status, 200);
  assert.equal(res.json.data.length, 3);
  assert.deepEqual(res.json.meta, { page: 1, limit: 20, total: 3 });
  const page2 = await call('GET', '/diagrams?limit=2&page=2');
  assert.equal(page2.json.data.length, 1);
  assert.equal(page2.json.meta.total, 3);
});

withApi('lists filter, search and sort', async ({ call }) => {
  assert.equal((await call('GET', '/diagrams?status=published')).json.data.length, 1);
  assert.equal((await call('GET', '/diagrams?projectId=1')).json.data.length, 2);
  assert.equal((await call('GET', '/diagrams?q=BILLING')).json.data[0].id, 3);
  assert.deepEqual(
    (await call('GET', '/diagrams?sort=-title')).json.data.map((d) => d.id),
    [1, 3, 2],
  );
  assert.deepEqual(
    (await call('GET', '/diagrams?sort=title')).json.data.map((d) => d.id),
    [2, 3, 1],
  );
  assert.deepEqual(
    (await call('GET', '/diagrams?sort=id')).json.data.map((d) => d.id),
    [1, 2, 3],
  );
  assert.equal((await call('GET', '/diagrams?sort=nope')).status, 400);
  assert.equal((await call('GET', '/diagrams?limit=0')).status, 400);
  assert.equal((await call('GET', '/diagrams?limit=101')).status, 400);
  assert.equal((await call('GET', '/diagrams?page=x')).json.error.code, 'invalid_query');
});

withApi('GET one item, unknown and malformed ids', async ({ call }) => {
  assert.equal((await call('GET', '/users/1')).json.name, 'Ada Lovelace');
  const missing = await call('GET', '/users/99');
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.json, { error: { code: 'not_found', message: 'User not found' } });
  assert.equal((await call('GET', '/users/abc')).json.error.code, 'invalid_id');
  assert.equal((await call('GET', '/users/0')).status, 400);
});

withApi('POST creates with defaults and a Location header', async ({ call }) => {
  const res = await call('POST', '/users', { name: 'Grace', email: 'grace@example.com' });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), '/api/users/3');
  assert.equal(res.json.role, 'viewer');
  assert.equal(res.json.createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal((await call('GET', '/users/3')).status, 200);
});

withApi('POST validation reports every problem', async ({ call }) => {
  const res = await call('POST', '/diagrams', { title: '  ', notation: 'XYZ', projectId: 'one', code: 5, extra: 1 });
  assert.equal(res.status, 400);
  assert.equal(res.json.error.code, 'validation_failed');
  const fields = res.json.error.details.map((d) => d.field).sort();
  assert.deepEqual(fields, ['code', 'extra', 'notation', 'projectId', 'title']);
  const missing = await call('POST', '/users', {});
  assert.deepEqual(
    missing.json.error.details.map((d) => d.message),
    ['name is required', 'email is required'],
  );
  assert.equal((await call('POST', '/users', { name: 'x'.repeat(61), email: 'a@b.co' })).status, 400);
  assert.match((await call('POST', '/users', { name: 'x', email: 'nope' })).json.error.details[0].message, /invalid format/);
  assert.equal((await call('POST', '/users')).json.error.details[0].field, 'body');
  assert.equal((await call('POST', '/users', [1])).status, 400);
});

withApi('references must exist', async ({ call }) => {
  const res = await call('POST', '/diagrams', { title: 't', notation: 'UML', projectId: 99 });
  assert.equal(res.status, 400);
  assert.match(res.json.error.details[0].message, /does not exist/);
  assert.equal((await call('POST', '/projects', { name: 'p', ownerId: 99 })).status, 400);
  assert.equal((await call('PATCH', '/diagrams/1', { projectId: 99 })).status, 400);
});

withApi('PUT replaces the whole record and keeps id and createdAt', async ({ call }) => {
  const res = await call('PUT', '/projects/2', { name: 'Billing v2', ownerId: 1 });
  assert.equal(res.status, 200);
  assert.deepEqual(res.json, { id: 2, name: 'Billing v2', description: '', ownerId: 1, createdAt: '2026-01-01T00:00:00.000Z' });
  assert.equal((await call('PUT', '/projects/2', { name: 'only name' })).status, 400);
  assert.equal((await call('PUT', '/projects/99', { name: 'n', ownerId: 1 })).status, 404);
});

withApi('PATCH changes only the sent fields', async ({ call }) => {
  const res = await call('PATCH', '/diagrams/2', { title: 'Renamed' });
  assert.equal(res.json.title, 'Renamed');
  assert.equal(res.json.notation, 'BPMN');
  assert.equal((await call('PATCH', '/diagrams/2', { notation: 'bad' })).status, 400);
  assert.equal((await call('PATCH', '/diagrams/99', { title: 'x' })).status, 404);
  assert.equal((await call('PATCH', '/diagrams/2', { id: 7 })).status, 400);
});

withApi('DELETE answers 204 then 404, referenced records give 409', async ({ call }) => {
  assert.equal((await call('DELETE', '/diagrams/3')).status, 204);
  assert.equal((await call('GET', '/diagrams/3')).status, 404);
  assert.equal((await call('DELETE', '/diagrams/3')).status, 404);
  assert.equal((await call('DELETE', '/projects/1')).json.error.code, 'conflict');
  assert.equal((await call('DELETE', '/users/1')).status, 409);
  assert.equal((await call('DELETE', '/projects/2')).status, 204);
  assert.equal((await call('DELETE', '/users/2')).status, 204);
});

withApi('extra operations: nested list, publish, duplicate', async ({ call }) => {
  const nested = await call('GET', '/projects/1/diagrams?status=draft');
  assert.deepEqual(
    nested.json.data.map((d) => d.id),
    [2],
  );
  assert.equal((await call('GET', '/projects/99/diagrams')).status, 404);
  const first = await call('POST', '/diagrams/2/publish');
  const second = await call('POST', '/diagrams/2/publish');
  assert.equal(first.json.status, 'published');
  assert.deepEqual(second.json, first.json);
  assert.equal((await call('POST', '/diagrams/99/publish')).status, 404);
  const copy = await call('POST', '/diagrams/1/duplicate');
  assert.equal(copy.status, 201);
  assert.equal(copy.json.title, 'Checkout sequence (copy)');
  assert.equal(copy.json.status, 'draft');
  assert.equal(copy.json.id, 4);
  assert.equal((await call('POST', '/diagrams/99/duplicate')).status, 404);
});

withApi('broken JSON, oversized body and unknown routes get JSON errors', async ({ call, base }) => {
  assert.equal((await call('POST', '/users', undefined, '{oops')).json.error.code, 'invalid_json');
  const big = await call('POST', '/users', { name: 'x'.repeat(200000), email: 'a@b.co' });
  assert.equal(big.status, 413);
  const unknown = await fetch(`${base}/nothing`);
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json()).error.code, 'not_found');
});

withApi('unexpected errors become a 500 JSON response and are logged', async ({ call, errors }) => {
  const original = JSON.stringify;
  JSON.stringify = (value, ...rest) => {
    if (value?.title === 'Checkout sequence') {
      JSON.stringify = original;
      throw new Error('boom');
    }
    return original(value, ...rest);
  };
  try {
    const res = await call('GET', '/diagrams/1');
    assert.equal(res.status, 500);
    assert.equal(res.json.error.code, 'internal_error');
    assert.match(errors[0][0], /GET \/api\/diagrams\/1/);
  } finally {
    JSON.stringify = original;
  }
});

test('default stores stamp real ISO dates and sorting keeps equal values stable', () => {
  const { users } = createStores();
  assert.match(users.all()[0].createdAt, /^\d{4}-\d{2}-\d{2}T/);
  const [item] = users.all();
  assert.equal(listItems([item, { ...item, id: 9 }], schemas.users, { sort: 'role' }).data.length, 2);
});
