const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { checkJwtSettings, lifetimeSeconds } = require('../src/settings');
const { createRateLimiter, createLoginGuard } = require('./../src/middleware/rate-limit');
const { startServer, SECRET, PASSWORD } = require('./harness');

const creds = (email, password = PASSWORD) => ({ body: { email, password } });
const pause = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

let app;
before(async () => {
  app = await startServer();
});
after(() => app.close());

// ---- token settings -------------------------------------------------------------------------------------------------

test('the JWT secret must be long and not a repeated pattern, the lifetime short and well formed', () => {
  assert.throws(() => checkJwtSettings({ jwtExpiresIn: '1h' }), /jwtSecret is required/);
  assert.throws(() => checkJwtSettings({ jwtSecret: 'short', jwtExpiresIn: '1h' }), /at least 32/);
  assert.throws(() => checkJwtSettings({ jwtSecret: 'a'.repeat(64), jwtExpiresIn: '1h' }), /not a repeated pattern/);
  assert.throws(() => checkJwtSettings({ jwtSecret: 'abababab'.repeat(8), jwtExpiresIn: '1h' }), /not a repeated pattern/);
  for (const bad of ['', 'abc', '0', '-5', '1y', '25h', '2d', 0, NaN, '1.5h', undefined]) {
    assert.throws(() => checkJwtSettings({ jwtSecret: SECRET, jwtExpiresIn: bad }), /jwtExpiresIn/, String(bad));
  }
  for (const [good, seconds] of [['15m', 900], ['1h', 3600], ['24h', 86400], ['1d', 86400], [3600, 3600], ['90', 90], ['30s', 30]]) {
    assert.equal(checkJwtSettings({ jwtSecret: SECRET, jwtExpiresIn: good }), seconds, String(good));
  }
  assert.equal(lifetimeSeconds('nonsense'), NaN);
});

test('createApp applies the same checks, so a weak setup cannot start the server', () => {
  assert.throws(() => createApp(app.models, { jwtSecret: 'too short' }), /at least 32/);
  assert.throws(() => createApp(app.models, { jwtSecret: SECRET, jwtExpiresIn: '30d' }), /jwtExpiresIn/);
});

test('the token is HS256, carries issuer, subject and an expiry, and no password data', async () => {
  const { body } = await app.call('POST', '/auth/register', creds('tok@example.com'));
  const login = await app.call('POST', '/auth/login', creds('tok@example.com'));
  const [header, payload] = login.body.token.split('.').slice(0, 2).map((part) => JSON.parse(Buffer.from(part, 'base64url')));
  assert.deepEqual(header, { alg: 'HS256', typ: 'JWT' });
  assert.equal(payload.iss, 'dslkit');
  assert.equal(payload.sub, String(body.id));
  assert.equal(payload.exp - payload.iat, 3600);
  assert.deepEqual(Object.keys(payload).sort(), ['email', 'exp', 'iat', 'id', 'iss', 'role', 'sub']);
});

test('a token signed with the right secret but without the issuer is refused', async () => {
  const forged = jwt.sign({ id: 1, role: 'admin' }, SECRET, { expiresIn: '1h' });
  const { res, body } = await app.call('GET', '/profile', { token: forged });
  assert.equal(res.status, 401);
  assert.equal(body.error, 'Invalid token');
});

// ---- the password hash never leaves the server -------------------------------------------------------------------------

