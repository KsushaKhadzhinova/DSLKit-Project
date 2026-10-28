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

const open = ({ search = '', storage = memory(), lang = 'ru', now = clock(), navigate = () => {} } = {}) => {
  const dom = new JSDOM(pages.editor.replace('<html lang="ru">', `<html lang="${lang}">`), { url: `http://localhost/app/editor.html${search}` });
  const { document } = dom.window;
  const timers = [];
  const api = initEditorProjects({ root: document, storage, now, seed: false, setTimer: (fn) => timers.push(fn) - 1, clearTimer: () => {}, navigate });
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

test('the autosave leaves an untouched new diagram alone, creates the project at the first change and then keeps it up to date', async () => {
  const storage = memory();
  const untouched = open({ storage });
  await untouched.flush();
  assert.equal(createProjectStore({ storage }).list().length, 0);
  const fresh = open({ storage });
  showCode(fresh.document, fresh.document.querySelector('.code__lines'), 'diagram idef0 "A"');
  await fresh.flush();
  assert.equal(createProjectStore({ storage }).list().length, 1);
  fresh.save();
  assert.equal(createProjectStore({ storage }).list().length, 1);
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

const dashboard = ({ lang = 'ru', storage = memory(), answers = {}, now = clock(), search = '' } = {}) => {
  const dom = new JSDOM(lang === 'ru' ? pages.dashboard : pages.en, { url: `http://localhost/app/dashboard.html${search}` });
  dom.window.prompt = () => answers.prompt ?? null;
  dom.window.confirm = () => answers.confirm ?? false;
  const api = initDashboard({ root: dom.window.document, storage, now, seed: false });
  const press = (node) => node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const visible = () => [...dom.window.document.querySelectorAll('.project-list__item:not([hidden]) .project-card__link')].map((node) => node.textContent);
  return { dom, document: dom.window.document, api, press, visible, storage };
};

test('My projects shows only the saved diagrams, newest first, with a link that opens them in the editor', () => {
  const storage = memory();
  const store = createProjectStore({ storage, now: clock() });
  const saved = store.save({ title: 'Mine', notation: 'idef0', source: 's' });
  store.save({ title: 'Other', notation: 'uml-class', source: 't' });
  const { document, visible } = dashboard({ storage });
  assert.deepEqual(visible(), ['Other', 'Mine']);
  const link = [...document.querySelectorAll('.project-card__link')].find((node) => node.textContent === 'Mine');
  assert.equal(link.getAttribute('href'), `editor.html?p=${saved.id}`);
  assert.equal(document.querySelector('#project-count').textContent, 'Найдено проектов: 2');
  assert.equal(document.querySelector('.dashboard__title').textContent, 'Мои проекты');
});

test('an empty list of projects says so, the shared examples and the trash are their own sections', () => {
  const { document, press, visible, api } = dashboard();
  assert.equal(document.querySelector('#project-count').textContent, 'Проектов не найдено');
  press(document.querySelector('[data-section="shared"]'));
  assert.equal(api.section(), 'shared');
  assert.equal(visible().length, 33);
  assert.equal(document.querySelector('.dashboard__title').textContent, 'Общие примеры');
  assert.equal(document.querySelector('[data-section="shared"]').getAttribute('aria-current'), 'page');
  assert.equal(document.querySelector('[data-section="mine"]').hasAttribute('aria-current'), false);
  assert.match(document.querySelector('.project-list__item .project-card__updated').textContent, /Общий пример/);
  press(document.querySelector('[data-section="trash"]'));
  assert.equal(document.querySelector('.dashboard__title').textContent, 'Корзина');
  assert.equal(visible().length, 0);
  assert.equal(api.show('nowhere'), false);
  press(document.querySelector('[data-section="mine"]'));
  assert.equal(api.section(), 'mine');
});

test('the card menu opens, renames and moves a saved project to the trash, where it can be restored or deleted for good', () => {
  const storage = memory();
  const store = createProjectStore({ storage, now: clock() });
  store.save({ title: 'Mine', notation: 'idef0', source: 's' });
  const ask = { prompt: 'Renamed', confirm: true };
  const { document, press, visible } = dashboard({ storage, answers: ask });
  const item = () => document.querySelector('.project-list__item:not([hidden])');
  const menu = item().querySelector('.project-card__menu');
  press(menu);
  assert.equal(item().querySelector('.project-card__actions').hidden, false);
  assert.equal(menu.getAttribute('aria-expanded'), 'true');
  press(item().querySelector('[data-act="rename"]'));
  assert.deepEqual(visible(), ['Renamed']);
  ask.prompt = null;
  press(item().querySelector('.project-card__menu'));
  press(item().querySelector('[data-act="rename"]'));
  assert.deepEqual(visible(), ['Renamed']);
  ask.confirm = false;
  press(item().querySelector('[data-act="remove"]'));
  assert.deepEqual(visible(), ['Renamed']);
  ask.confirm = true;
  press(item().querySelector('[data-act="remove"]'));
  assert.deepEqual(visible(), []);
  assert.equal(createProjectStore({ storage }).listTrash().length, 1);
  press(document.querySelector('[data-section="trash"]'));
  assert.deepEqual(visible(), ['Renamed']);
  assert.match(item().querySelector('.project-card__updated').textContent, /^Удалён /);
  assert.equal(item().querySelector('.project-card__link').getAttribute('href'), null);
  press(item().querySelector('.project-card__menu'));
  ask.confirm = false;
  press(item().querySelector('[data-act="purge"]'));
  assert.deepEqual(visible(), ['Renamed']);
  press(item().querySelector('[data-act="restore"]'));
  assert.deepEqual(visible(), []);
  press(document.querySelector('[data-section="mine"]'));
  assert.deepEqual(visible(), ['Renamed']);
  press(item().querySelector('.project-card__menu'));
  ask.confirm = true;
  press(item().querySelector('[data-act="remove"]'));
  press(document.querySelector('[data-section="trash"]'));
  press(item().querySelector('.project-card__menu'));
  press(item().querySelector('[data-act="purge"]'));
  assert.equal(createProjectStore({ storage }).listTrash().length, 0);
  press(document.querySelector('.project-list'));
});

test('a shared example can be copied to the saved projects and opens its own starter', () => {
  const { document, press, storage, visible } = dashboard();
  press(document.querySelector('[data-section="shared"]'));
  const sample = document.querySelector('.project-list__item:not([data-project])');
  assert.ok(sample.querySelector('.project-card__link').getAttribute('href').startsWith('editor.html?template='));
  press(sample.querySelector('.project-card__menu'));
  press(sample.querySelector('[data-act="copy"]'));
  const [copy] = createProjectStore({ storage }).list();
  assert.equal(copy.title, 'Order process');
  assert.equal(copy.source, TEMPLATES.idef0);
  assert.equal(visible().length, 33);
  press(document.querySelector('[data-section="mine"]'));
  assert.deepEqual(visible(), ['Order process']);
});

test('the English dashboard gets English labels, and an unknown starter falls back to IDEF0', () => {
  const { document, press, storage } = dashboard({ lang: 'en' });
  press(document.querySelector('[data-section="shared"]'));
  assert.equal(document.querySelector('.dashboard__title').textContent, 'Shared examples');
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
    { url: 'http://localhost/' },
  );
  initDashboard({ root: dom.window.document, storage: memory(), seed: false });
  assert.ok(dom.window.document.querySelector('.project-card__menu'));
});

test('the English dashboard asks in English before deleting for good, and the default clock stamps a copy', () => {
  const dom = new JSDOM(pages.en, { url: 'http://localhost/app/dashboard.html' });
  const asked = [];
  dom.window.confirm = (text) => {
    asked.push(text);
    return true;
  };
  const storage = memory();
  const api = initDashboard({ root: dom.window.document, storage, seed: false });
  const press = (node) => node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  api.show('shared');
  press(dom.window.document.querySelector('[data-act="copy"]'));
  api.show('mine');
  press(dom.window.document.querySelector('[data-project] [data-act="remove"]'));
  assert.match(asked[0], /^Move the project "/);
  api.show('trash');
  press(dom.window.document.querySelector('[data-project] [data-act="purge"]'));
  assert.match(asked[1], /^Delete the project "/);
  assert.equal(createProjectStore({ storage }).listTrash().length, 0);
});

test('the quota counts the diagrams created today and only shows the limit', () => {
  const storage = memory();
  const store = createProjectStore({ storage, now: clock() });
  const { document } = dashboard({ storage });
  assert.equal(document.querySelector('.app-nav__quota-text').textContent, 'Бета: сегодня создано 0 из 5');
  for (let i = 0; i < 6; i += 1) store.save({ title: `n${i}`, notation: 'idef0', source: 's' });
  const later = () => 1_700_000_000_000 + 7 * 60_000;
  const again = dashboard({ storage, now: later });
  assert.equal(again.document.querySelector('.app-nav__quota-text').textContent, 'Бета: сегодня создано 6, лимит 5 в день превышен');
  assert.equal(again.document.querySelector('.app-nav__progress').value, 5);
  const en = dashboard({ storage, lang: 'en', now: later });
  assert.match(en.document.querySelector('.app-nav__quota-text').textContent, /^Beta: 6 created today/);
  const trashed = createProjectStore({ storage });
  trashed.trash(trashed.list()[0].id);
  assert.equal(dashboard({ storage }).document.querySelector('.app-nav__quota-text').textContent, 'Бета: сегодня создано 6, лимит 5 в день превышен');
});

test('the search of the address fills the query of the list', () => {
  const storage = memory();
  const store = createProjectStore({ storage, now: clock() });
  store.save({ title: 'Alpha', notation: 'idef0', source: 's' });
  store.save({ title: 'Beta', notation: 'idef0', source: 's' });
  const { visible, document } = dashboard({ storage, search: '?q=alp' });
  assert.deepEqual(visible(), ['Alpha']);
  assert.equal(document.querySelector('.app-topbar__search-input').value, 'alp');
});

test('a page without the quota, the headings and the navigation still works', () => {
  const dom = new JSDOM('<!doctype html><html lang="ru"><body><ul id="project-list"></ul></body></html>', { url: 'http://localhost/' });
  const api = initDashboard({ root: dom.window.document, storage: memory(), seed: false });
  assert.equal(api.show('mine'), true);
});

test('the explorer lists the saved projects, marks the open one and opens another on a press', () => {
  const storage = memory();
  const store = createProjectStore({ storage, now: clock() });
  const a = store.save({ title: 'Alpha', notation: 'idef0', source: 'diagram idef0 "Alpha"' });
  const b = store.save({ title: 'Beta', notation: 'idef0', source: 'diagram idef0 "Beta"' });
  const went = [];
  const t = open({ search: `?p=${a.id}`, storage, navigate: (url) => went.push(url) });
  const items = [...t.document.querySelectorAll('.file-tree__item')];
  assert.deepEqual(
    items.map((node) => node.textContent),
    ['beta.dsl', 'alpha.dsl'],
  );
  assert.equal(t.document.querySelector('.file-tree__item--active').textContent, 'alpha.dsl');
  assert.equal(t.document.querySelector('.file-tree__item--active').getAttribute('aria-current'), 'true');
  const press = (node) => node.dispatchEvent(new t.dom.window.MouseEvent('click', { bubbles: true }));
  press(items[1]);
  assert.deepEqual(went, []);
  press(items[0]);
  assert.deepEqual(went, [`/app/editor.html?p=${b.id}`]);
  press(t.document.querySelector('.file-tree'));
  assert.equal(went.length, 1);
});

test('an unsaved diagram is the first entry of the explorer, saving turns it into a project and closing leaves for the list', () => {
  const went = [];
  const t = open({ navigate: (url) => went.push(url) });
  assert.equal(t.document.querySelector('.file-tree__item').textContent, 'Новая диаграмма (не сохранена)');
  t.save();
  assert.equal(t.document.querySelectorAll('.file-tree__item').length, 1);
  assert.equal(t.document.querySelector('.file-tree__item--active').textContent, 'order-process.dsl');
  t.document.querySelector('.app-page--editor').dispatchEvent(new t.dom.window.CustomEvent('dslkit:close', { bubbles: true }));
  assert.deepEqual(went, ['dashboard.html']);
});

test('the default navigation goes through the location of the window', () => {
  const dom = new JSDOM(pages.editor, { url: 'http://localhost/app/editor.html' });
  initEditorProjects({ root: dom.window.document, storage: memory() });
  assert.doesNotThrow(() =>
    dom.window.document.querySelector('.app-page--editor').dispatchEvent(new dom.window.CustomEvent('dslkit:close', { bubbles: true })),
  );
});

test('the editor works without an explorer list', () => {
  const dom = new JSDOM('<!doctype html><html lang="ru"><body><div class="app-page app-page--editor"><ol class="code__lines"></ol></div></body></html>', {
    url: 'http://localhost/app/editor.html',
  });
  const api = initEditorProjects({ root: dom.window.document, storage: memory(), navigate: () => {} });
  api.save();
  assert.ok(api.current());
});

test('the store keeps a trash: trashed projects are not listed or opened, restore brings them back', () => {
  const store = createProjectStore({ storage: memory(), now: clock() });
  const a = store.save({ title: 'A', notation: 'idef0', source: 'a' });
  const b = store.save({ title: 'B', notation: 'idef0', source: 'b' });
  assert.equal(store.trash(a.id), true);
  assert.equal(store.trash('none'), false);
  assert.deepEqual(
    store.list().map((item) => item.id),
    [b.id],
  );
  assert.deepEqual(
    store.listTrash().map((item) => item.id),
    [a.id],
  );
  assert.equal(store.get(a.id), null);
  assert.equal(store.rename(a.id, 'x'), null);
  assert.notEqual(store.save({ id: a.id, title: 'again', notation: 'idef0', source: 'a2' }).id, a.id);
  assert.equal(store.restore(a.id), true);
  assert.equal(store.get(a.id).title, 'A');
  assert.equal(store.restore('none'), false);
  assert.equal(store.listTrash().length, 0);
});

test('the store counts the projects created on a day, an old project without a creation time uses its last change', () => {
  const storage = memory();
  const day = 1_700_000_000_000;
  const store = createProjectStore({ storage, now: () => day });
  store.save({ title: 'A', notation: 'idef0', source: 'a' });
  const saved = store.save({ title: 'B', notation: 'idef0', source: 'b' });
  assert.equal(store.createdOn(), 2);
  assert.equal(store.createdOn(day + 3 * 24 * 3_600_000), 0);
  assert.equal(store.save({ id: saved.id, title: 'B2', notation: 'idef0', source: 'b2' }).created, saved.created);
  storage.set('projects', [{ id: 'old', title: 'Old', notation: 'idef0', source: 's', updated: day }]);
  assert.equal(store.createdOn(day), 1);
  assert.equal(store.save({ id: 'old', title: 'Old', notation: 'idef0', source: 's2' }).created, day);
});

test('the quota of the explorer counts the diagrams of today and follows a save', () => {
  const t = open();
  const text = () => t.document.querySelector('#quota-text').textContent;
  assert.equal(text(), 'Бета: сегодня создано 0 из 5');
  t.save();
  assert.equal(text(), 'Бета: сегодня создано 1 из 5');
  assert.equal(t.document.querySelector('.editor-sidebar__beta progress').value, 1);
  const en = open({ lang: 'en' });
  assert.equal(en.document.querySelector('#quota-text').textContent, 'Beta: 0 of 5 created today');
});

test('a title of symbols only gives the file name diagram.dsl, an unknown notation is saved as IDEF0, and a second change restarts the timer', async () => {
  const cleared = [];
  const dom = new JSDOM(pages.editor, { url: 'http://localhost/app/editor.html' });
  const { document } = dom.window;
  const timers = [];
  const api = initEditorProjects({
    root: document,
    storage: memory(),
    setTimer: (fn) => timers.push(fn) - 1,
    clearTimer: (id) => cleared.push(id),
    navigate: () => {},
  });
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

test('a saved project of a notation the editor does not know is still listed, under its own name', () => {
  const storage = memory();
  createProjectStore({ storage, now: clock() }).save({ title: 'Odd', notation: 'zzz', source: 's' });
  const { document } = dashboard({ storage });
  assert.equal(document.querySelector('.project-list__item').dataset.notation, 'other');
  assert.equal(document.querySelector('.project-card__tag').textContent, 'ZZZ');
});

test('the trash lists the newest deleted project first', () => {
  const store = createProjectStore({ storage: memory(), now: clock() });
  const a = store.save({ title: 'A', notation: 'idef0', source: 'a' });
  const b = store.save({ title: 'B', notation: 'idef0', source: 'b' });
  store.trash(a.id);
  store.trash(b.id);
  assert.deepEqual(
    store.listTrash().map((item) => item.title),
    ['B', 'A'],
  );
});
