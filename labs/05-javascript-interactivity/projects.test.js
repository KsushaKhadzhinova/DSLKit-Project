import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { readCode, showCode } from '../../site/js/components/code-lines.js';
import { initDashboard } from '../../site/js/components/dashboard.js';
import { PROJECT_AUTOSAVE_MS, initEditorProjects } from '../../site/js/components/editor-projects.js';
import { TEMPLATES } from '../../site/js/notations/index.js';
import { createProjectStore } from '../../site/js/storage/projects.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const memory = () => createStorage(createMemoryBackend());
const pages = {
  editor: readFileSync('site/app/editor.html', 'utf8'),
  dashboard: readFileSync('site/app/dashboard.html', 'utf8'),
  en: readFileSync('site/en/app/dashboard.html', 'utf8'),
};
const clock = () => {
  let t = 1_700_000_000_000;
  return () => (t += 60_000);
};

test('the store saves, updates, lists newest first, renames and removes', () => {
  const store = createProjectStore({ storage: memory(), now: clock() });
  const a = store.save({ title: ' First ', notation: 'idef0', source: 'a' });
  const b = store.save({ title: '', notation: 'erd', source: 'b' });
  assert.equal(a.title, 'First');
  assert.equal(b.title, 'Без названия');
  assert.notEqual(a.id, b.id);
  assert.deepEqual(
    store.list().map((p) => p.id),
    [b.id, a.id],
  );
  const again = store.save({ id: a.id, title: 'First v2', notation: 'idef0', source: 'a2' });
  assert.equal(again.id, a.id);
  assert.deepEqual(
    store.list().map((p) => p.id),
    [a.id, b.id],
  );
  assert.equal(store.get(a.id).source, 'a2');
  assert.equal(store.get('nope'), null);
  assert.equal(store.rename(a.id, ' New ').title, 'New');
  assert.equal(store.rename(a.id, '  '), null);
  assert.equal(store.rename('nope', 'x'), null);
  assert.equal(store.remove(a.id), true);
  assert.equal(store.remove(a.id), false);
});

test('the store ignores a damaged value and drops damaged projects, and is limited', () => {
  const storage = memory();
  storage.set('projects', 'oops');
  const store = createProjectStore({ storage });
  assert.deepEqual(store.list(), []);
  storage.set('projects', [null, { id: 1 }, { id: 'x', title: 't', source: 's', updated: 1, notation: 'idef0' }]);
  assert.equal(store.list().length, 1);
  for (let i = 0; i < 210; i += 1) store.save({ title: `t${i}`, notation: 'idef0', source: 's' });
  assert.equal(store.list().length, 200);
});

const open = ({ search = '', storage = memory(), lang = 'ru', now = clock() } = {}) => {
  const dom = new JSDOM(pages.editor.replace('<html lang="ru">', `<html lang="${lang}">`), { url: `http://localhost/app/editor.html${search}` });
  const { document } = dom.window;
  const timers = [];
  const api = initEditorProjects({ root: document, storage, now, setTimer: (fn) => timers.push(fn) - 1, clearTimer: () => {} });
  const code = () => readCode(document.querySelector('.code__lines'));
  const save = () => document.querySelector('.app-page--editor').dispatchEvent(new dom.window.CustomEvent('dslkit:save', { bubbles: true }));
  const flush = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const last = timers.pop();
    if (last) last();
  };
  return { dom, document, api, code, save, flush, storage, timers };
};

test('a page without the editor returns null', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initEditorProjects({ root: document, storage: memory() }), null);
});

test('a new diagram starts from a valid starter and a template in the address picks the starter', () => {
  assert.equal(open().code(), TEMPLATES.idef0);
  assert.equal(open({ search: '?template=erd' }).code(), TEMPLATES.erd);
  assert.equal(open({ search: '?template=unknown' }).code(), TEMPLATES.idef0);
});

test('Save creates a project, names the file and the address, and Save again updates it', () => {
  const { dom, document, api, code, save, storage } = open({ search: '?template=erd' });
  save();
  const [project] = createProjectStore({ storage }).list();
  assert.equal(project.title, 'Shop');
  assert.equal(project.notation, 'erd');
  assert.equal(dom.window.location.search, `?p=${project.id}`);
  assert.equal(document.querySelector('.editor-topbar__title').textContent, 'shop.dsl');
  assert.match(document.querySelector('.editor-status__saved').textContent, /Сохранено в «Мои проекты»: Shop/);
  showCode(document, document.querySelector('.code__lines'), `${code()}\n// n`);
  save();
  assert.equal(createProjectStore({ storage }).list().length, 1);
  assert.equal(api.current().id, project.id);
});

test('an untitled diagram is saved as Untitled and the English page says so', () => {
  const { document, save, storage } = open({ lang: 'en' });
  showCode(document, document.querySelector('.code__lines'), 'diagram idef0');
  save();
  assert.equal(createProjectStore({ storage }).list()[0].title, 'Untitled');
  assert.match(document.querySelector('.editor-status__saved').textContent, /Saved to "My projects"/);
});

