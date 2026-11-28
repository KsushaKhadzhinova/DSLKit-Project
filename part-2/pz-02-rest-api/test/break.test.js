import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, LIMITS } from '../src/app.js';
import { createJournal } from '../src/journal.js';
import { createStores } from '../src/store.js';

const JSON_HEADERS = { 'content-type': 'application/json' };

const withServer = (name, fn) =>
  test(name, async () => {
    const stores = createStores();
    const journal = createJournal();
    const errors = [];
    const server = createApp({ stores, journal, writeError: (...a) => errors.push(a), limit: { windowMs: 60000, max: 100000, maxClients: 100 } }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const call = async (method, path, body, headers = {}) => {
      const res = await fetch(`${base}/api${path}`, { method, headers: { ...(body !== undefined && JSON_HEADERS), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await res.text();
      return { status: res.status, json: text ? JSON.parse(text) : undefined, headers: res.headers };
    };
    try {
      await fn({ call, stores, journal, errors });
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      journal.close();
    }
  });

const broken = () => {
  throw new Error('disk is full');
};

withServer('when the journal cannot be written, PATCH, PUT and DELETE are refused and the record is untouched', async ({ call, stores, journal }) => {
  const before = JSON.stringify(stores.diagrams.find(3));
  journal.begin = broken;
  for (const [method, body] of [['PATCH', { title: 'Hacked' }], ['PUT', { title: 'Hacked', notation: 'UML', projectId: 1 }], ['DELETE', undefined]]) {
    const res = await call(method, '/diagrams/3', body);
    assert.equal(res.status, 500, method);
    assert.equal(res.json.error.code, 'journal_unavailable');
    assert.match(res.json.error.requestId, /^[0-9a-f-]{36}$/);
  }
  assert.equal(JSON.stringify(stores.diagrams.find(3)), before);
});

withServer('after the journal works again the same request is carried out', async ({ call, journal }) => {
  const working = journal.begin;
  journal.begin = broken;
  assert.equal((await call('DELETE', '/diagrams/3')).status, 500);
  journal.begin = working;
  assert.equal((await call('DELETE', '/diagrams/3')).status, 204);
});

withServer('huge, empty and whitespace-only values are refused with 400 and nothing is stored', async ({ call, stores }) => {
  const count = stores.users.all().length;
  for (const name of ['a'.repeat(LIMITS.userName + 1), '   ', '\t\n', '', '​']) {
    const res = await call('POST', '/users', { name, email: 'huge@example.com' });
    assert.equal(res.status, 400, JSON.stringify(name).slice(0, 20));
  }
  assert.equal((await call('POST', '/users', { name: 'Ok', email: `${'a'.repeat(LIMITS.userEmail)}@example.com` })).status, 400);
  assert.equal((await call('POST', '/diagrams', { title: 'T', notation: 'UML', projectId: 1, code: 'x'.repeat(LIMITS.diagramCode + 1) })).status, 400);
  assert.equal(stores.users.all().length, count);
});

withServer('a body over the size limit is 413 JSON with a Request ID, not a crash', async ({ call }) => {
  const res = await call('POST', '/diagrams', { title: 'T', notation: 'UML', projectId: 1, code: 'x'.repeat(200 * 1024) });
  assert.equal(res.status, 413);
  assert.equal(res.json.error.code, 'payload_too_large');
  assert.ok(res.json.error.requestId);
});

withServer('numbers: zero, negative, fractional, huge and non-numeric ids and references are refused', async ({ call }) => {
  for (const id of ['0', '-1', '1.5', '1e3', '99999999999999999999', '%20', 'NaN', '٣']) assert.equal((await call('GET', `/users/${id}`)).status, 400, id);
  for (const ownerId of [0, -5, 1.5, 2 ** 31, '1', null, true, [1], {}]) assert.equal((await call('POST', '/projects', { name: 'P', ownerId })).status, 400, JSON.stringify(ownerId));
});

withServer('SQL and HTML injection text is stored as plain text and the journal table survives', async ({ call, journal }) => {
  const evil = "x'); DROP TABLE request_log; --";
  const created = await call('POST', '/users', { name: evil, email: 'sql@example.com' });
  assert.equal(created.status, 201);
  assert.equal(created.json.name, evil);
  assert.equal((await call('GET', `/users?q=${encodeURIComponent(evil)}`)).status, 200);
  assert.equal((await call('GET', `/users?x=${encodeURIComponent(evil)}`)).status, 400);
  const rows = journal.recent(10);
  assert.ok(rows.length >= 3, 'the journal table is still there and keeps filling');
  assert.ok(rows.some((r) => r.path.includes('DROP%20TABLE')), 'the hostile path is stored as data');
  const html = await call('POST', '/users', { name: '<img src=x onerror=alert(1)>', email: 'xss@example.com' });
  assert.equal(html.status, 201);
});

withServer('race: a child is created while its parent is deleted, in every order, with no 5xx and no orphan', async ({ call, stores }) => {
  for (let round = 0; round < 20; round += 1) {
    const project = (await call('POST', '/projects', { name: `Race ${round}`, ownerId: 1 })).json;
    const results = await Promise.all([
      call('POST', '/diagrams', { title: 'Child', notation: 'UML', projectId: project.id }),
      call('DELETE', `/projects/${project.id}`),
      call('POST', '/diagrams', { title: 'Child 2', notation: 'UML', projectId: project.id }),
      call('PATCH', `/projects/${project.id}`, { name: 'Renamed' }),
    ]);
    for (const res of results) assert.ok([200, 201, 204, 404, 409].includes(res.status), `status ${res.status}`);
    const live = new Set(stores.projects.all().map((p) => p.id));
    for (const diagram of stores.diagrams.all()) assert.ok(live.has(diagram.projectId), 'no diagram points to a deleted project');
  }
});

withServer('race: twenty parallel requests of every kind never give a 5xx and keep ids unique', async ({ call, stores }) => {
  const jobs = [];
  for (let i = 0; i < 20; i += 1) {
    jobs.push(call('POST', '/users', { name: `U${i}`, email: `u${i}@example.com` }));
    jobs.push(call('PATCH', '/users/1', { name: `Ada ${i}` }));
    jobs.push(call('DELETE', `/users/${100 + i}`));
    jobs.push(call('GET', '/users?sort=-id'));
  }
  const results = await Promise.all(jobs);
  assert.ok(results.every((r) => r.status < 500));
  const ids = stores.users.all().map((u) => u.id);
  assert.equal(new Set(ids).size, ids.length);
});

withServer('a failing journal under parallel load always answers 500 and applies nothing', async ({ call, stores, journal }) => {
  journal.begin = broken;
  const before = stores.users.all().length;
  const results = await Promise.all(Array.from({ length: 30 }, (_, i) => call('POST', '/users', { name: `N${i}`, email: `n${i}@example.com` })));
  assert.ok(results.every((r) => r.status === 500));
  assert.equal(stores.users.all().length, before);
});

test('tools/break-journal.mjs breaks a running server for real and restore repairs it', async () => {
  const { breakJournal, restoreJournal } = await import('../tools/break-journal.mjs');
  const { default: os } = await import('node:os');
  const { default: path } = await import('node:path');
  const file = path.join(os.tmpdir(), `pz2-break-${process.pid}-${Date.now()}.sqlite`);
  const journal = createJournal(file);
  const server = createApp({ journal, writeError: () => {} }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/users`;
  try {
    assert.equal((await fetch(url)).status, 200);
    breakJournal(file);
    assert.equal((await fetch(url)).status, 500);
    restoreJournal(file);
    assert.equal((await fetch(url)).status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    journal.close();
    (await import('node:fs')).rmSync(file, { force: true });
  }
});
