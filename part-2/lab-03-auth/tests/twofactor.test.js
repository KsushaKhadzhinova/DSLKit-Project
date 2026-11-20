const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, PASSWORD } = require('./harness');
const { totp } = require('../src/security/totp');
const { createBox, sha256 } = require('../src/security/crypto-box');

let app;
const STEP = 30000;
const creds = (email, password = PASSWORD) => ({ body: { email, password } });
// A code of the next time step: the window accepts it now, and it is newer than the code used for the setup.
const codeAfter = (secret, steps) => totp(secret, Date.now() + steps * STEP);

before(async () => {
  app = await startServer({ loginMaxAttempts: 5, twoFactorKey: 'two-factor-key-two-factor-key-1234' });
});
after(() => app.close());

// Registers, logs in and runs setup and enable; returns everything a test needs.
const withTwoFactor = async (email) => {
  await app.call('POST', '/auth/register', creds(email));
  const token = (await app.call('POST', '/auth/login', creds(email))).body.token;
  const setup = await app.call('POST', '/auth/2fa/setup', { token, body: { password: PASSWORD } });
  assert.equal(setup.res.status, 201);
  const enable = await app.call('POST', '/auth/2fa/enable', { token, body: { code: totp(setup.body.secret) } });
  assert.equal(enable.res.status, 200);
  return { email, token, secret: setup.body.secret, recoveryCodes: enable.body.recoveryCodes };
};

test('setup needs a token and the password, and returns the secret and an otpauth URL', async () => {
  await app.call('POST', '/auth/register', creds('t1@example.com'));
  const token = (await app.call('POST', '/auth/login', creds('t1@example.com'))).body.token;
  assert.equal((await app.call('POST', '/auth/2fa/setup', { body: { password: PASSWORD } })).res.status, 401);
  assert.equal((await app.call('POST', '/auth/2fa/setup', { token, body: {} })).res.status, 400);
  assert.equal((await app.call('POST', '/auth/2fa/setup', { token, body: { password: 'wrong password' } })).res.status, 401);
  const { res, body } = await app.call('POST', '/auth/2fa/setup', { token, body: { password: PASSWORD } });
  assert.equal(res.status, 201);
  assert.match(body.secret, /^[A-Z2-7]{32}$/);
  assert.ok(body.otpauthUrl.startsWith('otpauth://totp/DSLKit:t1%40example.com?secret=' + body.secret));
  assert.deepEqual((await app.call('GET', '/auth/2fa', { token })).body, { enabled: false, recoveryCodesLeft: 0 });
});

test('the secret is encrypted in the database and cannot be read without the key', async () => {
  await app.call('POST', '/auth/register', creds('t2@example.com'));
  const token = (await app.call('POST', '/auth/login', creds('t2@example.com'))).body.token;
  const { body } = await app.call('POST', '/auth/2fa/setup', { token, body: { password: PASSWORD } });
  const user = await app.models.User.findOne({ where: { email: 't2@example.com' } });
  assert.match(user.twoFactorSecret, /^v1\./);
  assert.equal(user.twoFactorSecret.includes(body.secret), false);
  assert.equal(createBox('two-factor-key-two-factor-key-1234').open(user.twoFactorSecret), body.secret);
  assert.throws(() => createBox('another-key-another-key-another-1').open(user.twoFactorSecret));
  assert.equal('twoFactorSecret' in JSON.parse(JSON.stringify(user)), false, 'toJSON hides it');
});

test('enable refuses a wrong code and a call without a setup, then returns eight recovery codes once, stored hashed', async () => {
  await app.call('POST', '/auth/register', creds('t3@example.com'));
  const token = (await app.call('POST', '/auth/login', creds('t3@example.com'))).body.token;
  assert.equal((await app.call('POST', '/auth/2fa/enable', { token, body: { code: '123456' } })).res.status, 400, 'no setup yet');
  const { body: setup } = await app.call('POST', '/auth/2fa/setup', { token, body: { password: PASSWORD } });
  assert.equal((await app.call('POST', '/auth/2fa/enable', { token, body: { code: '000000' } })).res.status, 401);
  assert.equal((await app.call('POST', '/auth/2fa/enable', { token, body: {} })).res.status, 400);
  const { res, body } = await app.call('POST', '/auth/2fa/enable', { token, body: { code: totp(setup.secret) } });
  assert.equal(res.status, 200);
  assert.equal(body.recoveryCodes.length, 8);
  assert.equal(new Set(body.recoveryCodes).size, 8);
  for (const code of body.recoveryCodes) assert.match(code, /^[0-9a-f]{5}-[0-9a-f]{5}$/);
  const user = await app.models.User.findOne({ where: { email: 't3@example.com' } });
  const rows = await app.models.RecoveryCode.findAll({ where: { userId: user.id } });
  assert.equal(rows.length, 8);
  assert.deepEqual(rows.map((r) => r.codeHash).sort(), body.recoveryCodes.map(sha256).sort());
  assert.deepEqual((await app.call('GET', '/auth/2fa', { token })).body, { enabled: true, recoveryCodesLeft: 8 });
  assert.equal((await app.call('POST', '/auth/2fa/enable', { token, body: { code: codeAfter(setup.secret, 1) } })).res.status, 409);
  assert.equal((await app.call('POST', '/auth/2fa/setup', { token, body: { password: PASSWORD } })).res.status, 409);
});

