import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createDiagramStore } from '../src/data/diagrams.js';
import { openRequestLog } from '../src/data/requestLog.js';
import { loadLimits } from '../src/limits.js';

const limits = loadLimits();
const valid = { title: 'Edited title', notation: 'ERD', description: 'Edited description', code: 'a -> b', revision: '7' };

const withServer = (name, fn) =>
  test(name, async () => {
    const store = createDiagramStore();
    const server = createApp({ store, log: openRequestLog(), write: () => {}, writeError: () => {} }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      await fn({ base, store });
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });

// Opens a page like a browser does and returns the CSRF cookie and the token from the hidden field.
const session = async (base, path = '/add?auth=1') => {
  const res = await fetch(`${base}${path}`);
  const html = await res.text();
  return { cookie: res.headers.get('set-cookie').split(';')[0], token: html.match(/name="_csrf" value="([0-9a-f]+)"/)[1], html };
};

const send = async (base, path, fields = {}, { csrf = true, headers = {} } = {}) => {
  const form = new URLSearchParams(fields);
  const cookie = {};
  if (csrf) {
    const { cookie: value, token } = await session(base);
    form.set('_csrf', token);
    cookie.cookie = value;
  }
  return fetch(`${base}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...cookie, ...headers },
    body: form,
  });
};

withServer('the detail page offers Edit and Delete only to a signed-in user, and the delete form carries the CSRF token', async ({ base }) => {
  const guest = await (await fetch(`${base}/item/1`)).text();
  assert.doesNotMatch(guest, /Delete/);
  assert.doesNotMatch(guest, /\/edit/);
  const { html } = await session(base, '/item/1?auth=1');
  assert.match(html, /href="\/item\/1\/edit\?auth=1"/);
  assert.match(html, /<form[^>]*action="\/item\/1\/delete\?auth=1"/);
  assert.match(html, /name="_csrf" value="[0-9a-f]{48}"/);
});

withServer('the edit form is filled with the current values and posts to the edit address', async ({ base, store }) => {
  const res = await fetch(`${base}/item/2/edit?auth=1`);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /<h1[^>]*>Edit diagram<\/h1>/);
  assert.match(html, /action="\/item\/2\/edit\?auth=1"/);
  assert.match(html, /value="Approval workflow"/);
  assert.match(html, /value="1"/);
  assert.match(html, /<option value="BPMN" selected>/);
  assert.match(html, />Save changes</);
  assert.equal(store.find(2).revision, 1);
});

withServer('a guest is sent to the sign-in page for the edit form, the edit and the delete', async ({ base, store }) => {
  const form = await fetch(`${base}/item/1/edit`, { redirect: 'manual' });
  assert.equal(form.status, 302);
  assert.equal(form.headers.get('location'), '/login');
  for (const path of ['/item/1/edit', '/item/1/delete']) {
    const res = await send(base, path, valid);
    assert.equal(res.status, 302, path);
    assert.equal(res.headers.get('location'), '/login');
    // Without the token even a guest is refused before the sign-in check.
    assert.equal((await send(base, path, valid, { csrf: false })).status, 403, path);
  }
  assert.deepEqual(store.find(1).title, 'Order service sequence');
  assert.equal(store.all().length, 3);
});

withServer('a valid edit changes the fields, keeps the id and the creation time and goes back to the detail page', async ({ base, store }) => {
  const before = { ...store.find(1) };
  const res = await send(base, '/item/1/edit?auth=1', { ...valid, title: '   Edited title  ' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/item/1?auth=1');
  const after = store.find(1);
  assert.deepEqual(after, { ...valid, title: 'Edited title', revision: 7, id: 1, createdAt: before.createdAt });
  assert.equal(store.all().length, 3);
  assert.match(await (await fetch(`${base}/item/1`)).text(), /Edited title/);
});

withServer('an invalid edit answers 400, shows the messages and the typed values, and changes nothing', async ({ base, store }) => {
  const before = { ...store.find(1) };
  const res = await send(base, '/item/1/edit?auth=1', { ...valid, title: '   ', revision: '-1', description: 'typed text' });
  const html = await res.text();
  assert.equal(res.status, 400);
  assert.match(html, /Title is required/);
  assert.match(html, /Revision must be a whole number/);
  assert.match(html, />typed text</);
  assert.match(html, /action="\/item\/1\/edit\?auth=1"/);
  assert.deepEqual(store.find(1), before);
});

withServer('edit refuses huge, fractional and odd values like the add form', async ({ base, store }) => {
  const before = { ...store.find(3) };
  const cases = [
    { title: 'x'.repeat(limits.title.maxLength + 1) },
    { description: 'x'.repeat(limits.description.maxLength + 1) },
    { code: 'x'.repeat(limits.code.maxLength + 1) },
    { notation: 'XYZ' },
    { revision: '1.5' },
    { revision: '1e999' },
    { revision: String(limits.revision.max + 1) },
    { revision: '99999999999999999999' },
    { revision: '' },
  ];
  for (const change of cases) {
    const res = await send(base, '/item/3/edit?auth=1', { ...valid, ...change });
    assert.equal(res.status, 400, JSON.stringify(change).slice(0, 60));
  }
  assert.deepEqual(store.find(3), before);
  assert.equal((await send(base, '/item/3/edit?auth=1', { ...valid, revision: String(limits.revision.max) })).status, 302);
  assert.equal(store.find(3).revision, limits.revision.max);
});

withServer('repeated form keys do not crash the edit', async ({ base, store }) => {
  const form = new URLSearchParams(valid);
  form.append('title', 'second title');
  const { cookie, token } = await session(base);
  form.set('_csrf', token);
  const res = await fetch(`${base}/item/1/edit?auth=1`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: form,
  });
  assert.equal(res.status, 400);
  assert.equal(store.find(1).title, 'Order service sequence');
});

withServer('markup typed into an edit is stored as text and printed escaped', async ({ base, store }) => {
  const res = await send(base, '/item/1/edit?auth=1', { ...valid, title: '<script>alert(1)</script>' });
  assert.equal(res.status, 302);
  const page = await (await fetch(`${base}/item/1`)).text();
  assert.doesNotMatch(page, /<script>alert/);
  assert.match(page, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  const form = await (await fetch(`${base}/item/1/edit?auth=1`)).text();
  assert.doesNotMatch(form, /<script>alert/);
  assert.equal(store.find(1).title, '<script>alert(1)</script>');
});

withServer('edit and delete without the CSRF token, with a wrong token or from another site answer 403 and change nothing', async ({ base, store }) => {
  const before = store.all().map((item) => ({ ...item }));
  for (const path of ['/item/1/edit?auth=1', '/item/1/delete?auth=1']) {
    assert.equal((await send(base, path, valid, { csrf: false })).status, 403, path);
    const { cookie } = await session(base);
    const wrong = await fetch(`${base}${path}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
      body: new URLSearchParams({ ...valid, _csrf: 'f'.repeat(48) }),
    });
    assert.equal(wrong.status, 403, path);
    assert.equal((await send(base, path, valid, { headers: { origin: 'https://evil.example' } })).status, 403, path);
  }
  assert.deepEqual(store.all(), before);
});

