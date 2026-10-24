import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { createApp } from '../src/app.js';
import { createDiagramStore } from '../src/data/diagrams.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { exportLog, sendLogFile, describeFile } from '../src/data/logFile.js';
import { loadLimits } from '../src/limits.js';
import { CATALOG, UserError, entryFor } from '../src/errors.js';

// The extra of the teacher: the log is written to a file and downloaded through a stream; when the file is deleted the person gets an error page
// that says what happened, why and what to do, not a crash and not a bare "Internal Server Error".

const limits = loadLimits();
limits.rateLimit.all.max = 100000;
limits.rateLimit.write.max = 100000;

const start = async (options = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'pz1-file-'));
  const logFile = join(dir, 'request-log.txt');
  const errors = [];
  const log = openRequestLog();
  const server = createApp({ store: createDiagramStore(), limits, log, logFile, write: () => {}, writeError: (...a) => errors.push(a), ...options }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const session = async () => {
    const res = await fetch(`${base}/log?auth=1`);
    const html = await res.text();
    return { cookie: res.headers.get('set-cookie').split(';')[0], token: html.match(/name="_csrf" value="([0-9a-f]+)"/)[1] };
  };
  const post = async (path, s) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: s.cookie },
      body: new URLSearchParams({ _csrf: s.token }),
    });
  const close = async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  };
  return { base, dir, logFile, errors, log, session, post, close };
};

const threeParts = (html) => {
  assert.match(html, /What this is/);
  assert.match(html, /Why it happened/);
  assert.match(html, /How to fix it/);
};
const noInternals = (html, dir) => {
  assert.doesNotMatch(html, /node:|ENOENT|EACCES|EISDIR|ERR_|Error: |at \w+ \(|stack/);
  assert.ok(!html.includes(dir), 'the folder of the file is shown on the page');
};

test('export writes the log to a file through a stream, with a header, one line per row and no control characters', async () => {
  const app = await start();
  try {
    app.log.start({ time: '2026-10-24T10:00:00.000Z', method: 'GET', url: '/a\u0007b\nc' });
    const s = await app.session();
    const res = await app.post('/log/export?auth=1', s);
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/log?exported=1&auth=1');
    const text = readFileSync(app.logFile, 'utf8');
    const lines = text.trimEnd().split('\n');
    assert.equal(lines[0], 'time\tmethod\turl\tstatus\tms');
    assert.ok(lines.length >= 2);
    assert.ok(
      lines.some((line) => line.includes('/a?b?c')),
      'control characters were not replaced',
    );
    assert.ok(!existsSync(`${app.logFile}.part`), 'the temporary file was left behind');
    const page = await (await fetch(`${app.base}/log?exported=1&auth=1`)).text();
    assert.match(page, /The log was written to the file/);
    assert.match(page, /Exported file: \d+ bytes/);
  } finally {
    await app.close();
  }
});

test('the export needs the sign-in and the form token', async () => {
  const app = await start();
  try {
    const s = await app.session();
    const guest = await app.post('/log/export', s);
    assert.equal(guest.status, 302);
    assert.match(guest.headers.get('location'), /login/);
    const forged = await fetch(`${app.base}/log/export?auth=1`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: s.cookie },
      body: '_csrf=wrong',
    });
    assert.equal(forged.status, 403);
    assert.ok(!existsSync(app.logFile), 'a refused request wrote the file');
    assert.equal((await fetch(`${app.base}/log/download`, { redirect: 'manual' })).status, 302, 'a guest can download');
  } finally {
    await app.close();
  }
});

test('download sends the file as an attachment through a stream', async () => {
  const app = await start();
  try {
    const s = await app.session();
    await app.post('/log/export?auth=1', s);
    const res = await fetch(`${app.base}/log/download?auth=1`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/plain; charset=utf-8/);
    assert.equal(res.headers.get('content-disposition'), 'attachment; filename="request-log.txt"');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const body = await res.text();
    assert.equal(body, readFileSync(app.logFile, 'utf8'));
    assert.equal(Number(res.headers.get('content-length')), Buffer.byteLength(body));
  } finally {
    await app.close();
  }
});

