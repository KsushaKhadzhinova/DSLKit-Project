import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initDashboard } from '../../site/js/components/dashboard.js';
import { initEditorProjects } from '../../site/js/components/editor-projects.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createProjectStore } from '../../site/js/storage/projects.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const memory = () => createStorage(createMemoryBackend());
const dashboard = readFileSync('site/app/dashboard.html', 'utf8');
const editor = readFileSync('site/app/editor.html', 'utf8');
const NOW = 1_800_000_000_000;
const samples = [
  { title: 'One', notation: 'idef0', source: 'a', age: 1000, published: true },
  { title: 'Two', notation: 'erd', source: 'b', age: 5000, published: false },
];
const cards = (document) => [...document.querySelectorAll('[data-project]')].map((item) => item.querySelector('.project-card__link').textContent.trim());

test('the first seed fills an empty list once, with different ages and a published mark on some', () => {
  const store = createProjectStore({ storage: memory(), now: () => NOW });
  assert.equal(store.seed(samples), true);
  const [one, two] = store.list();
  assert.equal(one.title, 'One');
  assert.equal(one.published, true);
  assert.equal(one.updated, NOW - 1000);
  assert.equal(two.published, undefined);
  assert.equal(two.updated, NOW - 5000);
  assert.notEqual(one.id, two.id);
  assert.equal(store.seed(samples), false);
});

test('deleted seeds do not come back, and a list with projects is not seeded', () => {
  const store = createProjectStore({ storage: memory(), now: () => NOW });
  store.seed(samples);
  store.list().forEach((project) => store.remove(project.id));
  assert.equal(store.seed(samples), false);
  assert.equal(store.list().length, 0);
  const used = createProjectStore({ storage: memory(), now: () => NOW });
  used.save({ title: 'Mine', notation: 'idef0', source: 'x' });
  assert.equal(used.seed(samples), false);
  assert.equal(used.list().length, 1);
});

test('a storage that refuses to save does not seed', () => {
  const broken = { get: () => null, set: () => false, remove: () => true };
  assert.equal(createProjectStore({ storage: broken }).seed(samples), false);
});

test('seeds are not counted into the daily quota, and an edited seed keeps its marks', () => {
  const store = createProjectStore({ storage: memory(), now: () => NOW });
  store.seed(samples);
  assert.equal(store.createdOn(), 0);
  const edited = store.save({ id: store.list()[0].id, title: 'One v2', notation: 'idef0', source: 'c' });
  assert.equal(edited.seed, true);
  assert.equal(edited.published, true);
  assert.equal(store.createdOn(), 0);
  store.save({ title: 'New', notation: 'idef0', source: 'n' });
  assert.equal(store.createdOn(), 1);
});

test('every user has projects of their own, a guest has the shared ones', () => {
  const storage = memory();
  const guest = createProjectStore({ storage });
  const first = createProjectStore({ storage, owner: 'u1' });
  const second = createProjectStore({ storage, owner: 'u2' });
  guest.save({ title: 'Guest', notation: 'idef0', source: 'g' });
  first.save({ title: 'First', notation: 'idef0', source: 'f' });
  assert.deepEqual(
    [guest, first, second].map((store) => store.list().map((project) => project.title)),
    [['Guest'], ['First'], []],
  );
  assert.equal(storage.get('projects.u1').length, 1);
});

test('the dashboard seeds six projects for a guest once, marks the published ones and keeps the quota at zero', () => {
  const storage = memory();
  const window = new JSDOM(dashboard, { url: 'http://localhost/' }).window;
  const api = initDashboard({ root: window.document, storage });
  assert.equal(cards(window.document).length, 6);
  assert.equal(window.document.querySelectorAll('[data-project] .badge').length, 3);
  assert.equal(api.store.createdOn(), 0);
  assert.match(window.document.querySelector('.app-nav__quota-text').textContent, /0 из 5/);
  api.store.list().forEach((project) => api.store.remove(project.id));
  const again = new JSDOM(dashboard, { url: 'http://localhost/' }).window;
  initDashboard({ root: again.document, storage });
  assert.equal(cards(again.document).length, 0);
});

test('a new user gets seeds of their own, the guest projects stay apart, and the English badge is English', async () => {
  const storage = memory();
  const guest = new JSDOM(dashboard, { url: 'http://localhost/' }).window;
  initDashboard({ root: guest.document, storage });
  await createAccountStore({ storage }).register({ name: 'Ксения', email: 'k@example.com', password: 'correct horse' });
  const english = new JSDOM(readFileSync('site/en/app/dashboard.html', 'utf8'), { url: 'http://localhost/' }).window;
  const api = initDashboard({ root: english.document, storage });
  assert.equal(cards(english.document).length, 6);
  assert.equal(english.document.querySelector('[data-project] .badge').textContent, 'published');
  assert.equal(api.store.list().length, 6);
  assert.equal(storage.get('projects').length, 6);
  assert.equal(Object.keys(storage.get('accounts')[0]).includes('hash'), true);
});

test('the editor of a signed-in user saves into the projects of that user', async () => {
  const storage = memory();
  const { user } = await createAccountStore({ storage }).register({ name: 'Ксения', email: 'k@example.com', password: 'correct horse' });
  const dom = new JSDOM(editor, { url: 'http://localhost/app/editor.html' });
  initEditorProjects({ root: dom.window.document, storage, navigate: () => {}, seed: false });
  dom.window.document.querySelector('.app-page--editor').dispatchEvent(new dom.window.CustomEvent('dslkit:save', { bubbles: true }));
  assert.equal(storage.get(`projects.${user.id}`).length, 1);
  assert.equal(storage.get('projects'), null);
});