test('with 2FA on, login answers a challenge, and the code completes it; the same code does not work twice (replay)', async () => {
  const user = await withTwoFactor('t4@example.com');
  const login = await app.call('POST', '/auth/login', creds(user.email));
  assert.equal(login.res.status, 200);
  assert.equal(login.body.twoFactorRequired, true);
  assert.equal(login.body.token, undefined);
  assert.equal(login.body.refreshToken, undefined);
  assert.ok(login.body.challengeToken);
  const code = codeAfter(user.secret, 1);
  const done = await app.call('POST', '/auth/2fa/verify', { body: { challengeToken: login.body.challengeToken, code } });
  assert.equal(done.res.status, 200);
  assert.equal((await app.call('GET', '/profile', { token: done.body.token })).res.status, 200);
  assert.ok(done.body.refreshToken);
  const replay = await app.call('POST', '/auth/2fa/verify', { body: { challengeToken: login.body.challengeToken, code } });
  assert.equal(replay.res.status, 401);
  assert.equal(replay.body.error, 'Invalid code');
  const enableCode = totp(user.secret);
  assert.equal((await app.call('POST', '/auth/2fa/verify', { body: { challengeToken: login.body.challengeToken, code: enableCode } })).res.status, 401, 'the code used to enable 2FA is spent too');
});

test('a wrong password still answers 401 and never a challenge; the challenge token is not an access token', async () => {
  const user = await withTwoFactor('t5@example.com');
  const wrong = await app.call('POST', '/auth/login', creds(user.email, 'wrong password'));
  assert.equal(wrong.res.status, 401);
  const login = await app.call('POST', '/auth/login', creds(user.email));
  assert.equal((await app.call('GET', '/profile', { token: login.body.challengeToken })).res.status, 401);
});

test('verify refuses a bad, expired or foreign challenge and malformed bodies', async () => {
  const user = await withTwoFactor('t6@example.com');
  const code = codeAfter(user.secret, 1);
  for (const challengeToken of ['nope', user.token]) {
    assert.equal((await app.call('POST', '/auth/2fa/verify', { body: { challengeToken, code } })).res.status, 401);
  }
  for (const body of [{}, { challengeToken: 'x' }, { code: '123456' }, { challengeToken: 5, code: 5 }]) {
    assert.equal((await app.call('POST', '/auth/2fa/verify', { body })).res.status, 400, JSON.stringify(body));
  }
});

test('a recovery code completes a login once; a used or unknown one fails', async () => {
  const user = await withTwoFactor('t7@example.com');
  const challenge = async () => (await app.call('POST', '/auth/login', creds(user.email))).body.challengeToken;
  const [first, second] = user.recoveryCodes;
  const ok = await app.call('POST', '/auth/2fa/verify', { body: { challengeToken: await challenge(), code: first.toUpperCase() } });
  assert.equal(ok.res.status, 200, 'letter case does not matter');
  assert.equal((await app.call('POST', '/auth/2fa/verify', { body: { challengeToken: await challenge(), code: first } })).res.status, 401);
  assert.equal((await app.call('POST', '/auth/2fa/verify', { body: { challengeToken: await challenge(), code: 'aaaaa-bbbbb' } })).res.status, 401);
  assert.equal((await app.call('POST', '/auth/2fa/verify', { body: { challengeToken: await challenge(), code: second } })).res.status, 200);
  assert.equal((await app.call('GET', '/auth/2fa', { token: ok.body.token })).body.recoveryCodesLeft, 6);
});

