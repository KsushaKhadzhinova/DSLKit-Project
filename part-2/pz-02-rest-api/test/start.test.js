import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readConfig, startServer } from '../src/start.js';
import { LIMITS } from '../src/app.js';

// Ports 4250-4259 are reserved for this practical.
const PORT_A = 4251;
const PORT_B = 4252;
const tmp = (name) => path.join(os.tmpdir(), `pz2-${name}-${process.pid}-${Date.now()}.sqlite`);
// The servers keep their journal files open until the process ends, and Windows refuses to delete an open file:
// a file left in the temp folder is harmless, so removal is best effort.
const removeAll = (file) => ['', '-wal', '-shm'].forEach((suffix) => fs.rmSync(file + suffix, { force: true, maxRetries: 0 }));
const until = async (check, what) => {
  for (let i = 0; i < 100 && !check(); i += 1) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(check(), what);
};

test('readConfig takes the port, limit and journal file from the environment and falls back to the defaults', () => {
  assert.deepEqual(readConfig({}), { port: 3000, max: LIMITS.rateMax, journalFile: 'journal.sqlite' });
  assert.deepEqual(readConfig({ PORT: '4251', RATE_LIMIT_MAX: '7', JOURNAL_FILE: 'x.sqlite' }), { port: 4251, max: 7, journalFile: 'x.sqlite' });
  for (const bad of ['0', '-3', 'abc', '']) assert.equal(readConfig({ RATE_LIMIT_MAX: bad }).max, LIMITS.rateMax, bad);
  assert.equal(readConfig({ PORT: 'nope' }).port, 3000);
});

// One test runs the whole life of the servers in this process, so the coverage never depends on how a child process
// ends: start two servers (the function and the real entry file), call them, then stop both the way a signal does,
// with process.exit and the grace timer replaced so the test process itself is not ended.
test('the server starts, answers, writes its journal and stops on SIGINT and SIGTERM', async () => {
  const fileA = tmp('a');
  const fileB = tmp('b');
  const realExit = process.exit;
  const realTimeout = globalThis.setTimeout;
  const exits = [];
  const timers = [];
  const logs = [];
  const realLog = console.log;
  try {
    console.log = (...args) => logs.push(args.join(' '));
    const { server } = startServer({ PORT: String(PORT_A), JOURNAL_FILE: fileA, RATE_LIMIT_MAX: '5' });
    await new Promise((resolve) => (server.listening ? resolve() : server.once('listening', resolve)));
    assert.equal(server.headersTimeout, 10_000);
    assert.equal(server.requestTimeout, 30_000);
    assert.equal((await fetch(`http://127.0.0.1:${PORT_A}/health`)).status, 200);
    assert.equal((await fetch(`http://127.0.0.1:${PORT_A}/api/users`)).status, 200);
    assert.ok(fs.existsSync(fileA));

    // The entry file `npm start` runs: it only calls startServer with the real environment.
    process.env.PORT = String(PORT_B);
    process.env.JOURNAL_FILE = fileB;
    await import('../src/server.js');
    await until(() => logs.some((line) => line.includes(String(PORT_B))), 'the entry file started its server');
    assert.equal((await fetch(`http://127.0.0.1:${PORT_B}/health`)).status, 200);

    process.exit = (code) => exits.push(code);
    globalThis.setTimeout = (fn, ms) => {
      if (ms === 5000) {
        timers.push(fn);
        return { unref() {} };
      }
      return realTimeout(fn, ms);
    };
    process.emit('SIGINT');
    process.emit('SIGTERM');
    globalThis.setTimeout = realTimeout;
    await until(() => exits.includes(0), 'the servers closed and asked the process to end with 0');
    assert.ok(logs.some((line) => line.includes('SIGINT received')) && logs.some((line) => line.includes('SIGTERM received')));
    assert.equal(timers.length, 4, 'every stop arms the grace timer');
    timers.forEach((fn) => fn());
    assert.ok(exits.includes(1), 'a server that does not close in time ends the process with 1');
  } finally {
    process.exit = realExit;
    globalThis.setTimeout = realTimeout;
    console.log = realLog;
    delete process.env.PORT;
    delete process.env.JOURNAL_FILE;
    for (const file of [fileA, fileB]) {
      try {
        removeAll(file);
      } catch {
        // still open on Windows, see above
      }
    }
  }
});
