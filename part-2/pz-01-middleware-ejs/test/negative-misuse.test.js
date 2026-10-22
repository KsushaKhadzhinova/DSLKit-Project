import { test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createDiagramStore } from '../src/data/diagrams.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { loadLimits } from '../src/limits.js';

const limits = loadLimits();
const valid = { title: 'ok', notation: 'ERD', description: 'd', code: '', revision: '0' };

const startWith = async () => {
  const store = createDiagramStore();
  const log = openRequestLog();
  const server = createApp({ store, log, limits, write: () => {}, writeError: () => {} }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  };
  return { base, store, log, close };
};

const withServer = (name, fn) =>
  test(name, async () => {
    const ctx = await startWith();
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

// Posts a form with a valid CSRF cookie and token.
const post = async (url, body) => {
  const fields = new URLSearchParams(body);
  const { cookie, token } = await session(new URL(url).origin);
  fields.set('_csrf', token);
  return fetch(url, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie }, body: fields });
};

// A raw request: the path is sent exactly as written (fetch would percent-encode "<" and ">").
const rawGet = (base, path) =>
  new Promise((resolve, reject) => {
    const { hostname, port } = new URL(base);
    const req = request({ hostname, port, path, method: 'GET' }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (text += chunk));
      res.on('end', () => resolve({ status: res.statusCode, text }));
    });
    req.on('error', reject);
    req.end();
  });

// ---------- addresses ----------

withServer('odd item addresses answer 404, a broken escape 400, and never 500', async ({ base, store }) => {
  for (const id of ['abc', '1e3', '1.5', '%', '%F0%9F%98%80', '%D8%A7', '1'.repeat(300)]) {
    const res = await fetch(`${base}/item/${id}`);
    assert.equal(res.status, id === '%' ? 400 : 404, id);
    assert.match(await res.text(), /<link rel="stylesheet"/, id);
  }
  assert.equal(store.all().length, 3);
});

withServer('a POST to an unknown route with a valid token answers the styled 404 page', async ({ base, store }) => {
  const res = await post(`${base}/no/such/route`, valid);
  assert.equal(res.status, 404);
  assert.match(await res.text(), /Page not found/);
  assert.equal(store.all().length, 3);
});

withServer('PUT and PATCH on an item address answer 405 with Allow and change nothing', async ({ base, store }) => {
  const before = { ...store.find(1) };
  const { cookie, token } = await session(base);
  for (const method of ['PUT', 'PATCH']) {
    const res = await fetch(`${base}/item/1`, {
      method,
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...valid, _csrf: token }),
    });
    assert.equal(res.status, 405, method);
    assert.equal(res.headers.get('allow'), 'GET, HEAD');
  }
  assert.deepEqual(store.find(1), before);
});

withServer('a HEAD request to a page answers 200 with the headers and no body', async ({ base }) => {
  const res = await fetch(`${base}/`, { method: 'HEAD' });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.equal(await res.text(), '');
});

withServer('an address with an encoded line break is logged as one plain row', async ({ base, log }) => {
  const path = '/x%0D%0A2026-01-01T00:00:00.000Z%20GET%20/admin%20200';
  assert.equal((await fetch(`${base}${path}`)).status, 404);
  const rows = log.recent(100);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].url, path);
});

withServer('markup in a raw address is escaped on the 404 page and on the request log', async ({ base }) => {
  const path = '/<img/src=x/onerror=alert(1)>';
  const page = await rawGet(base, path);
  assert.equal(page.status, 404);
  assert.doesNotMatch(page.text, /<img\/src=x/);
  assert.match(page.text, /&lt;img\/src=x\/onerror=alert\(1\)&gt;/);
  const log = await (await fetch(`${base}/log?auth=1`)).text();
  assert.doesNotMatch(log, /<img\/src=x/);
  assert.match(log, /&lt;img\/src=x/);
});

// ---------- request shape ----------

withServer('a form sent as text/plain is refused with 403 and nothing is stored', async ({ base, store }) => {
  const { cookie, token } = await session(base);
  const res = await fetch(`${base}/add?auth=1`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'text/plain' },
    body: `title=x&notation=ERD&description=d&revision=0&_csrf=${token}`,
  });
  assert.equal(res.status, 403);
  assert.equal(store.all().length, 3);
});

withServer('a body one byte over the 20 kB limit answers 413 with the styled page', async ({ base, store }) => {
  const res = await post(`${base}/add?auth=1`, { ...valid, description: 'd'.repeat(20 * 1024 + 1) });
  assert.equal(res.status, 413);
  assert.match(await res.text(), /Request too large/);
  assert.equal(store.all().length, 3);
});

withServer('a form without the notation field is refused with 400 and keeps the other values', async ({ base }) => {
  const rest = { ...valid, title: 'keep this title' };
  delete rest.notation;
  const res = await post(`${base}/add?auth=1`, rest);
  const html = await res.text();
  assert.equal(res.status, 400);
  assert.match(html, /Choose a notation/);
  assert.match(html, /keep this title/);
});

// ---------- values ----------

