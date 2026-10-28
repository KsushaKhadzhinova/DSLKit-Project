import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initDashboard as start } from '../../site/js/components/dashboard.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

// The sample cards live in the shared section, most of these tests work with them.
const initDashboard = (options) => {
  const api = start({ seed: false, ...options });
  api?.show('shared');
  return api;
};
const html = readFileSync('site/app/dashboard.html', 'utf8');
const load = (source = html) => new JSDOM(source, { url: 'http://localhost/' }).window;
const memory = () => createStorage(createMemoryBackend());
const titles = (document) =>
  [...document.querySelectorAll('.project-list__item')]
    .filter((item) => !item.hidden)
    .map((item) => item.querySelector('.project-card__link').textContent.trim());
const chip = (document, name) => document.querySelector(`.filter__chip[data-filter="${name}"]`);

test('without the project list nothing is built', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initDashboard({ root: document, storage: memory() }), null);
});

test('the dashboard shows an example of every notation and a Russian count at the start', () => {
  const { document } = load();
  initDashboard({ root: document, storage: memory() });
  assert.equal(titles(document).length, 33);
  assert.equal(document.querySelector('#project-count').textContent, 'Найдено проектов: 33');
  assert.equal(chip(document, 'all').getAttribute('aria-pressed'), 'true');
  const tags = [...document.querySelectorAll('.project-card__tag')].map((node) => node.textContent);
  assert.equal(new Set(tags).size, 33);
});

test('a filter chip shows only projects of that notation and is saved', () => {
  const window = load();
  const { document } = window;
  const storage = memory();
  initDashboard({ root: document, storage });
  chip(document, 'erd').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.deepEqual(titles(document), ['Shop']);
  assert.equal(chip(document, 'erd').getAttribute('aria-pressed'), 'true');
  assert.ok(chip(document, 'erd').classList.contains('filter__chip--active'));
  assert.equal(storage.get('dashboard').filter, 'erd');
});

test('every other notation can be chosen from the list, and the list follows the filter', () => {
  const window = load();
  const { document } = window;
  initDashboard({ root: document, storage: memory() });
  const others = document.querySelector('#notation-filter');
  const values = [...others.options].map((option) => option.value).filter(Boolean);
  assert.equal(values.length, 29);
  assert.ok(!values.includes('erd') && values.includes('uml-class') && values.includes('petri'));
  others.value = 'uml-class';
  others.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(titles(document).length, 1);
  assert.equal(document.querySelector('.project-list__item:not([hidden]) .project-card__tag').textContent, 'UML · Class');
  assert.equal(chip(document, 'all').getAttribute('aria-pressed'), 'false');
  chip(document, 'dfd').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(others.value, '');
  others.value = '';
  others.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(titles(document).length, 33);
});

test('a click on the group but not on a chip changes nothing', () => {
  const window = load();
  const { document } = window;
  initDashboard({ root: document, storage: memory() });
  document.querySelector('.filter').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(titles(document).length, 33);
});

test('the search box filters by title ignoring case and shows an empty message', () => {
  const window = load();
  const { document } = window;
  initDashboard({ root: document, storage: memory() });
  const search = document.querySelector('.app-topbar__search-input');
  search.value = ' ORDER process ';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.deepEqual(titles(document), ['Order process']);
  search.value = 'zzz';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(titles(document).length, 0);
  assert.equal(document.querySelector('#project-count').textContent, 'Проектов не найдено');
});

test('the sort select reorders the list by name and in reverse', () => {
  const window = load();
  const { document } = window;
  initDashboard({ root: document, storage: memory() });
  const select = document.querySelector('#project-sort');
  const order = () => [...document.querySelectorAll('.project-list__item')].map((item) => item.querySelector('.project-card__link').textContent.trim());
  const initial = order();
  select.value = 'name';
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(
    order(),
    [...initial].sort((a, b) => a.localeCompare(b)),
  );
  select.value = 'oldest';
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(order(), [...initial].reverse());
  select.value = 'newest';
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(order(), initial);
});

test('the saved state is restored after a reload', () => {
  const storage = memory();
  storage.set('dashboard', { filter: 'bpmn', query: 'o', sort: 'name' });
  const { document } = load();
  initDashboard({ root: document, storage });
  assert.equal(titles(document).length, 1);
  assert.equal(document.querySelector('.app-topbar__search-input').value, 'o');
  assert.equal(document.querySelector('#project-sort').value, 'name');
  const other = memory();
  other.set('dashboard', { filter: 'uml-state', query: '', sort: 'newest' });
  const again = load().document;
  initDashboard({ root: again, storage: other });
  assert.equal(again.querySelector('#notation-filter').value, 'uml-state');
});

test('broken saved values fall back to the defaults', () => {
  const storage = memory();
  storage.set('dashboard', { filter: 'zzz', query: 5, sort: 'zzz' });
  const { document } = load();
  const api = initDashboard({ root: document, storage });
  assert.deepEqual(api.state(), { filter: 'all', query: '', sort: 'newest' });
  storage.set('dashboard', null);
  assert.deepEqual(initDashboard({ root: load().document, storage }).state(), { filter: 'all', query: '', sort: 'newest' });
});

test('update works from the API and the English page gets English labels', () => {
  const english = html.replace('<html lang="ru">', '<html lang="en">');
  const { document } = load(english);
  const api = initDashboard({ root: document, storage: memory() });
  api.update({ filter: 'dfd' });
  assert.equal(document.querySelector('#project-count').textContent, 'Projects found: 1');
  api.update({ query: 'nothing' });
  assert.equal(document.querySelector('#project-count').textContent, 'No projects found');
  assert.match(document.querySelector('#notation-filter').options[1].textContent, /[A-Za-z]/);
});

test('a page without chips, search, sort and count still works', () => {
  const { document } = new JSDOM(
    '<!doctype html><html lang="ru"><body><ul id="project-list"><li class="project-list__item" data-notation="erd"><article class="project-card"><a class="project-card__link">A</a></article></li></ul></body></html>',
  ).window;
  const api = initDashboard({ root: document, storage: memory() });
  api.update({ filter: 'bpmn' });
  assert.equal(document.querySelector('li').hidden, true);
  api.update({ filter: 'all' });
  assert.equal(document.querySelector('li').hidden, false);
});
