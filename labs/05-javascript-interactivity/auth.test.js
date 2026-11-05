import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initAuthForm, initAuthMenu } from '../../site/js/components/auth.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { isValidPassword, validateLogin, validateRegistration } from '../../site/js/utils/validation.js';

const pages = Object.fromEntries(
  ['app/login.html', 'app/register.html', 'en/app/login.html', 'app/dashboard.html', 'app/editor.html', 'index.html'].map((name) => [
    name,
    readFileSync(`site/${name}`, 'utf8'),
  ]),
);
const memory = () => createStorage(createMemoryBackend());
const load = (name) => new JSDOM(pages[name], { url: 'http://localhost/' }).window;
const field = (document, id) => document.querySelector(`#${id}`);
const fill = (document, values) => Object.entries(values).forEach(([id, value]) => (field(document, id).value = value));
const person = { name: 'Ксения', email: 'k@example.com', password: 'correct horse' };
const setup = (name, storage = memory()) => {
  const window = load(name);
  const navigate = mock.fn();
  const api = initAuthForm({ root: window.document, storage, navigate, crypto: globalThis.crypto });
  return { window, document: window.document, navigate, storage, api };
};
const signedIn = async (storage, user = person) => {
  await createAccountStore({ storage }).register(user);
  return storage;
};
const signedOut = async (storage) => {
  await signedIn(storage);
  createAccountStore({ storage }).logout();
  return storage;
};

test('password rules: 8 to 128 characters and not only spaces', () => {
  assert.equal(isValidPassword('12345678'), true);
  assert.equal(isValidPassword('1234567'), false);
  assert.equal(isValidPassword(' '.repeat(10)), false);
  assert.equal(isValidPassword('x'.repeat(129)), false);
  assert.equal(isValidPassword(12345678), false);
});

test('sign-in and registration validation name the wrong fields', () => {
  assert.deepEqual(validateLogin(), ['email', 'password']);
  assert.deepEqual(validateLogin({ email: 'a@b.co', password: 'x' }), []);
  assert.deepEqual(validateLogin({ email: 'bad', password: '' }), ['email', 'password']);
  assert.deepEqual(validateRegistration(), ['name', 'email', 'password', 'confirm']);
  assert.deepEqual(validateRegistration({ name: 'Ксения', email: 'a@b.co', password: '12345678', confirm: '12345678' }), []);
  assert.deepEqual(validateRegistration({ name: 'К1', email: 'a@b', password: '1234', confirm: '12345' }), ['name', 'email', 'password', 'confirm']);
});

test('without the form or the menu nothing happens', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initAuthForm({ root: document, storage: memory() }), null);
  assert.equal(initAuthMenu({ root: document, storage: memory() }), null);
});

test('an empty sign-in shows both errors, marks the fields and focuses the first', async () => {
  const { window, document, navigate, api } = setup('app/login.html');
  const event = new window.Event('submit', { bubbles: true, cancelable: true });
  document.querySelector('#auth-form').dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(await api.submit(), false);
  for (const id of ['email', 'password']) {
    assert.equal(field(document, `${id}-error`).hidden, false, id);
    assert.equal(field(document, id).getAttribute('aria-invalid'), 'true', id);
    assert.match(field(document, id).getAttribute('aria-describedby'), new RegExp(`${id}-error`));
  }
  assert.equal(document.activeElement, field(document, 'email'));
  assert.equal(navigate.mock.callCount(), 0);
});

test('a wrong password shows one message, clears the password and keeps the address', async () => {
  const { document, api, navigate } = setup('app/login.html', await signedOut(memory()));
  fill(document, { email: person.email, password: 'wrong password' });
  assert.equal(await api.submit(), false);
  assert.match(field(document, 'auth-error').textContent, /Неверная почта или пароль/);
  assert.equal(field(document, 'auth-error').hidden, false);
  assert.equal(field(document, 'password').value, '');
  assert.equal(field(document, 'email').value, person.email);
  assert.equal(document.activeElement, field(document, 'password'));
  assert.equal(document.querySelector('[type="submit"]').disabled, false);
  assert.equal(navigate.mock.callCount(), 0);
});

test('a right password signs in and opens the dashboard', async () => {
  const storage = await signedOut(memory());
  const { document, navigate, api } = setup('app/login.html', storage);
  fill(document, { email: person.email, password: person.password });
  assert.equal(await api.submit(), true);
  assert.deepEqual(navigate.mock.calls[0].arguments, ['dashboard.html']);
  assert.equal(createAccountStore({ storage }).current().name, 'Ксения');
  assert.equal(field(document, 'password').value, '');
});

test('the English sign-in page answers in English', async () => {
  const { document, api } = setup('en/app/login.html');
  fill(document, { email: person.email, password: 'wrong password' });
  await api.submit();
  assert.match(field(document, 'auth-error').textContent, /The email or the password is wrong/);
});

test('registration checks every field, then creates the account and opens the welcome page', async () => {
  const { document, navigate, storage, api } = setup('app/register.html');
  fill(document, { name: 'К', email: 'bad', password: '123', confirm: '321' });
  assert.equal(await api.submit(), false);
  for (const id of ['name', 'email', 'password', 'confirm']) assert.equal(field(document, `${id}-error`).hidden, false, id);
  assert.equal(document.activeElement, field(document, 'name'));
  fill(document, { ...person, confirm: 'another phrase' });
  assert.equal(await api.submit(), false);
  assert.equal(field(document, 'name-error').hidden, true);
  assert.equal(field(document, 'confirm-error').hidden, false);
  fill(document, { password: person.password, confirm: person.password });
  assert.equal(await api.submit(), true);
  assert.deepEqual(navigate.mock.calls[0].arguments, ['welcome.html']);
  assert.equal(storage.get('accounts').length, 1);
  assert.equal(field(document, 'password').value, '');
  assert.equal(field(document, 'confirm').value, '');
});

