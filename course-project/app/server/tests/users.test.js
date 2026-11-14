const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./harness');

let app;
let admin;
let user;

before(async () => {
  app = await startServer();
  admin = await app.tokenFor('admin@example.com', 'admin');
  user = await app.tokenFor('dave@example.com');
});
after(() => app.close());

const idOf = async (email) => (await app.models.User.findOne({ where: { email } })).id;

test('admin routes answer 401 without a token and 403 for a regular user', async () => {
  for (const [method, path] of [
    ['GET', '/users'],
    ['PATCH', '/users/1/role'],
    ['DELETE', '/users/1'],
  ]) {
    assert.equal((await app.call(method, path, { body: { role: 'admin' } })).res.status, 401, `${method} ${path}`);
    const { res, body } = await app.call(method, path, { token: user, body: { role: 'admin' } });
    assert.equal(res.status, 403, `${method} ${path}`);
    assert.equal(body.error, 'Requires the admin role');
  }
});

test('GET /users lists users without password hashes', async () => {
  const { res, body } = await app.call('GET', '/users', { token: admin });
  assert.equal(res.status, 200);
  assert.deepEqual(
    body.map((u) => u.email),
    ['admin@example.com', 'dave@example.com'],
  );
  assert.ok(body.every((u) => !('passwordHash' in u)));
});

test('PATCH /users/:id/role changes a role, validates it and protects the admin themself', async () => {
  const id = await idOf('dave@example.com');
  const changed = await app.call('PATCH', `/users/${id}/role`, { token: admin, body: { role: 'admin' } });
  assert.equal(changed.res.status, 200);
  assert.equal(changed.body.role, 'admin');
  await app.call('PATCH', `/users/${id}/role`, { token: admin, body: { role: 'user' } });

  assert.equal((await app.call('PATCH', `/users/${id}/role`, { token: admin, body: { role: 'root' } })).res.status, 400);
  assert.equal((await app.call('PATCH', `/users/${id}/role`, { token: admin, body: [] })).res.status, 400);
  assert.equal((await app.call('PATCH', '/users/abc/role', { token: admin, body: { role: 'user' } })).res.status, 400);
  assert.equal((await app.call('PATCH', '/users/9999/role', { token: admin, body: { role: 'user' } })).res.status, 404);
  const self = await app.call('PATCH', `/users/${await idOf('admin@example.com')}/role`, { token: admin, body: { role: 'user' } });
  assert.equal(self.res.status, 400);
});

test('DELETE /users/:id removes a user, answers 404 for a missing one and refuses self-deletion', async () => {
  const victim = await app.tokenFor('erin@example.com');
  const id = await idOf('erin@example.com');
  assert.equal((await app.call('DELETE', `/users/${id}`, { token: admin })).res.status, 204);
  assert.equal((await app.call('GET', '/profile', { token: victim })).res.status, 401);
  assert.equal((await app.call('DELETE', `/users/${id}`, { token: admin })).res.status, 404);
  assert.equal((await app.call('DELETE', `/users/${await idOf('admin@example.com')}`, { token: admin })).res.status, 400);
});
