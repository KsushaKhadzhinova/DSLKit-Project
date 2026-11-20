import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { initAuthForm } from '../../site/js/components/auth.js';
import { initDashboard } from '../../site/js/components/dashboard.js';
import { initTheme } from '../../site/js/components/theme.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage, getStorage } from '../../site/js/utils/storage.js';

// Defects of the account scenarios STO-14 (storage off), ISO-08 (theme per account) and ISO-09 (dashboard state per account).
const memory = () => createStorage(createMemoryBackend());
const page = (name) => readFileSync(`site/${name}`, 'utf8');
const person = (n) => ({ name: `Person ${n}`, email: `p${n}@example.com`, password: 'correct horse battery' });

test('a browser without storage gives a volatile in-memory storage, a working one does not', () => {
  assert.equal(getStorage({}).volatile, true);
  assert.equal(getStorage({ localStorage: null }).volatile, true);
  assert.equal(
    getStorage({
      get localStorage() {
        throw new Error('blocked');
      },
    }).volatile,
    true,
  );
  assert.equal(getStorage({ localStorage: createMemoryBackend() }).volatile, undefined);
});

test('with the storage off an account can be neither made nor signed in to', async () => {
  const store = createAccountStore({ storage: getStorage({}) });
  assert.deepEqual(await store.register(person(1)), { ok: false, error: 'storage' });
  assert.deepEqual(await store.login(person(1)), { ok: false, error: 'storage' });
  assert.equal(store.current(), null);
});

test('the registration form says why it fails when the storage is off and does not leave the page', async () => {
  const { window } = new JSDOM(page('app/register.html'), { url: 'http://localhost/' });
  const { document } = window;
  const moved = [];
  initAuthForm({ root: document, storage: getStorage({}), crypto: globalThis.crypto, navigate: (url) => moved.push(url) });
  const values = { name: 'Priv', email: 'priv@example.com', password: 'correct horse battery', confirm: 'correct horse battery' };
  Object.entries(values).forEach(([id, value]) => (document.querySelector(`#${id}`).value = value));
  document.querySelector('#auth-form').dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.match(document.querySelector('#auth-error').textContent, /хранилище браузера недоступно/);
  assert.deepEqual(moved, []);
});

const signedIn = async (storage, n) => {
  const store = createAccountStore({ storage });
  const result = await store.register(person(n));
  return result.user;
};
const html = (theme) =>
  `<html><body><input class="theme__input" type="checkbox"><input type="radio" name="theme" value="dark"><input type="radio" name="theme" value="light"><input type="radio" name="theme" value="auto" ${theme}></body></html>`;

test('the theme is kept per account: the choice of A does not reach B, a guest choice is the start of both', async () => {
  const storage = memory();
  const a = await signedIn(storage, 1);
  const { window } = new JSDOM(html(''));
  const { document } = window;
  initTheme({ root: document, storage, matchMedia: () => ({ matches: false }) });
  const dark = document.querySelector('input[value="dark"]');
  dark.checked = true;
  dark.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(storage.get(`theme.${a.id}`), 'dark');
  assert.equal(storage.get('theme'), null);

  const store = createAccountStore({ storage });
  store.logout();
  const b = await signedIn(storage, 2);
  const other = new JSDOM(html('')).window.document;
  initTheme({ root: other, storage, matchMedia: () => ({ matches: false }) });
  assert.equal(other.documentElement.dataset.theme, 'light');
  assert.equal(storage.get(`theme.${b.id}`), null);

  store.logout();
  storage.set('theme', 'dark');
  const guest = new JSDOM(html('')).window.document;
  initTheme({ root: guest, storage, matchMedia: () => ({ matches: false }) });
  assert.equal(guest.documentElement.dataset.theme, 'dark');
});

const runEarly = (values, url = 'http://localhost/app/editor.html') => {
  const root = { dataset: {}, classList: { add() {} } };
  const location = { pathname: new URL(url).pathname, replace: (to) => (location.moved = to) };
  const localStorage = { getItem: (key) => (key in values ? JSON.stringify(values[key]) : null) };
  vm.runInNewContext(readFileSync('site/js/early.js', 'utf8'), {
    document: { documentElement: root },
    window: { matchMedia: () => ({ matches: false }) },
    localStorage,
    location,
  });
  return { theme: root.dataset.theme, moved: location.moved };
};

test('the first paint uses the theme of the signed-in account, then the plain one, then the system', () => {
  assert.equal(runEarly({ 'dslkit.session': { userId: 'u1' }, 'dslkit.theme.u1': 'dark', 'dslkit.theme': 'light' }).theme, 'dark');
  assert.equal(runEarly({ 'dslkit.session': { userId: 'u2' }, 'dslkit.theme.u1': 'dark', 'dslkit.theme': 'light' }).theme, 'light');
  assert.equal(runEarly({ 'dslkit.session': { userId: 7 }, 'dslkit.theme': 'dark' }).theme, 'dark');
  assert.equal(runEarly({}).theme, 'light');
});

test('a guest is still sent away from the dashboard, a known account is not', () => {
  assert.equal(runEarly({}, 'http://localhost/app/dashboard.html').moved, 'login.html');
  const known = { 'dslkit.session': { userId: 'u1' }, 'dslkit.accounts': [{ id: 'u1' }] };
  assert.equal(runEarly(known, 'http://localhost/app/dashboard.html').moved, undefined);
});

test('the search and filter of the dashboard belong to the account', async () => {
  const storage = memory();
  const a = await signedIn(storage, 1);
  storage.set(`dashboard.${a.id}`, { filter: 'all', query: 'A-secret', sort: 'newest' });
  const first = new JSDOM(page('app/dashboard.html'), { url: 'http://localhost/' }).window.document;
  initDashboard({ root: first, storage, seed: false });
  assert.equal(first.querySelector('.app-topbar__search-input').value, 'A-secret');
  assert.deepEqual(storage.get(`dashboard.${a.id}`).query, 'A-secret');
  assert.equal(storage.get('dashboard'), null);

  createAccountStore({ storage }).logout();
  const b = await signedIn(storage, 2);
  const second = new JSDOM(page('app/dashboard.html'), { url: 'http://localhost/' }).window.document;
  initDashboard({ root: second, storage, seed: false });
  assert.equal(second.querySelector('.app-topbar__search-input').value, '');
  assert.equal(storage.get(`dashboard.${b.id}`).query, '');
});
