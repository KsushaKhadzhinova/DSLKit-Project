const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { startServer, PASSWORD, SECRET } = require('./harness');
const { sha256 } = require('../src/security/crypto-box');

let app;
const creds = (email) => ({ body: { email, password: PASSWORD } });
// Registers (once) and logs in; the User-Agent becomes the device label of the session.
const login = async (email, agent = 'test-agent/1.0') => {
  await app.call('POST', '/auth/register', creds(email));
  const { res, body } = await app.call('POST', '/auth/login', { ...creds(email), headers: { 'User-Agent': agent } });
  assert.equal(res.status, 200);
  return body;
};
const refresh = (refreshToken) => app.call('POST', '/auth/refresh', { body: { refreshToken } });
const profile = (token) => app.call('GET', '/profile', { token });

before(async () => {
  app = await startServer();
});
after(() => app.close());

test('login returns a short access token, an opaque refresh token and the session id', async () => {
  const body = await login('r1@example.com');
  assert.equal(body.tokenType, 'Bearer');
  assert.equal(body.token, body.accessToken);
  assert.equal(body.expiresIn, '15m');
  assert.match(body.refreshToken, /^[A-Za-z0-9_-]{43}$/);
  assert.match(body.sessionId, /^[0-9a-f-]{36}$/);
  const payload = jwt.verify(body.accessToken, SECRET, { audience: 'dslkit-api' });
  assert.equal(payload.sid, body.sessionId);
  assert.equal(payload.exp - payload.iat, 900);
  assert.equal((await profile(body.accessToken)).res.status, 200);
});

test('only the hash of a refresh token is stored', async () => {
  const body = await login('r2@example.com');
  const rows = await app.models.RefreshToken.findAll({ where: { familyId: body.sessionId } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].tokenHash, sha256(body.refreshToken));
  assert.equal(JSON.stringify(rows[0].toJSON()).includes(body.refreshToken), false);
});

test('POST /auth/refresh rotates: a new pair comes back, the family stays, the old token is spent', async () => {
  const first = await login('r3@example.com');
  const { res, body } = await refresh(first.refreshToken);
  assert.equal(res.status, 200);
  assert.notEqual(body.refreshToken, first.refreshToken);
  assert.equal(body.sessionId, first.sessionId);
  assert.equal((await profile(body.accessToken)).res.status, 200);
  const rows = await app.models.RefreshToken.findAll({ where: { familyId: first.sessionId }, order: [['id', 'ASC']] });
  assert.equal(rows.length, 2);
  assert.ok(rows[0].usedAt);
  assert.equal(rows[1].usedAt, null);
});

test('reusing a spent refresh token revokes the whole family, the new token and the access token included', async () => {
  const first = await login('r4@example.com');
  const second = (await refresh(first.refreshToken)).body;
  const stolen = await refresh(first.refreshToken);
  assert.equal(stolen.res.status, 401);
  assert.equal(stolen.body.error, 'Invalid refresh token');
  assert.equal((await refresh(second.refreshToken)).res.status, 401, 'the newest token of the family is dead too');
  const ended = await profile(second.accessToken);
  assert.equal(ended.res.status, 401);
  assert.equal(ended.body.error, 'Session was ended');
  const user = await app.models.User.findOne({ where: { email: 'r4@example.com' } });
  const event = await app.models.AuditEvent.findOne({ where: { type: 'refresh_reuse', userId: user.id } });
  assert.ok(event);
});

test('reuse in one family leaves the other sessions of the user alone', async () => {
  const phone = await login('r5@example.com', 'phone');
  const laptop = await login('r5@example.com', 'laptop');
  await refresh(phone.refreshToken);
  await refresh(phone.refreshToken);
  assert.equal((await profile(laptop.accessToken)).res.status, 200);
  assert.equal((await refresh(laptop.refreshToken)).res.status, 200);
});

test('two parallel refreshes with one token: exactly one wins', async () => {
  const first = await login('r6@example.com');
  const results = await Promise.all([refresh(first.refreshToken), refresh(first.refreshToken), refresh(first.refreshToken)]);
  const statuses = results.map((r) => r.res.status).sort();
  assert.equal(statuses.filter((s) => s === 200).length, 1, statuses.join());
});

