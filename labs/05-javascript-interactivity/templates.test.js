import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { readCode, showCode } from '../../site/js/components/code-lines.js';
import { initDashboard } from '../../site/js/components/dashboard.js';
import { initEditorProjects } from '../../site/js/components/editor-projects.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createProjectStore, createTemplateStore } from '../../site/js/storage/projects.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const memory = () => createStorage(createMemoryBackend());
const pages = {
  dashboard: readFileSync('site/app/dashboard.html', 'utf8'),
  en: readFileSync('site/en/app/dashboard.html', 'utf8'),
  editor: readFileSync('site/app/editor.html', 'utf8'),
};
const clock = () => {
  let t = 1_700_000_000_000;
  return () => (t += 60_000);
};
const SOURCE = 'diagram idef0 "Kept"\nbox A1 "One" {\n}';

test('the template store creates, lists newest first, updates, renames and deletes', () => {
  const store = createTemplateStore({ storage: memory(), now: clock() });
  const a = store.save({ title: ' First ', notation: 'idef0', source: 'a' });
  const b = store.save({ title: '', notation: 'erd', source: 'b' });
  assert.equal(a.title, 'First');
  assert.equal(b.title, 'Без названия');
  assert.deepEqual(
    store.list().map((item) => item.id),
    [b.id, a.id],
  );
  const again = store.save({ id: a.id, title: 'First v2', notation: 'idef0', source: 'a2' });
  assert.equal(again.id, a.id);
  assert.equal(again.created, a.created);
  assert.equal(store.get(a.id).source, 'a2');
  assert.deepEqual(
    store.list().map((item) => item.id),
    [a.id, b.id],
  );
  assert.equal(store.rename(a.id, ' Renamed ').title, 'Renamed');
  assert.equal(store.rename(a.id, '  '), null);
  assert.equal(store.rename('none', 'x'), null);
  assert.equal(store.get('none'), null);
  assert.equal(store.remove(a.id), true);
  assert.equal(store.remove(a.id), false);
  assert.equal(store.list().length, 1);
});

test('templates are kept per user, a guest has the shared ones, damaged data gives an empty list', () => {
  const storage = memory();
  createTemplateStore({ storage }).save({ title: 'Guest', notation: 'idef0', source: 'g' });
  createTemplateStore({ storage, owner: 'u1' }).save({ title: 'User', notation: 'idef0', source: 'u' });
  assert.equal(createTemplateStore({ storage }).list()[0].title, 'Guest');
  assert.equal(createTemplateStore({ storage, owner: 'u1' }).list()[0].title, 'User');
  assert.equal(createTemplateStore({ storage, owner: 'u2' }).list().length, 0);
  storage.set('templates', 'broken');
  assert.deepEqual(createTemplateStore({ storage }).list(), []);
});

const dashboard = ({ lang = 'ru', storage = memory(), prompt = () => null, confirm = () => true } = {}) => {
  const dom = new JSDOM(lang === 'en' ? pages.en : pages.dashboard, { url: 'http://localhost/app/dashboard.html' });
  dom.window.prompt = prompt;
  dom.window.confirm = confirm;
  const navigate = mock.fn();
  const api = initDashboard({ root: dom.window.document, storage, seed: false, now: clock(), navigate });
  const { document } = dom.window;
  const visible = () =>
    [...document.querySelectorAll('.project-list__item')]
      .filter((item) => !item.hidden)
      .map((item) => item.querySelector('.project-card__link').textContent.trim());
  const act = (name, index = 0) => {
    const item = [...document.querySelectorAll('.project-list__item')].filter((node) => !node.hidden)[index];
    item.querySelector('.project-card__menu').click();
    item.querySelector(`[data-act="${name}"]`).click();
  };
  return { dom, document, api, navigate, visible, act };
};

test('"My templates" is a section with its own heading, an empty message and the New template button', () => {
  const { document, api, navigate } = dashboard();
  const button = document.querySelector('[data-new-template]');
  assert.equal(button.hidden, true);
  assert.equal(api.show('templates'), true);
  assert.equal(button.hidden, false);
  assert.equal(document.querySelector('.dashboard__title').textContent, 'Мои шаблоны');
  assert.match(document.querySelector('#project-count').textContent, /Шаблонов не найдено/);
  api.show('mine');
  assert.equal(button.hidden, true);
  assert.equal(navigate.mock.callCount(), 0);
});

