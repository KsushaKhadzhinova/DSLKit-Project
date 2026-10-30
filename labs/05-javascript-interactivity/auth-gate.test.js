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

test('the default way out replaces the address of the window', () => {
  const sent = [];
  const root = { body: { dataset: { requiresAuth: '' } }, defaultView: { location: { replace: (url) => sent.push(url) } } };
  initAuthGate({ root, storage: createStorage(createMemoryBackend()) });
  assert.deepEqual(sent, ['login.html']);
});
