import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initAuthGate } from '../../site/js/components/auth-gate.js';
import { showCode } from '../../site/js/components/code-lines.js';
import { initEditorProjects } from '../../site/js/components/editor-projects.js';
import { initImport } from '../../site/js/components/import-menu.js';
import { initSettings } from '../../site/js/components/settings.js';
import { createProjectStore, createTemplateStore } from '../../site/js/storage/projects.js';
import { scopedKey } from '../../site/js/storage/scope.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

// A browser storage that can be filled up: while `state.full` is true every write throws, like QuotaExceededError.
const fillable = () => {
  const backend = createMemoryBackend();
  const state = { full: false };
  const wrapped = {
    ...backend,
    setItem: (key, value) => {
      if (state.full) throw new Error('QuotaExceededError');
      backend.setItem(key, value);
    },
  };
  return { storage: createStorage(wrapped), state };
};
const clock = () => {
  let t = 1_700_000_000_000;
  return () => (t += 60_000);
};
const editorHtml = readFileSync('site/app/editor.html', 'utf8');
const person = { name: 'Ann', email: 'ann@example.com', password: 'correct horse 9' };

test('F3: a full storage is reported by every store method instead of a success', () => {
  const { storage, state } = fillable();
  const store = createProjectStore({ storage, now: clock() });
  const first = store.save({ title: 'A', notation: 'idef0', source: 'a' });
  const templates = createTemplateStore({ storage, now: clock() });
  const template = templates.save({ title: 'T', notation: 'idef0', source: 't' });
  state.full = true;
  assert.equal(store.save({ title: 'B', notation: 'idef0', source: 'b' }), false);
  assert.equal(store.save({ id: first.id, title: 'A2', notation: 'idef0', source: 'a2' }), false);
  assert.equal(store.rename(first.id, 'New'), false);
  assert.equal(store.trash(first.id), false);
  assert.equal(store.remove(first.id), false);
  assert.equal(templates.save({ title: 'T2', notation: 'idef0', source: 't2' }), false);
  assert.equal(templates.rename(template.id, 'New'), false);
  assert.equal(templates.remove(template.id), false);
  state.full = false;
  assert.equal(store.list().length, 1);
  assert.equal(store.get(first.id).title, 'A');
});

test('ISO-19: a save never brings back a project that another tab trashed or deleted', () => {
  const { storage } = fillable();
  const store = createProjectStore({ storage, now: clock() });
  const project = store.save({ title: 'A', notation: 'idef0', source: 'a' });
  store.trash(project.id);
  assert.equal(store.save({ id: project.id, title: 'A', notation: 'idef0', source: 'a2' }), undefined);
  assert.equal(store.list().length, 0);
  assert.equal(store.listTrash().length, 1);
  store.remove(project.id);
  assert.equal(store.list().length + store.listTrash().length, 0);
});

const openEditor = ({ storage, lang = 'ru', navigate = () => {} }) => {
  const dom = new JSDOM(editorHtml.replace('<html lang="ru">', `<html lang="${lang}">`), { url: 'http://localhost/app/editor.html?template=erd' });
  const { document } = dom.window;
  const timers = [];
  const api = initEditorProjects({ root: document, storage, now: clock(), seed: false, setTimer: (fn) => timers.push(fn) - 1, clearTimer: () => {}, navigate });
  const save = () => document.querySelector('.app-page--editor').dispatchEvent(new dom.window.CustomEvent('dslkit:save', { bubbles: true }));
  return { dom, document, api, save, timers };
};

test('F3 + F2: a failed save says one thing, in the status bar and the canvas note, never "saved" or "ready"', () => {
  for (const lang of ['ru', 'en']) {
    const { storage, state } = fillable();
    const { document, save } = openEditor({ storage, lang });
    const canvas = document.querySelector('.canvas__status');
    canvas.textContent = lang === 'ru' ? 'Диаграмма готова.' : 'Diagram is ready.';
    state.full = true;
    save();
    assert.match(document.querySelector('.editor-status__saved').textContent, lang === 'ru' ? /Не сохранено: хранилище/ : /Not saved: the browser storage/);
    assert.equal(canvas.textContent, document.querySelector('.editor-status__saved').textContent);
    assert.equal(canvas.dataset.state, 'note');
    assert.doesNotMatch(document.querySelector('.editor-status__saved').textContent, /Сохранено в|Saved to/);
  }
});

test('F2: the sixth new diagram of a day gets the limit message in both notes', () => {
  const { storage } = fillable();
  const store = createProjectStore({ storage, now: clock() });
  for (let n = 0; n < 5; n += 1) store.save({ title: `p${n}`, notation: 'idef0', source: 's' });
  const { document, save } = openEditor({ storage, lang: 'en' });
  document.querySelector('.canvas__status').textContent = 'Diagram is ready.';
  save();
  assert.match(document.querySelector('.canvas__status').textContent, /limit/);
  assert.equal(document.querySelector('.canvas__status').textContent, document.querySelector('.editor-status__saved').textContent);
});

test('ISO-19: the editor says the project was deleted in another tab and does not create a copy', () => {
  const { storage } = fillable();
  const { document, api, save } = openEditor({ storage });
  save();
  const id = api.current().id;
  api.store.trash(id);
  showCode(document, document.querySelector('.code__lines'), 'changed');
  save();
  assert.match(document.querySelector('.editor-status__saved').textContent, /удалён в другой вкладке/);
  assert.equal(api.store.list().length, 0);
});

