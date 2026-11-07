const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, PASSWORD } = require('./harness');

// Oversized values (a very long email, a very long password, a request far above the body limit) and values built
// to make a naive email/password regex backtrack catastrophically must all answer quickly with 400/413/401, never
// hang the event loop and never overflow. A hang here would stall the whole server, not just this request, so every
// case is timed and must finish well under a second even though the limit is generous.
const HANG_BUDGET_MS = 3000;

let app;
before(async () => {
  app = await startServer();
});
after(() => app.close());

const timed = async (fn) => {
  const start = Date.now();
  const result = await fn();
  return { ...result, ms: Date.now() - start };
};

test('a password built to make a naive "trailing spaces" or similar regex backtrack answers fast, not a hang', async () => {
  // 'a' * 40000 + one non-matching character defeats a (a+)+-style catastrophic backtracking pattern in O(2^n);
  // the real password check (type/empty/length/byte-length) is linear, so this must still return almost at once.
  const evil = `${'a'.repeat(40000)}!`;
  const { res, ms } = await timed(() => app.call('POST', '/auth/login', { body: { email: 'evil@example.com', password: evil } }));
  assert.ok(ms < HANG_BUDGET_MS, `took ${ms}ms`);
  assert.equal(res.status, 401);
});

test('an email built the same way (long run of a word character with no @ and no dot) is rejected fast by length alone', async () => {
  const evil = `${'a'.repeat(90000)}`;
  for (const path of ['/auth/register', '/auth/login']) {
    const { res, body, ms } = await timed(() => app.call('POST', path, { body: { email: evil, password: PASSWORD } }));
    assert.ok(ms < HANG_BUDGET_MS, `${path} took ${ms}ms`);
    assert.ok(res.status === 400 || res.status === 401, `${path}: ${res.status}`);
    assert.equal(typeof body.error, 'string');
  }
});

test('an email that passes the length check but is built to defeat backtracking (many a@a segments, no final dot) is rejected fast', async () => {
  // Stays under the 254-character limit, so it reaches the EMAIL regex; the regex has no nested quantifiers,
  // so even a string crafted to maximize backtracking in a vulnerable pattern runs in linear time here.
  const evil = `${'a@'.repeat(100)}a`;
  const { res, ms } = await timed(() => app.call('POST', '/auth/register', { body: { email: evil, password: PASSWORD } }));
  assert.ok(ms < HANG_BUDGET_MS, `took ${ms}ms`);
  assert.equal(res.status, 400);
});

test('a request body far above the configured limit answers 413 quickly on auth routes too, not a hang or a crash', async () => {
  const huge = 'x'.repeat(2 * 1024 * 1024); // 2 MB, well above the 100kb limit
  const { res, ms } = await timed(() => app.call('POST', '/auth/register', { body: { email: 'big@example.com', password: huge } }));
  assert.ok(ms < HANG_BUDGET_MS, `took ${ms}ms`);
  assert.equal(res.status, 413);
  // The health check and an ordinary request must still work right after: the process did not choke on the huge body.
  assert.equal((await app.call('GET', '/health')).res.status, 200);
});

test('huge numbers sent instead of strings for email or password are rejected by type, never coerced or hashed', async () => {
  const cases = ['1e309', '9'.repeat(400), '-1'];
  for (const raw of cases) {
    const body = `{"email":${raw},"password":"${PASSWORD}"}`;
    const { res, ms } = await timed(() => app.call('POST', '/auth/login', { raw: body, headers: { 'Content-Type': 'application/json' } }));
    assert.ok(ms < HANG_BUDGET_MS, `took ${ms}ms`);
    assert.equal(res.status, 400, raw);
  }
  for (const raw of cases) {
    const body = `{"email":"n@example.com","password":${raw}}`;
    const { res, ms } = await timed(() => app.call('POST', '/auth/login', { raw: body, headers: { 'Content-Type': 'application/json' } }));
    assert.ok(ms < HANG_BUDGET_MS, `took ${ms}ms`);
    assert.equal(res.status, 400, raw);
  }
});

test('a role value that is a huge number answers 400 fast and the role is unaffected', async () => {
  const admin = await app.tokenFor('large-input-admin@example.com', 'admin');
  const target = await app.tokenFor('large-input-target@example.com');
  const targetId = (await app.models.User.findOne({ where: { email: 'large-input-target@example.com' } })).id;
  const { res, ms } = await timed(() => app.call('PATCH', `/users/${targetId}/role`, { token: admin, body: { role: 1e308 } }));
  assert.ok(ms < HANG_BUDGET_MS, `took ${ms}ms`);
  assert.equal(res.status, 400);
  assert.equal((await app.models.User.findByPk(targetId)).role, 'user');
  assert.ok(target);
});
