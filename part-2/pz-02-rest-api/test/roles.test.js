import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { createStores } from '../src/store.js';

const withApi = (name, fn) =>
  test(name, async () => {
    const errors = [];
    const stores = createStores();
    const server = createApp({ stores, writeError: (...a) => errors.push(a), limit: { windowMs: 60000, max: 1_000_000 } }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const call = async (method, p, body, headers = {}) => {
      const res = await fetch(`${base}${p}`, { method, headers: { ...(body !== undefined && { 'content-type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await res.text();
      return { status: res.status, headers: res.headers, json: text && res.headers.get('content-type').includes('json') ? JSON.parse(text) : text };
    };
    try {
      await fn({ call, stores, errors, base });
      assert.deepEqual(errors, []);
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });

const ada = { 'x-user-id': '1' }; // owns project 1 and its diagrams 1, 2
const alan = { 'x-user-id': '2' }; // owns project 2 and diagram 3
const admin = { 'x-user-id': '1', 'x-role': 'admin' };

withApi('a user changes their own records and gets a described 403 for another one, with a Request ID', async ({ call, stores }) => {
  assert.equal((await call('PATCH', '/api/projects/1', { name: 'Mine' }, ada)).status, 200);
  const res = await call('PATCH', '/api/projects/2', { name: 'Stolen' }, ada);
  assert.equal(res.status, 403);
  assert.equal(res.json.error.code, 'forbidden');
  assert.equal(res.json.error.requestId, res.headers.get('x-request-id'));
  assert.match(res.json.error.description, /Likely cause/);
  assert.equal(stores.projects.find(2).name, 'Billing');
  assert.equal((await call('PUT', '/api/users/2', { name: 'X', email: 'x@example.com' }, ada)).status, 403);
  assert.equal((await call('PATCH', '/api/users/1', { name: 'Ada L.' }, ada)).status, 200);
});

withApi('diagrams follow the owner of their project, including publish and duplicate', async ({ call }) => {
  assert.equal((await call('PATCH', '/api/diagrams/3', { title: 'No' }, ada)).status, 403);
  assert.equal((await call('POST', '/api/diagrams/3/publish', undefined, ada)).status, 403);
  assert.equal((await call('POST', '/api/diagrams/3/duplicate', undefined, ada)).status, 403);
  assert.equal((await call('DELETE', '/api/diagrams/3', undefined, ada)).status, 403);
  assert.equal((await call('POST', '/api/diagrams', { title: 'In Alan', notation: 'UML', projectId: 2 }, ada)).status, 403);
  assert.equal((await call('PUT', '/api/diagrams/1', { title: 'Moved', notation: 'UML', projectId: 2 }, ada)).status, 403);
  assert.equal((await call('POST', '/api/diagrams/1/duplicate', undefined, ada)).status, 201);
  assert.equal((await call('PATCH', '/api/diagrams/1', { title: 'Mine' }, ada)).status, 200);
  assert.equal((await call('PATCH', '/api/diagrams/1', { status: 'published' }, ada)).status, 200);
  assert.equal((await call('DELETE', '/api/diagrams/1', undefined, ada)).status, 204);
});

withApi('only an administrator deletes projects and other users; a user may not hand a project over', async ({ call }) => {
  assert.equal((await call('DELETE', '/api/projects/2', undefined, alan)).status, 403);
  assert.equal((await call('DELETE', '/api/users/2', undefined, ada)).status, 403);
  assert.equal((await call('POST', '/api/projects', { name: 'Gift', ownerId: 2 }, ada)).status, 403);
  assert.equal((await call('PATCH', '/api/projects/1', { ownerId: 2 }, ada)).status, 403);
  assert.equal((await call('POST', '/api/projects', { name: 'Own', ownerId: 1 }, ada)).status, 201);
  assert.equal((await call('PATCH', '/api/projects/1', { description: 'same owner' }, ada)).status, 200);
  assert.equal((await call('DELETE', '/api/diagrams/3', undefined, admin)).status, 204);
  assert.equal((await call('DELETE', '/api/projects/2', undefined, admin)).status, 204);
  assert.equal((await call('DELETE', '/api/users/2', undefined, admin)).status, 204);
});

withApi('a missing record is 404 before 403, and a missing parent is refused', async ({ call }) => {
  assert.equal((await call('DELETE', '/api/projects/99', undefined, ada)).status, 404);
  assert.equal((await call('POST', '/api/diagrams', { title: 'Lost', notation: 'UML', projectId: 99 }, ada)).status, 409);
  assert.equal((await call('POST', '/api/diagrams', { title: 'Lost', notation: 'UML', projectId: 99 }, admin)).status, 409);
});

withApi('an anonymous caller is not restricted, and bad identity headers are refused', async ({ call }) => {
  assert.equal((await call('DELETE', '/api/diagrams/3')).status, 204);
  for (const headers of [{ 'x-role': 'root' }, { 'x-user-id': 'abc' }, { 'x-user-id': '0' }, { 'x-user-id': '1; DROP' }]) {
    const res = await call('GET', '/api/users', undefined, headers);
    assert.equal(res.status, 400, JSON.stringify(headers));
    assert.equal(res.json.error.code, 'invalid_identity');
  }
  assert.equal((await call('GET', '/api/users', undefined, { 'x-user-id': '77' })).status, 403);
  assert.equal((await call('GET', '/api/users', undefined, { 'x-role': 'admin' })).status, 200);
});

withApi('race: a user adds a diagram while the administrator deletes the project, both orders end cleanly', async ({ call, stores }) => {
  for (let round = 0; round < 15; round += 1) {
    const project = (await call('POST', '/api/projects', { name: `R${round}`, ownerId: 1 }, ada)).json;
    const results = await Promise.all([
      call('POST', '/api/diagrams', { title: 'Comment', notation: 'UML', projectId: project.id }, ada),
      call('DELETE', `/api/projects/${project.id}`, undefined, admin),
      call('POST', '/api/diagrams', { title: 'Comment 2', notation: 'UML', projectId: project.id }, ada),
      call('DELETE', `/api/projects/${project.id}`, undefined, ada),
    ]);
    for (const res of results) assert.ok([201, 204, 403, 404, 409].includes(res.status), String(res.status));
    assert.ok([403, 404].includes(results[3].status), 'a plain user never deletes the project');
    const live = new Set(stores.projects.all().map((p) => p.id));
    for (const diagram of stores.diagrams.all()) assert.ok(live.has(diagram.projectId));
  }
});

withApi('a browser gets the 403 page, a text/html client is not refused with 406, an unknown address has its own text', async ({ call }) => {
  const page = await call('DELETE', '/api/projects/2', undefined, { ...ada, accept: 'text/html,*/*;q=0.8' });
  assert.equal(page.status, 403);
  assert.match(page.json, /<p class="code">403<\/p>[\s\S]*Forbidden[\s\S]*Request ID/);
  const onlyHtml = await call('GET', '/nope', undefined, { accept: 'text/html' });
  assert.equal(onlyHtml.status, 404);
  assert.match(onlyHtml.json, /Page not found/);
  const data = await call('GET', '/api/users', undefined, { accept: 'text/html' });
  assert.equal(data.status, 200);
  const json404 = await call('GET', '/nope');
  assert.equal(json404.json.error.code, 'route_not_found');
  assert.equal(json404.json.error.title, 'Page not found');
  assert.equal((await call('GET', '/api/users/99')).json.error.title, 'Not found');
  assert.equal((await call('GET', '/api/users', undefined, { accept: 'image/png' })).status, 406);
});

test('server.js starts on the given port, creates the journal file and answers /health', async () => {
  const file = path.join(os.tmpdir(), `pz2-server-${process.pid}-${Date.now()}.sqlite`);
  const child = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, PORT: '4231', JOURNAL_FILE: file, RATE_LIMIT_MAX: '5' }, stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.stdout.on('data', (chunk) => String(chunk).includes('listens') && resolve());
      child.once('exit', () => reject(new Error('server exited early')));
    });
    assert.equal((await fetch('http://127.0.0.1:4231/health')).status, 200);
    assert.equal((await fetch('http://127.0.0.1:4231/api/users')).status, 200);
    assert.ok(fs.existsSync(file));
  } finally {
    child.kill();
    await new Promise((resolve) => (child.exitCode === null && child.signalCode === null ? child.once('exit', resolve) : resolve()));
    for (const suffix of ['', '-wal', '-shm']) fs.rmSync(file + suffix, { force: true });
  }
});