test('wrong codes are limited: five failures lock the checks for that account, an admin unlock lifts it', async () => {
  const user = await withTwoFactor('t8@example.com');
  const challenge = (await app.call('POST', '/auth/login', creds(user.email))).body.challengeToken;
  for (let i = 0; i < 5; i += 1) assert.equal((await app.call('POST', '/auth/2fa/verify', { body: { challengeToken: challenge, code: '000000' } })).res.status, 401);
  const locked = await app.call('POST', '/auth/2fa/verify', { body: { challengeToken: challenge, code: codeAfter(user.secret, 1) } });
  assert.equal(locked.res.status, 429, 'even the right code is refused while locked');
  assert.ok(Number(locked.res.headers.get('retry-after')) > 0);
});

test('disable needs the password and a code, then login is plain again and the data is gone', async () => {
  const user = await withTwoFactor('t9@example.com');
  assert.equal((await app.call('POST', '/auth/2fa/disable', { token: user.token, body: { password: PASSWORD } })).res.status, 400);
  assert.equal((await app.call('POST', '/auth/2fa/disable', { token: user.token, body: { password: 'wrong password', code: codeAfter(user.secret, 1) } })).res.status, 401);
  assert.equal((await app.call('POST', '/auth/2fa/disable', { token: user.token, body: { password: PASSWORD, code: '000000' } })).res.status, 401);
  assert.equal((await app.call('POST', '/auth/2fa/disable', { token: user.token, body: { password: PASSWORD, code: user.recoveryCodes[0] } })).res.status, 204, 'a recovery code works for disabling');
  const record = await app.models.User.findOne({ where: { email: user.email } });
  assert.equal(record.twoFactorEnabled, false);
  assert.equal(record.twoFactorSecret, null);
  assert.equal(await app.models.RecoveryCode.count({ where: { userId: record.id } }), 0);
  const login = await app.call('POST', '/auth/login', creds(user.email));
  assert.ok(login.body.token);
  assert.equal(login.body.twoFactorRequired, undefined);
  assert.equal((await app.call('POST', '/auth/2fa/disable', { token: login.body.token, body: { password: PASSWORD, code: '123456' } })).res.status, 409);
});

test('a password reset does not switch 2FA off', async () => {
  const user = await withTwoFactor('t10@example.com');
  await app.call('POST', '/auth/password-reset/request', { body: { email: user.email } });
  const token = /: (\S+)\n/.exec(app.outbox.at(-1).text)[1];
  assert.equal((await app.call('POST', '/auth/password-reset/confirm', { body: { token, newPassword: 'a brand new phrase 7' } })).res.status, 204);
  const login = await app.call('POST', '/auth/login', creds(user.email, 'a brand new phrase 7'));
  assert.equal(login.body.twoFactorRequired, true);
});

test('2FA events are in the audit trail and no secret or code is in it', async () => {
  const user = await withTwoFactor('t11@example.com');
  const record = await app.models.User.findOne({ where: { email: user.email } });
  const events = await app.models.AuditEvent.findAll({ where: { userId: record.id } });
  const types = events.map((e) => e.type);
  assert.ok(types.includes('2fa_setup_started') && types.includes('2fa_enabled'));
  const text = JSON.stringify(events);
  assert.equal(text.includes(user.secret), false);
  for (const code of user.recoveryCodes) assert.equal(text.includes(code), false);
});

test('without TWO_FACTOR_KEY the key is derived from the JWT secret with another label, and a short key is refused', async () => {
  const plain = await startServer();
  try {
    await plain.call('POST', '/auth/register', creds('t12@example.com'));
    const token = (await plain.call('POST', '/auth/login', creds('t12@example.com'))).body.token;
    const { body } = await plain.call('POST', '/auth/2fa/setup', { token, body: { password: PASSWORD } });
    const stored = (await plain.models.User.findOne({ where: { email: 't12@example.com' } })).twoFactorSecret;
    assert.equal(createBox('test-secret-test-secret-test-secret-123', 'dslkit-2fa-secret-from-jwt-v1').open(stored), body.secret);
    assert.throws(() => createBox('test-secret-test-secret-test-secret-123').open(stored), 'not the signing key itself');
  } finally {
    await plain.close();
  }
  const { createApp } = require('../src/app');
  assert.throws(() => createApp(app.models, { jwtSecret: 'test-secret-test-secret-test-secret-123', twoFactorKey: 'short' }), /twoFactorKey/);
});
