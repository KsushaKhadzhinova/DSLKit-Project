import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initEditor } from '../../site/js/components/editor.js';
import { AUTOSAVE_DELAY_MS, initSourceAutosave } from '../../site/js/components/source-autosave.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const html = readFileSync('site/app/editor.html', 'utf8');
const htmlEn = readFileSync('site/en/app/editor.html', 'utf8');
const memory = () => createStorage(createMemoryBackend());

// A timer that does nothing until the test says that the time has come.
const fakeTimers = () => {
  const jobs = new Map();
  let next = 1;
  return {
    setTimer: (fn, ms) => {
      jobs.set(next, { fn, ms });
      return next++;
    },
    clearTimer: (id) => jobs.delete(id),
    pending: () => [...jobs.values()],
    fire: () => {
      const [[id, job]] = [...jobs.entries()];
      jobs.delete(id);
      job.fn();
    },
  };
};

const setup = ({ page = html, storage = memory(), options = {} } = {}) => {
  const window = new JSDOM(page, { url: 'http://localhost/' }).window;
  const timers = fakeTimers();
  const api = initEditor({
    root: window.document,
    storage,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    now: () => Date.UTC(2026, 9, 23, 10, 5),
    ...options,
  });
  return { window, document: window.document, storage, timers, api };
};
const code = (document) => [...document.querySelectorAll('.code__line code')].map((line) => line.textContent).join('\n');
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('the delay is one second', () => {
  assert.equal(AUTOSAVE_DELAY_MS, 1000);
});

test('a page without code lines has no source autosave', () => {
  const window = new JSDOM('<!doctype html><html><body><div class="app-page--editor"></div></body></html>').window;
  const page = window.document.querySelector('.app-page--editor');
  assert.equal(initSourceAutosave({ page, root: window.document, storage: memory() }), null);
});

test('a change of the code is saved one second later, once', async () => {
  const { document, storage, timers, api } = setup();
  assert.equal(api.sourceAutosave.pending(), false);
  api.loadTemplate('petri');
  await settle();
  assert.equal(timers.pending().length, 1);
  assert.equal(timers.pending()[0].ms, 1000);
  api.loadTemplate('erd');
  await settle();
  assert.equal(timers.pending().length, 1, 'a new change replaces the waiting save');
  assert.equal(api.sourceAutosave.pending(), true);
  timers.fire();
  assert.equal(storage.get('editor-source'), code(document));
  assert.equal(api.sourceAutosave.pending(), false);
  assert.match(document.querySelector('.editor-status__saved').textContent, /^Сохранено \d\d:\d\d$/);
});

test('the saved time is shown in English on the English page', async () => {
  const { document, timers, api } = setup({ page: htmlEn });
  api.loadTemplate('erd');
  await settle();
  timers.fire();
  assert.match(document.querySelector('.editor-status__saved').textContent, /^Saved \d\d:\d\d$/);
});

test('a save also clears the unsaved marks of the tabs', async () => {
  const { document, timers, api } = setup();
  assert.ok(document.querySelector('.editor-tabs__dot, .editor-topbar__dot'));
  api.loadTemplate('erd');
  await settle();
  timers.fire();
  assert.equal(document.querySelector('.editor-tabs__dot, .editor-topbar__dot'), null);
});

test('with the autosave switch off nothing is written', async () => {
  const { document, storage, timers, api } = setup();
  document.querySelector('.editor-toolbar__switch').click();
  api.loadTemplate('erd');
  await settle();
  timers.fire();
  assert.equal(storage.get('editor-source', null), null);
  assert.equal(document.querySelector('.editor-status__saved').textContent, '');
});

test('the saved code comes back when the page is opened again', () => {
  const storage = memory();
  storage.set('editor-source', 'diagram graph "Back"\nnode A "One"');
  const { document } = setup({ storage });
  assert.equal(code(document), 'diagram graph "Back"\nnode A "One"');
  assert.equal(document.querySelector('.editor-tabs__dot, .editor-topbar__dot'), null, 'restored code counts as saved');
});

test('a damaged, blank or unchanged saved value leaves the page as it is', () => {
  const original = code(setup().document);
  for (const value of [42, '   ', null, ['x'], original]) {
    const storage = memory();
    storage.set('editor-source', value);
    assert.equal(code(setup({ storage }).document), original);
  }
});

test('the save works on a page without the switch and the note', async () => {
  const window = new JSDOM(
    '<!doctype html><html lang="ru"><body><div class="app-page--editor"><ol class="code__lines"><li class="code__line"><code>diagram graph "A"</code></li></ol></div></body></html>',
  ).window;
  const page = window.document.querySelector('.app-page--editor');
  const storage = memory();
  const timers = fakeTimers();
  let saved = 0;
  const api = initSourceAutosave({ page, root: window.document, storage, onSaved: () => saved++, setTimer: timers.setTimer, clearTimer: timers.clearTimer });
  page.querySelector('code').textContent = 'diagram graph "B"';
  await settle();
  timers.fire();
  assert.equal(storage.get('editor-source'), 'diagram graph "B"');
  assert.equal(saved, 1);
  assert.equal(api.save(), true);
});

test('the real timers are used when none are given', async () => {
  const window = new JSDOM(
    '<!doctype html><html><body><div class="app-page--editor"><ol class="code__lines"><li class="code__line"><code>a</code></li></ol></div></body></html>',
  ).window;
  const page = window.document.querySelector('.app-page--editor');
  const storage = memory();
  initSourceAutosave({ page, root: window.document, storage, delay: 5 });
  page.querySelector('code').textContent = 'b';
  await settle();
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(storage.get('editor-source'), 'b');
});
