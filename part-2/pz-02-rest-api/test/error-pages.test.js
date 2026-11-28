import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { createJournal } from '../src/journal.js';
import { describeError, KNOWN_STATUSES } from '../src/error-catalog.js';
import { PAGE_CSP, renderErrorPage } from '../src/error-page.js';
import { requestId } from '../src/security.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BROWSER = { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };

const withServer = (name, fn, options = {}) =>
  test(name, async () => {
    const errors = [];
    const journal = options.journal ?? createJournal();
    const server = createApp({ writeError: (...a) => errors.push(a), journal, ...options }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      await fn({ base, errors, journal });
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      journal.close();
    }
  });

withServer('every answer carries its own Request ID, also the health probe and a success', async ({ base }) => {
  const a = await fetch(`${base}/api/users`);
  const b = await fetch(`${base}/api/users`);
  const health = await fetch(`${base}/health`);
  assert.match(a.headers.get('x-request-id'), UUID);
  assert.notEqual(a.headers.get('x-request-id'), b.headers.get('x-request-id'));
  assert.match(health.headers.get('x-request-id'), UUID);
});

withServer('a Request ID sent by the client is never trusted', async ({ base }) => {
  const res = await fetch(`${base}/api/users`, { headers: { 'x-request-id': 'forged-by-the-client' } });
  assert.match(res.headers.get('x-request-id'), UUID);
});

withServer('a JSON error repeats the Request ID and explains itself', async ({ base }) => {
  const res = await fetch(`${base}/api/users/99`);
  const { error } = await res.json();
  assert.equal(res.status, 404);
  assert.equal(error.requestId, res.headers.get('x-request-id'));
  assert.equal(error.title, 'Not found');
  assert.match(error.description, /Likely cause: .* What to do: /);
});

withServer('the Request ID of a request is stored in the journal row', async ({ base, journal }) => {
  const res = await fetch(`${base}/api/users/1`);
  assert.equal(journal.recent(1)[0].request_id, res.headers.get('x-request-id'));
});

withServer('a browser gets a described 404 page, an API client gets JSON', async ({ base }) => {
  const res = await fetch(`${base}/no/such/page`, { headers: BROWSER });
  const html = await res.text();
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /^text\/html/);
  assert.equal(res.headers.get('content-security-policy'), PAGE_CSP);
  assert.match(html, /<p class="code">404<\/p>/);
  assert.match(html, /What happened/);
  assert.match(html, /Likely cause/);
  assert.match(html, /What to do/);
  assert.ok(html.includes(res.headers.get('x-request-id')));
  assert.match((await fetch(`${base}/no/such/page`)).headers.get('content-type'), /^application\/json/);
});

withServer('a browser page for a validation error lists the problems, escaped', async ({ base }) => {
  const res = await fetch(`${base}/api/users`, { method: 'POST', headers: { ...BROWSER, 'content-type': 'application/json' }, body: JSON.stringify({ name: '<script>alert(1)</script>', email: 'x' }) });
  const html = await res.text();
  assert.equal(res.status, 400);
  assert.match(html, /email: email has an invalid format/);
  assert.ok(!html.includes('<script>'));
});

withServer('the 429 page and the 405 page are described too', async ({ base }) => {
  const wrong = await fetch(`${base}/api/users/1`, { method: 'POST', headers: { ...BROWSER, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(wrong.status, 405);
  assert.match(await wrong.text(), /Method not allowed/);
  const first = await fetch(`${base}/api/users`, { headers: BROWSER });
  const second = await fetch(`${base}/api/users`, { headers: BROWSER });
  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.match(await second.text(), /Too many requests[\s\S]*Retry-After/);
}, { limit: { windowMs: 60000, max: 2, maxClients: 10 } });

withServer('the 500 page comes from a real failure of the journal and nothing is carried out', async ({ base, errors, journal }) => {
  const before = journal.recent(5).length;
  journal.begin = () => {
    throw new Error('disk is full');
  };
  const res = await fetch(`${base}/api/users`, { method: 'POST', headers: { ...BROWSER, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Grace', email: 'grace@example.com' }) });
  const html = await res.text();
  assert.equal(res.status, 500);
  assert.match(html, /Request journal unavailable/);
  assert.match(html, /the action was cancelled and nothing was changed/);
  assert.ok(html.includes(res.headers.get('x-request-id')));
  assert.ok(!html.includes('disk is full'));
  assert.ok(errors[0][0].includes(res.headers.get('x-request-id')), 'the server log carries the same Request ID');
  assert.equal(before, 0);
});

test('the catalog describes every status the API can answer, a code can refine it, an unknown status has a fallback', () => {
  for (const status of KNOWN_STATUSES) {
    const { title, description } = describeError(status, 'x');
    assert.ok(title.length > 0);
    assert.match(description, /Likely cause: .+ What to do: .+/);
  }
  assert.ok(KNOWN_STATUSES.includes(403) && KNOWN_STATUSES.includes(404) && KNOWN_STATUSES.includes(429) && KNOWN_STATUSES.includes(500));
  assert.equal(describeError(500, 'journal_unavailable').title, 'Request journal unavailable');
  assert.equal(describeError(418, 'teapot').title, 'Error');
});

test('the 403 page is described even though no route needs it yet', () => {
  const html = renderErrorPage({ status: 403, code: 'forbidden', message: 'No access', requestId: 'abc' });
  assert.match(html, /<title>403 Forbidden<\/title>/);
  assert.match(html, /Request ID: <code>abc<\/code>/);
  assert.ok(!html.includes('<ul>'));
});

test('the error page escapes every value it prints', () => {
  const html = renderErrorPage({ status: 400, code: 'bad_request', message: '<b>"&\'', requestId: '<i>', details: [{ field: '<f>', message: '<m>' }] });
  assert.ok(!/<b>|<i>|<f>|<m>/.test(html));
  assert.match(html, /&lt;b&gt;&quot;&amp;&#39;/);
});

test('requestId middleware sets the id on the response and the locals', () => {
  const res = { locals: {}, set(name, value) { this.header = [name, value]; } };
  let passed = false;
  requestId({}, res, () => (passed = true));
  assert.ok(passed);
  assert.match(res.locals.requestId, UUID);
  assert.deepEqual(res.header, ['X-Request-Id', res.locals.requestId]);
});

test('a journal file made before the Request ID existed is upgraded and keeps its rows', () => {
  const file = path.join(os.tmpdir(), `pz2-old-journal-${process.pid}-${Date.now()}.sqlite`);
  const old = new DatabaseSync(file);
  old.exec('CREATE TABLE request_log (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL, ip TEXT NOT NULL, status INTEGER)');
  old.exec("INSERT INTO request_log (created_at, method, path, ip, status) VALUES ('2026-01-01T00:00:00.000Z', 'GET', '/old', '1.1.1.1', 200)");
  old.close();
  const journal = createJournal(file);
  try {
    journal.begin({ method: 'GET', path: '/new', ip: '2.2.2.2', requestId: 'rid-1' });
    const rows = journal.recent(5);
    assert.deepEqual(rows.map((r) => [r.path, r.request_id]), [['/new', 'rid-1'], ['/old', null]]);
  } finally {
    journal.close();
    fs.rmSync(file, { force: true });
  }
});
