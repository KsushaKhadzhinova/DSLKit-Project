import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { loadLimits } from '../src/limits.js';

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
  const fields = body instanceof URLSearchParams ? body : new URLSearchParams(body);
  const extra = {};
  if (csrfToken) {
    const { cookie, token } = await session(new URL(url).origin);
    fields.set('_csrf', token);
    extra.cookie = cookie;
  }
  return fetch(url, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...extra, ...headers }, body: fields });
};

// ---------- addresses ----------

withServer('path traversal in an encoded address stays a 404 and never serves package.json', async ({ base }) => {
  const res = await fetch(`${base}/%2e%2e/package.json`);
  assert.equal(res.status, 404);
  assert.doesNotMatch(await res.text(), /"name"/);
});

withServer('a NUL byte in the item address answers 404', async ({ base }) => {
  assert.equal((await fetch(`${base}/item/%00`)).status, 404);
  assert.equal((await fetch(`${base}/item/1%00`)).status, 404);
});

withServer('item addresses 0, -1 and 1.0 answer 404, not 500', async ({ base }) => {
  for (const id of ['0', '-1', '1.0']) {
    const res = await fetch(`${base}/item/${id}`);
    assert.equal(res.status, 404, id);
    assert.match(await res.text(), /Page not found|404/, id);
  }
});

withServer('an item number with ten digits answers 404 without a crash', async ({ base }) => {
  assert.equal((await fetch(`${base}/item/1000000000`)).status, 404);
  assert.equal((await fetch(`${base}/item/999999999`)).status, 404);
});

withServer('a very long query string is served and the logged address is cut to 500 characters', async ({ base, log }) => {
  const res = await fetch(`${base}/?x=${'q'.repeat(10000)}`);
  assert.equal(res.status, 200);
  assert.ok(log.recent(1)[0].url.length <= 501);
});

withServer('DELETE on an item address without a token is refused with 403 and the item stays', async ({ base }) => {
  const res = await fetch(`${base}/item/1`, { method: 'DELETE' });
  assert.equal(res.status, 403);
  assert.equal((await fetch(`${base}/item/1`)).status, 200);
});

withServer('a valid POST to an item address with a token answers the styled 405, not 500', async ({ base }) => {
  const res = await post(`${base}/item/1`, valid);
  assert.equal(res.status, 405);
  assert.match(await res.text(), /Method not allowed/);
});

// ---------- CSRF and request bodies ----------

withServer('a POST to /login without a token is refused with the styled 403 page', async ({ base }) => {
  const res = await post(`${base}/login`, {}, { csrfToken: false });
  assert.equal(res.status, 403);
  assert.match(await res.text(), /<link rel="stylesheet"/);
});

withServer('a JSON body that carries the token is ignored and refused with 403', async ({ base }) => {
  const { cookie, token } = await session(base);
  const res = await fetch(`${base}/add?auth=1`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ ...valid, _csrf: token }),
  });
  assert.equal(res.status, 403);
});

withServer('a token one character too short is refused with 403, not a crash', async ({ base }) => {
  const { cookie, token } = await session(base);
  const res = await fetch(`${base}/add?auth=1`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...valid, _csrf: token.slice(0, -1) }),
  });
  assert.equal(res.status, 403);
});

withServer('a repeated _csrf field is refused with 403', async ({ base }) => {
  const { cookie, token } = await session(base);
  const res = await fetch(`${base}/add?auth=1`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams([...Object.entries(valid), ['_csrf', token], ['_csrf', token]]),
  });
  assert.equal(res.status, 403);
});

withServer('malformed percent-encoding in a form field gets a 302 or a 400, never a 500', async ({ base }) => {
  const { cookie, token } = await session(base);
  const body = `title=%E0%A4%A&notation=ERD&description=d&code=&revision=0&_csrf=${token}`;
  const sent = await fetch(`${base}/add?auth=1`, { method: 'POST', redirect: 'manual', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body });
  assert.notEqual(sent.status, 500);
  assert.ok([302, 400].includes(sent.status), String(sent.status));
});

withServer('form keys named __proto__ and constructor are ignored and do not crash the form', async ({ base }) => {
  const res = await post(`${base}/add?auth=1`, new URLSearchParams([...Object.entries(valid), ['__proto__', 'x'], ['constructor', 'y']]));
  assert.equal(res.status, 302);
});

// ---------- values ----------

withServer('a title padded with spaces is trimmed, so 80 real characters are accepted', async ({ base }) => {
  const res = await post(`${base}/add?auth=1`, { ...valid, title: `     ${'x'.repeat(80)}     ` });
  assert.equal(res.status, 302);
});