test('registering a known address says so and focuses the address', async () => {
  const { document, api } = setup('app/register.html', await signedOut(memory()));
  fill(document, { ...person, confirm: person.password });
  assert.equal(await api.submit(), false);
  assert.match(field(document, 'auth-error').textContent, /Аккаунт с такой почтой уже есть/);
  assert.equal(document.activeElement, field(document, 'email'));
});

test('a browser without Web Crypto gets an explanation', async () => {
  const window = load('app/register.html');
  const api = initAuthForm({ root: window.document, storage: memory(), crypto: null, navigate: mock.fn() });
  fill(window.document, { ...person, confirm: person.password });
  assert.equal(await api.submit(), false);
  assert.match(field(window.document, 'auth-error').textContent, /не поддерживает безопасное хранение/);
});

test('a second submit while the first one is running is ignored', async () => {
  const { document, api, storage } = setup('app/register.html');
  fill(document, { ...person, confirm: person.password });
  const first = api.submit();
  assert.equal(await api.submit(), false);
  assert.equal(await first, true);
  assert.equal(storage.get('accounts').length, 1);
});

test('a field is checked when it is left and then while typing; the confirmation follows the password', () => {
  const { window, document } = setup('app/register.html');
  const type = (id, value, event = 'input') => {
    field(document, id).value = value;
    field(document, id).dispatchEvent(new window.Event(event, { bubbles: true }));
  };
  type('email', 'bad');
  assert.equal(field(document, 'email-error').hidden, true);
  type('email', 'bad', 'change');
  assert.equal(field(document, 'email-error').hidden, false);
  type('email', 'good@example.com');
  assert.equal(field(document, 'email-error').hidden, true);
  assert.equal(field(document, 'email').getAttribute('aria-describedby'), 'email-hint');
  type('password', 'long enough');
  type('confirm', 'something', 'change');
  assert.equal(field(document, 'confirm-error').hidden, false);
  type('password', 'something');
  assert.equal(field(document, 'confirm-error').hidden, true);
  type('password', 'other thing');
  assert.equal(field(document, 'confirm-error').hidden, true);
  document.querySelector('#auth-form').dispatchEvent(new window.Event('input', { bubbles: true }));
});

test('a signed-in user who opens a sign-in page is sent to the dashboard', async () => {
  const { navigate } = setup('app/login.html', await signedIn(memory()));
  assert.deepEqual(navigate.mock.calls[0].arguments, ['dashboard.html']);
});

test('the form and the menu work without a passed navigate function', () => {
  assert.ok(initAuthForm({ root: load('app/login.html').document, storage: memory() }));
  const window = load('index.html');
  const storage = memory();
  const api = initAuthMenu({ root: window.document, storage });
  assert.ok(api);
  const logout = window.document.querySelector('[data-auth-logout]');
  logout.hidden = false;
  assert.doesNotThrow(() => logout.click());
});

const menu = (name, storage = memory()) => {
  const window = load(name);
  const navigate = mock.fn();
  const api = initAuthMenu({ root: window.document, storage, navigate });
  return { window, document: window.document, navigate, storage, api };
};
const shown = (document, selector) => [...document.querySelectorAll(selector)].every((node) => !node.hidden);

test('a guest sees the sign-in and registration links and no sign-out', () => {
  const { document, api } = menu('index.html');
  assert.equal(api.user(), null);
  assert.equal(shown(document, '[data-auth-guest]'), true);
  assert.equal(shown(document, '[data-auth-user]'), false);
});

test('a signed-in user sees the name and the sign-out button', async () => {
  const { document } = menu('app/dashboard.html', await signedIn(memory()));
  assert.equal(shown(document, '[data-auth-guest]'), false);
  assert.equal(shown(document, '[data-auth-user]'), true);
  assert.equal(document.querySelector('[data-auth-name]').textContent, 'Ксения');
});

test('the settings gear replaces the initials on every application page', () => {
  for (const name of ['app/dashboard.html', 'app/editor.html']) {
    const link = load(name).document.querySelector('.app-topbar__avatar, .editor-toolbar__avatar');
    assert.equal(link.getAttribute('href'), 'settings.html');
    assert.equal(link.getAttribute('aria-label'), 'Настройки');
    assert.ok(link.querySelector('svg'));
    assert.equal(link.textContent.trim(), '');
  }
});

test('signing out clears the session and opens the home page of the page', async () => {
  const storage = await signedIn(memory());
  const { window, document, navigate, api } = menu('app/editor.html', storage);
  document.body.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(navigate.mock.callCount(), 0);
  document.querySelector('[data-auth-logout]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(storage.get('session'), null);
  assert.equal(api.user(), null);
  assert.deepEqual(navigate.mock.calls[0].arguments, ['../index.html']);
  assert.equal(shown(document, '[data-auth-guest]'), true);
});

test('a sign-out button outside a menu goes to the current folder, and a change in another tab updates the menu', async () => {
  const storage = await signedIn(memory());
  const { window, document, navigate, api } = menu('index.html', storage);
  const stray = document.createElement('button');
  stray.dataset.authLogout = '';
  document.body.append(stray);
  stray.click();
  assert.deepEqual(navigate.mock.calls[0].arguments, ['./']);
  assert.equal(shown(document, '[data-auth-user]'), false);
  await createAccountStore({ storage }).login(person);
  window.dispatchEvent(new window.Event('storage'));
  assert.equal(api.render().name, 'Ксения');
  assert.equal(shown(document, '[data-auth-user]'), true);
});
