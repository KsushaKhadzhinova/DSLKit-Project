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
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
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
    assert.equal(errors[0][0], '[error] "GET" "/api/diagrams/1"');
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

withApi('prototype keys are not treated as schema fields', async ({ call }) => {
  const body = '{"name":"x","email":"a@b.co","constructor":1,"__proto__":{"role":"owner"}}';
  const res = await call('POST', '/users', undefined, body);
  assert.equal(res.status, 400);
  assert.deepEqual(res.json.error.details.map((d) => d.field).sort(), ['__proto__', 'constructor']);
  assert.equal((await call('GET', '/diagrams?sort=constructor')).status, 400);
  assert.equal((await call('GET', '/diagrams?sort=toString')).status, 400);
});

withApi('ids, page and limit accept only plain positive integers', async ({ call }) => {
  for (const id of ['1e0', '1.0', '01', '0x1', '-1', '%201', '1%20', '99999999999999999999']) {
    assert.equal((await call('GET', `/users/${id}`)).json.error.code, 'invalid_id', id);
  }
  for (const query of ['page=1.0', 'page=1e0', 'limit=1e1', 'limit=010', 'page=-1', 'limit=%205']) {
    assert.equal((await call('GET', `/users?${query}`)).json.error.code, 'invalid_query', query);
  }
  assert.equal((await call('GET', '/users?page=1&limit=100')).status, 200);
});

withApi('unsupported methods on known routes give 405 with Allow, OPTIONS lists them', async ({ call, base }) => {
  const list = await call('DELETE', '/users');
  assert.equal(list.status, 405);
  assert.equal(list.headers.get('allow'), 'GET, POST, HEAD, OPTIONS');
  assert.equal(list.json.error.code, 'method_not_allowed');
  assert.equal((await call('POST', '/users/1', {})).headers.get('allow'), 'GET, PUT, PATCH, DELETE, HEAD, OPTIONS');
  assert.equal((await call('GET', '/diagrams/1/publish')).headers.get('allow'), 'POST, OPTIONS');
  assert.equal((await call('PUT', '/diagrams/1/duplicate', {})).status, 405);
  assert.equal((await call('POST', '/projects/1/diagrams', {})).headers.get('allow'), 'GET, HEAD, OPTIONS');
  const options = await fetch(`${base}/users`, { method: 'OPTIONS' });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('allow'), 'GET, POST, HEAD, OPTIONS');
  assert.equal((await fetch(`${base}/users/1`, { method: 'HEAD' })).status, 200);
});

withApi('PATCH with an empty object is rejected', async ({ call }) => {
  const res = await call('PATCH', '/users/1', {});
  assert.equal(res.status, 400);
  assert.equal(res.json.error.details[0].field, 'body');
});

withApi('reference ids must be within 1 and 2147483647', async ({ call }) => {
  for (const projectId of [0, -1, 2147483648, 1.5]) {
    const res = await call('POST', '/diagrams', { title: 't', notation: 'UML', projectId });
    assert.equal(res.status, 400, String(projectId));
  }
  assert.match((await call('POST', '/projects', { name: 'p', ownerId: 0 })).json.error.details[0].message, /between 1 and 2147483647/);
  assert.equal(
    (await call('POST', '/diagrams', { title: 't', notation: 'UML', projectId: 2147483647 })).json.error.details[0].message.includes('does not exist'),
    true,
  );
});

withApi('string fields are trimmed before validation and storage', async ({ call }) => {
  const res = await call('POST', '/projects', { name: '  Docs  ', description: '  spaced  ', ownerId: 1 });
  assert.equal(res.json.name, 'Docs');
  assert.equal(res.json.description, 'spaced');
  assert.equal((await call('PATCH', '/projects/1', { name: ' Renamed ' })).json.name, 'Renamed');
  assert.equal((await call('PUT', '/projects/1', { name: ' Put ', ownerId: 1, description: ' d ' })).json.description, 'd');
  assert.equal((await call('POST', '/projects', { name: '   ', ownerId: 1 })).status, 400);
});

withApi('email is unique ignoring case, on create, PUT and PATCH', async ({ call }) => {
  const dup = await call('POST', '/users', { name: 'Copy', email: 'ADA@example.com' });
  assert.equal(dup.status, 409);
  assert.equal(dup.json.error.code, 'conflict');
  assert.equal((await call('PUT', '/users/2', { name: 'Alan', email: 'Ada@Example.com' })).status, 409);
  assert.equal((await call('PATCH', '/users/2', { email: 'ada@example.com' })).status, 409);
  assert.equal((await call('PATCH', '/users/1', { email: 'ADA@EXAMPLE.COM' })).status, 200);
  assert.equal((await call('PATCH', '/users/1', { name: 'Ada L.' })).status, 200);
  assert.equal((await call('PUT', '/users/2', { name: 'Alan', email: 'alan@example.com' })).status, 200);
  assert.equal((await call('POST', '/users', { name: 'New', email: 'new@example.com' })).status, 201);
});

