'use strict';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, strongPassword, validProject } = require('./helpers');

describe('users, roles and request log', () => {
  let s;
  let user;
  let editor;
  let admin;
  before(async () => {
    s = await startServer();
    user = await s.signup('user', 'Una');
    editor = await s.signup('editor', 'Eddie');
    admin = await s.signup('admin', 'Alex');
  });
  after(() => s.close());

  const missingId = '00000000-0000-4000-8000-000000000000';

  describe('admin-only endpoints', () => {
    const endpoints = (id) => [
      ['GET', '/api/users'],
      ['PATCH', `/api/users/${id}`, { role: 'editor' }],
      ['POST', `/api/users/${id}/unlock`],
      ['GET', '/api/logs'],
    ];
    test('guest gets 401 everywhere', async () => {
      for (const [m, p, body] of endpoints(user.id)) assert.equal((await s.api(m, p, { body })).status, 401, p);
    });
    for (const who of ['user', 'editor']) {
      test(`${who} gets 403 everywhere`, async () => {
        const t = { user, editor }[who];
        for (const [m, p, body] of endpoints(user.id)) assert.equal((await s.api(m, p, { token: t.token, body })).status, 403, `${m} ${p}`);
      });
    }
  });

  test('admin lists users with emails, paged and searchable by name or email', async () => {
    const res = await s.api('GET', '/api/users?pageSize=50', { token: admin.token });
    assert.equal(res.status, 200);
    assert.ok(res.body.items.some((u) => u.email === user.email));
    assert.doesNotMatch(res.text, /passwordHash|\$2[aby]\$|refresh/i);
    assert.equal((await s.api('GET', '/api/users?q=Eddie', { token: admin.token })).body.items.length, 1);
    assert.equal((await s.api('GET', `/api/users?q=${encodeURIComponent(admin.email)}`, { token: admin.token })).body.items.length, 1);
    assert.equal((await s.api('GET', '/api/users?pageSize=1&page=2', { token: admin.token })).body.items.length, 1);
    assert.equal((await s.api('GET', '/api/users?pageSize=1000', { token: admin.token })).status, 400);
  });

  test('admin finds users by a Cyrillic name in any case', async () => {
    await s.signup('user', 'Ёжик Иванов');
    for (const q of ['ёжик', 'ИВАНОВ'])
      assert.equal((await s.api('GET', `/api/users?q=${encodeURIComponent(q)}`, { token: admin.token })).body.items.length, 1, q);
  });

  test('a role change applies to the next request, without a new login', async () => {
    const u = await s.signup('user', 'Promoted');
    const shared = (await s.api('POST', '/api/projects', { token: user.token, body: validProject({ visibility: 'shared' }) })).body.project;
    assert.equal((await s.api('PATCH', `/api/projects/${shared.id}`, { token: u.token, body: { title: 'x' } })).status, 403);
    const res = await s.api('PATCH', `/api/users/${u.id}`, { token: admin.token, body: { role: 'editor' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, 'editor');
    assert.equal((await s.api('PATCH', `/api/projects/${shared.id}`, { token: u.token, body: { title: 'now ok' } })).status, 200);
    await s.api('PATCH', `/api/users/${u.id}`, { token: admin.token, body: { role: 'user' } });
    assert.equal((await s.api('PATCH', `/api/projects/${shared.id}`, { token: u.token, body: { title: 'again' } })).status, 403);
  });

  test('role input is validated and the target must exist', async () => {
    const t = (body, id = user.id) => s.api('PATCH', `/api/users/${id}`, { token: admin.token, body });
    assert.equal((await t({ role: 'root' })).status, 400);
    assert.equal((await t({ role: 'guest' })).status, 400);
    assert.equal((await t({})).status, 400);
    assert.equal((await t({ role: 'editor', email: 'x@y.test' })).status, 400);
    assert.equal((await t({ role: 'editor' }, missingId)).status, 404);
    assert.equal((await t({ role: 'editor' }, 'bad-id')).status, 404);
  });

  test('an admin cannot change their own role (no accidental loss of the last admin)', async () => {
    const res = await s.api('PATCH', `/api/users/${admin.id}`, { token: admin.token, body: { role: 'user' } });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'own_role_locked');
  });

  test('admin unlocks a locked account, which can then log in again', async () => {
    const u = await s.signup();
    for (let i = 0; i < 5; i++) await s.api('POST', '/api/auth/login', { body: { email: u.email, password: strongPassword() } });
    assert.equal((await s.api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } })).status, 401);
    assert.equal((await s.api('POST', `/api/users/${u.id}/unlock`, { token: admin.token })).status, 200);
    assert.equal((await s.api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } })).status, 200);
    assert.equal((await s.api('POST', `/api/users/${missingId}/unlock`, { token: admin.token })).status, 404);
  });

  test('project responses never expose the owner email to other users', async () => {
    const p = (await s.api('POST', '/api/projects', { token: user.token, body: validProject({ visibility: 'shared' }) })).body.project;
    const res = await s.api('GET', `/api/projects/${p.id}`, { token: editor.token });
    assert.equal(res.status, 200);
    assert.doesNotMatch(res.text, new RegExp(user.email.replace('.', '\\.')));
    assert.equal(res.body.project.owner.displayName, 'Una');
  });

  describe('request log', () => {
    test('admin reads the log; entries hold metadata only, never bodies, passwords or tokens', async () => {
      const pw = strongPassword();
      await s.api('POST', '/api/auth/login', { body: { email: 'nobody@example.test', password: pw } });
      await s.api('GET', '/api/me', { token: user.token });
      // The log row is written after the response, so wait until the last request shows up.
      let res;
      for (let i = 0; i < 40; i++) {
        res = await s.api('GET', '/api/logs?pageSize=200', { token: admin.token });
        if (res.body.items.some((e) => e.path === '/api/me' && e.userId === user.id)) break;
        await new Promise((r) => setTimeout(r, 25));
      }
      assert.equal(res.status, 200);
      const entry = res.body.items.find((e) => e.path === '/api/auth/login' && e.status === 401);
      assert.ok(entry);
      assert.deepEqual(Object.keys(entry).sort(), ['createdAt', 'durationMs', 'id', 'ip', 'method', 'path', 'status', 'userId']);
      assert.equal(res.text.includes(pw), false);
      assert.equal(res.text.includes(user.token), false);
      const mine = res.body.items.find((e) => e.path === '/api/me' && e.userId === user.id);
      assert.ok(mine);
    });

    test('the query string is not stored in the log path', async () => {
      await s.api('GET', '/api/projects?q=secret-search-term', { token: user.token });
      await new Promise((r) => setTimeout(r, 100));
      const res = await s.api('GET', '/api/logs?pageSize=200', { token: admin.token });
      assert.equal(res.text.includes('secret-search-term'), false);
    });

    test('log paging is bounded and validated', async () => {
      assert.equal((await s.api('GET', '/api/logs?pageSize=201', { token: admin.token })).status, 400);
      assert.equal((await s.api('GET', '/api/logs?pageSize=2', { token: admin.token })).body.items.length, 2);
    });

    test('a failing log write never breaks the request', async () => {
      await s.db.RequestLog.drop();
      assert.equal((await s.api('GET', '/api/me', { token: user.token })).status, 200);
      await s.db.RequestLog.sync();
    });
  });
});
