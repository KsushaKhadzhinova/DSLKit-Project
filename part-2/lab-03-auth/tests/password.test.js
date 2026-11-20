const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, PASSWORD } = require('./harness');
const { sha256 } = require('../src/security/crypto-box');
const { createMailer } = require('../src/mailer');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

let app;
const NEW = 'a brand new phrase 7';
const creds = (email, password = PASSWORD) => ({ body: { email, password } });
const login = async (email, password = PASSWORD) => (await app.call('POST', '/auth/login', creds(email, password))).body;
const resetTokenFrom = (message) => /: (\S+)\n/.exec(message.text)[1];

before(async () => {
  app = await startServer({ loginMaxAttempts: 5 });
});
after(() => app.close());

test('registration applies the password policy: common passwords, the email and repeated characters are refused', async () => {
  const cases = [
    ['pol1@example.com', 'password123', /too common/],
    ['pol2@example.com', 'Qwerty123', /too common/],
    ['pol3@example.com', 'pol3@example.com', /same as the email/],
    ['pol4@example.com', 'zzzzzzzzzz', /different characters/],
  ];
  for (const [email, password, pattern] of cases) {
    const { res, body } = await app.call('POST', '/auth/register', creds(email, password));
    assert.equal(res.status, 400, password);
    assert.match(body.details[0].message, pattern);
  }
  assert.equal((await app.call('POST', '/auth/register', creds('pol5@example.com'))).res.status, 201);
});

test('change-password needs a token, the current password and a policy-compliant new one', async () => {
  await app.call('POST', '/auth/register', creds('cp1@example.com'));
  const { token } = await login('cp1@example.com');
  assert.equal((await app.call('POST', '/auth/change-password', { body: { currentPassword: PASSWORD, newPassword: NEW } })).res.status, 401);
  const cases = [
    [{ currentPassword: PASSWORD }, 400],
    [{ currentPassword: PASSWORD, newPassword: 'short' }, 400],
    [{ currentPassword: PASSWORD, newPassword: 'password123' }, 400],
    [{ currentPassword: PASSWORD, newPassword: 'cp1@example.com' }, 400],
    [{ currentPassword: PASSWORD, newPassword: PASSWORD }, 400],
    [{ newPassword: NEW }, 400],
    [{ currentPassword: 'wrong password', newPassword: NEW }, 401],
  ];
  for (const [body, status] of cases) assert.equal((await app.call('POST', '/auth/change-password', { token, body })).res.status, status, JSON.stringify(body));
  assert.equal((await app.call('POST', '/auth/change-password', { token, body: { currentPassword: PASSWORD, newPassword: NEW } })).res.status, 204);
  assert.equal((await app.call('POST', '/auth/login', creds('cp1@example.com'))).res.status, 401);
  assert.equal((await app.call('POST', '/auth/login', creds('cp1@example.com', NEW))).res.status, 200);
});

test('change-password revokes the other sessions and keeps the current one', async () => {
  await app.call('POST', '/auth/register', creds('cp2@example.com'));
  const here = await login('cp2@example.com');
  const there = await login('cp2@example.com');
  assert.equal((await app.call('POST', '/auth/change-password', { token: here.token, body: { currentPassword: PASSWORD, newPassword: NEW } })).res.status, 204);
  assert.equal((await app.call('GET', '/profile', { token: here.token })).res.status, 200);
  assert.equal((await app.call('POST', '/auth/refresh', { body: { refreshToken: here.refreshToken } })).res.status, 200);
  assert.equal((await app.call('GET', '/profile', { token: there.token })).res.status, 401);
  assert.equal((await app.call('POST', '/auth/refresh', { body: { refreshToken: there.refreshToken } })).res.status, 401);
});

