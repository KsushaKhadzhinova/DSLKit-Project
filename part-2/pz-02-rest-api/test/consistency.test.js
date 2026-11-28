import { test } from 'node:test';
import assert from 'node:assert/strict';
import { core } from './helpers.js';
import { createApp } from '../src/app.js';
import { createStores } from '../src/store.js';

// "A user started writing while the administrator deleted the parent": every such window must end in 404, 409 or
// 412 in the one error format, never in a 500 and never in a record whose parent is gone.
const withApi = (name, fn) =>
  test(name, async () => {
    const errors = [];
    const stores = createStores();
    const server = createApp({ stores, writeError: (...a) => errors.push(a), limit: { windowMs: 60000, max: 1_000_000 } }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const call = async (method, path, body, headers = {}) => {
      const res = await fetch(base + path, {
        method,
        headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
    };
    try {
      await fn({ call, stores, errors });
      assert.deepEqual(errors, [], 'no unexpected server error was logged');
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });

const orphans = (stores) => [
  ...stores.projects.all().filter((p) => !stores.users.find(p.ownerId)).map((p) => `project ${p.id}`),
  ...stores.diagrams.all().filter((d) => !stores.projects.find(d.projectId)).map((d) => `diagram ${d.id}`),
];

withApi('a child of a deleted parent is refused with 409 and nothing is stored', async ({ call, stores }) => {
  const user = (await call('POST', '/users', { name: 'Temp', email: 'temp@example.com' })).json;
  assert.equal((await call('DELETE', `/users/${user.id}`)).status, 204);
  const project = await call('POST', '/projects', { name: 'Late', ownerId: user.id });
  assert.equal(project.status, 409);
  assert.equal(project.json.error.code, 'parent_missing');
  assert.equal(project.json.error.details[0].field, 'ownerId');
  const emptyProject = (await call('POST', '/projects', { name: 'Empty', ownerId: 1 })).json;
  assert.equal((await call('DELETE', `/projects/${emptyProject.id}`)).status, 204);
  const diagram = await call('POST', '/diagrams', { title: 'Late', notation: 'UML', projectId: emptyProject.id });
  assert.equal(diagram.status, 409);
  assert.equal(diagram.json.error.code, 'parent_missing');
  assert.equal((await call('PATCH', '/diagrams/1', { projectId: emptyProject.id })).status, 409);
  assert.equal((await call('PUT', '/diagrams/1', { title: 't', notation: 'UML', projectId: emptyProject.id })).status, 409);
  assert.equal(stores.diagrams.find(1).projectId, 1);
  assert.deepEqual(orphans(stores), []);
});

withApi('changing or deleting an already deleted record answers 404, deleting twice is safe', async ({ call }) => {
  assert.equal((await call('DELETE', '/diagrams/3')).status, 204);
  for (const [method, path, body] of [
    ['GET', '/diagrams/3'],
    ['PATCH', '/diagrams/3', { title: 'x' }],
    ['PUT', '/diagrams/3', { title: 'x', notation: 'UML', projectId: 1 }],
    ['DELETE', '/diagrams/3'],
    ['POST', '/diagrams/3/publish'],
    ['POST', '/diagrams/3/duplicate'],
  ]) {
    const res = await call(method, path, body);
    assert.equal(res.status, 404, `${method} ${path}`);
    assert.deepEqual(core(res.json), { error: { code: 'not_found', message: 'Diagram not found' } });
  }
});

withApi('parallel PATCH and DELETE of one record end in a consistent state', async ({ call }) => {
  for (let round = 0; round < 20; round += 1) {
    const created = (await call('POST', '/diagrams', { title: `r${round}`, notation: 'ERD', projectId: 2 })).json;
    const [patch, del] = await Promise.all([call('PATCH', `/diagrams/${created.id}`, { status: 'published' }), call('DELETE', `/diagrams/${created.id}`)]);
    assert.equal(del.status, 204);
    assert.ok([200, 404].includes(patch.status), String(patch.status));
    assert.equal((await call('GET', `/diagrams/${created.id}`)).status, 404);
  }
});

withApi('two parallel DELETEs of one record: one 204, one 404', async ({ call }) => {
  const [a, b] = await Promise.all([call('DELETE', '/diagrams/1'), call('DELETE', '/diagrams/1')]);
  assert.deepEqual([a.status, b.status].sort(), [204, 404]);
});

withApi('creating a child while the parent is deleted never leaves an orphan', async ({ call, stores }) => {
  for (let round = 0; round < 25; round += 1) {
    const project = (await call('POST', '/projects', { name: `p${round}`, ownerId: 1 })).json;
    const [create, remove] = await Promise.all([
      call('POST', '/diagrams', { title: 'd', notation: 'DFD', projectId: project.id }),
      call('DELETE', `/projects/${project.id}`),
    ]);
    assert.ok([201, 409].includes(create.status), `create ${create.status}`);
    assert.ok([204, 409].includes(remove.status), `delete ${remove.status}`);
    // exactly one of them wins: either the diagram exists and the project too, or neither
    assert.equal(create.status === 201, remove.status === 409);
    assert.deepEqual(orphans(stores), []);
  }
  for (let round = 0; round < 25; round += 1) {
    const user = (await call('POST', '/users', { name: `u${round}`, email: `u${round}@example.com` })).json;
    const [create, remove] = await Promise.all([call('POST', '/projects', { name: 'p', ownerId: user.id }), call('DELETE', `/users/${user.id}`)]);
    assert.equal(create.status === 201, remove.status === 409);
    assert.deepEqual(orphans(stores), []);
  }
});

withApi('step by step: the administrator deletes the project between two requests of the user', async ({ call, stores }) => {
  const project = (await call('POST', '/projects', { name: 'Draft', ownerId: 2 })).json;
  assert.equal((await call('GET', `/projects/${project.id}/diagrams`)).status, 200); // the user opens the project
  assert.equal((await call('DELETE', `/projects/${project.id}`)).status, 204); // the administrator deletes it
  assert.equal((await call('POST', '/diagrams', { title: 'Mine', notation: 'UML', projectId: project.id })).status, 409); // the user saves
  assert.equal((await call('GET', `/projects/${project.id}/diagrams`)).status, 404);
  assert.deepEqual(orphans(stores), []);
});

withApi('a parent with children cannot be deleted, so nothing cascades silently', async ({ call, stores }) => {
  assert.equal((await call('DELETE', '/projects/1')).json.error.code, 'conflict');
  assert.equal((await call('DELETE', '/users/1')).json.error.code, 'conflict');
  assert.equal(stores.diagrams.all().length, 3);
});

withApi('a conditional update with If-Match refuses stale data with 412', async ({ call }) => {
  const read = await call('GET', '/projects/1');
  const etag = read.headers.get('etag');
  assert.match(etag, /^W\/"[0-9a-f]+"$/);
  const first = await call('PATCH', '/projects/1', { name: 'First' }, { 'if-match': etag });
  assert.equal(first.status, 200);
  assert.notEqual(first.headers.get('etag'), etag);
  const stale = await call('PATCH', '/projects/1', { name: 'Second' }, { 'if-match': etag });
  assert.equal(stale.status, 412);
  assert.deepEqual(core(stale.json), { error: { code: 'precondition_failed', message: 'The record changed since you read it, read it again' } });
  assert.equal((await call('PUT', '/projects/1', { name: 'Third', ownerId: 1 }, { 'if-match': etag })).status, 412);
  assert.equal((await call('DELETE', '/diagrams/1', undefined, { 'if-match': '"nope"' })).status, 412);
  assert.equal((await call('GET', '/projects/1')).json.name, 'First');
  // a current tag, a list of tags and * all pass; without the header the update stays unconditional
  const fresh = first.headers.get('etag');
  assert.equal((await call('PUT', '/projects/1', { name: 'Put', ownerId: 1 }, { 'if-match': `"x", ${fresh}` })).status, 200);
  assert.equal((await call('PATCH', '/projects/1', { name: 'Star' }, { 'if-match': '*' })).status, 200);
  assert.equal((await call('PATCH', '/projects/1', { name: 'Open' })).status, 200);
  const current = (await call('GET', '/diagrams/2')).headers.get('etag');
  assert.equal((await call('DELETE', '/diagrams/2', undefined, { 'if-match': current })).status, 204);
});

withApi('two writers holding the same tag: only one wins', async ({ call }) => {
  const etag = (await call('GET', '/users/2')).headers.get('etag');
  const [a, b] = await Promise.all([
    call('PATCH', '/users/2', { name: 'Writer A' }, { 'if-match': etag }),
    call('PATCH', '/users/2', { name: 'Writer B' }, { 'if-match': etag }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 412]);
});
