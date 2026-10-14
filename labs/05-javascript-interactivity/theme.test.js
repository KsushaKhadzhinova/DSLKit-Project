import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { THEMES, applyTheme, initTheme } from '../../site/js/components/theme.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const load = (page) => new JSDOM(readFileSync(`site/${page}`, 'utf8'), { url: 'http://localhost/' }).window;
const memory = () => createStorage(createMemoryBackend());
const fakeMedia = (dark) => {
  const listeners = [];
  const media = (query) => ({ matches: dark.value, media: query, addEventListener: (type, listener) => listeners.push(listener) });
  media.fire = () => listeners.forEach((listener) => listener());
  return media;
};
const change = (window, element) => element.dispatchEvent(new window.Event('change', { bubbles: true }));

test('the theme list and applyTheme set the data attribute', () => {
  assert.deepEqual(THEMES, ['light', 'dark']);
  const { document } = load('index.html');
  applyTheme(document.documentElement, 'dark');
  assert.equal(document.documentElement.dataset.theme, 'dark');
});

test('without a saved choice the theme follows the system preference', () => {
  const dark = { value: true };
  const window = load('index.html');
  const api = initTheme({ root: window.document, storage: memory(), matchMedia: fakeMedia(dark) });
  assert.equal(api.current(), 'dark');
  assert.equal(api.choice(), 'auto');
  assert.equal(window.document.documentElement.dataset.theme, 'dark');
  assert.equal(window.document.querySelector('.theme__input').checked, true);
});

test('a light system gives the light theme and a missing matchMedia is treated as light', () => {
  const window = load('index.html');
  assert.equal(initTheme({ root: window.document, storage: memory(), matchMedia: fakeMedia({ value: false }) }).current(), 'light');
  assert.equal(initTheme({ root: load('index.html').document, storage: memory(), matchMedia: undefined }).current(), 'light');
});

test('a saved dark or light choice wins over the system', () => {
  const storage = memory();
  storage.set('theme', 'dark');
  const window = load('index.html');
  assert.equal(initTheme({ root: window.document, storage, matchMedia: fakeMedia({ value: false }) }).current(), 'dark');
  storage.set('theme', 'light');
  assert.equal(initTheme({ root: load('index.html').document, storage, matchMedia: fakeMedia({ value: true }) }).current(), 'light');
});

test('an unknown saved value is treated as auto', () => {
  const storage = memory();
  storage.set('theme', 'purple');
  const api = initTheme({ root: load('index.html').document, storage, matchMedia: fakeMedia({ value: false }) });
  assert.equal(api.choice(), 'auto');
});

test('the header toggle saves and applies the chosen theme', () => {
  const window = load('index.html');
  const storage = memory();
  const api = initTheme({ root: window.document, storage, matchMedia: fakeMedia({ value: false }) });
  const toggle = window.document.querySelector('.theme__input');
  toggle.checked = true;
  change(window, toggle);
  assert.equal(api.current(), 'dark');
  assert.equal(storage.get('theme'), 'dark');
  assert.equal(window.document.documentElement.dataset.theme, 'dark');
  toggle.checked = false;
  change(window, toggle);
  assert.equal(storage.get('theme'), 'light');
});

test('the settings radios save the choice and follow it', () => {
  const window = load('app/settings.html');
  const storage = memory();
  const api = initTheme({ root: window.document, storage, matchMedia: fakeMedia({ value: true }) });
  const radio = (value) => window.document.querySelector(`input[name="theme"][value="${value}"]`);
  assert.equal(radio('auto').checked, true);
  radio('light').checked = true;
  change(window, radio('light'));
  assert.equal(api.current(), 'light');
  assert.equal(storage.get('theme'), 'light');
  radio('auto').checked = true;
  change(window, radio('auto'));
  assert.equal(api.current(), 'dark');
  assert.equal(storage.get('theme'), 'auto');
});

test('a change of something that is not a theme radio is ignored', () => {
  const window = load('app/settings.html');
  const storage = memory();
  initTheme({ root: window.document, storage, matchMedia: fakeMedia({ value: false }) });
  change(window, window.document.querySelector('#line-wrap'));
  assert.equal(storage.get('theme'), null);
  const odd = window.document.createElement('input');
  odd.type = 'radio';
  odd.name = 'theme';
  odd.value = 'purple';
  window.document.body.append(odd);
  change(window, odd);
  assert.equal(storage.get('theme'), null);
});

test('the auto choice follows later system changes and a fixed choice does not', () => {
  const dark = { value: false };
  const media = fakeMedia(dark);
  const window = load('index.html');
  const api = initTheme({ root: window.document, storage: memory(), matchMedia: media });
  dark.value = true;
  media.fire();
  assert.equal(api.current(), 'dark');
  const toggle = window.document.querySelector('.theme__input');
  toggle.checked = false;
  change(window, toggle);
  dark.value = true;
  media.fire();
  assert.equal(api.current(), 'light');
});

test('a media query object without addEventListener is tolerated', () => {
  const media = () => ({ matches: false });
  assert.equal(initTheme({ root: load('index.html').document, storage: memory(), matchMedia: media }).current(), 'light');
});

test('a page without any theme control still gets the saved theme and the default matchMedia works in jsdom', () => {
  const storage = memory();
  storage.set('theme', 'dark');
  const window = load('errors/404.html');
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener: () => {} });
  const api = initTheme({ root: window.document, storage });
  assert.equal(api.current(), 'dark');
  assert.equal(window.document.documentElement.dataset.theme, 'dark');
});

test('a document without a window falls back to light', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initTheme({ root: document, storage: memory() }).current(), 'light');
});
