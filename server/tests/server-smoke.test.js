'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomSecret, strongPassword, uniqueEmail } = require('./helpers');

const entry = path.join(__dirname, '..', 'src', 'server.js');

function run(env) {
  const child = spawn(process.execPath, [entry], { env: { PATH: process.env.PATH, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
  return { child, exited, output: () => out };
}

async function waitFor(fn, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('timeout');
}

test('the real process starts on a file database, creates the first admin, serves logins and stops cleanly', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dslkit-smoke-'));
  const email = uniqueEmail('root');
  const password = strongPassword();
  const p = run({
    PORT: '0',
    DB_STORAGE: path.join(dir, 'nested', 'db.sqlite'),
    JWT_SECRET: randomSecret(),
    BCRYPT_ROUNDS: '4',
    ADMIN_EMAIL: email,
    ADMIN_PASSWORD: password,
  });
  try {
    const port = await waitFor(() => p.output().match(/listening on 127\.0\.0\.1:(\d+)/)?.[1]);
    assert.match(p.output(), /First administrator created/);
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).user.role, 'admin');
  } finally {
    p.child.kill('SIGTERM');
    await p.exited;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the process refuses to start without a JWT secret and says why', async () => {
  const p = run({ PORT: '0', DB_STORAGE: ':memory:' });
  assert.equal(await p.exited, 1);
  assert.match(p.output(), /JWT_SECRET/);
});