test('no response ever contains the password hash, even when a User is serialized directly', async () => {
  const admin = await app.tokenFor('hash-admin@example.com', 'admin');
  const user = await app.models.User.findOne({ where: { email: 'hash-admin@example.com' } });
  assert.equal(JSON.stringify(user).includes('passwordHash'), false);
  assert.equal(JSON.stringify(user).includes('$2'), false);
  for (const [method, path, options] of [
    ['GET', '/profile', { token: admin }],
    ['GET', '/users', { token: admin }],
    ['POST', '/auth/register', creds('hash-new@example.com')],
    ['POST', '/auth/register', creds('hash-new@example.com')],
    ['POST', '/auth/login', creds('hash-new@example.com')],
    ['GET', '/diagrams', { token: admin }],
  ]) {
    const res = await fetch(`http://localhost:${app.port}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(options.token && { Authorization: `Bearer ${options.token}` }) },
      body: options.body && JSON.stringify(options.body),
    });
    const text = await res.text();
    assert.equal(/passwordHash|\$2[aby]\$/.test(text), false, `${method} ${path}`);
  }
});

// ---- passwords and bad input --------------------------------------------------------------------------------------------

test('a password of only spaces is refused at registration and login', async () => {
  const register = await app.call('POST', '/auth/register', creds('blank@example.com', '          '));
  assert.equal(register.res.status, 400);
  assert.match(register.body.details[0].message, /only spaces/);
  assert.equal((await app.call('POST', '/auth/login', creds('blank@example.com', '   '))).res.status, 400);
  assert.equal((await app.call('POST', '/auth/login', creds('   ', PASSWORD))).res.status, 400);
});

test('a login with an over-long email or password gets the usual 401 without hashing', async () => {
  const long = await app.call('POST', '/auth/login', creds(`${'x'.repeat(300)}@example.com`));
  const wrong = await app.call('POST', '/auth/login', creds('nobody@example.com'));
  assert.equal(long.res.status, 401);
  assert.deepEqual(long.body, wrong.body);
  assert.equal((await app.call('POST', '/auth/login', creds('nobody@example.com', 'p'.repeat(5000)))).res.status, 401);
});

test('an over-long email is refused at registration', async () => {
  const { res, body } = await app.call('POST', '/auth/register', creds(`${'x'.repeat(250)}@example.com`));
  assert.equal(res.status, 400);
  assert.equal(body.details[0].field, 'email');
});

// ---- role changes act on old tokens ---------------------------------------------------------------------------------------

test('demoting an administrator takes effect at once for the token issued while they were admin', async () => {
  const boss = await app.tokenFor('boss@example.com', 'admin');
  const other = await app.tokenFor('other-admin@example.com', 'admin');
  assert.equal((await app.call('GET', '/users', { token: boss })).res.status, 200);
  const target = await app.models.User.findOne({ where: { email: 'boss@example.com' } });
  const { res } = await app.call('PATCH', `/users/${target.id}/role`, { token: other, body: { role: 'user' } });
  assert.equal(res.status, 200);
  const payload = jwt.decode(boss);
  assert.equal(payload.role, 'admin');
  assert.equal((await app.call('GET', '/users', { token: boss })).res.status, 403);
  assert.equal((await app.call('PATCH', `/users/${target.id}/role`, { token: boss, body: { role: 'admin' } })).res.status, 403);
  assert.equal((await app.call('GET', '/profile', { token: boss })).body.role, 'user');
});

test('a user cannot raise their own role through the body of any request', async () => {
  const token = await app.tokenFor('sneaky@example.com');
  const me = await app.models.User.findOne({ where: { email: 'sneaky@example.com' } });
  assert.equal((await app.call('PATCH', `/users/${me.id}/role`, { token, body: { role: 'admin' } })).res.status, 403);
  assert.equal((await app.call('POST', '/diagrams', { token, body: { title: 't', notation: 'UML', sourceCode: 's', ownerId: 1, role: 'admin' } })).body.ownerId, me.id);
  assert.equal((await app.models.User.findByPk(me.id)).role, 'user');
});

// ---- protocol details ---------------------------------------------------------------------------------------------------

test('auth routes answer 405 with Allow for other methods and 415 for a body that is not JSON', async () => {
  for (const [method, path, allow] of [
    ['GET', '/auth/login', 'POST, OPTIONS'],
    ['PUT', '/auth/register', 'POST, OPTIONS'],
    ['POST', '/profile', 'GET, HEAD, OPTIONS'],
    ['DELETE', '/users', 'GET, HEAD, OPTIONS'],
    ['GET', '/users/1', 'DELETE, OPTIONS'],
    ['PUT', '/users/1/role', 'PATCH, OPTIONS'],
  ]) {
    const { res } = await app.call(method, path, { body: {} });
    assert.equal(res.status, 405, `${method} ${path}`);
    assert.equal(res.headers.get('allow'), allow);
  }
  const res = await app.call('POST', '/auth/login', { raw: 'email=a&password=b', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.equal(res.res.status, 415);
  assert.equal(res.res.headers.get('content-type').startsWith('application/json'), true);
});

test('OPTIONS needs no token and HEAD behaves like GET', async () => {
  const options = await fetch(`http://localhost:${app.port}/diagrams`, { method: 'OPTIONS' });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('allow'), 'GET, POST, HEAD, OPTIONS');
  const token = await app.tokenFor('head@example.com');
  const head = await fetch(`http://localhost:${app.port}/profile`, { method: 'HEAD', headers: { Authorization: `Bearer ${token}` } });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal((await fetch(`http://localhost:${app.port}/profile`, { method: 'HEAD' })).status, 401);
});

test('PUT of the same diagram twice is idempotent, POST twice creates two', async () => {
  const token = await app.tokenFor('idem@example.com');
  const diagram = { title: 'T', notation: 'UML', sourceCode: 's', priority: 'low' };
  const a = await app.call('POST', '/diagrams', { token, body: diagram });
  const b = await app.call('POST', '/diagrams', { token, body: diagram });
  assert.notEqual(a.body.id, b.body.id);
  const first = await app.call('PUT', `/diagrams/${a.body.id}`, { token, body: diagram });
  const second = await app.call('PUT', `/diagrams/${a.body.id}`, { token, body: diagram });
  assert.deepEqual({ ...first.body, updatedAt: 0 }, { ...second.body, updatedAt: 0 });
});

test('whitespace-only and over-long texts are rejected, titles are trimmed', async () => {
  const token = await app.tokenFor('limits@example.com');
  const valid = { title: 'T', notation: 'UML', sourceCode: 's' };
  for (const blank of ['', '  ', '\t\n', ' ']) {
    const { res, body } = await app.call('POST', '/diagrams', { token, body: { ...valid, title: blank, sourceCode: blank } });
    assert.equal(res.status, 400, JSON.stringify(blank));
    assert.deepEqual(
      body.details.map((d) => d.field),
      ['title', 'sourceCode'],
    );
  }
  assert.equal((await app.call('POST', '/diagrams', { token, body: { ...valid, title: 'x'.repeat(81) } })).res.status, 400);
  assert.equal((await app.call('POST', '/diagrams', { token, body: { ...valid, title: `  ${'x'.repeat(80)}  ` } })).body.title.length, 80);
});

test('security headers are set on every answer, no framework banner, and token answers are never cached', async () => {
  for (const [method, path] of [
    ['GET', '/nothing'],
    ['GET', '/profile'],
    ['POST', '/auth/login'],
  ]) {
    const res = await fetch(`http://localhost:${app.port}${path}`, { method });
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
    assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('x-powered-by'), null);
  }
});

// ---- brute force --------------------------------------------------------------------------------------------------------

test('the rate limiter counts per client, answers 429 with Retry-After, and starts a new window later', () => {
  let time = 0;
  const limiter = createRateLimiter({ windowMs: 1000, max: 2, now: () => time });
  const hit = (ip) => {
    let outcome;
    limiter({ ip }, {}, (error) => (outcome = error));
    return outcome;
  };
  assert.equal(hit('a'), undefined);
  assert.equal(hit('a'), undefined);
  const blocked = hit('a');
  assert.equal(blocked.status, 429);
  assert.equal(blocked.retryAfter, 1);
  assert.equal(hit('b'), undefined);
  time = 1001;
  assert.equal(hit('a'), undefined);
});

test('the limiter and the login guard keep their memory bounded', () => {
  const limiter = createRateLimiter({ windowMs: 10 ** 9, max: 1 });
  for (let i = 0; i < 25000; i += 1) limiter({ ip: `ip-${i}` }, {}, () => {});
  const guard = createLoginGuard({ maxAttempts: 1, lockMs: 10 ** 9 });
  for (let i = 0; i < 25000; i += 1) guard.fail(`user${i}@example.com`);
  // The oldest entries were dropped, the newest are still locked.
  assert.equal(guard.retryAfter('user0@example.com'), 0);
  assert.ok(guard.retryAfter('user24999@example.com') > 0);
});

test('too many login requests from one address answer 429', async () => {
  const strict = await startServer({ loginRateMax: 3, registerRateMax: 2 });
  try {
    for (let i = 0; i < 3; i += 1) assert.equal((await strict.call('POST', '/auth/login', creds('x@example.com'))).res.status, 401);
    const blocked = await strict.call('POST', '/auth/login', creds('x@example.com'));
    assert.equal(blocked.res.status, 429);
    assert.ok(Number(blocked.res.headers.get('retry-after')) > 0);
    assert.equal(blocked.body.error, 'Too many requests, try again later');
    // Registration has its own counter.
    for (let i = 0; i < 2; i += 1) assert.equal((await strict.call('POST', '/auth/register', creds(`r${i}@example.com`))).res.status, 201);
    assert.equal((await strict.call('POST', '/auth/register', creds('r9@example.com'))).res.status, 429);
  } finally {
    await strict.close();
  }
});

test('repeated wrong passwords lock the email, even for the right password, and unknown emails lock the same way', async () => {
  const strict = await startServer({ loginMaxAttempts: 3, loginLockMs: 60000 });
  try {
    await strict.call('POST', '/auth/register', creds('victim@example.com'));
    for (const email of ['victim@example.com', 'ghost@example.com']) {
      for (let i = 0; i < 3; i += 1) assert.equal((await strict.call('POST', '/auth/login', creds(email, 'wrong password'))).res.status, 401);
    }
    const locked = await strict.call('POST', '/auth/login', creds('victim@example.com'));
    const ghost = await strict.call('POST', '/auth/login', creds('ghost@example.com'));
    assert.equal(locked.res.status, 429);
    assert.equal(ghost.res.status, 429);
    assert.deepEqual(locked.body, ghost.body);
    assert.ok(Number(locked.res.headers.get('retry-after')) > 50);
    // The case of the email does not give a second chance.
    assert.equal((await strict.call('POST', '/auth/login', creds('VICTIM@example.com'))).res.status, 429);
    // Another account is not affected.
    await strict.call('POST', '/auth/register', creds('friend@example.com'));
    assert.equal((await strict.call('POST', '/auth/login', creds('friend@example.com'))).res.status, 200);
  } finally {
    await strict.close();
  }
});

test('a successful login resets the failed attempts and a lock ends after its time', async () => {
  const strict = await startServer({ loginMaxAttempts: 3, loginLockMs: 400 });
  try {
    await strict.call('POST', '/auth/register', creds('reset@example.com'));
    for (let round = 0; round < 3; round += 1) {
      for (let i = 0; i < 2; i += 1) await strict.call('POST', '/auth/login', creds('reset@example.com', 'wrong password'));
      assert.equal((await strict.call('POST', '/auth/login', creds('reset@example.com'))).res.status, 200, `round ${round}`);
    }
    for (let i = 0; i < 3; i += 1) await strict.call('POST', '/auth/login', creds('reset@example.com', 'wrong password'));
    assert.equal((await strict.call('POST', '/auth/login', creds('reset@example.com'))).res.status, 429);
    await pause(500);
    assert.equal((await strict.call('POST', '/auth/login', creds('reset@example.com'))).res.status, 200);
  } finally {
    await strict.close();
  }
});

// ---- request log (even variant: a database table) ------------------------------------------------------------------------

test('requests are written to the RequestLog table without the query string or the token', async () => {
  await app.models.RequestLog.destroy({ where: {} });
  const token = await app.tokenFor('logger@example.com');
  await pause();
  await app.models.RequestLog.destroy({ where: {} });
  await app.call('GET', `/profile?access_token=${token}`, { token });
  await app.call('GET', '/nothing');
  await pause();
  const rows = await app.models.RequestLog.findAll({ order: [['id', 'ASC']] });
  assert.deepEqual(
    rows.map((r) => [r.method, r.path, r.status]),
    [
      ['GET', '/profile', 200],
      ['GET', '/nothing', 404],
    ],
  );
  assert.equal(JSON.stringify(rows).includes(token), false);
});

test('control characters in the path cannot forge a log line', async () => {
  await app.models.RequestLog.destroy({ where: {} });
  await fetch(`http://localhost:${app.port}/a%0d%0aGET%20/forged%0a`);
  await pause();
  const [row] = await app.models.RequestLog.findAll();
  assert.doesNotMatch(row.path, /[\r\n]/);
});

test('when the log cannot be written the client gets 500 without internals', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(app.models.RequestLog, 'create', async () => {
    throw new Error('disk is full');
  });
  const { res, body } = await app.call('GET', '/diagrams');
  assert.equal(res.status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
});

test('a database failure behind a valid token gives 500 without internals', async (t) => {
  const token = await app.tokenFor('failure@example.com');
  t.mock.method(console, 'error', () => {});
  t.mock.method(app.models.Diagram, 'findAll', async () => {
    throw new Error('connection lost: password=hunter2');
  });
  const { res, body } = await app.call('GET', '/diagrams', { token });
  assert.equal(res.status, 500);
  assert.equal(JSON.stringify(body).includes('hunter2'), false);
});
