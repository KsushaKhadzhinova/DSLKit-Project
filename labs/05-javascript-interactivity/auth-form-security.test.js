import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initAuthForm, waitText } from '../../site/js/components/auth.js';
import { attachPasswordMeter, issuesText, strengthLabel } from '../../site/js/components/password-meter.js';
import { hotp, stepOf } from '../../site/js/auth/totp.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const pages = Object.fromEntries(['app/login.html', 'app/register.html', 'en/app/login.html'].map((name) => [name, readFileSync(`site/${name}`, 'utf8')]));
const memory = () => createStorage(createMemoryBackend());
const person = { name: 'Ксения', email: 'k@example.com', password: 'correct horse' };
const field = (document, id) => document.querySelector(`#${id}`);
const fill = (document, values) => Object.entries(values).forEach(([id, value]) => (field(document, id).value = value));
const setup = (name, storage = memory(), extra = {}) => {
  const window = new JSDOM(pages[name], { url: 'http://localhost/' }).window;
  const navigate = mock.fn();
  const api = initAuthForm({ root: window.document, storage, navigate, crypto: globalThis.crypto, ...extra });
  return { window, document: window.document, navigate, storage, api };
};
const summary = (document) => field(document, 'auth-error');

test('wait times are written in the language of the page', () => {
  assert.equal(waitText(500, 'en'), '1 s');
  assert.equal(waitText(30_000, 'ru'), '30 с');
  assert.equal(waitText(125_000, 'en'), '2 min 5 s');
  assert.equal(waitText(61_000, 'ru'), '1 мин 1 с');
});

test('the strength meter shows nothing for an empty field, the first problem of a refused password and a level of an accepted one', () => {
  const { document } = setup('app/register.html');
  const bar = document.querySelector('[data-password-meter] meter');
  const text = document.querySelector('[data-meter-text]');
  const input = field(document, 'password');
  const type = (value) => {
    input.value = value;
    input.dispatchEvent(new document.defaultView.Event('input'));
  };
  assert.equal(text.textContent, '');
  type('password');
  assert.equal(bar.value, 0);
  assert.match(text.textContent, /Пароль не принят: это один из самых частых паролей/);
  type('correct horse battery staple');
  assert.equal(bar.value, 3);
  assert.equal(text.textContent, 'Хороший пароль');
  type('');
  assert.equal(text.textContent, '');
  fill(document, { name: 'Ксения Хаджинова', email: 'ksenia.k@example.com' });
  type('my ksenia.k phrase');
  assert.match(text.textContent, /почтой или именем/);
  assert.equal(strengthLabel(4, 'en'), 'Strong password');
  assert.equal(issuesText(['short', 'long'], 'en'), 'at least 8 characters, not only spaces; at most 128 characters');
});

test('the meter works with a context that is not given', () => {
  const { window } = new JSDOM('<input><meter></meter><span></span>');
  const { document } = window;
  const input = document.querySelector('input');
  const update = attachPasswordMeter({ input, bar: document.querySelector('meter'), text: document.querySelector('span'), lang: 'en' });
  input.value = 'abcd efgh ijkl';
  update();
  assert.equal(document.querySelector('span').textContent, 'Fair password');
});

test('registration refuses a password of the policy in the form and says why', async () => {
  const { document, navigate, storage, api } = setup('app/register.html');
  fill(document, { ...person, password: 'password', confirm: 'password' });
  assert.equal(await api.submit(), false);
  assert.match(summary(document).textContent, /Пароль не принят: это один из самых частых паролей/);
  assert.equal(document.activeElement, field(document, 'password'));
  assert.equal(navigate.mock.callCount(), 0);
  assert.equal(storage.get('accounts'), null);
});

test('"remember me" is read from the form: unticked gives a short session', async () => {
  const { document, storage, api } = setup('app/register.html');
  field(document, 'remember').checked = false;
  fill(document, { ...person, confirm: person.password });
  assert.equal(await api.submit(), true);
  assert.equal(storage.get('sessions')[0].remember, false);
});

