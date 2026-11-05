import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initAuthGate } from '../../site/js/components/auth-gate.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const page = (name) => new JSDOM(readFileSync(`site/${name}`, 'utf8'), { url: 'http://localhost/' }).window.document;

test('My projects is closed to a guest: the gate sends the guest to the sign-in page', () => {
  for (const name of ['app/dashboard.html', 'en/app/dashboard.html']) {
    const sent = [];
    assert.deepEqual(initAuthGate({ root: page(name), storage: createStorage(createMemoryBackend()), navigate: (url) => sent.push(url) }), {
      redirected: true,
    });
    assert.deepEqual(sent, ['login.html']);
  }
});

test('a signed-in user stays on the page, and a page that is open to everybody is not guarded', async () => {
  const storage = createStorage(createMemoryBackend());
  const sent = [];
  const navigate = (url) => sent.push(url);
  assert.equal(initAuthGate({ root: page('app/editor.html'), storage, navigate }), null);
  await createAccountStore({ storage }).register({ name: 'Ксения', email: 'k@example.com', password: 'correct horse' });
  assert.equal(initAuthGate({ root: page('app/dashboard.html'), storage, navigate }), null);
  assert.deepEqual(sent, []);
});

test('a sign-out in another tab sends a page open in this tab to the sign-in page too', async () => {
  const storage = createStorage(createMemoryBackend());
  await createAccountStore({ storage }).register({ name: 'Ксения', email: 'k@example.com', password: 'correct horse' });
  const sent = [];
  const window = new EventTarget();
  const root = { body: { dataset: { requiresAuth: '' } }, defaultView: window };
  assert.equal(initAuthGate({ root, storage, navigate: (url) => sent.push(url) }), null);
  assert.deepEqual(sent, []);
  storage.remove('session');
  window.dispatchEvent(Object.assign(new Event('storage'), { key: 'session' }));
  assert.deepEqual(sent, ['login.html']);
  // A storage event for an unrelated key, or a page still signed in, changes nothing.
  sent.length = 0;
  await createAccountStore({ storage }).login({ email: 'k@example.com', password: 'correct horse' });
  window.dispatchEvent(Object.assign(new Event('storage'), { key: 'theme' }));
  assert.deepEqual(sent, []);
});

test('the default way out replaces the address of the window', () => {
  const sent = [];
  const root = { body: { dataset: { requiresAuth: '' } }, defaultView: { location: { replace: (url) => sent.push(url) } } };
  initAuthGate({ root, storage: createStorage(createMemoryBackend()) });
  assert.deepEqual(sent, ['login.html']);
});