test('a project is saved as a template, the template is listed, opened as a start and searchable', () => {
  const storage = memory();
  createProjectStore({ storage }).save({ title: 'Shop', notation: 'erd', source: SOURCE });
  const { document, api, visible, act } = dashboard({ storage });
  act('template');
  assert.equal(api.templates.list().length, 1);
  assert.deepEqual(visible(), ['Shop']);
  document.querySelector('[data-section="templates"]').click();
  assert.deepEqual(visible(), ['Shop']);
  assert.equal(document.querySelector('#project-count').textContent, 'Найдено шаблонов: 1');
  const link = document.querySelector('[data-template] .project-card__link');
  assert.match(link.getAttribute('href'), /^editor\.html\?my=t/);
  assert.equal(document.querySelectorAll('[data-template] [data-act]').length, 3);
  document.querySelector('.app-topbar__search-input').value = 'zzz';
  document.querySelector('.app-topbar__search-input').dispatchEvent(new document.defaultView.Event('input', { bubbles: true }));
  assert.deepEqual(visible(), []);
  api.update({ query: '' });
  document.querySelector('[data-section="mine"]').click();
  assert.deepEqual(visible(), ['Shop']);
});

test('a template can be renamed, edited and deleted, and each step can be cancelled', () => {
  const storage = memory();
  createTemplateStore({ storage }).save({ title: 'Old', notation: 'idef0', source: SOURCE });
  let answer = 'New name';
  let sure = false;
  const { document, api, navigate, visible, act } = dashboard({ storage, prompt: () => answer, confirm: () => sure });
  api.show('templates');
  act('rename');
  assert.deepEqual(visible(), ['New name']);
  answer = null;
  act('rename');
  assert.deepEqual(visible(), ['New name']);
  act('edit');
  assert.match(navigate.mock.calls[0].arguments[0], /^editor\.html\?tpl=t/);
  act('remove-template');
  assert.equal(api.templates.list().length, 1);
  sure = true;
  act('remove-template');
  assert.equal(api.templates.list().length, 0);
  assert.deepEqual(visible(), []);
  assert.match(document.querySelector('#project-count').textContent, /не найдено/);
});

test('the New template button asks for a name and opens the editor in template mode; an empty name does nothing', () => {
  let answer = ' ';
  const { document, api, navigate } = dashboard({ prompt: () => answer });
  api.show('templates');
  const button = document.querySelector('[data-new-template]');
  button.click();
  answer = null;
  button.click();
  assert.equal(navigate.mock.callCount(), 0);
  answer = 'Blank';
  button.click();
  assert.equal(api.templates.list()[0].title, 'Blank');
  assert.match(navigate.mock.calls[0].arguments[0], /^editor\.html\?tpl=t/);
});

test('the English dashboard has English texts for templates', () => {
  const storage = memory();
  createTemplateStore({ storage }).save({ title: 'Kept', notation: 'idef0', source: SOURCE });
  const { document, api, act } = dashboard({ lang: 'en', storage });
  api.show('templates');
  assert.equal(document.querySelector('#project-count').textContent, 'Templates found: 1');
  act('remove-template');
  assert.equal(api.templates.list().length, 0);
  assert.equal(document.querySelector('.dashboard__title').textContent, 'My templates');
  assert.match(document.querySelector('#project-count').textContent, /No templates found/);
  api.show('mine');
  api.show('templates');
  assert.equal(document.querySelector('.dashboard__title').textContent, 'My templates');
  assert.match(document.querySelector('#project-count').textContent, /No templates found/);
});

test('the dashboard works with its own navigation when none is passed', () => {
  const dom = new JSDOM(pages.dashboard, { url: 'http://localhost/app/dashboard.html' });
  dom.window.prompt = () => 'Blank';
  const api = initDashboard({ root: dom.window.document, storage: memory(), seed: false });
  api.show('templates');
  assert.doesNotThrow(() => dom.window.document.querySelector('[data-new-template]').click());
});