test('change-password counts wrong current passwords and locks after five', async () => {
  await app.call('POST', '/auth/register', creds('cp3@example.com'));
  const { token } = await login('cp3@example.com');
  for (let i = 0; i < 5; i += 1) assert.equal((await app.call('POST', '/auth/change-password', { token, body: { currentPassword: 'wrong password', newPassword: NEW } })).res.status, 401);
  const locked = await app.call('POST', '/auth/change-password', { token, body: { currentPassword: PASSWORD, newPassword: NEW } });
  assert.equal(locked.res.status, 429);
  const user = await app.models.User.findOne({ where: { email: 'cp3@example.com' } });
  assert.ok(await app.models.AuditEvent.findOne({ where: { type: 'account_locked', userId: user.id } }));
});

test('a reset request answers the same 202 for a known and an unknown address and returns no token', async () => {
  await app.call('POST', '/auth/register', creds('pr1@example.com'));
  const before = app.outbox.length;
  const known = await app.call('POST', '/auth/password-reset/request', { body: { email: 'PR1@example.com' } });
  const unknown = await app.call('POST', '/auth/password-reset/request', { body: { email: 'nobody-here@example.com' } });
  assert.equal(known.res.status, 202);
  assert.equal(unknown.res.status, 202);
  assert.deepEqual(known.body, unknown.body);
  assert.equal(app.outbox.length, before + 1, 'only the known address got a message');
  assert.equal(app.outbox.at(-1).to, 'pr1@example.com');
  assert.equal(JSON.stringify(known.body).includes(resetTokenFrom(app.outbox.at(-1))), false);
  assert.deepEqual([...known.res.headers.keys()].filter((k) => k.startsWith('x-')).sort(), [...unknown.res.headers.keys()].filter((k) => k.startsWith('x-')).sort());
  for (const body of [{}, { email: 5 }, { email: 'not-an-email' }]) assert.equal((await app.call('POST', '/auth/password-reset/request', { body })).res.status, 400, JSON.stringify(body));
});

test('the reset token is stored hashed, expires, works once and sets the new password', async () => {
  await app.call('POST', '/auth/register', creds('pr2@example.com'));
  await app.call('POST', '/auth/password-reset/request', { body: { email: 'pr2@example.com' } });
  const token = resetTokenFrom(app.outbox.at(-1));
  const user = await app.models.User.findOne({ where: { email: 'pr2@example.com' } });
  const row = await app.models.PasswordReset.findOne({ where: { userId: user.id } });
  assert.equal(row.tokenHash, sha256(token));
  assert.ok(row.expiresAt.getTime() - Date.now() <= 30 * 60 * 1000 + 1000);
  const session = await login('pr2@example.com');
  assert.equal((await app.call('POST', '/auth/password-reset/confirm', { body: { token, newPassword: 'password123' } })).res.status, 400, 'the policy applies');
  assert.equal((await app.call('POST', '/auth/password-reset/confirm', { body: { token, newPassword: NEW } })).res.status, 204);
  assert.equal((await app.call('POST', '/auth/password-reset/confirm', { body: { token, newPassword: 'another phrase 99' } })).res.status, 400, 'used once');
  assert.equal((await app.call('POST', '/auth/login', creds('pr2@example.com'))).res.status, 401);
  assert.equal((await app.call('POST', '/auth/login', creds('pr2@example.com', NEW))).res.status, 200);
  assert.equal((await app.call('GET', '/profile', { token: session.token })).res.status, 401, 'old sessions are revoked');
});

test('an expired, unknown or malformed reset token gives one 400', async () => {
  await app.call('POST', '/auth/register', creds('pr3@example.com'));
  await app.call('POST', '/auth/password-reset/request', { body: { email: 'pr3@example.com' } });
  const token = resetTokenFrom(app.outbox.at(-1));
  await app.models.PasswordReset.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { tokenHash: sha256(token) } });
  const answers = [];
  for (const candidate of [token, 'unknown-token-value', 'x']) {
    const { res, body } = await app.call('POST', '/auth/password-reset/confirm', { body: { token: candidate, newPassword: NEW } });
    assert.equal(res.status, 400);
    answers.push(body);
  }
  assert.deepEqual(answers[0], answers[1]);
  for (const body of [{}, { token: 5 }, []]) assert.equal((await app.call('POST', '/auth/password-reset/confirm', { body })).res.status, 400);
});