test('an expired, unknown, malformed or missing refresh token is refused', async () => {
  const first = await login('r7@example.com');
  await app.models.RefreshToken.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { familyId: first.sessionId } });
  assert.equal((await refresh(first.refreshToken)).res.status, 401);
  for (const bad of ['x', 'a'.repeat(43), 'a'.repeat(500)]) assert.equal((await refresh(bad)).res.status, 401, bad.slice(0, 5));
  for (const body of [{}, { refreshToken: 5 }, { refreshToken: '' }, []]) assert.equal((await app.call('POST', '/auth/refresh', { body })).res.status, 400, JSON.stringify(body));
});

test('a refresh token never outlives the absolute session limit', async () => {
  const first = await login('r8@example.com');
  await app.models.RefreshToken.update({ familyStartedAt: new Date(Date.now() - 29.5 * 24 * 3600 * 1000) }, { where: { familyId: first.sessionId } });
  const { body } = await refresh(first.refreshToken);
  const row = await app.models.RefreshToken.findOne({ where: { tokenHash: sha256(body.refreshToken) } });
  assert.ok(row.expiresAt.getTime() - Date.now() < 0.6 * 24 * 3600 * 1000, 'the new token ends with the 30 day session, not 7 days from now');
});

test('a deleted user cannot refresh', async () => {
  const first = await login('r9@example.com');
  await app.models.User.destroy({ where: { email: 'r9@example.com' } });
  assert.equal((await refresh(first.refreshToken)).res.status, 401);
});

test('POST /auth/logout ends the session and always answers 204', async () => {
  const first = await login('l1@example.com');
  assert.equal((await app.call('POST', '/auth/logout', { body: { refreshToken: first.refreshToken } })).res.status, 204);
  assert.equal((await refresh(first.refreshToken)).res.status, 401);
  assert.equal((await profile(first.accessToken)).res.status, 401);
  assert.equal((await app.call('POST', '/auth/logout', { body: { refreshToken: first.refreshToken } })).res.status, 204);
  assert.equal((await app.call('POST', '/auth/logout', { body: { refreshToken: 'unknown-but-long-enough-token' } })).res.status, 204);
  assert.equal((await app.call('POST', '/auth/logout', { body: {} })).res.status, 400);
});

test('POST /auth/logout-all needs a token and ends every session of the caller only', async () => {
  const a1 = await login('l2@example.com', 'a1');
  const a2 = await login('l2@example.com', 'a2');
  const b = await login('l3@example.com');
  assert.equal((await app.call('POST', '/auth/logout-all')).res.status, 401);
  assert.equal((await app.call('POST', '/auth/logout-all', { token: a1.accessToken, body: {} })).res.status, 204);
  for (const session of [a1, a2]) {
    assert.equal((await profile(session.accessToken)).res.status, 401);
    assert.equal((await refresh(session.refreshToken)).res.status, 401);
  }
  assert.equal((await profile(b.accessToken)).res.status, 200);
});

test('GET /auth/sessions lists the active sessions with the device, marks the current one and hides the tokens', async () => {
  const phone = await login('s1@example.com', 'PhoneBrowser/2 (Android)');
  const laptop = await login('s1@example.com', 'LaptopBrowser/9');
  await refresh(laptop.refreshToken);
  const { res, body } = await app.call('GET', '/auth/sessions', { token: phone.accessToken });
  assert.equal(res.status, 200);
  assert.equal(body.length, 2, 'a rotated session is still one session');
  assert.deepEqual(body.map((s) => s.device).sort(), ['LaptopBrowser/9', 'PhoneBrowser/2 (Android)']);
  assert.deepEqual(body.filter((s) => s.current).map((s) => s.id), [phone.sessionId]);
  assert.equal(JSON.stringify(body).includes(phone.refreshToken), false);
  assert.equal(JSON.stringify(body).includes('tokenHash'), false);
  assert.equal((await app.call('GET', '/auth/sessions')).res.status, 401);
});

