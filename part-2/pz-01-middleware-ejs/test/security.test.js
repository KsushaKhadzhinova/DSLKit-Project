import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { loadLimits } from '../src/limits.js';
import { requestLogger } from '../src/middleware/requestLogger.js';
import { csrf, rateLimit, safeLogText, securityHeaders } from '../src/middleware/security.js';

const valid = { title: 'ok', notation: 'ERD', description: 'd', code: '', revision: '0' };

const startWith = async (limits = loadLimits()) => {
  const log = openRequestLog();
  const server = createApp({ limits, log, write: () => {}, writeError: () => {} }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  };
  return { base, log, close };
};

const withServer = (name, fn, limits) =>
  test(name, async () => {
    const ctx = await startWith(limits);
    try {
      await fn(ctx);
    } finally {
      await ctx.close();
    }
  });

// Opens the form like a browser does and returns the CSRF cookie and the token from the hidden field.
const session = async (base) => {
  const res = await fetch(`${base}/add?auth=1`);
  const html = await res.text();
  return { cookie: res.headers.get('set-cookie').split(';')[0], token: html.match(/name="_csrf" value="([0-9a-f]+)"/)[1] };
};

const post = async (url, body, { csrfToken = true, headers = {} } = {}) => {
  const fields = new URLSearchParams(body);
  const extra = {};
  if (csrfToken) {
    const { cookie, token } = await session(new URL(url).origin);
    fields.set('_csrf', token);
    extra.cookie = cookie;
  }
  return fetch(url, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...extra, ...headers }, body: fields });
};

withServer('every page carries the security headers and hides the framework name', async ({ base }) => {
  for (const path of ['/', '/nope', '/dslkit.css']) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(res.headers.get('x-frame-options'), 'DENY', path);
    assert.equal(res.headers.get('referrer-policy'), 'same-origin', path);
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'.*frame-ancestors 'none'/, path);
    assert.equal(res.headers.get('x-powered-by'), null, path);
  }
});

withServer('the pages use no inline script, style or handler, so the strict policy works', async ({ base }) => {
  for (const path of ['/', '/add?auth=1', '/item/1', '/nope', '/login', '/log?auth=1']) {
    const html = await (await fetch(`${base}${path}`)).text();
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/, path);
    assert.doesNotMatch(html, /<style|\sstyle="|\son\w+="/, path);
  }
});

withServer('a POST without the CSRF token, with a wrong token or from another site is refused with 403', async ({ base, log }) => {
  const none = await post(`${base}/add?auth=1`, valid, { csrfToken: false });
  assert.equal(none.status, 403);
  assert.match(await none.text(), /Request refused/);
  const { cookie, token } = await session(base);
  const wrong = await fetch(`${base}/add?auth=1`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...valid, _csrf: token.replace(/./, (c) => (c === '0' ? '1' : '0')) }),
  });
  assert.equal(wrong.status, 403);
  const noCookie = await fetch(`${base}/add?auth=1`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...valid, _csrf: token }),
  });
  assert.equal(noCookie.status, 403);
  const foreign = await post(`${base}/add?auth=1`, valid, { headers: { origin: 'https://evil.example' } });
  assert.equal(foreign.status, 403);
  assert.match(await foreign.text(), /another site/);
  assert.equal((await post(`${base}/add?auth=1`, valid, { headers: { origin: base } })).status, 302);
  assert.equal(log.recent(100).filter((row) => row.method === 'POST' && row.status === 302).length, 1);
});

withServer('the CSRF cookie is HttpOnly and SameSite=Strict and stays the same while it is valid', async ({ base }) => {
  const first = await fetch(`${base}/add?auth=1`);
  const setCookie = first.headers.get('set-cookie');
  assert.match(setCookie, /^dslkit_csrf=[0-9a-f]{48}; Path=\/; HttpOnly; SameSite=Strict$/);
  const again = await fetch(`${base}/add?auth=1`, { headers: { cookie: setCookie.split(';')[0] } });
  assert.equal(again.headers.get('set-cookie'), null);
  assert.match(await again.text(), new RegExp(`value="${setCookie.match(/=([0-9a-f]+)/)[1]}"`));
});

test('csrf marks the cookie Secure behind https and ignores a malformed cookie', () => {
  const headers = {};
  const res = { locals: {}, append: (name, value) => (headers[name] = value) };
  csrf({ method: 'GET', headers: { cookie: 'a=1; dslkit_csrf=bad' }, secure: true }, res, () => {});
  assert.match(headers['Set-Cookie'], /; Secure$/);
  assert.match(res.locals.csrfToken, /^[0-9a-f]{48}$/);
});

test('securityHeaders sets the headers and passes on', () => {
  const set = {};
  let passed = false;
  securityHeaders({}, { set: (h) => Object.assign(set, h) }, () => (passed = true));
  assert.equal(passed, true);
  assert.equal(set['X-Frame-Options'], 'DENY');
});

