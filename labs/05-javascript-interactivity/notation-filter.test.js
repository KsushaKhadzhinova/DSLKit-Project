import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initNotationFilter } from '../../site/js/components/notation-filter.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const load = (page) => new JSDOM(readFileSync(`site/${page}`, 'utf8'), { url: 'http://localhost/' }).window;
const memory = () => createStorage(createMemoryBackend());
const click = (window, element) => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const visible = (document) => [...document.querySelectorAll('#notations-list li')].filter((item) => !item.hidden).length;
const chip = (document, name) => document.querySelector(`.filter__chip[data-filter="${name}"]`);

test('without the notation list nothing is built', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initNotationFilter({ root: document, storage: memory() }), null);
});

test('a list without status items is ignored', () => {
  const { document } = new JSDOM('<!doctype html><html><body><ul id="notations-list"><li>x</li></ul></body></html>').window;
  assert.equal(initNotationFilter({ root: document, storage: memory() }), null);
});

test('the Russian page gets three chips and a live region and shows all six cards', () => {
  const { document } = load('index.html');
  const api = initNotationFilter({ root: document, storage: memory() });
  const group = document.querySelector('.filter');
  assert.equal(group.getAttribute('aria-label'), 'Фильтр по статусу');
  assert.deepEqual(
    [...group.querySelectorAll('button')].map((button) => button.textContent),
    ['Все', 'В бете', 'В планах'],
  );
  assert.equal(group.nextElementSibling.getAttribute('role'), 'status');
  assert.equal(group.nextElementSibling.textContent, 'Показано 6 из 6');
  assert.equal(chip(document, 'all').getAttribute('aria-pressed'), 'true');
  assert.equal(api.current(), 'all');
  assert.equal(visible(document), 6);
});

test('clicking a chip hides the cards of the other status and updates the pressed state', () => {
  const window = load('index.html');
  const { document } = window;
  const storage = memory();
  initNotationFilter({ root: document, storage });
  click(window, chip(document, 'beta'));
  assert.equal(visible(document), 3);
  assert.equal(chip(document, 'beta').getAttribute('aria-pressed'), 'true');
  assert.equal(chip(document, 'all').getAttribute('aria-pressed'), 'false');
  assert.ok(chip(document, 'beta').classList.contains('filter__chip--active'));
  assert.equal(document.querySelector('.filter + p').textContent, 'Показано 3 из 6');
  assert.equal(storage.get('notation-filter'), 'beta');
  click(window, chip(document, 'planned'));
  assert.equal(visible(document), 3);
  assert.equal(storage.get('notation-filter'), 'planned');
  click(window, chip(document, 'all'));
  assert.equal(visible(document), 6);
});

test('a click outside the chips changes nothing', () => {
  const window = load('index.html');
  const { document } = window;
  initNotationFilter({ root: document, storage: memory() });
  click(window, document.querySelector('.filter'));
  assert.equal(visible(document), 6);
});

test('the saved filter is restored after a reload', () => {
  const storage = memory();
  storage.set('notation-filter', 'planned');
  const { document } = load('index.html');
  initNotationFilter({ root: document, storage });
  assert.equal(visible(document), 3);
  assert.equal(chip(document, 'planned').getAttribute('aria-pressed'), 'true');
});

test('an unknown saved value falls back to all', () => {
  const storage = memory();
  storage.set('notation-filter', 'unknown');
  const { document } = load('index.html');
  const api = initNotationFilter({ root: document, storage });
  assert.equal(api.current(), 'all');
  assert.equal(visible(document), 6);
});

test('select works from the API and ignores unknown names', () => {
  const { document } = load('index.html');
  const api = initNotationFilter({ root: document, storage: memory() });
  api.select('beta');
  assert.equal(api.current(), 'beta');
  api.select('nonsense');
  assert.equal(api.current(), 'all');
});

test('the English page gets English labels', () => {
  const { document } = load('en/index.html');
  initNotationFilter({ root: document, storage: memory() });
  const group = document.querySelector('.filter');
  assert.equal(group.getAttribute('aria-label'), 'Filter by status');
  assert.deepEqual(
    [...group.querySelectorAll('button')].map((button) => button.textContent),
    ['All', 'In beta', 'Planned'],
  );
  assert.equal(group.nextElementSibling.textContent, 'Showing 6 of 6');
});

test('a failing storage does not break the filter', () => {
  const broken = createStorage({
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
    removeItem: () => {},
  });
  const window = load('index.html');
  const { document } = window;
  initNotationFilter({ root: document, storage: broken });
  click(window, chip(document, 'beta'));
  assert.equal(visible(document), 3);
});
