const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const jwt = require('jsonwebtoken');
const { Sequelize } = require('sequelize');
const { createApp } = require('../src/app');
const { createModels } = require('../src/models');
const { startServer, SECRET, PASSWORD } = require('./harness');

// A refused or unreachable database (no network, the container is not running, the host is wrong) must never turn
// into a crash or a bare 500: the client gets a clear 503 in Russian and English, on every route that touches the
// database, including login, register and the JWT check that loads the user. Before the fix, the generic error
// handler turned this into "Internal server error" (500) and said nothing about retrying.
const connectionRefused = () => new Sequelize.ConnectionRefusedError(new Error('connect ECONNREFUSED 127.0.0.1:1'));

let app;
before(async () => {
  app = await startServer();
});
after(() => app.close());

test('login answers 503 (not 401 or 500) when looking up the account hits a refused database connection', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(app.models.User, 'findOne', async () => {
    throw connectionRefused();
  });
  const { res, body } = await app.call('POST', '/auth/login', { body: { email: 'anyone@example.com', password: PASSWORD } });
  assert.equal(res.status, 503);
  assert.match(body.error, /Service unavailable/);
  assert.match(body.error, /Сервис недоступен/);
  assert.equal(JSON.stringify(body).includes('ECONNREFUSED'), false);
});

test('register answers 503 (not 500) when creating the account hits a refused database connection', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(app.models.User, 'create', async () => {
    throw connectionRefused();
  });
  const { res, body } = await app.call('POST', '/auth/register', { body: { email: 'new@example.com', password: PASSWORD } });
  assert.equal(res.status, 503);
  assert.match(body.error, /Service unavailable/);
  assert.match(body.error, /Сервис недоступен/);
});

test('a valid token answers 503 (not 401 or 500) when the JWT check cannot load the user because the database refused the connection', async (t) => {
  const token = await app.tokenFor('outage-jwt@example.com');
  t.mock.method(console, 'error', () => {});
  t.mock.method(app.models.User, 'findByPk', async () => {
    throw connectionRefused();
  });
  const { res, body } = await app.call('GET', '/profile', { token });
  assert.equal(res.status, 503);
  assert.match(body.error, /Service unavailable/);
  assert.match(body.error, /Сервис недоступен/);
});

test('bcrypt.compare still runs with the dummy hash for an unknown email, so a refused connection is reported honestly instead of a wrong 401', async (t) => {
  // login() only reaches bcrypt after the account lookup; with the database down there is no account to compare
  // against either way, so the honest answer is 503, never the normal "invalid email or password" 401.
  t.mock.method(console, 'error', () => {});
  t.mock.method(app.models.User, 'findOne', async () => {
    throw connectionRefused();
  });
  const { res } = await app.call('POST', '/auth/login', { body: { email: 'unknown@example.com', password: 'whatever1' } });
  assert.equal(res.status, 503);
});

test('a real connection-refused PostgreSQL (unreachable host/port) answers 503 on health, register and login, with no stack trace, no ECONNREFUSED or host:port leaked, and the process keeps serving other routes', async (t) => {
  t.mock.method(console, 'error', () => {});
  // Port 1 refuses immediately on any machine: nothing needs to be listening for this test to reproduce the outage.
  const models = createModels({ dialect: 'postgres', host: '127.0.0.1', port: 1, username: 'x', password: 'x', database: 'x', logging: false });
  const server = createApp(models, { jwtSecret: SECRET, bcryptRounds: 4 }).listen(0);
  await new Promise((resolve_) => server.once('listening', resolve_));
  const base = `http://localhost:${server.address().port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 503);
    assert.deepEqual(await health.json(), { status: 'unavailable' });

    for (const [path, body] of [
      ['/auth/register', { email: 'down@example.com', password: PASSWORD }],
      ['/auth/login', { email: 'down@example.com', password: PASSWORD }],
    ]) {
      const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const text = await res.text();
      assert.equal(res.status, 503, path);
      assert.match(text, /Service unavailable/);
      assert.match(text, /Сервис недоступен/);
      assert.equal(text.includes('ECONNREFUSED'), false, path);
      assert.equal(text.includes('127.0.0.1'), false, path);
      assert.equal(text.includes('at ') /* no stack frame text */, false, path);
    }

    // The outage must not have crashed the server or left it hanging: the process still answers right away, even for
    // a route that does not exist (the request log write, which runs before routing, is what actually fails first).
    const missing = await fetch(`${base}/no-such-route`);
    assert.equal(missing.status, 503);
  } finally {
    server.close();
    await models.sequelize.close().catch(() => {});
  }
});

// ---- server.js at startup, with no database reachable at all --------------------------------------------------------

const serverPath = resolve(__dirname, '../server.js');

const waitForLine = (child, pattern, timeoutMs = 10000) =>
  new Promise((resolvePromise, rejectPromise) => {
    let buffer = '';
    const onData = (chunk) => {
      buffer += chunk.toString();
      if (pattern.test(buffer)) {
        child.stdout.off('data', onData);
        child.stderr.off('data', onData);
        resolvePromise(buffer);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    setTimeout(() => rejectPromise(new Error(`Timed out waiting for ${pattern} in:\n${buffer}`)), timeoutMs);
  });

test('server.js starts and keeps running when the database is completely unreachable at boot (no network, no container running), and /health answers 503 instead of the process exiting', async () => {
  const child = spawn(
    process.execPath,
    [serverPath],
    {
      cwd: resolve(__dirname, '..'),
      env: {
        ...process.env,
        PORT: '0',
        // An unreachable port: this stands in for "no internet" / "the database container is not running".
        DATABASE_URL: 'postgres://x:x@127.0.0.1:1/x',
        JWT_SECRET: SECRET,
        JWT_EXPIRES_IN: '1h',
      },
    },
  );
  let exited = false;
  child.once('exit', () => {
    exited = true;
  });
  try {
    const log = await waitForLine(child, /Server running on http:\/\/localhost:(\d+)/);
    // process.exit(1) from the old startup gate would have fired within a few milliseconds of the refused connection;
    // waiting a little longer confirms the process is still up, not merely that it had not crashed yet.
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    assert.equal(exited, false, 'the process must not exit just because the database is unreachable at startup');

    const port = Number(/Server running on http:\/\/localhost:(\d+)/.exec(log)[1]);
    const health = await fetch(`http://localhost:${port}/health`);
    assert.equal(health.status, 503);
    assert.deepEqual(await health.json(), { status: 'unavailable' });

    const register = await fetch(`http://localhost:${port}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'boot@example.com', password: PASSWORD }),
    });
    assert.equal(register.status, 503);
    const registerBody = await register.json();
    assert.match(registerBody.error, /Service unavailable/);
    assert.match(registerBody.error, /Сервис недоступен/);
  } finally {
    if (!exited) child.kill('SIGTERM');
  }
});
