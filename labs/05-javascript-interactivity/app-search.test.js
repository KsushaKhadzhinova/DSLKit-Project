import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initAppSearch } from '../../site/js/components/app-search.js';

const pages = { dashboard: readFileSync('site/app/dashboard.html', 'utf8'), welcome: readFileSync('site/app/welcome.html', 'utf8') };

const setup = (page = 'welcome') => {
  const window = new JSDOM(pages[page], { url: `http://localhost/app/${page}.html` }).window;
  const went = [];
  const api = initAppSearch({ root: window.document, navigate: (url) => went.push(url) });
  const input = window.document.querySelector('.app-topbar__search-input');
  const key = (target, init) => {
    const event = new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };
  return { window, api, input, went, key };
};

test('a page without the search box returns null', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initAppSearch({ root: document }), null);
});

test('outside the project list Enter and the magnifier open the list with the query', () => {
  const t = setup('welcome');
  t.input.value = ' order ';
  assert.equal(t.key(t.input, { key: 'Enter' }).defaultPrevented, true);
  assert.deepEqual(t.went, ['dashboard.html?q=order']);
  t.input.value = 'a b&c';
  t.window.document.querySelector('.app-topbar__search-button').dispatchEvent(new t.window.MouseEvent('click', { bubbles: true }));
  assert.equal(t.went[1], 'dashboard.html?q=a%20b%26c');
  assert.equal(t.key(t.input, { key: 'a' }).defaultPrevented, false);
});

test('on the project list the box only keeps the focus, the list filters by itself', () => {
  const t = setup('dashboard');
  assert.equal(t.api.submit(), false);
  assert.equal(t.window.document.activeElement, t.input);
  t.key(t.input, { key: 'Enter' });
  assert.deepEqual(t.went, []);
});

test('Ctrl+K and Cmd+K put the cursor into the box, other keys do not', () => {
  const t = setup('welcome');
  t.window.document.body.focus();
  assert.equal(t.key(t.window.document.body, { key: 'k', ctrlKey: true }).defaultPrevented, true);
  assert.equal(t.window.document.activeElement, t.input);
  t.input.blur();
  assert.equal(t.key(t.window.document.body, { key: 'K', metaKey: true }).defaultPrevented, true);
  assert.equal(t.key(t.window.document.body, { key: 'k' }).defaultPrevented, false);
  assert.equal(t.key(t.window.document.body, { key: 'x', ctrlKey: true }).defaultPrevented, false);
});

test('without the magnifier and with the default navigation the box still works', () => {
  const window = new JSDOM('<!doctype html><html lang="ru"><body><input class="app-topbar__search-input"></body></html>', { url: 'http://localhost/app/welcome.html' }).window;
  const api = initAppSearch({ root: window.document });
  assert.doesNotThrow(() => api.submit());
});