test('a saved project opens from the address, an unknown one says so and opens a new diagram', () => {
  const storage = memory();
  const store = createProjectStore({ storage });
  const saved = store.save({ title: 'My one', notation: 'idef0', source: 'diagram idef0 "My one"' });
  const opened = open({ search: `?p=${saved.id}`, storage });
  assert.equal(opened.code(), 'diagram idef0 "My one"');
  assert.equal(opened.document.querySelector('.editor-tabs__tab--active span').textContent, 'my-one.dsl');
  const missing = open({ search: '?p=none', storage });
  assert.equal(missing.code(), TEMPLATES.idef0);
  assert.match(missing.document.querySelector('.editor-status__saved').textContent, /не найден/);
});

test('the autosave updates a saved project only, only when the switch is on and the code changed', async () => {
  const storage = memory();
  const fresh = open({ storage });
  showCode(fresh.document, fresh.document.querySelector('.code__lines'), 'diagram idef0 "A"');
  await fresh.flush();
  assert.equal(createProjectStore({ storage }).list().length, 0);
  fresh.save();
  const [project] = createProjectStore({ storage }).list();
  const { document, flush, code } = open({ search: `?p=${project.id}`, storage });
  await flush();
  assert.equal(createProjectStore({ storage }).get(project.id).source, project.source);
  showCode(document, document.querySelector('.code__lines'), `${code()}\n// more`);
  await flush();
  assert.match(createProjectStore({ storage }).get(project.id).source, /more/);
  const off = open({ search: `?p=${project.id}`, storage });
  off.document.querySelector('.editor-toolbar__switch').setAttribute('aria-checked', 'false');
  showCode(off.document, off.document.querySelector('.code__lines'), 'diagram idef0 "X"');
  await off.flush();
  assert.notEqual(createProjectStore({ storage }).get(project.id).source, 'diagram idef0 "X"');
  showCode(off.document, off.document.querySelector('.code__lines'), 'diagram idef0 "Y"');
  showCode(off.document, off.document.querySelector('.code__lines'), 'diagram idef0 "Z"');
  await off.flush();
  assert.equal(PROJECT_AUTOSAVE_MS, 1000);
});

test('the editor works without the autosave switch', async () => {
  const dom = new JSDOM('<!doctype html><html lang="ru"><body><div class="app-page app-page--editor"><ol class="code__lines"></ol></div></body></html>', {
    url: 'http://localhost/app/editor.html',
  });
  const timers = [];
  initEditorProjects({ root: dom.window.document, storage: memory(), setTimer: (fn) => timers.push(fn), clearTimer: () => {} });
  const page = dom.window.document.querySelector('.app-page--editor');
  page.dispatchEvent(new dom.window.CustomEvent('dslkit:save', { bubbles: true }));
  showCode(dom.window.document, dom.window.document.querySelector('.code__lines'), 'diagram idef0 "Q"');
  await new Promise((resolve) => setTimeout(resolve, 0));
  timers.pop()();
});

const dashboard = ({ lang = 'ru', storage = memory(), answers = {}, now = clock() } = {}) => {
  const dom = new JSDOM(lang === 'ru' ? pages.dashboard : pages.en, { url: 'http://localhost/app/dashboard.html' });
  dom.window.prompt = () => answers.prompt ?? null;
  dom.window.confirm = () => answers.confirm ?? false;
  const api = initDashboard({ root: dom.window.document, storage, now });
  const press = (node) => node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  return { dom, document: dom.window.document, api, press, storage };
};

test('My projects shows the saved diagrams first, with a link that opens them in the editor', () => {
  const storage = memory();
  const store = createProjectStore({ storage, now: clock() });
  const saved = store.save({ title: 'Mine', notation: 'idef0', source: 's' });
  store.save({ title: 'Other', notation: 'uml-class', source: 't' });
  const { document } = dashboard({ storage });
  const first = document.querySelector('.project-list__item');
  assert.equal(first.querySelector('.project-card__link').textContent, 'Other');
  assert.equal(first.dataset.notation, 'other');
  const link = [...document.querySelectorAll('.project-card__link')].find((node) => node.textContent === 'Mine');
  assert.equal(link.getAttribute('href'), `editor.html?p=${saved.id}`);
  assert.match(document.querySelector('#project-count').textContent, /Найдено проектов: 10/);
});