test('a new request does not pile up tokens: within a minute it is throttled, and a second token cancels the first on use', async () => {
  await app.call('POST', '/auth/register', creds('pr4@example.com'));
  const before = app.outbox.length;
  await app.call('POST', '/auth/password-reset/request', { body: { email: 'pr4@example.com' } });
  await app.call('POST', '/auth/password-reset/request', { body: { email: 'pr4@example.com' } });
  assert.equal(app.outbox.length, before + 1);
  const user = await app.models.User.findOne({ where: { email: 'pr4@example.com' } });
  await app.models.PasswordReset.update({ createdAt: new Date(Date.now() - 120000) }, { where: { userId: user.id } });
  await app.call('POST', '/auth/password-reset/request', { body: { email: 'pr4@example.com' } });
  assert.equal(app.outbox.length, before + 2);
  const [first, second] = [app.outbox.at(-2), app.outbox.at(-1)].map(resetTokenFrom);
  assert.equal((await app.call('POST', '/auth/password-reset/confirm', { body: { token: second, newPassword: NEW } })).res.status, 204);
  assert.equal((await app.call('POST', '/auth/password-reset/confirm', { body: { token: first, newPassword: 'another phrase 99' } })).res.status, 400);
});

test('a reset lifts the login lock of the account', async () => {
  const strict = await startServer({ loginMaxAttempts: 2 });
  try {
    await strict.call('POST', '/auth/register', creds('pr5@example.com'));
    for (let i = 0; i < 2; i += 1) await strict.call('POST', '/auth/login', creds('pr5@example.com', 'wrong password'));
    assert.equal((await strict.call('POST', '/auth/login', creds('pr5@example.com'))).res.status, 429);
    await strict.call('POST', '/auth/password-reset/request', { body: { email: 'pr5@example.com' } });
    const token = resetTokenFrom(strict.outbox.at(-1));
    assert.equal((await strict.call('POST', '/auth/password-reset/confirm', { body: { token, newPassword: NEW } })).res.status, 204);
    assert.equal((await strict.call('POST', '/auth/login', creds('pr5@example.com', NEW))).res.status, 200);
  } finally {
    await strict.close();
  }
});

test('reset requests are rate limited per address and write an audit event without the token', async () => {
  const limited = await startServer({ resetRateMax: 3 });
  try {
    const statuses = [];
    for (let i = 0; i < 5; i += 1) statuses.push((await limited.call('POST', '/auth/password-reset/request', { body: { email: `x${i}@example.com` } })).res.status);
    assert.deepEqual(statuses, [202, 202, 202, 429, 429]);
  } finally {
    await limited.close();
  }
  const events = await app.models.AuditEvent.findAll({ where: { type: 'password_reset_requested' } });
  assert.ok(events.length > 0);
  assert.equal(JSON.stringify(events).includes(resetTokenFrom(app.outbox.at(-1))), false);
});

test('the mailer writes to an outbox file, to the console in development and says nothing about the link in production', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dslkit-mail-'));
  try {
    const file = join(dir, 'outbox.jsonl');
    await createMailer({ outboxFile: file })({ to: 'a@b.co', subject: 'Hi', text: 'secret-link' });
    await createMailer({ outboxFile: file })({ to: 'c@d.co', subject: 'Again', text: 'x' });
    const lines = readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    assert.deepEqual(lines.map((l) => l.to), ['a@b.co', 'c@d.co']);
    assert.equal(lines[0].text, 'secret-link');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const logged = [];
  const original = { log: console.log, warn: console.warn };
  console.log = (...args) => logged.push(args.join(' '));
  console.warn = (...args) => logged.push(args.join(' '));
  try {
    await createMailer()({ to: 'a@b.co', subject: 'Dev', text: 'dev-link' });
    await createMailer({ production: true })({ to: 'a@b.co', subject: 'Prod', text: 'prod-link' });
  } finally {
    Object.assign(console, original);
  }
  assert.ok(logged[0].includes('dev-link'));
  assert.equal(logged[1].includes('prod-link'), false);
});