withServer('delete removes the record, goes to the list and a second delete answers 404', async ({ base, store }) => {
  const res = await send(base, '/item/2/delete?auth=1');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/?auth=1');
  assert.equal(store.find(2), undefined);
  assert.equal(store.all().length, 2);
  assert.equal((await fetch(`${base}/item/2`)).status, 404);
  assert.doesNotMatch(await (await fetch(`${base}/`)).text(), /Approval workflow/);
  assert.equal((await send(base, '/item/2/delete?auth=1')).status, 404);
});

withServer('delete and edit by a GET link do nothing, unknown and odd ids give 404, ids are never reused', async ({ base, store }) => {
  assert.equal((await fetch(`${base}/item/1/delete?auth=1`)).status, 404);
  assert.equal(store.all().length, 3);
  for (const id of ['99', 'abc', '0x1', '1e0', '-1', '1.5', '9'.repeat(30)]) {
    assert.equal((await fetch(`${base}/item/${id}/edit?auth=1`)).status, 404, id);
    assert.equal((await send(base, `/item/${id}/edit?auth=1`, valid)).status, 404, id);
    assert.equal((await send(base, `/item/${id}/delete?auth=1`)).status, 404, id);
  }
  assert.equal(store.all().length, 3);
  await send(base, '/item/3/delete?auth=1');
  const created = store.add({ title: 't', notation: 'UML', description: 'd', code: '', revision: 0 });
  assert.equal(created.id, 4);
});

test('the store update and remove report a missing record', () => {
  const store = createDiagramStore();
  assert.equal(store.update(99, valid), undefined);
  assert.equal(store.remove(99), false);
  assert.equal(store.remove(1), true);
  assert.equal(store.find(1), undefined);
});
