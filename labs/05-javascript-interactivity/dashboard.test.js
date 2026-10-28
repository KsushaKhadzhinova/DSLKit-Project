import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initDashboard } from '../../site/js/components/dashboard.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

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

test('the dashboard shows all eight projects and a Russian count at the start', () => {
  const { document } = load();
  initDashboard({ root: document, storage: memory() });
  assert.equal(titles(document).length, 8);
  assert.equal(document.querySelector('#project-count').textContent, 'Найдено проектов: 8');
  assert.equal(chip(document, 'all').getAttribute('aria-pressed'), 'true');
});

test('a filter chip shows only projects of that notation and is saved', () => {
  const window = load();
  const { document } = window;
  const storage = memory();
  initDashboard({ root: document, storage });
  chip(document, 'erd').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.deepEqual(titles(document), ['Shop schema', 'Users & roles']);
  assert.equal(chip(document, 'erd').getAttribute('aria-pressed'), 'true');
  assert.ok(chip(document, 'erd').classList.contains('filter__chip--active'));
  assert.equal(storage.get('dashboard').filter, 'erd');
});

test('a click on the group but not on a chip changes nothing', () => {
  const window = load();
  const { document } = window;
  initDashboard({ root: document, storage: memory() });
  document.querySelector('.filter').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(titles(document).length, 8);
});

test('the search box filters by title ignoring case and shows an empty message', () => {
  const window = load();
  const { document } = window;
  initDashboard({ root: document, storage: memory() });
  const search = document.querySelector('.app-topbar__search-input');
  search.value = ' ORDER ';
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
  storage.set('dashboard', { filter: 'bpmn', query: 'r', sort: 'name' });
  const { document } = load();
  initDashboard({ root: document, storage });
  assert.deepEqual(titles(document), ['Hiring flow', 'Release process']);
  assert.equal(document.querySelector('.app-topbar__search-input').value, 'r');
  assert.equal(document.querySelector('#project-sort').value, 'name');
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
  assert.equal(document.querySelector('#project-count').textContent, 'Projects found: 2');
  api.update({ query: 'nothing' });
  assert.equal(document.querySelector('#project-count').textContent, 'No projects found');
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