test('the teacher deletes the log file: the download shows a page that explains what happened, why and how to fix it, and the server keeps working', async () => {
  const app = await start();
  try {
    const s = await app.session();
    await app.post('/log/export?auth=1', s);
    assert.equal((await fetch(`${app.base}/log/download?auth=1`)).status, 200);
    rmSync(app.logFile);

    const res = await fetch(`${app.base}/log/download?auth=1`);
    const html = await res.text();
    assert.equal(res.status, 404);
    assert.match(html, /<h1[^>]*>The log file was not found<\/h1>/);
    assert.match(html, /<link rel="stylesheet"/, 'the page is not styled');
    threeParts(html);
    assert.match(html, /deleted or moved/);
    assert.match(html, /Export the log to a file/);
    assert.match(html, /kept in the database/);
    noInternals(html, app.dir);
    assert.ok(app.errors.length === 0 || app.errors.every(([line]) => !/crash|uncaught/i.test(String(line))));

    // The log page itself still opens and says that the file is gone, and a new export brings the file back.
    const page = await (await fetch(`${app.base}/log?auth=1`)).text();
    assert.match(page, /has not been exported to a file yet, or the file was deleted/);
    await app.post('/log/export?auth=1', s);
    assert.equal((await fetch(`${app.base}/log/download?auth=1`)).status, 200);
    assert.equal((await fetch(`${app.base}/`)).status, 200);
  } finally {
    await app.close();
  }
});

test('a folder or something else in the place of the file is also "not found", never a crash', async () => {
  const app = await start();
  try {
    mkdirSync(app.logFile);
    const res = await fetch(`${app.base}/log/download?auth=1`);
    const html = await res.text();
    assert.equal(res.status, 404);
    threeParts(html);
    noInternals(html, app.dir);
    assert.equal(await describeFile(app.logFile), null);
  } finally {
    await app.close();
  }
});

test('the file disappears between the check and the opening: still the page for the person', async () => {
  const app = await start();
  const fake = { ...process, code: 'ENOENT' };
  void fake;
  try {
    writeFileSync(app.logFile, 'x');
    const res = {};
    const open = () => {
      const stream = new Readable({ read() {} });
      setImmediate(() => stream.destroy(Object.assign(new Error('gone'), { code: 'ENOENT' })));
      return stream;
    };
    await assert.rejects(
      sendLogFile(res, app.logFile, () => {}, open),
      (error) => error instanceof UserError && error.userCode === 'log-file-missing',
    );
    const denied = () => {
      const stream = new Readable({ read() {} });
      setImmediate(() => stream.destroy(Object.assign(new Error('denied'), { code: 'EACCES' })));
      return stream;
    };
    await assert.rejects(
      sendLogFile(res, app.logFile, () => {}, denied),
      (error) => error instanceof UserError && error.userCode === 'log-file-unreadable',
    );
  } finally {
    await app.close();
  }
});

test('a failure in the middle of the transfer closes the connection, is written to the console and does not stop the server', async () => {
  const app = await start();
  try {
    writeFileSync(app.logFile, 'x'.repeat(1000));
    const failures = [];
    let destroyed = false;
    // A real writable stream stands for the answer to the browser.
    const res = new Writable({
      write(chunk, encoding, done) {
        done();
      },
    });
    res.set = () => {};
    const realDestroy = res.destroy.bind(res);
    res.destroy = (...args) => {
      destroyed = true;
      return realDestroy(...args);
    };
    const open = () => {
      const stream = new Readable({ read() {} });
      setImmediate(() => {
        stream.emit('open');
        stream.push('first part');
        setImmediate(() => stream.destroy(new Error('disk read error')));
      });
      return stream;
    };
    await sendLogFile(res, app.logFile, (...a) => failures.push(a), open);
    assert.ok(destroyed, 'the connection was not closed');
    assert.equal(failures.length, 1);
    assert.match(failures[0][0], /transfer failed/);
    assert.equal((await fetch(`${app.base}/health`)).status, 200);
  } finally {
    await app.close();
  }
});