test('ISO-17: signing out or in in another tab reopens the editor for the new owner, other keys change nothing', async () => {
  const { storage } = fillable();
  const accounts = createAccountStore({ storage });
  await accounts.register(person);
  const moved = [];
  const { dom } = openEditor({ storage, navigate: (url) => moved.push(url) });
  const event = (key) => Object.assign(new dom.window.Event('storage'), { key });
  dom.window.dispatchEvent(event('dslkit.theme'));
  dom.window.dispatchEvent(event('dslkit.session'));
  assert.deepEqual(moved, []);
  accounts.logout();
  dom.window.dispatchEvent(event('dslkit.session'));
  assert.deepEqual(moved, ['/app/editor.html']);
  dom.window.dispatchEvent(Object.assign(new dom.window.Event('storage'), { key: null }));
  assert.equal(moved.length, 2);
});

test('ISO-17: the gate of a page reacts to the real, prefixed key of the session', async () => {
  const storage = createStorage(createMemoryBackend());
  await createAccountStore({ storage }).register(person);
  const sent = [];
  const window = new EventTarget();
  initAuthGate({ root: { body: { dataset: { requiresAuth: '' } }, defaultView: window }, storage, navigate: (url) => sent.push(url) });
  storage.remove('session');
  window.dispatchEvent(Object.assign(new Event('storage'), { key: 'dslkit.session' }));
  assert.deepEqual(sent, ['login.html']);
});

test('ISO-06/07: settings and versions are kept per account, a guest keeps the plain key', async () => {
  const storage = createStorage(createMemoryBackend());
  assert.equal(scopedKey(storage, 'settings'), 'settings');
  const accounts = createAccountStore({ storage });
  const { user } = await accounts.register(person);
  assert.equal(scopedKey(storage, 'settings'), `settings.${user.id}`);
  assert.equal(scopedKey(storage, 'git-commits'), `git-commits.${user.id}`);
});

test('STO-13: the settings page does not claim "saved" when the write failed', () => {
  const { storage, state } = fillable();
  const dom = new JSDOM(readFileSync('site/app/settings.html', 'utf8'), { url: 'http://localhost/app/settings.html' });
  const { document } = dom.window;
  const toasts = [];
  document.addEventListener('dslkit:toast', (event) => toasts.push(event.detail));
  initSettings({ root: document, storage });
  const control = document.querySelector('.settings input[type="checkbox"], .settings select');
  state.full = true;
  control.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(toasts.at(-1).kind, 'error');
  state.full = false;
  control.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(toasts.at(-1).kind, 'success');
});

test('F1: a failed import is an error toast and an error note, never a success', async () => {
  for (const lang of ['ru', 'en']) {
    const dom = new JSDOM(editorHtml.replace('<html lang="ru">', `<html lang="${lang}">`), { url: 'http://localhost/app/editor.html' });
    const { document } = dom.window;
    const toasts = [];
    document.addEventListener('dslkit:toast', (event) => toasts.push(event.detail));
    const api = initImport({ root: document, readClipboard: async () => 'this is not a diagram at all' });
    assert.equal(api.load('this is not a diagram at all'), false);
    assert.equal(toasts.at(-1).kind, 'error');
    assert.equal(await api.importFrom(async () => 'plain words'), false);
    assert.equal(
      await api.importFrom(async () => {
        throw new Error('read');
      }),
      false,
    );
    assert.deepEqual(
      toasts.map((item) => item.kind),
      ['error', 'error', 'error'],
    );
  }
});

test('F3: a template that cannot be stored says the storage is full, not that it was deleted', () => {
  const { storage, state } = fillable();
  const template = createTemplateStore({ storage, now: clock() }).save({ title: 'T', notation: 'idef0', source: 'diagram idef0 "T"' });
  const dom = new JSDOM(editorHtml, { url: `http://localhost/app/editor.html?tpl=${template.id}` });
  const { document } = dom.window;
  const toasts = [];
  document.addEventListener('dslkit:toast', (event) => toasts.push(event.detail));
  initEditorProjects({ root: document, storage, now: clock(), seed: false, setTimer: () => 0, clearTimer: () => {}, navigate: () => {} });
  state.full = true;
  document.querySelector('.app-page--editor').dispatchEvent(new dom.window.CustomEvent('dslkit:save', { bubbles: true }));
  assert.match(toasts.at(-1).text, /хранилище/);
  assert.equal(toasts.at(-1).kind, 'error');
});

test('ISO-17: a pending autosave is cancelled and flushed once when the account changes in another tab', async () => {
  const { storage } = fillable();
  const accounts = createAccountStore({ storage });
  await accounts.register(person);
  const cleared = [];
  const dom = new JSDOM(editorHtml, { url: 'http://localhost/app/editor.html?template=erd' });
  const { document } = dom.window;
  const moved = [];
  initEditorProjects({
    root: document,
    storage,
    now: clock(),
    seed: false,
    setTimer: () => 7,
    clearTimer: (id) => cleared.push(id),
    navigate: (url) => moved.push(url),
  });
  showCode(document, document.querySelector('.code__lines'), 'diagram erd "Changed"');
  await new Promise((resolve) => setTimeout(resolve, 5));
  accounts.logout();
  dom.window.dispatchEvent(Object.assign(new dom.window.Event('storage'), { key: 'dslkit.session' }));
  assert.deepEqual(cleared, [7]);
  assert.deepEqual(moved, ['/app/editor.html']);
});
