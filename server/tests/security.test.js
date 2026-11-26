'use strict';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, strongPassword, uniqueEmail } = require('./helpers');
const { bootstrapAdmin } = require('../src/bootstrap-admin');

describe('http security', () => {
  let s;
  before(async () => {
    s = await startServer();
  });
  after(() => s.close());

  test('an allowed origin gets CORS headers, and Vary: Origin', async () => {
    const res = await s.api('GET', '/api/health', { headers: { origin: 'http://localhost:5173' } });
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.match(res.headers.get('vary'), /Origin/i);
  });

  test('a foreign origin gets no CORS headers, never a wildcard', async () => {
    const res = await s.api('GET', '/api/health', { headers: { origin: 'http://evil.test' } });
    assert.equal(res.headers.get('access-control-allow-origin'), null);
    const ok = await s.api('GET', '/api/health');
    assert.equal(ok.headers.get('access-control-allow-origin'), null);
  });

  test('preflight: allowed origin gets 204 with methods and headers; a foreign one gets none', async () => {
    const pre = (origin) => fetch(`${s.base}/api/projects`, { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST' } });
    const good = await pre('http://127.0.0.1:5173');
    assert.equal(good.status, 204);
    assert.match(good.headers.get('access-control-allow-methods'), /POST/);
    assert.match(good.headers.get('access-control-allow-headers'), /authorization/i);
    const bad = await pre('http://evil.test');
    assert.equal(bad.status, 204);
    assert.equal(bad.headers.get('access-control-allow-origin'), null);
  });

  test('responses carry hardening headers and no framework banner', async () => {
    const res = await s.api('GET', '/api/health');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
  });

  test('malformed JSON is a clean 400 in the uniform format', async () => {
    const res = await s.api('POST', '/api/auth/login', { raw: '{"email":', headers: { 'content-type': 'application/json' } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'invalid_json');
    assert.doesNotMatch(res.text, /SyntaxError|at .*\.js/);
  });

  test('a body that is not JSON is refused', async () => {
    const res = await s.api('POST', '/api/auth/login', { raw: 'email=a', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    assert.equal(res.status, 415);
  });

  test('an oversized body is 413 in the uniform format', async () => {
    const res = await s.api('POST', '/api/auth/login', { body: { email: 'x'.repeat(400 * 1024), password: 'y' } });
    assert.equal(res.status, 413);
    assert.equal(res.body.error.code, 'payload_too_large');
  });

  test('unknown routes and wrong methods are uniform 404 and 405-free of internals', async () => {
    const res = await s.api('GET', '/api/nope');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'not_found');
    assert.equal((await s.api('GET', '/')).status, 404);
  });

  test('an internal failure is a generic 500 without stack, path or SQL', async () => {
    const t = await startServer();
    const u = await t.signup();
    await t.db.sequelize.close();
    const res = await t.api('GET', '/api/projects', { token: u.token });
    assert.equal(res.status, 500);
    assert.equal(res.body.error.code, 'internal_error');
    assert.doesNotMatch(res.text, /SELECT|sequelize|\.js|node_modules/i);
    await t.close();
  });

  test('health needs no authentication and reveals nothing else', async () => {
    const res = await s.api('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });
});

describe('rate limits', () => {
  test('login attempts per IP are limited and recover after the window', async () => {
    const s = await startServer({ limits: { loginRateMax: 3, loginRateWindowMinutes: 15 } });
    const attempt = () => s.api('POST', '/api/auth/login', { body: { email: uniqueEmail('x'), password: strongPassword() } });
    for (let i = 0; i < 3; i++) assert.equal((await attempt()).status, 401);
    const blocked = await attempt();
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.error.code, 'rate_limited');
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    s.clock.advance(16 * 60 * 1000);
    assert.equal((await attempt()).status, 401);
    await s.close();
  });

  test('registration and refresh and general traffic are limited too', async () => {
    const s = await startServer({ limits: { registerRateMax: 2, refreshRateMax: 2, generalRateMax: 6 } });
    const reg = () => s.api('POST', '/api/auth/register', { body: { email: uniqueEmail(), password: strongPassword(), displayName: 'R' } });
    assert.equal((await reg()).status, 201);
    assert.equal((await reg()).status, 201);
    assert.equal((await reg()).status, 429);
    const ref = () => s.api('POST', '/api/auth/refresh', { body: { refreshToken: 'x'.repeat(64) } });
    assert.equal((await ref()).status, 401);
    assert.equal((await ref()).status, 401);
    assert.equal((await ref()).status, 429);
    for (let i = 0; i < 6; i++) await s.api('GET', '/api/health');
    assert.equal((await s.api('GET', '/api/health')).status, 429);
    await s.close();
  });
});

describe('bootstrap administrator', () => {
  test('creates the first admin once and never overwrites an existing one', async () => {
    const s = await startServer();
    const email = uniqueEmail('boss');
    const password = strongPassword();
    const first = await bootstrapAdmin({ db: s.db, config: s.config, email, password, now: () => s.clock.now });
    assert.equal(first.created, true);
    const login = await s.api('POST', '/api/auth/login', { body: { email, password } });
    assert.equal(login.body.user.role, 'admin');
    const second = await bootstrapAdmin({ db: s.db, config: s.config, email: uniqueEmail('boss'), password, now: () => s.clock.now });
    assert.equal(second.created, false);
    assert.equal(await s.db.User.count({ where: { role: 'admin' } }), 1);
    await s.close();
  });

  test('does nothing without credentials and refuses a weak password', async () => {
    const s = await startServer();
    assert.deepEqual(await bootstrapAdmin({ db: s.db, config: s.config, email: '', password: '' }), { created: false, reason: 'not_configured' });
    await assert.rejects(bootstrapAdmin({ db: s.db, config: s.config, email: uniqueEmail(), password: 'weak' }), /ADMIN_PASSWORD/);
    await assert.rejects(bootstrapAdmin({ db: s.db, config: s.config, email: 'bad', password: strongPassword() }), /ADMIN_EMAIL/);
    await s.close();
  });
});
