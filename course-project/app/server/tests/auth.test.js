const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { createApp } = require('../src/app');
const { startServer, SECRET, PASSWORD } = require('./harness');

let app;
const creds = (email = 'carol@example.com', password = PASSWORD) => ({ body: { email, password } });
const loginToken = async () => (await app.call('POST', '/auth/login', creds())).body.token;

before(async () => {
  app = await startServer();
});
after(() => app.close());

test('POST /auth/register answers 201, normalizes the email and never returns the hash', async () => {
  const { res, body } = await app.call('POST', '/auth/register', creds('  Carol@Example.COM '));
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), '/profile');
  assert.deepEqual(Object.keys(body).sort(), ['createdAt', 'email', 'id', 'role']);
  assert.equal(body.email, 'carol@example.com');
  assert.equal(body.role, 'user');
});

test('the stored password is a bcrypt hash, not the password', async () => {
  const user = await app.models.User.findOne({ where: { email: 'carol@example.com' } });
  assert.notEqual(user.passwordHash, PASSWORD);
  assert.match(user.passwordHash, /^\$2[aby]\$04\$/);
  assert.equal(await bcrypt.compare(PASSWORD, user.passwordHash), true);
});

test('registration cannot choose a role', async () => {
  const { res, body } = await app.call('POST', '/auth/register', { body: { email: 'mallory@example.com', password: PASSWORD, role: 'admin' } });
  assert.equal(res.status, 201);
  assert.equal(body.role, 'user');
});

test('registering the same email twice answers 409, whatever its case', async () => {
  for (const email of ['carol@example.com', 'CAROL@example.com']) {
    const { res, body } = await app.call('POST', '/auth/register', creds(email));
    assert.equal(res.status, 409, email);
    assert.match(body.error, /already exists/);
  }
});

test('registration answers 400 with details for bad email or password', async () => {
  const cases = [
    [{ email: 'nope', password: PASSWORD }, ['email']],
    [{ email: 'a@b.co', password: 'short' }, ['password']],
    [{ email: 'a@b.co', password: 'é'.repeat(37) }, ['password']],
    [{ email: 5, password: 5 }, ['email', 'password']],
    [{}, ['email', 'password']],
  ];
  for (const [body, fields] of cases) {
    const result = await app.call('POST', '/auth/register', { body });
    assert.equal(result.res.status, 400, JSON.stringify(body));
    assert.deepEqual(
      result.body.details.map((d) => d.field),
      fields,
    );
  }
  assert.equal((await app.call('POST', '/auth/register', { body: [] })).res.status, 400);
});

test('POST /auth/login returns a signed token with email and role that expires in an hour', async () => {
  const { res, body } = await app.call('POST', '/auth/login', creds(' CAROL@example.com'));
  assert.equal(res.status, 200);
  assert.equal(body.tokenType, 'Bearer');
  const payload = jwt.verify(body.token, SECRET);
  assert.deepEqual({ email: payload.email, role: payload.role }, { email: 'carol@example.com', role: 'user' });
  assert.equal(payload.exp - payload.iat, 3600);
  assert.equal('passwordHash' in payload, false);
});

test('login answers 401 with the same message for a wrong password and an unknown email', async () => {
  const wrong = await app.call('POST', '/auth/login', creds('carol@example.com', 'wrong password'));
  const unknown = await app.call('POST', '/auth/login', creds('nobody@example.com'));
  assert.equal(wrong.res.status, 401);
  assert.equal(unknown.res.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
});

test('login answers 400 when email or password is missing or not a string', async () => {
  for (const body of [{}, { email: 'a@b.co' }, { password: 'x' }, { email: 1, password: 2 }, []]) {
    assert.equal((await app.call('POST', '/auth/login', { body })).res.status, 400, JSON.stringify(body));
  }
});

test('GET /profile returns the current user with a valid token', async () => {
  const { res, body } = await app.call('GET', '/profile', { token: await loginToken() });
  assert.equal(res.status, 200);
  assert.equal(body.email, 'carol@example.com');
  assert.equal('passwordHash' in body, false);
});

test('GET /profile answers 401 without a token or with a malformed header', async () => {
  const token = await loginToken();
  const headersList = [
    {},
    { Authorization: token },
    { Authorization: `Basic ${token}` },
    { Authorization: `Bearer ${token} extra` },
    { Authorization: 'Bearer' },
  ];
  for (const headers of headersList) {
    const { res, body } = await app.call('GET', '/profile', { headers });
    assert.equal(res.status, 401, JSON.stringify(headers));
    assert.equal(body.error, 'Missing Bearer token');
  }
});

test('GET /profile answers 401 for a tampered, wrongly signed, unsigned or expired token', async () => {
  const [head, payload, signature] = (await loginToken()).split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ id: 1, role: 'admin' })).toString('base64url');
  const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${payload}.`;
  const other = jwt.sign({ id: 1 }, 'a-different-secret-a-different-secret-1');
  const hs512 = jwt.sign({ id: 1 }, SECRET, { algorithm: 'HS512' });
  for (const token of [`${head}.${forgedPayload}.${signature}`, other, unsigned, hs512, 'not.a.jwt']) {
    const { res, body } = await app.call('GET', '/profile', { token });
    assert.equal(res.status, 401, token);
    assert.equal(body.error, 'Invalid token');
  }
  const { res, body } = await app.call('GET', '/profile', { token: jwt.sign({ id: 1 }, SECRET, { expiresIn: -10 }) });
  assert.equal(res.status, 401);
  assert.equal(body.error, 'Token expired');
});

test('a token stops working once its user is deleted', async () => {
  const token = await app.tokenFor('temp@example.com');
  await app.models.User.destroy({ where: { email: 'temp@example.com' } });
  const { res, body } = await app.call('GET', '/profile', { token });
  assert.equal(res.status, 401);
  assert.equal(body.error, 'User no longer exists');
});

test('a changed role takes effect at once, even with an old token', async () => {
  const token = await app.tokenFor('promoted@example.com');
  assert.equal((await app.call('GET', '/users', { token })).res.status, 403);
  await app.models.User.update({ role: 'admin' }, { where: { email: 'promoted@example.com' } });
  assert.equal((await app.call('GET', '/users', { token })).res.status, 200);
});

test('createApp refuses to start without a JWT secret', () => {
  assert.throws(() => createApp(app.models, {}), /jwtSecret is required/);
});
