import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { createApp, schemas } from '../src/app.js';
import { createCollection, createStores } from '../src/store.js';
import { normalizeEmail } from '../src/validation.js';

// Each test below reproduces one finding of redteam-pz2.md / redteam2-pz2.md: it failed (or behaved unsafely)
// before the fix in this commit and passes after it. The finding id is in the test name.

const withApi = (name, fn, options = {}) =>
  test(name, async () => {
    const errors = [];
    const server = createApp({ stores: createStores(() => '2026-01-01T00:00:00.000Z'), writeError: (...a) => errors.push(a), ...options }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const call = async (method, path, body, extraHeaders) => {
      const res = await fetch(base + path, {
        method,
        headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...extraHeaders },
        body: body === undefined ? undefined : JSON.stringify(body),
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

// --- F3: email uniqueness bypass and weak validation ------------------------------------------------------

withApi('F3: a zero-width space inside an email no longer bypasses uniqueness', async ({ call }) => {
  const dup = await call('POST', '/users', { name: 'x', email: 'ada@example.com​' });
  assert.equal(dup.status, 409);
  assert.equal(dup.json.error.code, 'conflict');
});

withApi('F3: NFC and NFD spellings of a non-ASCII email are rejected the same way, never one 201 and one 409', async ({ call }) => {
  // The stricter pattern also only accepts an ASCII local part and domain (an IDNA/punycode domain is out of
  // scope here), so "é@x.io" is rejected outright rather than accepted - which is itself enough to stop the two
  // spellings from ever becoming two different-looking accounts for the same address.
  const nfc = await call('POST', '/users', { name: 'x', email: 'é@example.io' }); // é, one code point
  const nfd = await call('POST', '/users', { name: 'y', email: 'é@example.io' }); // e + combining acute
  assert.equal(nfc.status, 400);
  assert.equal(nfd.status, 400);
  assert.equal(nfc.json.error.details[0].message, nfd.json.error.details[0].message);
});

withApi('F3: a@b..c, a leading/trailing dot and <script>@x.y are rejected as invalid emails', async ({ call }) => {
  for (const email of ['a@b..c', 'a@.b.c', 'a@b.c.', '.a@b.c', '<script>@x.y', 'a@b']) {
    const res = await call('POST', '/users', { name: 'x', email });
    assert.equal(res.status, 400, email);
    assert.match(res.json.error.details[0].message, /invalid format/, email);
  }
});

withApi('F3: the stored email keeps its normalized form so GET shows the same text that was deduplicated on', async ({ call }) => {
  const res = await call('POST', '/users', { name: 'Grace', email: ' Grace@Example.com​ ' });
  assert.equal(res.status, 201);
  assert.equal(res.json.email, 'grace@example.com');
});

test('F16: a pathologically long, almost-matching email string is rejected quickly (no quadratic regex blow-up)', async () => {
  const errors = [];
  const server = createApp({ writeError: (...a) => errors.push(a) }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const email = `a@${'.'.repeat(90000)} `;
    const start = Date.now();
    const res = await fetch(`${base}/users`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x', email }) });
    const elapsed = Date.now() - start;
    assert.equal(res.status, 400);
    assert.ok(elapsed < 2000, `took ${elapsed} ms`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

// --- F4 / F6: invisible, control and unpaired-surrogate characters ----------------------------------------

withApi('F4: a name made only of a zero-width space is rejected instead of creating a blank-looking record', async ({ call }) => {
  const res = await call('POST', '/users', { name: '​', email: 'zw@b.com' });
  assert.equal(res.status, 400);
  assert.equal(res.json.error.details[0].field, 'name');
});

withApi('F4: a newline and a BEL control character in a (single-line) name are rejected', async ({ call }) => {
  const res = await call('POST', '/users', { name: 'a\nb\u0007', email: 'ctrl@b.com' });
  assert.equal(res.status, 400);
  assert.match(res.json.error.details[0].message, /control or invisible/);
});

withApi('F4: a multiline field (description, code) still allows a newline', async ({ call }) => {
  const res = await call('POST', '/projects', { name: 'p', description: 'line one\nline two', ownerId: 1 });
  assert.equal(res.status, 201);
  assert.equal(res.json.description, 'line one\nline two');
});

withApi('F4: a combined emoji built from a zero-width joiner is still accepted (not every invisible is rejected)', async ({ call }) => {
  const res = await call('POST', '/projects', { name: '\u{1F469}‍\u{1F4BB}', ownerId: 1 }); // "👩‍💻"
  assert.equal(res.status, 201);
});

withApi('F6: a lone (unpaired) surrogate in a name is rejected', async ({ call }) => {
  const res = await call('POST', '/users', { name: '\ud800', email: 's@x.io' });
  assert.equal(res.status, 400);
  assert.match(res.json.error.details[0].message, /unpaired surrogate/);
});

// --- F5: duplicate must cut by code point, never in the middle of a surrogate pair ------------------------

withApi('F5: duplicating a title that is exactly at the length limit does not leave a lone surrogate', async ({ call }) => {
  const title = 'a' + '\u{1F600}'.repeat(79); // 80 code points, each emoji is one code point / two UTF-16 units
  const created = await call('POST', '/diagrams', { title, notation: 'UML', projectId: 1 });
  assert.equal(created.status, 201);
  const copy = await call('POST', `/diagrams/${created.json.id}/duplicate`);
  assert.equal(copy.status, 201);
  assert.equal(copy.json.title.isWellFormed(), true);
  assert.equal([...copy.json.title].length <= 80, true);
});

// --- F7: PUT without an optional field must not silently reset it to the schema default -------------------

withApi('F7: PUT without "role" keeps the current role instead of resetting it to the default', async ({ call }) => {
  const before = await call('GET', '/users/1');
  assert.equal(before.json.role, 'owner');
  const res = await call('PUT', '/users/1', { name: 'Ada Lovelace', email: 'ada@example.com' });
  assert.equal(res.status, 200);
  assert.equal(res.json.role, 'owner');
});

withApi('F7: PUT without "status" keeps a published diagram published', async ({ call }) => {
  await call('POST', '/diagrams/1/publish');
  const res = await call('PUT', '/diagrams/1', { title: 'Checkout sequence', notation: 'UML', projectId: 1 });
  assert.equal(res.status, 200);
  assert.equal(res.json.status, 'published');
});

withApi('F7: PUT can still explicitly change the role when it is sent', async ({ call }) => {
  const res = await call('PUT', '/users/1', { name: 'Ada Lovelace', email: 'ada@example.com', role: 'viewer' });
  assert.equal(res.status, 200);
  assert.equal(res.json.role, 'viewer');
});

// --- F9: a collection refuses to grow past its configured size ---------------------------------------------

test('F9: a collection answers with a conflict instead of growing past maxItems', () => {
  const collection = createCollection([], () => '2026-01-01T00:00:00.000Z', 2);
  collection.create({ name: 'a' });
  collection.create({ name: 'b' });
  assert.throws(() => collection.create({ name: 'c' }), (err) => err.status === 409 && err.code === 'quota_exceeded');
});

withApi(
  'F9: the diagrams collection answers 409 quota_exceeded once it is full, including through /duplicate',
  async ({ call }) => {
    await call('POST', '/diagrams', { title: 'extra', notation: 'UML', projectId: 1 }); // store already has 3 seeded, cap is 4
    const res = await call('POST', '/diagrams', { title: 'one too many', notation: 'UML', projectId: 1 });
    assert.equal(res.status, 409);
    assert.equal(res.json.error.code, 'quota_exceeded');
    const dup = await call('POST', '/diagrams/1/duplicate');
    assert.equal(dup.status, 409);
    assert.equal(dup.json.error.code, 'quota_exceeded');
  },
  { stores: createStores(() => '2026-01-01T00:00:00.000Z', 4) },
);

// --- F10: content negotiation and body-on-bodyless-method inconsistencies ----------------------------------

withApi('F10: an Accept header that cannot match JSON gets 406, a missing or */* Accept is fine', async ({ call }) => {
  const rejected = await call('GET', '/users', undefined, { Accept: 'text/html' });
  assert.equal(rejected.status, 406);
  assert.equal(rejected.json.error.code, 'not_acceptable');
  assert.equal((await call('GET', '/users', undefined, { Accept: '*/*' })).status, 200);
  assert.equal((await call('GET', '/users', undefined, { Accept: 'application/json' })).status, 200);
});

withApi('F10: GET with an unrelated body/content-type is no longer refused with 415, the body is simply unused', async ({ base }) => {
  // The fetch spec refuses to put a body on a GET request, so a raw http request is used here, exactly as a
  // misbehaving client's library might send one.
  const url = new URL(`${base}/users`);
  const status = await new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'GET', headers: { 'content-type': 'text/plain', 'content-length': '3' } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end('abc');
  });
  assert.equal(status, 200);
});

withApi('F10: a declared charset other than utf-8 is 415, not a confusing 400 invalid_json', async ({ base }) => {
  const res = await fetch(`${base}/users`, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-16' }, body: '{}' });
  assert.equal(res.status, 415);
  assert.equal((await res.json()).error.code, 'unsupported_media_type');
});

// --- F11: unknown and out-of-range query values are rejected, not silently ignored -------------------------

withApi('F11: an invalid filter value (bad enum / non-integer id) is 400, not an empty 200', async ({ call }) => {
  const badEnum = await call('GET', '/users?role=admin');
  assert.equal(badEnum.status, 400);
  assert.equal(badEnum.json.error.code, 'invalid_query');
  const badInt = await call('GET', '/projects?ownerId=abc');
  assert.equal(badInt.status, 400);
  assert.equal(badInt.json.error.code, 'invalid_query');
});

withApi('F11: filtering by the hidden field is still a silent no-op (the privacy design is unchanged)', async ({ call }) => {
  const total = (await call('GET', '/users')).json.meta.total;
  assert.equal((await call('GET', '/users?email=ada@example.com')).json.meta.total, total);
});

withApi('F11: a repeated query key (?name=a&name=b) is rejected instead of being silently joined', async ({ call }) => {
  const res = await call('GET', '/projects?name=a&name=b');
  assert.equal(res.status, 400);
  assert.equal(res.json.error.code, 'invalid_query');
});

// --- F12: the page error message states the limit that is actually enforced --------------------------------

withApi('F12: the page error message quotes the real 15-digit ceiling, not Number.MAX_SAFE_INTEGER', async ({ call }) => {
  const res = await call('GET', '/users?page=9999999999999999');
  assert.equal(res.status, 400);
  assert.match(res.json.error.message, /1 to 999999999999999\b/);
});

// --- F13: sort is locale-aware and stable (ties keep a fixed order) -----------------------------------------

withApi('F13: diagrams with an equal sort key keep a stable, repeatable order (tie-break by id)', async ({ call }) => {
  await call('POST', '/diagrams', { title: 'Same', notation: 'UML', projectId: 1 });
  await call('POST', '/diagrams', { title: 'Same', notation: 'UML', projectId: 1 });
  const first = await call('GET', '/diagrams?sort=title');
  const second = await call('GET', '/diagrams?sort=title');
  assert.deepEqual(first.json.data.map((d) => d.id), second.json.data.map((d) => d.id));
  const sameIds = first.json.data.filter((d) => d.title === 'Same').map((d) => d.id);
  assert.deepEqual(sameIds, [...sameIds].sort((a, b) => a - b));
});

// --- F14: the OpenAPI document matches the real responses ---------------------------------------------------

withApi('F14: the user list schema does not require email, and 406/429/default are documented on every operation', async ({ call }) => {
  const { json: doc } = await call('GET', '/openapi.json');
  assert.ok(doc.components.schemas.UserListItem);
  assert.equal(doc.components.schemas.UserListItem.required.includes('email'), false);
  assert.ok(doc.paths['/users'].get.responses['406']);
  assert.ok(doc.paths['/users'].get.responses['429']);
  assert.ok(doc.paths['/users'].get.responses.default);
});

withApi('F14: 409 is no longer declared on project/diagram writes that can never produce it', async ({ call }) => {
  const { json: doc } = await call('GET', '/openapi.json');
  assert.equal(doc.paths['/projects'].post.responses['409'], undefined);
  assert.equal(doc.paths['/diagrams/{id}'].put.responses['409'], undefined);
  // users can really 409 on write, projects can really 409 on delete: those stay documented.
  assert.ok(doc.paths['/users'].post.responses['409']);
  assert.ok(doc.paths['/projects/{id}'].delete.responses['409']);
  assert.equal(doc.paths['/diagrams/{id}'].delete.responses['409'], undefined);
});

withApi('F14: POST /api/openapi.json is 405 with an Allow header, not a bare 404', async ({ call }) => {
  const res = await call('POST', '/openapi.json', {});
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'GET, HEAD, OPTIONS');
});

withApi('F14: the id path parameter declares the real 15-digit ceiling', async ({ call }) => {
  const { json: doc } = await call('GET', '/openapi.json');
  const idParam = doc.paths['/users/{id}'].get.parameters.find((p) => p.name === 'id');
  assert.equal(idParam.schema.maximum, 999999999999999);
});

// --- normalizeEmail unit coverage ----------------------------------------------------------------------------

test('normalizeEmail strips invisible formatting characters, normalizes and lower-cases', () => {
  assert.equal(normalizeEmail('Ada@Example.com​'), 'ada@example.com');
  assert.equal(normalizeEmail('é@x.io'), normalizeEmail('é@x.io'));
});

test('the collection size limit comes from limits.json', async () => {
  const { LIMITS } = await import('../src/app.js');
  assert.equal(typeof LIMITS.maxRecordsPerCollection, 'number');
  assert.equal(typeof LIMITS.rateMaxClients, 'number');
});

test('the schemas object marks description and code as multiline, allowing a stored newline', () => {
  assert.equal(schemas.projects.description.multiline, true);
  assert.equal(schemas.diagrams.code.multiline, true);
  assert.equal(schemas.users.name.multiline, undefined);
});

// --- redteam2-pz2.md, finding #2: no server-level request/header timeout (slowloris) ------------------------

test('report #2 (slowloris): src/server.js sets explicit header/request timeouts well below Node\'s own defaults', async () => {
  // Before this fix, src/server.js set no timeout at all: a client that sends headers and then trickles the
  // body in one byte at a time could hold a socket open for Node's default of 5 minutes (requestTimeout) with
  // only a 60 s headersTimeout, and the per-IP rate limiter only counts requests that finish, so it does
  // nothing against this. Reading the source (instead of actually waiting minutes for a timeout to fire) keeps
  // the test fast while still failing if the hardening lines are ever removed.
  const src = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');
  const headersTimeout = Number(/headersTimeout\s*=\s*(\d+)/.exec(src)?.[1]);
  const requestTimeout = Number(/requestTimeout\s*=\s*(\d+)/.exec(src)?.[1]);
  assert.ok(headersTimeout > 0 && headersTimeout < 60_000, `headersTimeout (${headersTimeout}) should be set and below Node's 60 s default`);
  assert.ok(requestTimeout > 0 && requestTimeout < 300_000, `requestTimeout (${requestTimeout}) should be set and below Node's 5 min default`);
});
