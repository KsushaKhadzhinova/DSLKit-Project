import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { logSafe, rateLimit, securityHeaders } from '../src/security.js';

const start = async (options = {}) => {
  const errors = [];
  const server = createApp({ writeError: (...a) => errors.push(a), ...options }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  };
  return { base, errors, close };
};

const json = (base, path, init = {}) => fetch(`${base}${path}`, { ...init, headers: { 'content-type': 'application/json', ...init.headers } });

test('every answer carries the security headers and hides the framework name', async () => {
  const { base, close } = await start();
  for (const path of ['/api/users', '/api/users/999', '/nothing']) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(res.headers.get('x-frame-options'), 'DENY', path);
    assert.match(res.headers.get('content-security-policy'), /default-src 'none'/, path);
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer', path);
    assert.equal(res.headers.get('cache-control'), 'no-store', path);
    assert.equal(res.headers.get('x-powered-by'), null, path);
  }
  await close();
});

test('a broken percent escape in the URL is 400 and an unknown Content-Encoding is 415, not 500', async () => {
  const { base, errors, close } = await start();
  const url = await fetch(`${base}/api/users/%E0%A4%A`);
  assert.equal(url.status, 400);
  assert.equal((await url.json()).error.code, 'bad_request');
  const encoded = await json(base, '/api/users', { method: 'POST', headers: { 'content-encoding': 'x-unknown' }, body: '{}' });
  assert.equal(encoded.status, 415);
  assert.equal((await encoded.json()).error.code, 'unsupported_media_type');
  assert.equal(errors.length, 0);
  await close();
});

test('a client error from the framework without a known code gets a generic 4xx answer', async () => {
  const { base, close } = await start();
  const res = await json(base, '/api/users', { method: 'POST', headers: { 'content-length': '5' }, body: '{"a":1}'.slice(0, 5) });
  assert.ok(res.status >= 400 && res.status < 500, String(res.status));
  assert.ok((await res.json()).error.code);
  await close();
});

test('too many requests give a JSON 429 with Retry-After, in the same error shape', async () => {
  const { base, close } = await start({ limit: { windowMs: 60000, max: 2 } });
  const statuses = [];
  let last;
  for (let i = 0; i < 4; i += 1) {
    last = await fetch(`${base}/api/users`);
    statuses.push(last.status);
  }
  assert.deepEqual(statuses, [200, 200, 429, 429]);
  assert.match(last.headers.get('retry-after'), /^\d+$/);
  const body = await last.json();
  assert.equal(body.error.code, 'too_many_requests');
  assert.match(body.error.message, /try again in \d+ s/);
  await close();
});

test('rate limit counts per address and opens again after the window', () => {
  let time = 0;
  const limit = rateLimit({ windowMs: 1000, max: 1, now: () => time });
  const run = (req) => {
    const out = { headers: {} };
    limit(req, { set: (k, v) => (out.headers[k] = v) }, (err) => (out.err = err));
    return out;
  };
  assert.equal(run({ ip: 'a' }).err, undefined);
  assert.equal(run({ ip: 'a' }).err.status, 429);
  assert.equal(run({ ip: 'b' }).err, undefined);
  assert.equal(run({}).err, undefined);
  time = 1001;
  assert.equal(run({ ip: 'a' }).err, undefined);
});

test('rate limit sweeps expired entries when the table grows', () => {
  let time = 0;
  const limit = rateLimit({ windowMs: 10, max: 1, now: () => time });
  const results = [];
  for (let i = 0; i < 10002; i += 1) limit({ ip: `ip${i}` }, {}, (err) => results.push(err));
  time = 100;
  limit({ ip: 'fresh' }, {}, (err) => results.push(err));
  assert.equal(results.every((err) => err === undefined), true);
});

test('log lines cannot be forged with line breaks, the text is quoted and cut', () => {
  const out = logSafe('/a' + String.fromCharCode(13, 10) + '[error] GET /forged');
  assert.equal(out.includes(String.fromCharCode(10)), false);
  assert.equal(out, '"/a' + String.fromCharCode(92) + 'r' + String.fromCharCode(92) + 'n[error] GET /forged"');
  assert.ok(logSafe('x'.repeat(1000)).length <= 300);
});

test('unexpected failures are logged with an escaped address and answered with a plain 500', async () => {
  const stores = {
    users: { all: () => { throw new Error('boom'); }, find: () => undefined },
    projects: { all: () => [], find: () => undefined },
    diagrams: { all: () => [], find: () => undefined },
  };
  const { base, errors, close } = await start({ stores });
  const res = await fetch(`${base}/api/users?a=b`);
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: { code: 'internal_error', message: 'Internal server error' } });
  assert.equal(errors[0][0], '[error] "GET" "/api/users?a=b"');
  await close();
});

test('securityHeaders passes on', () => {
  let passed = false;
  securityHeaders({}, { set: () => {} }, () => (passed = true));
  assert.equal(passed, true);
});

test('big and hostile bodies give 400 or 413 and no crash', async () => {
  const { base, errors, close } = await start();
  const big = await json(base, '/api/users', { method: 'POST', body: JSON.stringify({ name: 'x'.repeat(200000), email: 'a@b.cc' }) });
  assert.equal(big.status, 413);
  const long = await json(base, '/api/users', { method: 'POST', body: JSON.stringify({ name: 'x'.repeat(60000), email: 'a@b.cc' }) });
  assert.equal(long.status, 400);
  const deep = await json(base, '/api/users', { method: 'POST', body: '['.repeat(5000) + ']'.repeat(5000) });
  assert.equal(deep.status, 400);
  const digits = await json(base, '/api/projects', { method: 'POST', body: `{"name":"p","ownerId":${'9'.repeat(400)}}` });
  assert.equal(digits.status, 400);
  const proto = await json(base, '/api/users', { method: 'POST', body: '{"__proto__":{"admin":true},"name":"a","email":"a@b.cc"}' });
  assert.equal(proto.status, 400);
  assert.equal(({}).admin, undefined);
  assert.equal(errors.length, 0);
  await close();
});
