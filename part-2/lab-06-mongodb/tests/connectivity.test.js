const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { connect, disconnect } = require('../src/db');

// Scenario: MongoDB is genuinely unreachable (wrong host or port, connection refused).
// Mongoose must not hang forever (bufferCommands/the default driver timeout), the error
// must be a plain message without a stack trace, and the process must stay alive.

test('db.connect() to an unreachable host rejects quickly with a plain message, not a hang or a stack trace', async () => {
  const started = Date.now();
  await assert.rejects(
    () => connect('mongodb://127.0.0.1:1/does-not-exist'),
    (error) => {
      assert.ok(error instanceof Error);
      assert.ok(!/\n\s*at /.test(error.message), `message looks like a stack trace: ${error.message}`);
      return true;
    },
  );
  const elapsed = Date.now() - started;
  // serverSelectionTimeoutMS is 5000; give generous slack for a slow machine, but it must not hang indefinitely.
  assert.ok(elapsed < 9000, `connect() took ${elapsed}ms to fail, too close to or past a hang`);
  await disconnect().catch(() => {});
});

// Spawns the real server.js process against an unreachable database, the way a reviewer would when
// the database is simply not running. The health check must answer right away, every other route must
// answer a clean 503, and the process must still be alive after at least one retry cycle.
const waitForHealth = async (base, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/health`);
      return res;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error('server never started listening');
};

test('server.js survives an unreachable MongoDB: health and API routes answer 503 cleanly, the process never exits', async (t) => {
  const port = 39120 + (process.pid % 300);
  const cwd = path.join(__dirname, '..');
  const child = spawn(process.execPath, ['server.js'], {
    cwd,
    env: { ...process.env, PORT: String(port), MONGODB_URI: 'mongodb://127.0.0.1:1/does-not-exist', MONGO_URI: '' },
  });
  let exited = null;
  child.on('exit', (code, signal) => {
    exited = { code, signal };
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  t.after(() => {
    if (exited === null) child.kill();
  });

  const base = `http://127.0.0.1:${port}`;
  const health = await waitForHealth(base, 15000);
  assert.equal(health.status, 503);
  assert.deepEqual(await health.json(), { status: 'unavailable' });

  const diagrams = await fetch(`${base}/diagrams`);
  assert.equal(diagrams.status, 503);
  const body = await diagrams.json();
  assert.deepEqual(Object.keys(body), ['error']);
  assert.ok(!/mongo|econn|\.js:\d|node_modules|\n\s*at /i.test(JSON.stringify(body)), `leaked internals: ${JSON.stringify(body)}`);
  assert.equal(exited, null, 'the process exited while the database was unreachable');

  // Wait past the 5 s retry interval: the server must still answer, not crash on the retried attempt.
  await new Promise((resolve) => setTimeout(resolve, 6000));
  assert.equal(exited, null, `the process exited during a retry: ${JSON.stringify(exited)}`);
  const stillUp = await fetch(`${base}/health`);
  assert.equal(stillUp.status, 503);

  // The retry failure is logged as a plain message server-side, never as an unhandled exception.
  assert.ok(!/UnhandledPromiseRejection|uncaught exception/i.test(stderr), stderr);

  child.kill();
});
