import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initAuthForm, initAuthMenu } from '../../site/js/components/auth.js';
import { initSettings } from '../../site/js/components/settings.js';
import { initTheme } from '../../site/js/components/theme.js';
import { initToasts } from '../../site/js/components/toast.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const memory = () => createStorage(createMemoryBackend());
const page = (name) => new JSDOM(readFileSync(`site/${name}`, 'utf8'), { url: 'http://localhost/' }).window;
const person = { name: 'Anna', email: 'anna@example.com', password: 'correct horse' };
const submitForm = async (name, values, storage) => {
  const window = page(name);
  const api = initAuthForm({ root: window.document, storage, navigate: mock.fn(), crypto: globalThis.crypto });
  Object.entries(values).forEach(([id, value]) => (window.document.querySelector(`#${id}`).value = value));
  assert.equal(await api.submit(), true);
};

test('signing in and registration leave a note for the next page, in both languages', async () => {
  const storage = memory();
  await submitForm('app/register.html', { name: 'Анна', email: 'ru@example.com', password: 'correct horse', confirm: 'correct horse' }, storage);
  assert.equal(storage.get('flash').text, 'Аккаунт создан, добро пожаловать!');
  await submitForm('en/app/register.html', { name: 'Anna', email: 'en@example.com', password: 'correct horse', confirm: 'correct horse' }, storage);
  assert.equal(storage.get('flash').text, 'The account is created, welcome!');
  createAccountStore({ storage }).logout();
  await submitForm('app/login.html', { email: 'ru@example.com', password: 'correct horse' }, storage);
  assert.equal(storage.get('flash').text, 'Вы вошли в аккаунт.');
  await submitForm('en/app/login.html', { email: 'en@example.com', password: 'correct horse' }, storage);
  assert.equal(storage.get('flash').text, 'You are signed in.');
});

test('signing out leaves a note, in both languages', async () => {
  for (const [name, text] of [
    ['app/dashboard.html', 'Вы вышли из аккаунта.'],
    ['en/app/dashboard.html', 'You are signed out.'],
  ]) {
    const storage = memory();
    await createAccountStore({ storage }).register(person);
    const window = page(name);
    initAuthMenu({ root: window.document, storage, navigate: mock.fn(), crypto: globalThis.crypto });
    window.document.querySelector('[data-auth-logout]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(storage.get('flash').text, text);
  }
});

test('a change of a setting and of the theme answers with a toast, in both languages', () => {
  for (const [name, setting, theme] of [
    ['app/settings.html', 'Настройка сохранена.', /^Тема: /],
    ['en/app/settings.html', 'The setting is saved.', /^Theme: /],
  ]) {
    const window = page(name);
    const storage = memory();
    initToasts({ root: window.document, storage });
    initTheme({ root: window.document, storage, matchMedia: () => ({ matches: false }) });
    initSettings({ root: window.document, storage });
    const box = window.document.querySelector('input.switch__input[type="checkbox"]');
    box.checked = !box.checked;
    box.dispatchEvent(new window.Event('change', { bubbles: true }));
    window.document.querySelector('[data-theme-switch]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const texts = [...window.document.querySelectorAll('.toast__text')].map((node) => node.textContent);
    assert.equal(texts[0], setting);
    assert.match(texts[1], theme);
  }
});