test('an export that cannot be written keeps the old file and shows the page about the export', async () => {
  const app = await start();
  try {
    const s = await app.session();
    await app.post('/log/export?auth=1', s);
    const before = readFileSync(app.logFile, 'utf8');
    mkdirSync(`${app.logFile}.part`);
    const res = await app.post('/log/export?auth=1', s);
    const html = await res.text();
    assert.equal(res.status, 500);
    assert.match(html, /<h1[^>]*>The log could not be exported<\/h1>/);
    threeParts(html);
    noInternals(html, app.dir);
    assert.equal(readFileSync(app.logFile, 'utf8'), before, 'the old file was damaged');
  } finally {
    await app.close();
  }
});

test('an export into a folder that does not exist shows the page about the export and leaves no file', async () => {
  const app = await start({ logFile: join(tmpdir(), `pz1-missing-${process.pid}`, 'deep', 'log.txt') });
  try {
    const s = await app.session();
    const res = await app.post('/log/export?auth=1', s);
    const html = await res.text();
    assert.equal(res.status, 500);
    threeParts(html);
    assert.match(html, /folder of the file does not exist/);
    assert.equal(existsSync(join(tmpdir(), `pz1-missing-${process.pid}`)), false);
  } finally {
    await app.close();
  }
});

test('the log database that cannot be reached also gets the explained page', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pz1-db-'));
  const blocker = join(dir, 'blocker');
  writeFileSync(blocker, 'not a folder');
  const log = openRequestLog(join(blocker, 'log.db'));
  const app = await start({ log });
  try {
    const res = await fetch(`${app.base}/`);
    const html = await res.text();
    assert.equal(res.status, 500);
    assert.match(html, /Server error/);
    threeParts(html);
    assert.match(html, /deleted, moved or locked/);
    assert.match(html, /restart the server/);
    noInternals(html, dir);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the other error pages also say what it is, why it happened and how to fix it, and the catalog is complete', async () => {
  const app = await start();
  try {
    const missing = await fetch(`${app.base}/no/such/page`);
    assert.equal(missing.status, 404);
    threeParts(await missing.text());
    const wrongMethod = await fetch(`${app.base}/item/1`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=b' });
    assert.ok([403, 405].includes(wrongMethod.status));
    threeParts(await wrongMethod.text());
    const forged = await fetch(`${app.base}/add?auth=1`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'title=x' });
    assert.equal(forged.status, 403);
    threeParts(await forged.text());
    for (const [code, entry] of Object.entries(CATALOG)) {
      assert.ok(entry.heading && entry.what.length > 30, code);
      assert.ok(entry.why.length >= 1 && entry.fix.length >= 1, code);
    }
    assert.equal(entryFor({}, 418).heading, 'Bad request');
    assert.equal(entryFor({}, 599).heading, 'Server error');
    assert.equal(entryFor({ userCode: 'log-file-missing' }, 500).heading, 'The log file was not found');
  } finally {
    await app.close();
  }
});

test('exportLog counts the rows it wrote and works for an empty log', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pz1-count-'));
  try {
    const log = openRequestLog();
    assert.equal(await exportLog(log, join(dir, 'a.txt')), 0);
    for (let i = 0; i < 5; i += 1) log.start({ time: '2026-10-24T10:00:00.000Z', method: 'GET', url: `/${i}` });
    assert.equal(await exportLog(log, join(dir, 'b.txt')), 5);
    assert.equal(readFileSync(join(dir, 'b.txt'), 'utf8').trimEnd().split('\n').length, 6);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a request log in a folder that already exists is opened without trying to create the folder again (a drive root cannot be created)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pz1-existing-'));
  try {
    const log = openRequestLog(join(dir, 'log.db'));
    log.start({ time: '2026-10-24T10:00:00.000Z', method: 'GET', url: '/' });
    assert.equal(log.recent(1).length, 1);
    log.close();
    const deep = openRequestLog(join(dir, 'new', 'deeper', 'log.db'));
    deep.start({ time: '2026-10-24T10:00:00.000Z', method: 'GET', url: '/' });
    assert.equal(deep.recent(1).length, 1, 'a missing folder is still created');
    deep.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
