import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
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
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });

withApi('POST with a truncated JSON body answers 400 invalid_json and creates nothing', async ({ call }) => {
  const res = await call('POST', '/users', undefined, '{"name":"Grace","email":"grace@example.com"');
  assert.equal(res.status, 400);
  assert.equal(res.json.error.code, 'invalid_json');
  assert.equal((await call('GET', '/users')).json.meta.total, 2);
});

withApi('PATCH with an array body answers 400 body must be a JSON object', async ({ call }) => {
  const res = await call('PATCH', '/users/1', [{ name: 'Ada' }]);
  assert.equal(res.status, 400);
  assert.equal(res.json.error.details[0].field, 'body');
  assert.equal((await call('GET', '/users/1')).json.name, 'Ada Lovelace');
});

withApi('POST with a JSON null body answers 400 invalid_json', async ({ call }) => {
  const res = await call('POST', '/projects', undefined, 'null');
  assert.equal(res.status, 400);
  assert.equal(res.json.error.code, 'invalid_json');
});

withApi('POST with a bare JSON string body answers 400 and creates nothing', async ({ call }) => {
  const res = await call('POST', '/projects', undefined, '"Order service"');
  assert.equal(res.status, 400);
  assert.equal((await call('GET', '/projects')).json.meta.total, 2);
});

withApi('POST with 50 levels of nesting in an unknown field answers 400 validation_failed', async ({ call }) => {
  const nested = '{"a":'.repeat(50) + '1' + '}'.repeat(50);
  const res = await call('POST', '/projects', undefined, `{"name":"Deep","ownerId":1,"meta":${nested}}`);
  assert.equal(res.status, 400);
  assert.equal(res.json.error.code, 'validation_failed');
  assert.deepEqual(res.json.error.details, [{ field: 'meta', message: 'meta is not a known field' }]);
});

withApi('POST with a duplicate key keeps the last value', async ({ call }) => {
  const res = await call('POST', '/users', undefined, '{"name":"Grace","name":"Mallory","email":"grace@example.com"}');
  assert.equal(res.status, 201);
  assert.equal(res.json.name, 'Mallory');
});

withApi('POST with a number for name answers 400 must be a string', async ({ call }) => {
  const res = await call('POST', '/users', { name: 42, email: 'grace@example.com' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.json.error.details, [{ field: 'name', message: 'name must be a string' }]);
});

withApi('POST with an object for title answers 400 must be a string', async ({ call }) => {
  const res = await call('POST', '/diagrams', { title: { text: 'x' }, notation: 'UML', projectId: 1 });
  assert.equal(res.status, 400);
  assert.deepEqual(res.json.error.details, [{ field: 'title', message: 'title must be a string' }]);
});

withApi('POST with a string for ownerId answers 400 must be an integer', async ({ call }) => {
  const res = await call('POST', '/projects', { name: 'p', ownerId: '1' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.json.error.details, [{ field: 'ownerId', message: 'ownerId must be an integer' }]);
});

withApi('POST with true for ownerId answers 400 must be an integer', async ({ call }) => {
  const res = await call('POST', '/projects', { name: 'p', ownerId: true });
  assert.equal(res.status, 400);
  assert.equal(res.json.error.details[0].field, 'ownerId');
});

withApi('POST with id and createdAt answers 400 and creates nothing', async ({ call }) => {
  const res = await call('POST', '/projects', { id: 99, createdAt: '1999-01-01T00:00:00.000Z', name: 'Forged', ownerId: 1 });
  assert.equal(res.status, 400);
  assert.deepEqual(res.json.error.details.map((d) => d.field).sort(), ['createdAt', 'id']);
  assert.equal((await call('GET', '/projects')).json.meta.total, 2);
  assert.equal((await call('GET', '/projects/99')).status, 404);
});

withApi('PATCH with an unknown role answers 400 and does not change the user', async ({ call }) => {
  const res = await call('PATCH', '/users/2', { role: 'admin' });
  assert.equal(res.status, 400);
  assert.equal(res.json.error.details[0].field, 'role');
  assert.equal((await call('GET', '/users/2')).json.role, 'editor');
});

withApi('PATCH with a whitespace-only title answers 400 must not be empty', async ({ call }) => {
  const res = await call('PATCH', '/diagrams/2', { title: ' \t\n ' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.json.error.details, [{ field: 'title', message: 'title must not be empty' }]);
});

withApi('POST with a NUL character in name answers 400 and creates nothing', async ({ call }) => {
  const res = await call('POST', '/projects', { name: 'a\u0000b', ownerId: 1 });
  assert.equal(res.status, 400);
  assert.equal(res.json.error.code, 'validation_failed');
  assert.equal((await call('GET', '/projects')).json.meta.total, 2);
});

withApi('POST with emoji and right-to-left text stores them unchanged', async ({ call }) => {
  const res = await call('POST', '/projects', { name: 'שלום 👩‍💻', description: 'مرحبا', ownerId: 1 });
  assert.equal(res.status, 201);
  assert.equal(res.json.name, 'שלום 👩‍💻');
  assert.equal(res.json.description, 'مرحبا');
});

withApi('name length counts characters, 80 emoji are accepted and 81 answer 400', async ({ call }) => {
  assert.equal((await call('POST', '/projects', { name: '😀'.repeat(80), ownerId: 1 })).status, 201);
  const res = await call('POST', '/projects', { name: '😀'.repeat(81), ownerId: 1 });
  assert.equal(res.status, 400);
  assert.match(res.json.error.details[0].message, /at most 80 characters/);
});

withApi('diagram code of 10000 characters is accepted and 10001 answers 400', async ({ call }) => {
  assert.equal((await call('POST', '/diagrams', { title: 't', notation: 'UML', projectId: 1, code: 'c'.repeat(10000) })).status, 201);
  const res = await call('POST', '/diagrams', { title: 't', notation: 'UML', projectId: 1, code: 'c'.repeat(10001) });
  assert.equal(res.status, 400);
  assert.match(res.json.error.details[0].message, /at most 10000 characters/);
});

withApi('GET one item with odd ids answers 400 invalid_id', async ({ call }) => {
  for (const id of ['abc', '1e3', '0', '1.5', '%', '%00']) {
    const res = await call('GET', `/diagrams/${id}`);
    assert.equal(res.status, 400, id);
    assert.ok(['invalid_id', 'bad_request'].includes(res.json.error.code), id);
  }
});

withApi('an unknown nested route answers 404 with a JSON error', async ({ call }) => {
  const res = await call('GET', '/users/1/nothing');
  assert.equal(res.status, 404);
  assert.equal(res.json.error.code, 'not_found');
});

withApi('a POST with text/plain content answers 415 and creates nothing', async ({ call, base }) => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: JSON.stringify({ name: 'Grace', email: 'grace@example.com' }),
  });
  assert.equal(res.status, 415);
  assert.equal((await res.json()).error.code, 'unsupported_media_type');
  assert.equal((await call('GET', '/users')).json.meta.total, 2);
});