withServer('digits from other scripts and full-width digits are refused as revision', async ({ base }) => {
  for (const revision of ['١', '１', '٠١']) {
    const res = await post(`${base}/add?auth=1`, { ...valid, revision });
    assert.equal(res.status, 400, revision);
    assert.match(await res.text(), /whole number from 0 to 100000/, revision);
  }
});

withServer('a revision with a sign or an inner space is refused with 400', async ({ base }) => {
  for (const revision of ['+5', '5 6', '5,0']) {
    assert.equal((await post(`${base}/add?auth=1`, { ...valid, revision })).status, 400, revision);
  }
});

withServer('a notation typed in lower case is refused, because the list is exact', async ({ base }) => {
  const res = await post(`${base}/add?auth=1`, { ...valid, notation: 'uml' });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Choose a notation from the list/);
});

withServer('code of 5001 characters is refused with 400 and the code message', async ({ base }) => {
  const res = await post(`${base}/add?auth=1`, { ...valid, code: 'c'.repeat(5001) });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Code must be at most 5000 characters/);
});

withServer('description of 501 characters is refused with 400', async ({ base }) => {
  const res = await post(`${base}/add?auth=1`, { ...valid, description: 'd'.repeat(501) });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Description must be at most 500 characters/);
});

// ---------- guest and sign-in shortcuts ----------

withServer('?auth values other than 1 are treated as a guest and sent to /login', async ({ base }) => {
  for (const query of ['auth=2', 'auth=1&auth=0', 'auth[]=1', 'auth=true']) {
    const res = await fetch(`${base}/add?${query}`, { redirect: 'manual' });
    assert.equal(res.status, 302, query);
    assert.equal(res.headers.get('location'), '/login', query);
  }
});

// ---------- log table and load ----------

withServer('a request log that stops answers /log with the styled 500 page, and the next page too', async ({ base, log }) => {
  assert.equal((await fetch(`${base}/`)).status, 200);
  log.close();
  const first = await fetch(`${base}/log?auth=1`);
  assert.equal(first.status, 500);
  assert.match(await first.text(), /Server error/);
  assert.equal((await fetch(`${base}/`)).status, 500);
});

test('closing the request log twice does not throw', () => {
  const log = openRequestLog();
  log.recent(1);
  log.close();
  assert.doesNotThrow(() => log.close());
});

withServer('a burst of 25 parallel valid posts saves 20 and refuses the rest with 429', async ({ base, log }) => {
  const results = await Promise.all(Array.from({ length: 25 }, () => post(`${base}/add?auth=1`, valid)));
  const statuses = results.map((res) => res.status);
  assert.ok(statuses.every((code) => code === 302 || code === 429), statuses.join(','));
  assert.equal(statuses.filter((code) => code === 302).length, 20);
  assert.equal(log.recent(100).filter((row) => row.status === 500).length, 0);
});

withServer('GET /health answers ok with security headers and writes nothing to the request log', async ({ base, log }) => {
  const before = log.recent(100).length;
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
  assert.ok(res.headers.get('content-security-policy'));
  assert.equal(log.recent(100).length, before);
});

withServer('/health is not limited by the rate limit', async ({ base }) => {
  for (let i = 0; i < 25; i += 1) assert.equal((await fetch(`${base}/health`)).status, 200);
}, { ...loadLimits(), rateLimit: { all: { windowMs: 60000, max: 2 }, write: { windowMs: 60000, max: 2 } } });

withServer('clearing the log needs the sign-in and the token, then empties the table', async ({ base, log }) => {
  await fetch(`${base}/`);
  assert.ok(log.recent(10).length > 0);
  // A guest is sent to the login page and nothing is removed.
  const guest = await post(`${base}/log/clear`, {}, { csrfToken: true });
  assert.equal(guest.status, 302);
  assert.match(guest.headers.get('location'), /\/login/);
  assert.ok(log.recent(10).length > 0);
  // Without the CSRF token the request is refused.
  assert.equal((await post(`${base}/log/clear?auth=1`, {}, { csrfToken: false })).status, 403);
  // A signed-in user with the token clears the table (the row of this very request may remain).
  const ok = await post(`${base}/log/clear?auth=1`, {});
  assert.equal(ok.status, 302);
  assert.match(ok.headers.get('location'), /\/log\?auth=1/);
  assert.ok(log.recent(10).every((row) => /log\/clear|^\/log/.test(row.url)));
});

withServer('the log page shows the clear button with a CSRF token', async ({ base }) => {
  const html = await (await fetch(`${base}/log?auth=1`)).text();
  assert.match(html, /action="\/log\/clear\?auth=1"/);
  assert.match(html, /name="_csrf" value="[0-9a-f]+"/);
  assert.match(html, /Clear the log/);
});