withApi('GET /users/:id/projects lists the projects of one user with the list options', async ({ call }) => {
  const own = await call('GET', '/users/1/projects');
  assert.equal(own.status, 200);
  assert.deepEqual(
    own.json.data.map((p) => p.id),
    [1],
  );
  assert.deepEqual(own.json.meta, { page: 1, limit: 20, total: 1 });
  assert.deepEqual(
    (await call('GET', '/users/2/projects')).json.data.map((p) => p.name),
    ['Billing'],
  );
  await call('POST', '/projects', { name: 'Second', ownerId: 1 });
  await call('POST', '/projects', { name: 'Third', ownerId: 1 });
  const page = await call('GET', '/users/1/projects?limit=2&page=2&sort=name');
  assert.deepEqual(
    page.json.data.map((p) => p.name),
    ['Third'],
  );
  assert.equal(page.json.meta.total, 3);
  assert.equal((await call('GET', '/users/1/projects?q=second')).json.data.length, 1);
});

withApi('GET /users/:id/projects answers 404 for a missing user, 400 for a bad id or query, 405 for other methods', async ({ call }) => {
  assert.equal((await call('GET', '/users/99/projects')).status, 404);
  assert.equal((await call('GET', '/users/99/projects')).json.error.code, 'not_found');
  for (const id of ['abc', '0', '-1', '1.5', '0x1', '1e0', '9'.repeat(30)]) assert.equal((await call('GET', `/users/${id}/projects`)).status, 400, id);
  assert.equal((await call('GET', '/users/1/projects?limit=0')).status, 400);
  assert.equal((await call('GET', '/users/1/projects?sort=password')).status, 400);
  const post = await call('POST', '/users/1/projects', {});
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD, OPTIONS');
});

withApi('a user without projects gets an empty list and a deleted project disappears from it', async ({ call }) => {
  const user = (await call('POST', '/users', { name: 'New', email: 'new@example.com' })).json;
  assert.deepEqual((await call('GET', `/users/${user.id}/projects`)).json, { data: [], meta: { page: 1, limit: 20, total: 0 } });
  const project = (await call('POST', '/projects', { name: 'Mine', ownerId: user.id })).json;
  assert.equal((await call('GET', `/users/${user.id}/projects`)).json.meta.total, 1);
  await call('DELETE', `/projects/${project.id}`);
  assert.equal((await call('GET', `/users/${user.id}/projects`)).json.meta.total, 0);
});

withApi('the user list hides the email and cannot be filtered or searched by it, one user shows it', async ({ call }) => {
  const list = await call('GET', '/users');
  assert.equal(list.status, 200);
  assert.ok(list.json.data.length > 0);
  for (const user of list.json.data) {
    assert.equal(Object.hasOwn(user, 'email'), false);
    assert.ok(user.name && user.role);
  }
  // A filter or search by the hidden field is ignored, so it cannot be used to find out which emails exist.
  assert.equal((await call('GET', '/users?email=ada@example.com')).json.meta.total, list.json.meta.total);
  assert.equal((await call('GET', '/users?q=ada@example')).json.meta.total, 0);
  // Sorting by the hidden field would leak the order of the emails, so it is refused.
  for (const sort of ['email', '-email']) {
    const sorted = await call('GET', `/users?sort=${sort}`);
    assert.equal(sorted.status, 400);
    assert.equal(sorted.json.error.code, 'invalid_query');
  }
  const one = await call('GET', '/users/1');
  assert.equal(one.json.email, 'ada@example.com');
});

test('the limits of the schemas come from limits.json', async () => {
  const { LIMITS } = await import('../src/app.js');
  assert.equal(schemas.users.name.max, LIMITS.userName);
  assert.equal(schemas.users.email.max, LIMITS.userEmail);
  assert.equal(schemas.projects.name.max, LIMITS.projectName);
  assert.equal(schemas.projects.description.max, LIMITS.projectDescription);
  assert.equal(schemas.diagrams.title.max, LIMITS.diagramTitle);
  assert.equal(schemas.diagrams.code.max, LIMITS.diagramCode);
  assert.equal(schemas.projects.ownerId.max, LIMITS.idMax);
});

withApi('GET /api/openapi.json describes every route and the limits of the schemas', async ({ call }) => {
  const { status, json: doc } = await call('GET', '/openapi.json');
  assert.equal(status, 200);
  assert.equal(doc.openapi, '3.0.3');
  for (const path of ['/users', '/users/{id}', '/projects', '/projects/{id}', '/diagrams', '/diagrams/{id}', '/users/{id}/projects', '/projects/{id}/diagrams', '/diagrams/{id}/publish', '/diagrams/{id}/duplicate']) {
    assert.ok(doc.paths[path], path);
  }
  assert.deepEqual(Object.keys(doc.paths['/users/{id}']), ['get', 'put', 'patch', 'delete']);
  assert.equal(doc.components.schemas.UserInput.properties.name.maxLength, schemas.users.name.max);
  assert.deepEqual(doc.components.schemas.DiagramInput.properties.notation.enum, schemas.diagrams.notation.enum);
  assert.deepEqual([...doc.components.schemas.DiagramInput.required].sort(), ['notation', 'projectId', 'title']);
  // The hidden field cannot be used to filter the user list, so the document does not offer it as a filter.
  const userFilters = doc.paths['/users'].get.parameters.map((p) => p.name);
  assert.ok(!userFilters.includes('email'));
  assert.ok(userFilters.includes('role'));
});