test('the English form says that the password is not accepted in English', async () => {
  const { document, api } = setup('en/app/login.html');
  assert.equal(field(document, 'code-field').hidden, true);
  fill(document, { email: person.email, password: 'x' });
  await api.submit();
  assert.match(summary(document).textContent, /wrong/);
});

test('with the second factor on, the sign-in asks for a code after the right password and accepts a right code', async () => {
  const storage = memory();
  const now = () => Date.now();
  const store = createAccountStore({ storage, now });
  await store.register(person);
  const begun = store.beginTotp();
  await store.enableTotp({ code: await hotp(begun.secret, stepOf(now())) });
  store.logout();

  const { document, navigate, api } = setup('app/login.html', storage);
  fill(document, { email: person.email, password: person.password });
  assert.equal(await api.submit(), false);
  assert.equal(field(document, 'code-field').hidden, false);
  assert.match(summary(document).textContent, /Введите код из приложения/);
  assert.equal(field(document, 'password').value, person.password);
  assert.equal(document.activeElement, field(document, 'code'));

  assert.equal(await api.submit(), false);
  assert.equal(field(document, 'code-error').hidden, false);
  assert.equal(document.activeElement, field(document, 'code'));

  field(document, 'code').value = '000000';
  assert.equal(await api.submit(), false);
  assert.match(summary(document).textContent, /Код неверный или уже использован/);
  assert.equal(field(document, 'code').value, '');

  fill(document, { password: person.password, code: await hotp(begun.secret, stepOf(now()) + 1) });
  assert.equal(await api.submit(), true);
  assert.deepEqual(navigate.mock.calls[0].arguments, ['dashboard.html']);
});

test('a locked address shows a countdown, the button waits, and the form opens again when the time is over', async () => {
  const storage = memory();
  const clock = { at: 1_700_000_000_000 };
  const store = createAccountStore({ storage, now: () => clock.at });
  await store.register(person);
  store.logout();
  let tick = null;
  const stop = mock.fn();
  const every = mock.fn((callback) => {
    tick = callback;
    return stop;
  });
  const { document, api } = setup('app/login.html', storage, { now: () => clock.at, every });
  const button = document.querySelector('[type="submit"]');
  // The form shares the store clock through the real time, so the lock is made with the same clock by the store first.
  for (let index = 0; index < 5; index += 1) await store.login({ email: person.email, password: 'wrong one 1' });
  fill(document, { email: person.email, password: 'wrong one 1' });
  assert.equal(await api.submit(), false);
  assert.match(summary(document).textContent, /Слишком много неудачных попыток\. Подождите 30 с/);
  assert.equal(button.disabled, true);
  clock.at += 10_000;
  tick();
  assert.match(summary(document).textContent, /Подождите 20 с/);
  // A second lock while one is counting stops the first countdown.
  fill(document, { password: 'wrong one 1' });
  await api.submit();
  assert.equal(stop.mock.callCount(), 1);
  clock.at += 60_000;
  tick();
  assert.equal(button.disabled, false);
  assert.equal(summary(document).hidden, true);
  assert.equal(stop.mock.callCount() >= 2, true);
});

test('the default timer of the countdown is the one of the window', async () => {
  const storage = memory();
  const store = createAccountStore({ storage });
  await store.register(person);
  store.logout();
  for (let index = 0; index < 5; index += 1) await store.login({ email: person.email, password: 'wrong one 1' });
  const { window, document, api } = setup('app/login.html', storage);
  const set = mock.method(window, 'setInterval', () => 7);
  const clear = mock.method(window, 'clearInterval', () => {});
  fill(document, { email: person.email, password: 'wrong one 1' });
  await api.submit();
  assert.equal(set.mock.callCount(), 1);
  fill(document, { password: 'wrong one 1' });
  await api.submit();
  assert.deepEqual(clear.mock.calls[0].arguments, [7]);
});
