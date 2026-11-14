import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import { createDiagramStore } from '../src/data/diagrams.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { loadLimits } from '../src/limits.js';
import { fileFailure } from '../src/errors.js';

// The teacher breaks the log file by hand: deletes it, renames it, deletes its folder, makes a folder with the name of the file.
// Each time the person must read a page about what happened (not a system code like EISDIR) and the server must live on.

const limits = loadLimits();
limits.rateLimit.all.max = 100000;
limits.rateLimit.write.max = 100000;

const start = async (options = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'pz1-sabotage-'));
  const folder = join(dir, 'logs');
  mkdirSync(folder);
  const logFile = join(folder, 'request-log.txt');
  const errors = [];
  const server = createApp({ store: createDiagramStore(), limits, log: openRequestLog(), logFile, write: () => {}, writeError: (...a) => errors.push(a), ...options }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const res = await fetch(`${base}/log?auth=1`);
  const html = await res.text();
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const token = html.match(/name="_csrf" value="([0-9a-f]+)"/)[1];
  const exportLog = () =>
    fetch(`${base}/log/export?auth=1`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie }, body: new URLSearchParams({ _csrf: token }) });
  const download = () => fetch(`${base}/log/download?auth=1`);
  const close = async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  };
  return { base, dir, folder, logFile, errors, exportLog, download, close };
};

const readable = (html, dir) => {
  assert.match(html, /What this is/);
  assert.match(html, /Why it happened/);
  assert.match(html, /How to fix it/);
  assert.doesNotMatch(html, /node:|ENOENT|EACCES|EISDIR|ENOTDIR|EPERM|ERR_|Error: |at \w+ \(/);
  assert.ok(!html.includes(dir), 'the path is shown on the page');
};

test('a renamed log file is a missing file: the page explains it and a new export fixes it', async () => {
  const app = await start();
  try {
    assert.equal((await app.exportLog()).status, 302);
    renameSync(app.logFile, `${app.logFile}.old`);
    const res = await app.download();
    assert.equal(res.status, 404);
    const html = await res.text();
    assert.match(html, /The log file was not found/);
    readable(html, app.dir);
    assert.equal((await app.exportLog()).status, 302);
    assert.equal((await app.download()).status, 200);
  } finally {
    await app.close();
  }
});

test('a deleted folder of the log: download says the file is missing, export makes the folder again', async () => {
  const app = await start();
  try {
    await app.exportLog();
    rmSync(app.folder, { recursive: true, force: true });
    const res = await app.download();
    assert.equal(res.status, 404);
    readable(await res.text(), app.dir);
    assert.equal((await app.exportLog()).status, 302);
    assert.ok(existsSync(app.logFile));
  } finally {
    await app.close();
  }
});

test('a folder with the name of the log file: download, export and the log page each say so in plain words', async () => {
  const app = await start();
  try {
    mkdirSync(app.logFile);
    const download = await app.download();
    assert.equal(download.status, 500);
    const html = await download.text();
    assert.match(html, /A folder stands in the place of the log file/);
    readable(html, app.dir);
    const exported = await app.exportLog();
    assert.equal(exported.status, 500);
    const exportedHtml = await exported.text();
    assert.match(exportedHtml, /A folder stands in the place of the log file/);
    readable(exportedHtml, app.dir);
    const page = await (await fetch(`${app.base}/log?auth=1`)).text();
    assert.match(page, /A folder stands in the place of the exported file/);
    // The server lives on, and removing the folder makes everything work again.
    rmSync(app.logFile, { recursive: true });
    assert.equal((await app.exportLog()).status, 302);
    assert.equal((await app.download()).status, 200);
  } finally {
    await app.close();
  }
});

test('a file with the name of the folder of the log: the export says there is no access to the folder', async () => {
  const app = await start();
  try {
    rmSync(app.folder, { recursive: true });
    writeFileSync(app.folder, 'not a folder');
    const res = await app.exportLog();
    assert.equal(res.status, 500);
    const html = await res.text();
    assert.match(html, /No access to the folder of the log|The log could not be exported/);
    readable(html, app.dir);
    assert.equal((await fetch(`${app.base}/log?auth=1`)).status, 200);
  } finally {
    await app.close();
  }
});

test('the request log database replaced by a folder: every page explains it and the server does not crash', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pz1-db-folder-'));
  const dbFile = join(dir, 'log.sqlite');
  mkdirSync(dbFile);
  try {
    const server = createApp({ store: createDiagramStore(), limits, log: openRequestLog(dbFile), write: () => {}, writeError: () => {} }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const res = await fetch(`http://127.0.0.1:${server.address().port}/`);
    const html = await res.text();
    assert.equal(res.status, 500);
    assert.match(html, /A folder stands in the place of the log file/);
    readable(html, dir);
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fileFailure turns system codes into catalog codes', () => {
  assert.equal(fileFailure({ code: 'EISDIR' }, 'x'), 'log-path-is-folder');
  assert.equal(fileFailure({ code: 'EACCES' }, 'x'), 'log-folder-access');
  assert.equal(fileFailure({ code: 'EPERM' }, 'x'), 'log-folder-access');
  assert.equal(fileFailure({ code: 'ENOTDIR' }, 'x'), 'log-folder-access');
  assert.equal(fileFailure({ code: 'ENOSPC' }, 'x'), 'x');
  assert.equal(fileFailure({ code: 'ENOENT' }, 'x'), 'x');
  assert.equal(fileFailure(undefined, 'x'), 'x');
});
