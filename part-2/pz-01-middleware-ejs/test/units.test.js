import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { translate } from '../src/i18n.js';
import ru from '../src/locales/ru.js';
import { entryFor } from '../src/errors.js';
import { notFound, serverError } from '../src/middleware/errorHandlers.js';
import { requestLogger, hideAuth } from '../src/middleware/requestLogger.js';
import { csrf, rateLimit } from '../src/middleware/security.js';
import { createDiagramStore } from '../src/data/diagrams.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { createApp } from '../src/app.js';
import { loadLimits } from '../src/limits.js';

// These are the defensive paths that the normal request flow never reaches: every middleware must still behave
// when it is called alone, without the middleware that normally runs before it.

test('translate falls back: unknown language to English, unknown key to the key itself', () => {
  assert.equal(translate('xx', 'title.diagrams'), translate('en', 'title.diagrams'));
  assert.equal(translate('en', 'no.such.key'), 'no.such.key');
  assert.equal(translate('ru', 'no.such.key', { a: 1 }), 'no.such.key');
});

test('every Russian message that is a function returns text', () => {
  for (const [key, value] of Object.entries(ru)) {
    if (typeof value === 'function') assert.equal(typeof value({ max: 3, min: 1, retryAfter: 5 }), 'string', key);
  }
});

test('entryFor falls back to the generic client and server entries', () => {
  assert.ok(entryFor({}, 418, 'en').heading);
  assert.ok(entryFor({}, 599, 'ru').heading);
  assert.ok(entryFor({ userCode: 'no-such' }, 404, 'ru').heading);
});

const bareRes = () => {
  const res = {
    locals: {},
    headersSent: false,
    headers: {},
    set(k, v) {
      this.headers[k] = v;
      return this;
    },
    append() {},
    status(code) {
      this.code = code;
      return this;
    },
    render(view, locals, cb) {
      this.view = view;
      this.rendered = locals;
      if (cb) cb(null, '<html></html>');
    },
    send(body) {
      this.body = body;
    },
    on() {},
  };
  return res;
};

test('notFound and serverError work on a response that no earlier middleware touched', () => {
  const res = bareRes();
  notFound({ originalUrl: '/x' }, res);
  assert.equal(res.code, 404);
  const res2 = bareRes();
  serverError(() => {})(new Error('boom'), { method: 'GET', originalUrl: '/x' }, res2, () => {});
  assert.equal(res2.code, 500);
  assert.equal(res2.rendered.user.guest, true);
  assert.match(res2.rendered.langHref.ru, /lang=ru/);
  assert.equal(res2.rendered.t('title.notFound'), translate('en', 'title.notFound'));
});

test('hideAuth leaves an address with an empty query alone', () => {
  assert.equal(hideAuth('/x?'), '/x?');
  assert.equal(hideAuth('/x'), '/x');
});

test('requestLogger turns a failing log into an error even without response locals', () => {
  const res = bareRes();
  delete res.locals;
  let received;
  requestLogger({ start: () => { throw new Error('down'); } }, () => {})({ method: 'GET', originalUrl: '/x' }, res, (e) => (received = e));
  assert.equal(received.cause.message, 'down');
  assert.ok(received.publicMessage);
});

test('csrf and rateLimit work without a translator on the response', () => {
  let err;
  const res = bareRes();
  delete res.locals;
  csrf({ method: 'POST', headers: {}, body: {} }, res, (e) => (err = e));
  assert.equal(err.status, 403);
  const limit = rateLimit({ windowMs: 1000, max: 0 });
  const res2 = bareRes();
  delete res2.locals;
  limit({ method: 'GET' }, res2, (e) => (err = e));
  assert.equal(err.status, 429);
});

test('the store creates a missing folder and refuses a file that is not a database', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pz1-units-'));
  const nested = createDiagramStore(Date.now, join(dir, 'a', 'b', 'db.sqlite'));
  assert.equal(nested.all().length, 3);
  nested.close();
  const junk = join(dir, 'junk.sqlite');
  writeFileSync(junk, 'this is not a database file at all, just text '.repeat(50));
  const bad = createDiagramStore(Date.now, junk);
  assert.throws(() => bad.all(), { userCode: 'log-database-unavailable' });
  rmSync(dir, { recursive: true, force: true });
});

test('the first record of an emptied table still gets a creation time', () => {
  const store = createDiagramStore(() => 5000);
  for (const one of store.all()) store.remove(one.id);
  assert.equal(store.add({ title: 'T', notation: 'UML', description: 'D', code: '', revision: 0 }).createdAt, new Date(5000).toISOString());
  store.close();
});

test('the log page ends on the 500 page when reading the log fails after the request was recorded', async () => {
  const log = openRequestLog();
  const real = log.recent;
  log.recent = () => {
    throw new Error('read failed');
  };
  const server = createApp({ store: createDiagramStore(), limits: loadLimits(), log, write: () => {}, writeError: () => {} }).listen(0);
  const res = await fetch(`http://127.0.0.1:${server.address().port}/log?auth=1`);
  assert.equal(res.status, 500);
  assert.match(await res.text(), /500/);
  log.recent = real;
  server.close();
});