test('rate limit counts per address, refuses over the maximum and opens again after the window', () => {
  let time = 1000;
  const limit = rateLimit({ windowMs: 1000, max: 2, only: ['POST'], now: () => time });
  const run = (req) => {
    const out = { headers: {} };
    limit(req, { set: (k, v) => (out.headers[k] = v) }, (err) => (out.err = err));
    return out;
  };
  assert.equal(run({ method: 'GET', ip: 'a' }).err, undefined);
  assert.equal(run({ method: 'POST', ip: 'a' }).err, undefined);
  assert.equal(run({ method: 'POST', ip: 'a' }).err, undefined);
  const refused = run({ method: 'POST', ip: 'a' });
  assert.equal(refused.err.status, 429);
  assert.equal(refused.headers['Retry-After'], '1');
  assert.equal(run({ method: 'POST', ip: 'b' }).err, undefined);
  assert.equal(run({ method: 'POST' }).err, undefined);
  time += 1001;
  assert.equal(run({ method: 'POST', ip: 'a' }).err, undefined);
});

test('rate limit sweeps expired entries when the table grows', () => {
  let time = 0;
  const limit = rateLimit({ windowMs: 10, max: 1, now: () => time });
  const results = [];
  for (let i = 0; i < 10002; i += 1) limit({ method: 'GET', ip: `ip${i}` }, {}, (err) => results.push(err));
  time = 100;
  limit({ method: 'GET', ip: 'fresh' }, {}, (err) => results.push(err));
  assert.equal(results.every((err) => err === undefined), true);
});

test('too many requests give the styled 429 page with Retry-After', async () => {
  const limits = { ...loadLimits(), rateLimit: { all: { windowMs: 60000, max: 3 }, write: { windowMs: 60000, max: 1 } } };
  const { base, close } = await startWith(limits);
  const statuses = [];
  let last;
  for (let i = 0; i < 5; i += 1) {
    last = await fetch(`${base}/`);
    statuses.push(last.status);
  }
  const html = await last.text();
  await close();
  assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
  assert.match(last.headers.get('retry-after'), /^\d+$/);
  assert.match(html, /Too many requests/);
  assert.match(html, /<link rel="stylesheet"/);
});

test('POST requests have their own, lower limit', async () => {
  const limits = { ...loadLimits(), rateLimit: { all: { windowMs: 60000, max: 100 }, write: { windowMs: 60000, max: 2 } } };
  const { base, close } = await startWith(limits);
  const codes = [];
  for (let i = 0; i < 3; i += 1) codes.push((await post(`${base}/add?auth=1`, valid, { csrfToken: false })).status);
  await close();
  assert.deepEqual(codes, [403, 403, 429]);
});

test('line breaks and control characters in user input cannot forge log lines', () => {
  assert.equal(safeLogText('/a\r\n[2026] GET /forged 200\tx\u001b[31m'), '/a\\u000d\\u000a[2026] GET /forged 200\\u0009x\\u001b[31m');
  assert.equal(safeLogText('a b\u0085c'), 'a\\u2028b\\u0085c');
  assert.equal(safeLogText('x'.repeat(600)).length, 501);
  assert.equal(safeLogText('x'.repeat(10), 5), 'xxxxx…');
});

test('the logger escapes the address in the console line and in the table', () => {
  const lines = [];
  const rows = [];
  const log = { start: (row) => rows.push(row), finish: () => {} };
  const handlers = {};
  requestLogger(log, (l) => lines.push(l), 40)(
    { method: 'GET', originalUrl: '/x\n2026-01-01T00:00:00.000Z POST /admin 200 1ms and more text' },
    { statusCode: 200, on: (e, f) => (handlers[e] = f) },
    () => {},
  );
  handlers.finish();
  assert.equal(rows[0].url.includes('\n'), false);
  assert.match(rows[0].url, /^\/x\\u000a2026/);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].includes('\n'), false);
});

withServer('huge and hostile values give 400 or 413 and never a crash or a stored record', async ({ base }) => {
  const send = (fields) => post(`${base}/add?auth=1`, { ...valid, ...fields });
  assert.equal((await send({ title: 'x'.repeat(8000), description: 'y'.repeat(8000) })).status, 400);
  const digits = await send({ revision: '9'.repeat(5000) });
  assert.equal(digits.status, 400);
  assert.match(await digits.text(), /whole number from 0 to 100000/);
  assert.equal((await send({ revision: '1e999' })).status, 400);
  assert.equal((await send({ revision: '-0' })).status, 400);
  assert.equal((await send({ title: '\u0000‮<script>alert(1)</script>' })).status, 302);
  assert.equal((await post(`${base}/add?auth=1`, { ...valid, code: 'z'.repeat(30000) })).status, 413);
  const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`f${i}`, 'v']));
  assert.equal((await post(`${base}/add?auth=1`, { ...valid, ...many })).status, 413);
  const html = await (await fetch(`${base}/`)).text();
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.equal(html.match(/<article class="card">/g).length, 4);
});

withServer('a very long address and a broken escape give a styled page, not a crash', async ({ base }) => {
  assert.equal((await fetch(`${base}/${'a'.repeat(5000)}`)).status, 404);
  const broken = await fetch(`${base}/item/%E0%A4%A`);
  assert.equal(broken.status, 400);
  assert.match(await broken.text(), /<link rel="stylesheet"/);
});

withServer('the item number is plain digits only', async ({ base }) => {
  for (const id of ['0x1', '1e0', '+1', '01a', '%201', '99999999999999999999']) {
    assert.equal((await fetch(`${base}/item/${id}`)).status, 404, id);
  }
  assert.equal((await fetch(`${base}/item/1`)).status, 200);
});