test('the card menu opens, renames and deletes a saved project', () => {
  const storage = memory();
  createProjectStore({ storage, now: clock() }).save({ title: 'Mine', notation: 'idef0', source: 's' });
  const ask = { prompt: 'Renamed', confirm: true };
  const { document, press } = dashboard({ storage, answers: ask });
  const item = document.querySelector('[data-project]');
  const menu = item.querySelector('.project-card__menu');
  press(menu);
  assert.equal(item.querySelector('.project-card__actions').hidden, false);
  assert.equal(menu.getAttribute('aria-expanded'), 'true');
  press(item.querySelector('[data-act="rename"]'));
  assert.equal(document.querySelector('[data-project] .project-card__link').textContent, 'Renamed');
  ask.prompt = null;
  press(document.querySelector('[data-project] .project-card__menu'));
  press(document.querySelector('[data-project] [data-act="rename"]'));
  assert.equal(document.querySelector('[data-project] .project-card__link').textContent, 'Renamed');
  ask.confirm = false;
  press(document.querySelector('[data-project] [data-act="remove"]'));
  assert.equal(document.querySelectorAll('[data-project]').length, 1);
  ask.confirm = true;
  press(document.querySelector('[data-project] [data-act="remove"]'));
  assert.equal(document.querySelectorAll('[data-project]').length, 0);
  press(document.querySelector('.project-list'));
});

test('a sample card can be copied to the saved projects and opens its own starter', () => {
  const { document, press, storage } = dashboard();
  const sample = document.querySelector('.project-list__item:not([data-project])');
  assert.match(sample.querySelector('.project-card__link').getAttribute('href'), /^editor\.html\?template=/);
  press(sample.querySelector('.project-card__menu'));
  press(sample.querySelector('[data-act="copy"]'));
  const [copy] = createProjectStore({ storage }).list();
  assert.equal(copy.title, 'Order process');
  assert.equal(copy.source, TEMPLATES.idef0);
  assert.equal(document.querySelectorAll('[data-project]').length, 1);
});

test('the English dashboard gets English menu labels, and an unknown starter falls back to IDEF0', () => {
  const { document, press, storage } = dashboard({ lang: 'en' });
  const sample = document.querySelector('.project-list__item');
  assert.match(sample.querySelector('.project-card__menu').getAttribute('aria-label'), /Actions for the project/);
  sample.querySelector('.project-card__link').setAttribute('href', 'editor.html?template=zzz');
  press(sample.querySelector('.project-card__menu'));
  press(sample.querySelector('[data-act="copy"]'));
  assert.equal(createProjectStore({ storage }).list()[0].source, TEMPLATES.idef0);
});

test('a card without its own menu button gets one', () => {
  const dom = new JSDOM(
    '<!doctype html><html lang="ru"><body><ul id="project-list"><li class="project-list__item" data-notation="erd"><article class="project-card"><a class="project-card__link" href="editor.html">A</a></article></li></ul></body></html>',
    {
      url: 'http://localhost/',
    },
  );
  initDashboard({ root: dom.window.document, storage: memory() });
  assert.ok(dom.window.document.querySelector('.project-card__menu'));
});

test('a title of symbols only gives the file name diagram.dsl, an unknown notation is saved as IDEF0, and a second change restarts the timer', async () => {
  const cleared = [];
  const dom = new JSDOM(pages.editor, { url: 'http://localhost/app/editor.html' });
  const { document } = dom.window;
  const timers = [];
  const api = initEditorProjects({ root: document, storage: memory(), setTimer: (fn) => timers.push(fn) - 1, clearTimer: (id) => cleared.push(id) });
  const lines = () => document.querySelector('.code__lines');
  showCode(document, lines(), 'diagram nonsense "!!!"');
  api.save();
  assert.equal(api.current().notation, 'idef0');
  assert.equal(document.querySelector('.editor-topbar__title').textContent, 'diagram.dsl');
  showCode(document, lines(), 'diagram idef0 "A"');
  await new Promise((resolve) => setTimeout(resolve, 0));
  showCode(document, lines(), 'diagram idef0 "B"');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(cleared.length >= 1);
});

test('the English dashboard asks in English before deleting, and the default clock stamps a copy', () => {
  const dom = new JSDOM(pages.en, { url: 'http://localhost/app/dashboard.html' });
  const asked = [];
  dom.window.confirm = (text) => {
    asked.push(text);
    return true;
  };
  const storage = memory();
  initDashboard({ root: dom.window.document, storage });
  const press = (node) => node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  press(dom.window.document.querySelector('[data-act="copy"]'));
  assert.equal(createProjectStore({ storage }).list().length, 1);
  press(dom.window.document.querySelector('[data-project] [data-act="remove"]'));
  assert.match(asked[0], /^Delete the project "/);
  assert.equal(createProjectStore({ storage }).list().length, 0);
});

test('the link to the other language carries the project of the address', () => {
  const { document, save, dom } = open({ search: '?template=erd' });
  const link = document.querySelector('.editor-menu a[hreflang]');
  assert.equal(link.getAttribute('href'), '../en/app/editor.html?template=erd');
  save();
  assert.match(link.getAttribute('href'), /^\.\.\/en\/app\/editor\.html\?p=/);
  assert.equal(dom.window.location.search, new URL(link.href, 'http://localhost/app/').search);
});
