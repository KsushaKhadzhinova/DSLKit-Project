import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initSettings } from '../../site/js/components/settings.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const load = () => new JSDOM(readFileSync('site/app/settings.html', 'utf8'), { url: 'http://localhost/' }).window;
const memory = () => createStorage(createMemoryBackend());

test('a page without settings returns null', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initSettings({ root: document, storage: memory() }), null);
  const empty = new JSDOM('<!doctype html><html><body><main class="settings"></main></body></html>').window;
  assert.equal(initSettings({ root: empty.document, storage: memory() }), null);
});

test('changing a switch and a select saves the value', () => {
  const window = load();
  const { document } = window;
  const storage = memory();
  const api = initSettings({ root: document, storage });
  const wrap = document.querySelector('#line-wrap');
  wrap.checked = true;
  wrap.dispatchEvent(new window.Event('change', { bubbles: true }));
  const size = document.querySelector('#code-font-size');
  size.selectedIndex = size.options.length - 1;
  size.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(storage.get('settings')['line-wrap'], true);
  assert.equal(storage.get('settings')['code-font-size'], size.value);
  assert.equal(api.values()['line-wrap'], true);
});

test('a change of something that is not a setting is ignored', () => {
  const window = load();
  const { document } = window;
  const storage = memory();
  initSettings({ root: document, storage });
  document.querySelector('.settings__title').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(storage.get('settings'), null);
});

test('saved values are restored after a reload', () => {
  const storage = memory();
  const first = load();
  initSettings({ root: first.document, storage });
  const wrap = first.document.querySelector('#line-wrap');
  wrap.checked = true;
  wrap.dispatchEvent(new first.Event('change', { bubbles: true }));
  const guides = first.document.querySelector('#guides');
  guides.checked = false;
  guides.dispatchEvent(new first.Event('change', { bubbles: true }));
  const size = first.document.querySelector('#code-font-size');
  size.selectedIndex = size.options.length - 1;
  size.dispatchEvent(new first.Event('change', { bubbles: true }));
  const second = load();
  initSettings({ root: second.document, storage });
  assert.equal(second.document.querySelector('#line-wrap').checked, true);
  assert.equal(second.document.querySelector('#guides').checked, false);
  assert.equal(second.document.querySelector('#code-font-size').value, size.value);
});

test('an unknown option and a corrupted saved value are ignored', () => {
  const storage = memory();
  storage.set('settings', { 'code-font-size': 'no-such-option', 'unknown-id': true });
  const { document } = load();
  const before = document.querySelector('#code-font-size').value;
  initSettings({ root: document, storage });
  assert.equal(document.querySelector('#code-font-size').value, before);
  storage.set('settings', ['broken']);
  assert.deepEqual(initSettings({ root: load().document, storage }).values(), {});
});

test('a value written by another component between two changes is kept', () => {
  const window = load();
  const { document } = window;
  const storage = memory();
  initSettings({ root: document, storage });
  const wrap = document.querySelector('#line-wrap');
  wrap.checked = true;
  wrap.dispatchEvent(new window.Event('change', { bubbles: true }));
  storage.set('settings', { ...storage.get('settings'), autosave: true });
  wrap.checked = false;
  wrap.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(storage.get('settings').autosave, true);
  assert.equal(storage.get('settings')['line-wrap'], false);
});
