'use strict';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { startServer, strongPassword, uniqueEmail, randomSecret } = require('./helpers');

describe('auth', () => {
  let s;
  before(async () => {
    s = await startServer();
  });
  after(() => s.close());

  const reg = (over = {}) => ({ email: uniqueEmail(), password: strongPassword(), displayName: 'Ann', ...over });

  test('register creates a user with role "user", returns tokens and no password data', async () => {
    const body = reg();
    const res = await s.api('POST', '/api/auth/register', { body });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'user');
    assert.equal(res.body.user.email, body.email.toLowerCase());
    assert.ok(res.body.accessToken && res.body.refreshToken);
    assert.ok(res.body.expiresIn > 0);
    assert.doesNotMatch(res.text, /passwordHash|\$2[aby]\$/);
  });

  test('the stored password is a bcrypt hash, not the password', async () => {
    const body = reg();
    await s.api('POST', '/api/auth/register', { body });
    const row = await s.db.User.findOne({ where: { email: body.email.toLowerCase() } });
    assert.match(row.passwordHash, /^\$2[aby]\$/);
    assert.notEqual(row.passwordHash, body.password);
  });

  test('register refuses a role or any unknown field (mass assignment)', async () => {
    for (const extra of [{ role: 'admin' }, { isAdmin: true }, { id: 'x' }]) {
      const res = await s.api('POST', '/api/auth/register', { body: reg(extra) });
      assert.equal(res.status, 400, JSON.stringify(extra));
      assert.equal(res.body.error.code, 'validation_failed');
    }
  });

  test('registering the same email twice, in any letter case, is a conflict', async () => {
    const body = reg();
    assert.equal((await s.api('POST', '/api/auth/register', { body })).status, 201);
    const again = await s.api('POST', '/api/auth/register', { body: { ...body, email: body.email.toUpperCase() } });
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, 'email_taken');
  });

  const invalid = [
    ['missing email', { email: undefined }],
    ['email is a number', { email: 5 }],
    ['not an email', { email: 'nope' }],
    ['email too long', { email: `${'a'.repeat(250)}@x.test` }],
    ['password too short', { password: 'Aa1-xxx' }],
    ['password longer than 72 bytes', { password: `Aa1-${'x'.repeat(70)}` }],
    ['password of multi-byte chars over 72 bytes', { password: 'Aa1-' + 'ж'.repeat(35) }],
    ['password is an object', { password: { a: 1 } }],
    ['password without a digit', { password: 'Abcdefghijkl' }],
    ['empty display name', { displayName: '' }],
    ['display name too long', { displayName: 'n'.repeat(41) }],
    ['display name with markup', { displayName: '<script>x</script>' }],
    ['display name is an array', { displayName: ['a'] }],
  ];
  for (const [name, over] of invalid) {
    test(`register rejects ${name}`, async () => {
      const res = await s.api('POST', '/api/auth/register', { body: reg(over) });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'validation_failed');
      assert.ok(Array.isArray(res.body.error.details));
    });
  }

  test('register rejects a body that is not an object', async () => {
    for (const body of [[], 'text', null]) {
      const res = await s.api('POST', '/api/auth/register', { body });
      assert.equal(res.status, 400);
    }
  });

  test('login works and email is case-insensitive', async () => {
    const u = await s.signup();
    const res = await s.api('POST', '/api/auth/login', { body: { email: u.email.toUpperCase(), password: u.password } });
    assert.equal(res.status, 200);
    assert.ok(res.body.accessToken);
  });

  test('wrong password and unknown email give the same answer', async () => {
    const u = await s.signup();
    const wrong = await s.api('POST', '/api/auth/login', { body: { email: u.email, password: strongPassword() } });
    const unknown = await s.api('POST', '/api/auth/login', { body: { email: uniqueEmail('ghost'), password: strongPassword() } });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
  });

  test('login validates input shape', async () => {
    assert.equal((await s.api('POST', '/api/auth/login', { body: { email: 1, password: 2 } })).status, 400);
    assert.equal((await s.api('POST', '/api/auth/login', { body: {} })).status, 400);
  });

  test('SQL-looking login input is just a failed login', async () => {
    const res = await s.api('POST', '/api/auth/login', { body: { email: "' OR 1=1 --@x.test", password: "' OR '1'='1" } });
    assert.ok([400, 401].includes(res.status));
  });

  test('five wrong passwords lock the account, even for the right password, until the lock expires', async () => {
    const u = await s.signup();
    for (let i = 0; i < 5; i++) {
      const r = await s.api('POST', '/api/auth/login', { body: { email: u.email, password: strongPassword() } });
      assert.equal(r.status, 401, `attempt ${i + 1}`);
    }
    const locked = await s.api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } });
    assert.equal(locked.status, 429);
    assert.equal(locked.body.error.code, 'account_locked');
    assert.ok(Number(locked.headers.get('retry-after')) > 0);
    s.clock.advance(14 * 60 * 1000);
    assert.equal((await s.api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } })).status, 429);
    s.clock.advance(2 * 60 * 1000);
    assert.equal((await s.api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } })).status, 200);
  });

  test('a successful login resets the failure counter', async () => {
    const u = await s.signup();
    for (let i = 0; i < 4; i++) await s.api('POST', '/api/auth/login', { body: { email: u.email, password: strongPassword() } });
    assert.equal((await s.api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } })).status, 200);
    for (let i = 0; i < 4; i++) await s.api('POST', '/api/auth/login', { body: { email: u.email, password: strongPassword() } });
    assert.equal((await s.api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } })).status, 200);
  });

  test('refresh rotates the token; reusing an old one revokes every session of the user', async () => {
    const u = await s.signup();
    const first = await s.api('POST', '/api/auth/refresh', { body: { refreshToken: u.refreshToken } });
    assert.equal(first.status, 200);
    assert.notEqual(first.body.refreshToken, u.refreshToken);
    const replay = await s.api('POST', '/api/auth/refresh', { body: { refreshToken: u.refreshToken } });
    assert.equal(replay.status, 401);
    const afterTheft = await s.api('POST', '/api/auth/refresh', { body: { refreshToken: first.body.refreshToken } });
    assert.equal(afterTheft.status, 401);
  });

  test('refresh fails for expired, garbage and wrong-typed tokens', async () => {
    const u = await s.signup();
    assert.equal((await s.api('POST', '/api/auth/refresh', { body: { refreshToken: 'x'.repeat(64) } })).status, 401);
    assert.equal((await s.api('POST', '/api/auth/refresh', { body: { refreshToken: 12 } })).status, 400);
    assert.equal((await s.api('POST', '/api/auth/refresh', { body: {} })).status, 400);
    s.clock.advance(8 * 24 * 3600 * 1000);
    assert.equal((await s.api('POST', '/api/auth/refresh', { body: { refreshToken: u.refreshToken } })).status, 401);
  });

  test('logout revokes the refresh token', async () => {
    const u = await s.signup();
    assert.equal((await s.api('POST', '/api/auth/logout', { body: { refreshToken: u.refreshToken } })).status, 204);
    assert.equal((await s.api('POST', '/api/auth/refresh', { body: { refreshToken: u.refreshToken } })).status, 401);
    assert.equal((await s.api('POST', '/api/auth/logout', { body: { refreshToken: u.refreshToken } })).status, 204);
  });

  test('only the newest refresh tokens survive when the per-user cap is exceeded', async () => {
    const u = await s.signup();
    const tokens = [u.refreshToken];
    for (let i = 0; i < 11; i++) {
      const r = await s.api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } });
      tokens.push(r.body.refreshToken);
    }
    assert.equal((await s.api('POST', '/api/auth/refresh', { body: { refreshToken: tokens[0] } })).status, 401);
    assert.equal((await s.api('POST', '/api/auth/refresh', { body: { refreshToken: tokens.at(-1) } })).status, 200);
  });

  describe('access token', () => {
    test('/api/me returns the own profile including the email', async () => {
      const u = await s.signup();
      const res = await s.api('GET', '/api/me', { token: u.token });
      assert.equal(res.status, 200);
      assert.equal(res.body.user.email, u.email);
      assert.equal(res.body.user.role, 'user');
    });

    test('missing, malformed or non-bearer headers are 401', async () => {
      assert.equal((await s.api('GET', '/api/me')).status, 401);
      assert.equal((await s.api('GET', '/api/me', { headers: { authorization: 'Bearer' } })).status, 401);
      assert.equal((await s.api('GET', '/api/me', { headers: { authorization: 'Basic abc' } })).status, 401);
      assert.equal((await s.api('GET', '/api/me', { token: 'not.a.jwt' })).status, 401);
    });

    test('an expired token is 401 with a specific code', async () => {
      const u = await s.signup();
      s.clock.advance(11 * 60 * 1000);
      const res = await s.api('GET', '/api/me', { token: u.token });
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'token_expired');
    });

    test('a token signed with another secret, or with alg none, is rejected', async () => {
      const u = await s.signup();
      const nowSec = Math.floor(s.clock.now / 1000);
      const claims = { sub: u.id, iat: nowSec, exp: nowSec + 600, iss: 'dslkit-editor-server', aud: 'dslkit-editor' };
      const forged = jwt.sign(claims, randomSecret());
      assert.equal((await s.api('GET', '/api/me', { token: forged })).status, 401);
      const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.`;
      assert.equal((await s.api('GET', '/api/me', { token: none })).status, 401);
    });

    test('a token of a deleted user is 401', async () => {
      const u = await s.signup();
      await s.db.User.destroy({ where: { id: u.id } });
      assert.equal((await s.api('GET', '/api/me', { token: u.token })).status, 401);
    });
  });
});