withApi('two identical POSTs create two records with different ids', async ({ call }) => {
  const first = await call('POST', '/projects', { name: 'Twin', ownerId: 1 });
  const second = await call('POST', '/projects', { name: 'Twin', ownerId: 1 });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.notEqual(first.json.id, second.json.id);
  assert.equal((await call('GET', '/projects')).json.meta.total, 4);
});

withApi('PUT sent twice gives the same record both times', async ({ call }) => {
  const body = { name: 'Same', ownerId: 1 };
  const first = await call('PUT', '/projects/1', body);
  const second = await call('PUT', '/projects/1', body);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.deepEqual(second.json, first.json);
  assert.equal((await call('GET', '/projects')).json.meta.total, 2);
});

withApi('PUT and PATCH after DELETE answer 404 and do not recreate the record', async ({ call }) => {
  const made = (await call('POST', '/projects', { name: 'Temp', ownerId: 1 })).json;
  assert.equal((await call('DELETE', `/projects/${made.id}`)).status, 204);
  assert.equal((await call('PUT', `/projects/${made.id}`, { name: 'Back', ownerId: 1 })).status, 404);
  assert.equal((await call('PATCH', `/projects/${made.id}`, { name: 'Back' })).status, 404);
  assert.equal((await call('GET', `/projects/${made.id}`)).status, 404);
});

withApi('limit of -1 or 1e309 answers 400 invalid_query', async ({ call }) => {
  assert.equal((await call('GET', '/diagrams?limit=-1')).json.error.code, 'invalid_query');
  assert.equal((await call('GET', '/diagrams?limit=1e309')).json.error.code, 'invalid_query');
});

withApi('a huge page number answers 200 with an empty page and the real total', async ({ call }) => {
  const res = await call('GET', '/diagrams?page=999999999999999');
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.data, []);
  assert.deepEqual(res.json.meta, { page: 999999999999999, limit: 20, total: 3 });
});

withApi('a page number of 16 digits answers 400 invalid_query', async ({ call }) => {
  const res = await call('GET', '/diagrams?page=9999999999999999');
  assert.equal(res.status, 400);
  assert.equal(res.json.error.code, 'invalid_query');
});

withApi('search treats regexp characters as plain text and finds nothing', async ({ call }) => {
  for (const q of ['.*', '(a+)+$', '[', '\\']) {
    const res = await call('GET', `/diagrams?q=${encodeURIComponent(q)}`);
    assert.equal(res.status, 200, q);
    assert.deepEqual(res.json.data, [], q);
  }
});

withApi('search with a 10000-character q answers 200 with no matches', async ({ call }) => {
  const res = await call('GET', `/diagrams?q=${'a'.repeat(10000)}`);
  assert.equal(res.status, 200);
  assert.equal(res.json.meta.total, 0);
});

withApi('list query keys __proto__ and constructor are ignored', async ({ call }) => {
  const res = await call('GET', '/diagrams?__proto__=x&constructor=1&prototype=2');
  assert.equal(res.status, 200);
  assert.equal(res.json.meta.total, 3);
});

withApi('PATCH with one invalid field writes nothing, not even the valid ones', async ({ call }) => {
  const res = await call('PATCH', '/diagrams/2', { title: 'Changed', notation: 'XYZ' });
  assert.equal(res.status, 400);
  assert.equal((await call('GET', '/diagrams/2')).json.title, 'Approval workflow');
});
