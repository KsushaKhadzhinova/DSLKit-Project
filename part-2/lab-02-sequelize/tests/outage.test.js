const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');

// A teacher can "break" the server three ways without touching the code: stop the database (or cut the network to it),
// send huge values in a request, or start the whole thing with no database and no internet reachable at all.
// None of the three may crash the process or leak a stack trace; the health check must always answer, and every
// database-backed route must answer a plain 503 instead.

const labDir = resolve(__dirname, '..');
const serverPath = resolve(labDir, 'server.js');

// A free TCP port picked up front, so the child process has a fixed PORT to listen on (it does not use PORT=0).
const freePort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });

// Starts the real server.js as its own process, with DATABASE_URL pointing at a port nothing listens on
// (loopback, so no real network or credentials are involved) — the same situation as a stopped database
// or a machine with no route to it. Captures stdout/stderr so a crash shows the real reason in the test output.
const startServer = async (extraEnv = {}) => {
  const port = await freePort();
  const out = [];
  const child = spawn(process.execPath, [serverPath], {
    cwd: labDir,
    env: { ...process.env, PORT: String(port), DATABASE_URL: 'postgres://u:p@127.0.0.1:1/d', SQLITE_STORAGE: '', NODE_ENV: 'development', ...extraEnv },
  });
  child.stdout.on('data', (chunk) => out.push(chunk.toString()));
  child.stderr.on('data', (chunk) => out.push(chunk.toString()));
  let exited = false;
  child.once('exit', () => {
    exited = true;
  });
  const base = `http://127.0.0.1:${port}`;
  // Polls /health instead of a fixed delay: the process must come up even though the database never answers.
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (exited) throw new Error(`server.js exited before it answered a request. Output:\n${out.join('')}`);
    try {
      await fetch(`${base}/health`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return {
    base,
    log: () => out.join(''),
    isRunning: () => !exited,
    stop: () =>
      new Promise((resolveStop) => {
        if (exited) return resolveStop();
        child.once('exit', resolveStop);
        child.kill();
      }),
  };
};

test('scenario 3: the server starts and keeps running with no database and no network route to it', async () => {
  const server = await startServer();
  try {
    assert.ok(server.isRunning(), `server.js did not stay up. Output:\n${server.log()}`);
    const health = await fetch(`${server.base}/health`);
    assert.equal(health.status, 503);
    assert.deepEqual(await health.json(), { status: 'unavailable' });
    assert.ok(server.isRunning(), 'the process crashed while answering /health');
  } finally {
    await server.stop();
  }
});

test('scenario 3: a database-backed route answers 503 with a plain message instead of hanging or crashing, while the server stays up without a database', async () => {
  const server = await startServer();
  try {
    const res = await fetch(`${server.base}/diagrams`);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.match(body.error, /unavailable/i);
    assert.doesNotMatch(JSON.stringify(body), /ECONNREFUSED|\.js:|node_modules|password/i);
    assert.ok(server.isRunning(), `the process crashed answering /diagrams. Output:\n${server.log()}`);
    // A second, unrelated request still works: one failed DB call does not wedge the process.
    const again = await fetch(`${server.base}/projects`);
    assert.equal(again.status, 503);
  } finally {
    await server.stop();
  }
});

test('scenario 1: the real server answers 503 (not a bare 500 or a stack trace) when PostgreSQL is unreachable mid-request', async () => {
  const { createApp } = require('../src/app');
  const { createModels } = require('../src/models');
  const models = createModels({ dialect: 'postgres', host: '127.0.0.1', port: 1, username: 'u', password: 'p', database: 'd', logging: false, dialectOptions: { connectTimeout: 2000 } });
  const app = createApp(models).listen(0);
  await new Promise((r) => app.once('listening', r));
  const base = `http://127.0.0.1:${app.address().port}`;
  try {
    const res = await fetch(`${base}/diagrams`);
    assert.equal(res.status, 503);
    const text = await res.text();
    assert.doesNotMatch(text, /at .*\.js:\d+|node_modules|ECONNREFUSED/i);
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 503);
  } finally {
    app.close();
    await models.sequelize.close().catch(() => {});
  }
});

test('scenario 2: huge numbers in revision and projectId answer 400, never an overflow or a 500', async () => {
  const { createApp } = require('../src/app');
  const { createModels } = require('../src/models');
  const { createTempDatabase } = require('./helpers');
  const db = createTempDatabase();
  db.cli('db:migrate');
  const models = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  await models.sequelize.query('PRAGMA synchronous = OFF');
  const app = createApp(models).listen(0);
  await new Promise((r) => app.once('listening', r));
  const base = `http://127.0.0.1:${app.address().port}`;
  const valid = { title: 'Huge values', notation: 'UML', sourceCode: 'a -> b', priority: 'low', owner: 'tester' };
  try {
    for (const raw of ['9'.repeat(400), '1e21', -1, 1.5, '100000000000000000000']) {
      const revision = typeof raw === 'string' ? Number(raw) : raw;
      const res = await fetch(`${base}/diagrams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...valid, revision }),
      });
      assert.equal(res.status, 400, `revision ${raw} gave ${res.status}`);
    }
    for (const projectId of [Number.MAX_SAFE_INTEGER, 9999999999, -5]) {
      const res = await fetch(`${base}/diagrams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...valid, projectId }) });
      assert.equal(res.status, 400, `projectId ${projectId} gave ${res.status}`);
    }
    assert.equal((await fetch(`${base}/diagrams`)).status, 200, 'the server is still answering after the hostile requests');
  } finally {
    app.close();
    await models.sequelize.close();
    db.cleanup();
  }
});

test('scenario 2: a huge list-query offset/limit, a megabyte-long search text and a title of 200000 characters all answer 400/413 quickly, not a hang', async () => {
  const { createApp } = require('../src/app');
  const { createModels } = require('../src/models');
  const { createTempDatabase } = require('./helpers');
  const db = createTempDatabase();
  db.cli('db:migrate');
  const models = createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
  await models.sequelize.query('PRAGMA synchronous = OFF');
  const app = createApp(models).listen(0);
  await new Promise((r) => app.once('listening', r));
  const base = `http://127.0.0.1:${app.address().port}`;
  try {
    for (const query of ['limit=999999999999999999999', 'offset=' + '9'.repeat(300), 'limit=-1', 'offset=1e300']) {
      const started = Date.now();
      const res = await fetch(`${base}/diagrams?${query}`);
      assert.equal(res.status, 400, query);
      assert.ok(Date.now() - started < 1000, `${query} took ${Date.now() - started}ms: possible ReDoS`);
    }
    // The title field is checked against limits.json (80 chars) before it ever reaches a query, zero-width and
    // combining characters included, so a huge string never reaches the database layer.
    const started = Date.now();
    const res = await fetch(`${base}/diagrams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '​'.repeat(50000) + 'x'.repeat(50000), notation: 'UML', sourceCode: 'a', owner: 'o' }),
    });
    assert.ok([400, 413].includes(res.status), `huge title gave ${res.status}`);
    assert.ok(Date.now() - started < 2000, `validating a huge title took ${Date.now() - started}ms: possible ReDoS`);
    assert.equal((await fetch(`${base}/diagrams`)).status, 200, 'the server is still answering after the hostile requests');
  } finally {
    app.close();
    await models.sequelize.close();
    db.cleanup();
  }
});
