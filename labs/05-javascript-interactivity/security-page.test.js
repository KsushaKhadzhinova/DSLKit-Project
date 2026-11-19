import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initSecurity } from '../../site/js/components/security.js';
import { hotp, stepOf } from '../../site/js/auth/totp.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { hashCode } from '../../tools/dev-code.js';

const pages = { ru: readFileSync('site/app/settings.html', 'utf8'), en: readFileSync('site/en/app/settings.html', 'utf8') };
const person = { name: 'Ксения', email: 'k@example.com', password: 'correct horse' };
const adminHash = hashCode('admin-code');
const clock = { at: 1_700_000_000_000 };
const now = () => clock.at;

const until = async (check) => {
  for (let index = 0; index < 400; index += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail('the condition was not reached');
};
const open = async ({ lang = 'ru', signedIn = true } = {}) => {
  const storage = createStorage(createMemoryBackend());
  const store = createAccountStore({ storage, now, adminHash });
  if (signedIn) await store.register(person);
  const window = new JSDOM(pages[lang], { url: 'http://localhost/' }).window;
  const navigate = mock.fn();
  const api = initSecurity({ root: window.document, storage, now, navigate });
  const { document } = window;
  const $ = (selector) => document.querySelector(selector);
  const status = (name) => $(`[data-status="${name}"]`);
  const type = (id, value) => {
    $(`#${id}`).value = value;
    $(`#${id}`).dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  const submit = (id) => $(`#${id}`).dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  return { storage, store, window, document, navigate, api, $, status, type, submit };
};

test('a page without the section starts nothing', () => {
  const { document } = new JSDOM('<body></body>').window;
  assert.equal(initSecurity({ root: document, storage: createStorage(createMemoryBackend()) }), null);
});

test('a guest sees the invitation to sign in and no controls', async () => {
  const { $, type } = await open({ signedIn: false });
  assert.equal($('[data-security-guest]').hidden, false);
  assert.equal($('[data-security-user]').hidden, true);
  // The meter reads the typed text even when nobody is signed in.
  type('security-new', 'password');
  assert.match($('[data-meter-text]').textContent, /не принят/);
});

test('a signed-in user sees the session of this device and the first events of the log', async () => {
  const { $, document } = await open();
  assert.equal($('[data-security-user]').hidden, false);
  const rows = [...document.querySelectorAll('[data-session-list] li')];
  assert.equal(rows.length, 1);
  assert.match(rows[0].textContent, /Это устройство/);
  assert.match(rows[0].textContent, /Сессия: запомнен/);
  assert.equal($('[data-revoke-others]').hidden, true);
  assert.deepEqual(
    [...document.querySelectorAll('[data-audit-list] li')].map((item) => item.textContent.split(' · ').at(-1)),
    ['Вход', 'Аккаунт создан'],
  );
  assert.equal($('[data-security-admin]').hidden, true);
  assert.equal($('[data-totp-state]').textContent, 'Двухфакторная аутентификация выключена.');
});

test('the English page says the same things in English', async () => {
  const { $, document } = await open({ lang: 'en' });
  assert.match(document.querySelector('[data-session-list] li').textContent, /This device/);
  assert.match(document.querySelector('[data-audit-list] li').textContent, /Sign-in/);
  assert.equal($('[data-totp-state]').textContent, 'Two-factor authentication is off.');
});

test('the password form checks the confirmation, the old password and the policy, then changes the password', async () => {
  const { $, type, submit, status, store, storage } = await open();
  type('security-old', person.password);
  type('security-new', 'another horse 7');
  type('security-confirm', 'different');
  submit('security-password-form');
  assert.match(status('password').textContent, /не совпадают/);
  assert.match($('[data-meter-text]').textContent, /Хороший|Средний|Слабый|Надёжный/);

  type('security-confirm', 'another horse 7');
  type('security-old', 'wrong one 1');
  submit('security-password-form');
  await until(() => /неверный/.test(status('password').textContent));
  assert.equal(status('password').dataset.kind, 'error');

  type('security-old', person.password);
  type('security-new', 'password');
  type('security-confirm', 'password');
  submit('security-password-form');
  await until(() => /Пароль не принят: это один/.test(status('password').textContent));

  type('security-new', 'another horse 7');
  type('security-confirm', 'another horse 7');
  submit('security-password-form');
  await until(() => /Пароль изменён/.test(status('password').textContent));
  assert.equal($('#security-old').value, '');
  assert.equal($('[data-meter-text]').textContent, '');
  assert.equal((await store.login({ email: person.email, password: 'another horse 7' })).ok, true);
  assert.ok(storage.get('audit').some((event) => event.type === 'password-change'));
});

test('too many wrong old passwords show the wait', async () => {
  const { type, submit, status } = await open();
  for (let index = 0; index < 5; index += 1) {
    type('security-old', 'wrong one 1');
    type('security-new', 'another horse 7');
    type('security-confirm', 'another horse 7');
    submit('security-password-form');
    await until(() => status('password').textContent !== '' && !/^$/.test(status('password').textContent));
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  await until(() => /Подождите/.test(status('password').textContent));
});

test('other sessions are listed and revoked; revoking this device signs out and opens the sign-in page', async () => {
  const { $, document, store, storage, status, navigate, window } = await open();
  clock.at += 1000;
  const second = createAccountStore({ storage, now, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/120' });
  await second.login({ email: person.email, password: person.password, remember: false });
  clock.at += 1000;
  await store.login({ email: person.email, password: person.password });
  window.dispatchEvent(new window.Event('storage'));
  const rows = [...document.querySelectorAll('[data-session-list] li')];
  assert.equal(rows.length, 3);
  assert.match(rows.map((row) => row.textContent).join('|'), /Firefox · Linux[\s\S]*Сессия: короткая/);
  assert.equal($('[data-revoke-others]').hidden, false);
  rows
    .find((row) => !row.textContent.includes('Это устройство'))
    .querySelector('button')
    .click();
  assert.match(status('sessions').textContent, /Сессия завершена/);
  assert.equal(document.querySelectorAll('[data-session-list] li').length, 2);
  $('[data-revoke-others]').click();
  assert.match(status('sessions').textContent, /Завершено других сессий: 1/);
  assert.equal(document.querySelectorAll('[data-session-list] li').length, 1);
  document.querySelector('[data-session-list] button').click();
  assert.deepEqual(navigate.mock.calls[0].arguments, ['login.html']);
  // A click on something else does nothing, and a revoke of a vanished session is explained.
  $('[data-security]').click();
  const stale = document.createElement('button');
  stale.dataset.revoke = 'gone';
  $('[data-security]').append(stale);
  stale.click();
  assert.match(status('sessions').textContent, /Нужно войти|Войдите|Такой записи нет/);
});

test('two-factor authentication: set up with a code, see the recovery codes once, turn off with the password', async () => {
  const { $, document, type, submit, status, store } = await open();
  $('[data-totp-start]').click();
  const secret = $('[data-totp-secret]').textContent;
  assert.match(secret, /^[A-Z2-7]{32}$/);
  assert.match($('[data-totp-uri]').textContent, /^otpauth:\/\/totp\//);
  assert.equal($('[data-totp-setup]').hidden, false);
  type('totp-code', '000000');
  submit('totp-setup-form');
  await until(() => /Код неверный/.test(status('totp').textContent));
  type('totp-code', await hotp(secret, stepOf(now())));
  submit('totp-setup-form');
  await until(() => $('[data-recovery]').hidden === false);
  assert.equal(document.querySelectorAll('[data-recovery-list] li').length, 8);
  assert.match($('[data-totp-state]').textContent, /включена. Резервных кодов осталось: 8/);
  assert.equal($('[data-totp-start]').hidden, true);
  assert.equal($('[data-totp-disable]').hidden, false);
  assert.equal($('[data-totp-setup]').hidden, true);
  assert.equal(store.totpStatus().enabled, true);
  $('[data-totp-start]').click();
  assert.match(status('totp').textContent, /уже включена/);

  type('totp-password', 'wrong one 1');
  submit('totp-disable-form');
  await until(() => /Пароль неверный/.test(status('totp').textContent));
  type('totp-password', person.password);
  submit('totp-disable-form');
  await until(() => $('[data-totp-start]').hidden === false);
  assert.equal($('[data-recovery]').hidden, true);
  assert.match(status('totp').textContent, /выключена/);
});

test('an admin sees the accounts, changes a role, is stopped at the last admin and may read the events of all', async () => {
  const { $, document, store, status, storage } = await open();
  await store.becomeDeveloper('admin-code');
  const second = createAccountStore({ storage, now });
  const mine = store.current().id;
  await second.register({ name: 'Иван', email: 'ivan@example.com', password: 'another horse 7' });
  await store.login({ email: person.email, password: person.password });
  const view = initSecurity({ root: document, storage, now, navigate: () => {} });
  view.render();
  assert.equal($('[data-security-admin]').hidden, false);
  assert.equal($('#audit-all-field').hidden, false);
  const rows = [...document.querySelectorAll('[data-account-list] tr')];
  assert.equal(rows.length, 2);
  assert.match(rows[0].textContent, /k@example\.com/);
  assert.equal(rows[0].querySelector('select').value, 'admin');

  const ownSelect = document.querySelector(`[data-role-of="${mine}"]`);
  ownSelect.value = 'user';
  ownSelect.dispatchEvent(new document.defaultView.Event('change', { bubbles: true }));
  assert.match(status('accounts').textContent, /последнего администратора/);
  assert.equal(document.querySelector(`[data-role-of="${mine}"]`).value, 'admin');

  const other = document.querySelector('[data-role-of]:not([data-role-of="' + mine + '"])');
  other.value = 'developer';
  other.dispatchEvent(new document.defaultView.Event('change', { bubbles: true }));
  assert.match(status('accounts').textContent, /Роль изменена/);

  $('#audit-all').checked = true;
  $('#audit-all').dispatchEvent(new document.defaultView.Event('change', { bubbles: true }));
  const lines = [...document.querySelectorAll('[data-audit-list] li')].map((item) => item.textContent);
  assert.ok(lines.some((line) => line.includes('Иван: ')));
  assert.ok(lines.some((line) => /Роль изменена: user>developer/.test(line)));
});

test('an account without a creation date is listed and an unknown author of an event keeps its id', async () => {
  const { $, document, storage, store, window } = await open();
  await store.becomeDeveloper('admin-code');
  window.dispatchEvent(new window.Event('storage'));
  assert.notEqual(document.querySelectorAll('[data-account-list] tr td:last-child')[0].textContent, '');
  const accounts = storage.get('accounts');
  delete accounts[0].created;
  accounts[0].totp = { enabled: true, secret: 'JBSWY3DPEHPK3PXP' };
  storage.set('accounts', accounts);
  const stranger = { userId: 'uXX', type: 'sign-in', at: now() };
  storage.set('audit', [...storage.get('audit'), stranger]);
  window.dispatchEvent(new window.Event('storage'));
  $('#audit-all').checked = true;
  $('#audit-all').dispatchEvent(new document.defaultView.Event('change', { bubbles: true }));
  assert.ok([...document.querySelectorAll('[data-audit-list] li')].some((item) => item.textContent.includes('uXX: ')));
  assert.equal(document.querySelectorAll('[data-account-list] tr td:last-child')[0].textContent, '');
  assert.ok([...document.querySelectorAll('[data-account-list] tr td')].some((cell) => cell.textContent === '2FA'));
});

test('an empty log is explained', async () => {
  const { storage, document, window } = await open();
  storage.set('audit', []);
  window.dispatchEvent(new window.Event('storage'));
  assert.match(document.querySelector('[data-audit-list] li').textContent, /Событий пока нет/);
});

test('the account is deleted after the password and the visitor goes to the home page', async () => {
  const { $, type, submit, status, navigate, storage } = await open();
  type('security-delete-password', 'wrong one 1');
  submit('security-delete-form');
  await until(() => /Пароль неверный/.test(status('delete').textContent));
  assert.equal(navigate.mock.callCount(), 0);
  type('security-delete-password', person.password);
  submit('security-delete-form');
  await until(() => navigate.mock.callCount() === 1);
  assert.deepEqual(navigate.mock.calls[0].arguments, ['../index.html']);
  assert.match(status('delete').textContent, /Аккаунт удалён/);
  assert.deepEqual(storage.get('accounts'), []);
  assert.equal($('[data-security-guest]').hidden, true);
});

test('the default navigation uses the location of the window', async () => {
  const storage = createStorage(createMemoryBackend());
  await createAccountStore({ storage, now }).register(person);
  const window = new JSDOM(pages.ru, { url: 'http://localhost/app/settings.html' }).window;
  const { document } = window;
  document.querySelector('[data-security]').dataset.home = '#home';
  initSecurity({ root: document, storage, now });
  document.querySelector('#security-delete-password').value = person.password;
  document.querySelector('#security-delete-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await until(() => window.location.hash === '#home');
});

test('the page runs on the real clock when none is given', async () => {
  const { storage, window } = await open();
  assert.ok(initSecurity({ root: window.document, storage, navigate: () => {} }));
});
