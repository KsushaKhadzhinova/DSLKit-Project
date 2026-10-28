import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import * as realFs from 'node:fs';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { after, before, mock, test } from 'node:test';
import { SECURITY_HEADERS, staticServer } from './server.js';

const root = mkdtempSync(join(tmpdir(), 'site-'));
mkdirSync(join(root, 'errors'));
mkdirSync(join(root, 'docs'));
writeFileSync(join(root, 'index.html'), '<h1>home</h1>');
writeFileSync(join(root, 'docs', 'index.html'), '<h1>docs</h1>');
writeFileSync(join(root, 'data.bin'), 'bin');
writeFileSync(join(root, 'style.css'), 'a{}');
for (const code of [400, 403, 404, 405, 500]) writeFileSync(join(root, 'errors', `${code}.html`), `<h1>${code}</h1>`);

const start = (server) => new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
const get = (server, path, method = 'GET', headers = {}) =>
  new Promise((ok, fail) => {
    const req = request({ host: '127.0.0.1', port: server.address().port, path, method, headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => ok({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', fail);
    req.end();
  });

let main;
const servers = [];
before(async () => {
  main = await start(staticServer(root));
  servers.push(main);
});
after(() => servers.forEach((s) => s.close()));

test('serves files with their content types', async () => {
  const page = await get(main, '/');
  assert.equal(page.status, 200);
  assert.equal(page.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(page.body, '<h1>home</h1>');
  assert.equal((await get(main, '/style.css')).headers['content-type'], 'text/css; charset=utf-8');
  assert.equal((await get(main, '/data.bin')).headers['content-type'], 'application/octet-stream');
  assert.equal((await get(main, '/docs')).body, '<h1>docs</h1>');
});

test('HEAD returns headers without a body', async () => {
  const res = await get(main, '/', 'HEAD');
  assert.equal(res.status, 200);
  assert.equal(res.body, '');
  assert.equal((await get(main, '/missing', 'HEAD')).status, 404);
});

test('404 uses the error page', async () => {
  const res = await get(main, '/missing.html');
  assert.equal(res.status, 404);
  assert.equal(res.body, '<h1>404</h1>');
});

test('405 lists allowed methods', async () => {
  const res = await get(main, '/', 'POST');
  assert.equal(res.status, 405);
  assert.equal(res.headers.allow, 'GET, HEAD');
  assert.equal(res.body, '<h1>405</h1>');
});

test('400 for a malformed address', async () => {
  const res = await get(main, '/%E0%A4%A');
  assert.equal(res.status, 400);
  assert.equal(res.body, '<h1>400</h1>');
});

test('403 for path traversal', async () => {
  const res = await get(main, '/..%2fsecret.txt');
  assert.equal(res.status, 403);
  assert.equal(res.body, '<h1>403</h1>');
});

test('500 when the file system fails', async () => {
  const broken = await start(
    staticServer(root, {
      ...realFs,
      statSync: () => {
        throw new Error('disk');
      },
    }),
  );
  servers.push(broken);
  const res = await get(broken, '/docs');
  assert.equal(res.status, 500);
  assert.equal(res.body, '<h1>500</h1>');
});

test('plain text fallback without error pages', async () => {
  const bare = await start(staticServer(mkdtempSync(join(tmpdir(), 'bare-'))));
  servers.push(bare);
  const res = await get(bare, '/nothing');
  assert.equal(res.status, 404);
  assert.equal(res.headers['content-type'], 'text/plain; charset=utf-8');
  assert.equal(res.body, '404');
});

test('a stream error ends the response', async () => {
  const faulty = await start(
    staticServer(root, {
      ...realFs,
      createReadStream: () =>
        new Readable({
          read() {
            this.destroy(new Error('read'));
          },
        }),
    }),
  );
  servers.push(faulty);
  const res = await get(faulty, '/');
  assert.equal(res.status, 200);
  assert.equal(res.body, '');
});

test('serve script starts the server on the requested port', async () => {
  const log = mock.method(console, 'log', () => {});
  process.argv.splice(2, 2, root, '0');
  const { server } = await import('./serve.js');
  await once(server, 'listening');
  assert.match(log.mock.calls[0].arguments[0], /^http:\/\/localhost:\d+$/);
  server.close();
  log.mock.restore();
});

test('every answer carries the security headers, also errors and HEAD requests', async () => {
  const server = await start(staticServer(root));
  try {
    for (const [path, method] of [
      ['/', 'GET'],
      ['/style.css', 'GET'],
      ['/missing', 'GET'],
      ['/', 'HEAD'],
      ['/', 'POST'],
    ]) {
      const { headers } = await get(server, path, method);
      assert.match(headers['content-security-policy'], /default-src 'self'/, `${method} ${path}`);
      assert.match(headers['content-security-policy'], /script-src 'self'(;|$)/);
      assert.match(headers['content-security-policy'], /frame-ancestors 'none'/);
      assert.equal(headers['x-content-type-options'], 'nosniff');
      assert.equal(headers['x-frame-options'], 'DENY');
    }
    assert.doesNotMatch(SECURITY_HEADERS['Content-Security-Policy'], /unsafe-eval|script-src[^;]*unsafe-inline/);
  } finally {
    server.close();
  }
});

test('files carry a validator and must be revalidated, an unchanged file answers 304', async () => {
  const first = await get(main, '/style.css');
  assert.match(first.headers.etag, /^W\/"[0-9a-f]+-[0-9a-f]+"$/);
  assert.equal(first.headers['cache-control'], 'no-cache');
  assert.equal((await get(main, '/style.css', 'HEAD')).headers.etag, first.headers.etag);
  const same = await get(main, '/style.css', 'GET', { 'If-None-Match': first.headers.etag });
  assert.equal(same.status, 304);
  assert.equal(same.body, '');
  assert.equal(same.headers.etag, first.headers.etag);
  const other = await get(main, '/style.css', 'GET', { 'If-None-Match': 'W/"0-0"' });
  assert.equal(other.status, 200);
  assert.equal(other.body, 'a{}');
  assert.equal((await get(main, '/missing.html')).headers.etag, undefined);
});