withServer('a title made of non-breaking spaces and tabs counts as empty and is refused', async ({ base }) => {
  const res = await post(`${base}/add?auth=1`, { ...valid, title: ' \t ' });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Title is required/);
});

withServer('a title with emoji and right-to-left letters is stored and shown unchanged', async ({ base, store }) => {
  const title = '🚀 مخطط النظام 👍';
  assert.equal((await post(`${base}/add?auth=1`, { ...valid, title })).status, 302);
  assert.equal(store.all().at(-1).title, title);
  assert.ok((await (await fetch(`${base}/`)).text()).includes(title));
});

withServer('a title with a NUL byte or a direction override is refused with 400, and the list still opens', async ({ base }) => {
  const res = await post(`${base}/add?auth=1`, { ...valid, title: '\u0000' });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /control characters/);
  assert.equal((await post(`${base}/add?auth=1`, { ...valid, title: 'a‮b' })).status, 400);
  assert.equal((await fetch(`${base}/`)).status, 200);
});

withServer('a title of 41 emoji is refused, because the limit counts UTF-16 units like the form maxlength', async ({ base, store }) => {
  const res = await post(`${base}/add?auth=1`, { ...valid, title: '😀'.repeat(41) });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Title must be at most 80 characters/);
  assert.equal(store.all().length, 3);
});

withServer('a code of exactly 5000 characters is accepted, the limit is inclusive', async ({ base, store }) => {
  assert.equal((await post(`${base}/add?auth=1`, { ...valid, code: 'c'.repeat(5000) })).status, 302);
  assert.equal(store.all().at(-1).code.length, 5000);
});

withServer('a revision with leading zeros is accepted and stored as the plain number', async ({ base, store }) => {
  assert.equal((await post(`${base}/add?auth=1`, { ...valid, revision: '007' })).status, 302);
  assert.equal(store.all().at(-1).revision, 7);
});

withServer('revisions NaN, Infinity, a blank space and 2147483648 are refused with 400', async ({ base, store }) => {
  for (const revision of ['NaN', 'Infinity', ' ', '2147483648']) {
    assert.equal((await post(`${base}/add?auth=1`, { ...valid, revision })).status, 400, revision);
  }
  assert.equal(store.all().length, 3);
});

// ---------- tokens and repeated sends ----------

withServer('a token copied from another visitor form is refused with 403', async ({ base, store }) => {
  const mine = await session(base);
  const theirs = await session(base);
  const res = await fetch(`${base}/add?auth=1`, {
    method: 'POST',
    headers: { cookie: mine.cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...valid, _csrf: theirs.token }),
  });
  assert.equal(res.status, 403);
  assert.equal(store.all().length, 3);
});

withServer('the same add form sent twice creates two records, one per send', async ({ base, store }) => {
  const { cookie, token } = await session(base);
  const send = () =>
    fetch(`${base}/add?auth=1`, {
      method: 'POST',
      redirect: 'manual',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...valid, title: 'Twice', _csrf: token }),
    });
  const first = await send();
  const second = await send();
  assert.deepEqual([first.status, second.status], [302, 302]);
  assert.equal(store.all().filter((item) => item.title === 'Twice').length, 2);
});

withServer('editing a record after it was deleted answers 404 and does not bring it back', async ({ base, store }) => {
  assert.equal((await post(`${base}/item/2/delete?auth=1`, {})).status, 302);
  assert.equal((await fetch(`${base}/item/2/edit?auth=1`)).status, 404);
  assert.equal((await post(`${base}/item/2/edit?auth=1`, valid)).status, 404);
  assert.equal(store.find(2), undefined);
  assert.equal(store.all().length, 2);
});

// ---------- markup and failures ----------

withServer('markup typed into a rejected form is shown again as text, not as a tag', async ({ base }) => {
  const res = await post(`${base}/add?auth=1`, { ...valid, title: '<img src=x onerror=alert(1)>', revision: '-1' });
  const html = await res.text();
  assert.equal(res.status, 400);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
});

withServer('a stopped request log shows the 500 page without file paths, SQL or stack text', async ({ base, log }) => {
  assert.equal((await fetch(`${base}/`)).status, 200);
  log.close();
  const res = await fetch(`${base}/`);
  const html = await res.text();
  assert.equal(res.status, 500);
  assert.match(html, /Server error/);
  assert.doesNotMatch(html, /sqlite|\.db\b|node:|stack|ERR_|Error: /i);
});

test('a request log under a regular file shows the styled 500 page without internals and keeps answering', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pz1-misuse-'));
  const blocker = join(dir, 'blocker');
  writeFileSync(blocker, 'not a folder');
  const log = openRequestLog(join(blocker, 'log.db'));
  const server = createApp({ log, limits, write: () => {}, writeError: () => {} }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = await fetch(`${base}/`);
      const html = await res.text();
      assert.equal(res.status, 500);
      assert.match(html, /could not be written/);
      assert.doesNotMatch(html, /ENOTDIR|EEXIST|mkdir|blocker|\.db\b|node:/);
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});