const editor = ({ search = '', storage = memory(), lang = 'ru' } = {}) => {
  const dom = new JSDOM(pages.editor.replace('<html lang="ru">', `<html lang="${lang}">`), { url: `http://localhost/app/editor.html${search}` });
  const { document } = dom.window;
  const timers = [];
  const api = initEditorProjects({ root: document, storage, now: clock(), seed: false, setTimer: (fn) => timers.push(fn) - 1, clearTimer: () => {}, navigate: () => {} });
  const code = () => readCode(document.querySelector('.code__lines'));
  const save = () => document.querySelector('.app-page--editor').dispatchEvent(new dom.window.CustomEvent('dslkit:save', { bubbles: true }));
  const flush = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const last = timers.pop();
    if (last) last();
  };
  return { dom, document, api, code, save, flush, storage };
};

test('?my= starts a new diagram from a template of the user and the first change makes a project', async () => {
  const storage = memory();
  const template = createTemplateStore({ storage }).save({ title: 'Kept', notation: 'idef0', source: SOURCE });
  const opened = editor({ search: `?my=${template.id}`, storage });
  assert.equal(opened.code(), SOURCE);
  await opened.flush();
  assert.equal(createProjectStore({ storage }).list().length, 0);
  showCode(opened.document, opened.document.querySelector('.code__lines'), `${SOURCE}\n// more`);
  await opened.flush();
  assert.equal(createProjectStore({ storage }).list().length, 1);
  assert.equal(createTemplateStore({ storage }).list().length, 1);
});

test('?tpl= edits the template itself: Save and the autosave update it and no project is made', async () => {
  const storage = memory();
  const template = createTemplateStore({ storage }).save({ title: 'Kept', notation: 'idef0', source: SOURCE });
  const opened = editor({ search: `?tpl=${template.id}`, storage });
  assert.equal(opened.code(), SOURCE);
  assert.match(opened.document.querySelector('.file-tree').textContent, /Шаблон \(изменение\)/);
  showCode(opened.document, opened.document.querySelector('.code__lines'), 'diagram idef0 "Changed"\nbox A1 "One" {\n}');
  opened.save();
  assert.equal(createTemplateStore({ storage }).get(template.id).title, 'Changed');
  assert.match(opened.document.querySelector('.editor-status__saved').textContent, /Шаблон сохранён в «Мои шаблоны»: Changed/);
  showCode(opened.document, opened.document.querySelector('.code__lines'), 'diagram idef0 "Again"\nbox A1 "One" {\n}');
  await opened.flush();
  assert.equal(createTemplateStore({ storage }).get(template.id).title, 'Again');
  assert.equal(createTemplateStore({ storage }).list().length, 1);
  assert.equal(createProjectStore({ storage }).list().length, 0);
});

test('an unknown template in the address opens a new diagram and says so', () => {
  assert.match(editor({ search: '?tpl=none' }).document.querySelector('.editor-status__saved').textContent, /не найден/);
  assert.match(editor({ search: '?my=none' }).document.querySelector('.editor-status__saved').textContent, /не найден/);
});

test('"Save as a template" in the editor menu makes a new template each time, in English too', () => {
  const storage = memory();
  const opened = editor({ storage });
  opened.document.querySelector('[data-action="save-template"]').click();
  opened.document.querySelector('[data-action="save-template"]').click();
  assert.equal(createTemplateStore({ storage }).list().length, 2);
  assert.match(opened.document.querySelector('.editor-status__saved').textContent, /Шаблон сохранён/);
  const english = editor({ lang: 'en' });
  english.document.querySelector('[data-action="save-template"]').click();
  assert.match(english.document.querySelector('.editor-status__saved').textContent, /Template saved to "My templates"/);
});

test('templates of a signed-in user are theirs', async () => {
  const storage = memory();
  const { user } = await createAccountStore({ storage }).register({ name: 'Ксения', email: 'k@example.com', password: 'correct horse' });
  editor({ storage }).document.querySelector('[data-action="save-template"]').click();
  assert.equal(storage.get(`templates.${user.id}`).length, 1);
  assert.equal(storage.get('templates'), null);
});

test('a template saved from code without a title is called Untitled', () => {
  const storage = memory();
  const opened = editor({ storage, lang: 'en' });
  showCode(opened.document, opened.document.querySelector('.code__lines'), 'just text');
  opened.document.querySelector('[data-action="save-template"]').click();
  const [saved] = createTemplateStore({ storage }).list();
  assert.equal(saved.title, 'Untitled');
  assert.equal(saved.notation, 'idef0');
});
