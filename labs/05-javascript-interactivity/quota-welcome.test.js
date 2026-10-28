import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initEditorProjects } from '../../site/js/components/editor-projects.js';
import { initQuota } from '../../site/js/components/quota.js';
import { initWelcome } from '../../site/js/components/welcome.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createProjectStore, createTemplateStore } from '../../site/js/storage/projects.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const memory = () => createStorage(createMemoryBackend());
const page = (name) => new JSDOM(readFileSync(`site/${name}`, 'utf8'), { url: `http://localhost/${name}` }).window;

test('the quota block shows the real count in both languages and does nothing without the block', () => {
  const storage = memory();
  createProjectStore({ storage }).save({ title: 'A', notation: 'idef0', source: 'a' });
  const ru = page('app/settings.html');
  const api = initQuota({ root: ru.document, storage });
  assert.match(ru.document.querySelector('.app-nav__quota-text').textContent, /создано 1 из 5/);
  assert.equal(ru.document.querySelector('.app-nav__progress').value, 1);
  createProjectStore({ storage }).save({ title: 'B', notation: 'idef0', source: 'b' });
  api.refresh();
  assert.match(ru.document.querySelector('.app-nav__quota-text').textContent, /создано 2 из 5/);
  const en = page('en/app/welcome.html');
  initQuota({ root: en.document, storage });
  assert.match(en.document.querySelector('.app-nav__quota-text').textContent, /2 of 5 created today/);
  assert.equal(initQuota({ root: new JSDOM('<!doctype html><html><body></body></html>').window.document, storage }), null);
});

test('the welcome page lists the templates of the user after the built-in ones', async () => {
  const storage = memory();
  createTemplateStore({ storage }).save({ title: 'Guest one', notation: 'erd', source: 'x' });
  const { user } = await createAccountStore({ storage }).register({ name: 'Ксения', email: 'k@example.com', password: 'correct horse' });
  createTemplateStore({ storage, owner: user.id }).save({ title: 'Mine', notation: 'idef0', source: 'y' });
  const ru = page('app/welcome.html');
  const builtIn = ru.document.querySelectorAll('.template-list__item').length;
  assert.deepEqual(initWelcome({ root: ru.document, storage }), { count: 1 });
  const items = [...ru.document.querySelectorAll('.template-list__item')];
  assert.equal(items.length, builtIn + 1);
  assert.equal(items.at(-1).querySelector('.template-card__link').textContent, 'Mine');
  assert.match(items.at(-1).querySelector('.template-card__link').getAttribute('href'), /^editor\.html\?my=t/);
  assert.match(items.at(-1).querySelector('.template-card__caption').textContent, /Мой шаблон/);
  createTemplateStore({ storage, owner: user.id }).save({ title: 'Odd', notation: 'zzz', source: 'y' });
  const en = page('en/app/welcome.html');
  initWelcome({ root: en.document, storage });
  assert.ok([...en.document.querySelectorAll('.template-card__caption')].some((node) => node.textContent === 'ZZZ · My template'));
  assert.equal(initWelcome({ root: new JSDOM('<!doctype html><html><body></body></html>').window.document, storage }), null);
});

test('the first open of the editor puts the starter diagrams into the list once', () => {
  const storage = memory();
  const open = () => {
    const dom = new JSDOM(readFileSync('site/app/editor.html', 'utf8'), { url: 'http://localhost/app/editor.html' });
    return initEditorProjects({ root: dom.window.document, storage, navigate: () => {} });
  };
  const first = open();
  assert.equal(first.store.list().length, 6);
  assert.equal(first.store.createdOn(), 0);
  first.store.list().forEach((project) => first.store.remove(project.id));
  assert.equal(open().store.list().length, 0);
});

test('the quota counts the projects of the signed-in user only', async () => {
  const storage = memory();
  createProjectStore({ storage }).save({ title: 'Guest', notation: 'idef0', source: 'a' });
  await createAccountStore({ storage }).register({ name: 'Ксения', email: 'k@example.com', password: 'correct horse' });
  const window = page('app/welcome.html');
  initQuota({ root: window.document, storage });
  assert.match(window.document.querySelector('.app-nav__quota-text').textContent, /создано 0 из 5/);
});