test('a device name sent at login is used as the label, control characters are cleaned', async () => {
  await app.call('POST', '/auth/register', creds('s2@example.com'));
  const { body } = await app.call('POST', '/auth/login', { body: { email: 's2@example.com', password: PASSWORD, deviceName: 'My\nphone' } });
  const sessions = (await app.call('GET', '/auth/sessions', { token: body.accessToken })).body;
  assert.equal(sessions[0].device, 'My?phone');
});

test('DELETE /auth/sessions/:id revokes one session; another user\'s session id is a 404', async () => {
  const a1 = await login('s3@example.com', 'one');
  const a2 = await login('s3@example.com', 'two');
  const other = await login('s4@example.com');
  const foreign = await app.call('DELETE', `/auth/sessions/${other.sessionId}`, { token: a1.accessToken });
  assert.equal(foreign.res.status, 404);
  assert.equal((await profile(other.accessToken)).res.status, 200, 'the foreign session was not touched');
  assert.equal((await app.call('DELETE', `/auth/sessions/${a2.sessionId}`, { token: a1.accessToken })).res.status, 204);
  assert.equal((await profile(a2.accessToken)).res.status, 401);
  assert.equal((await refresh(a2.refreshToken)).res.status, 401);
  assert.equal((await profile(a1.accessToken)).res.status, 200);
  assert.equal((await app.call('DELETE', `/auth/sessions/${a2.sessionId}`, { token: a1.accessToken })).res.status, 404);
  assert.equal((await app.call('DELETE', '/auth/sessions/not-a-session', { token: a1.accessToken })).res.status, 404);
  assert.equal((await app.call('DELETE', `/auth/sessions/${a1.sessionId}`)).res.status, 401);
});

test('an account keeps at most ten sessions: the oldest one is closed', async () => {
  const first = await login('s5@example.com', 'first');
  for (let i = 0; i < 10; i += 1) await login('s5@example.com', `device-${i}`);
  assert.equal((await profile(first.accessToken)).res.status, 401);
  assert.equal((await refresh(first.refreshToken)).res.status, 401);
  const latest = await login('s5@example.com', 'latest');
  assert.equal((await app.call('GET', '/auth/sessions', { token: latest.accessToken })).body.length, 10);
});

test('the access token rules: audience and issuer are required, HS256 only, a challenge token is not an access token', async () => {
  const user = await app.models.User.findOne({ where: { email: 'r1@example.com' } });
  const make = (options, claims = {}) => jwt.sign({ id: user.id, ...claims }, SECRET, { expiresIn: '5m', ...options });
  assert.equal((await profile(make({ issuer: 'dslkit', audience: 'dslkit-api' }))).res.status, 200);
  for (const options of [{ issuer: 'dslkit' }, { issuer: 'dslkit', audience: 'someone-else' }, { issuer: 'dslkit', audience: 'dslkit-2fa' }, { audience: 'dslkit-api' }, { issuer: 'dslkit', audience: 'dslkit-api', algorithm: 'HS384' }]) {
    assert.equal((await profile(make(options))).res.status, 401, JSON.stringify(options));
  }
  assert.equal((await profile(make({ issuer: 'dslkit', audience: 'dslkit-api' }, { sid: 42 }))).res.status, 401, 'sid must be text');
  assert.equal((await profile(make({ issuer: 'dslkit', audience: 'dslkit-api' }, { sid: 'no-such-session' }))).res.status, 401);
});

test('the clock tolerance is a few seconds: a token that expired a moment ago passes, one that expired a minute ago does not', async () => {
  const user = await app.models.User.findOne({ where: { email: 'r1@example.com' } });
  const options = { issuer: 'dslkit', audience: 'dslkit-api' };
  const now = Math.floor(Date.now() / 1000);
  assert.equal((await profile(jwt.sign({ id: user.id, exp: now - 2 }, SECRET, options))).res.status, 200);
  assert.equal((await profile(jwt.sign({ id: user.id, exp: now - 60 }, SECRET, options))).res.status, 401);
});
