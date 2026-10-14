import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initEditor } from '../../site/js/components/editor.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const html = readFileSync('site/app/editor.html', 'utf8');
const load = () => new JSDOM(html, { url: 'http://localhost/' }).window;
const memory = () => createStorage(createMemoryBackend());
const setup = (storage = memory()) => {
  const window = load();
  const api = initEditor({ root: window.document, storage });
  return { window, document: window.document, storage, api };
};
const tab = (document, id) => document.querySelector(`#${id}`);
const click = (window, element) => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const press = (window, element, key, extra = {}) => {
  const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra });
  element.dispatchEvent(event);
  return event;
};

test('a page without the editor returns null', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initEditor({ root: document, storage: memory() }), null);
  const empty = new JSDOM('<!doctype html><html><body><div class="app-page--editor"></div></body></html>').window;
  assert.equal(initEditor({ root: empty.document, storage: memory() }), null);
});

test('the first tab and its panel are selected at the start', () => {
  const { document } = setup();
  assert.equal(tab(document, 'tab-order').getAttribute('aria-selected'), 'true');
  assert.equal(tab(document, 'tab-order').tabIndex, 0);
  assert.equal(tab(document, 'tab-rules').tabIndex, -1);
  assert.equal(document.querySelector('#editor-panel').hidden, false);
  assert.equal(document.querySelector('#rules-panel').hidden, true);
  assert.equal(document.querySelector('.editor-tabs__close').getAttribute('aria-label'), 'Закрыть файл order.dsl');
});

test('clicking a tab switches the panel and is saved', () => {
  const { window, document, storage } = setup();
  click(window, tab(document, 'tab-rules'));
  assert.equal(tab(document, 'tab-rules').getAttribute('aria-selected'), 'true');
  assert.ok(tab(document, 'tab-rules').classList.contains('editor-tabs__tab--active'));
  assert.equal(document.querySelector('#editor-panel').hidden, true);
  assert.equal(document.querySelector('#rules-panel').hidden, false);
  assert.equal(storage.get('editor-tab'), 1);
  click(window, document.querySelector('.editor-tabs__list'));
  assert.equal(storage.get('editor-tab'), 1);
});

test('arrow keys, Home and End move between tabs and other keys are ignored', () => {
  const { window, document } = setup();
  const first = tab(document, 'tab-order');
  const second = tab(document, 'tab-rules');
  press(window, first, 'ArrowRight');
  assert.equal(second.getAttribute('aria-selected'), 'true');
  assert.equal(document.activeElement, second);
  press(window, second, 'ArrowRight');
  assert.equal(first.getAttribute('aria-selected'), 'true');
  press(window, first, 'ArrowLeft');
  assert.equal(second.getAttribute('aria-selected'), 'true');
  press(window, second, 'Home');
  assert.equal(first.getAttribute('aria-selected'), 'true');
  press(window, first, 'End');
  assert.equal(second.getAttribute('aria-selected'), 'true');
  const ignored = press(window, second, 'a');
  assert.equal(ignored.defaultPrevented, false);
  const outside = press(window, document.querySelector('.editor-tabs__list'), 'ArrowRight');
  assert.equal(outside.defaultPrevented, false);
});

test('the saved tab is restored and a bad saved value falls back to the selected tab', () => {
  const storage = memory();
  storage.set('editor-tab', 1);
  const restored = setup(storage);
  assert.equal(tab(restored.document, 'tab-rules').getAttribute('aria-selected'), 'true');
  storage.set('editor-tab', 9);
  const fallback = setup(storage);
  assert.equal(tab(fallback.document, 'tab-order').getAttribute('aria-selected'), 'true');
});

test('the close button opens the dialog with showModal when it exists and with the open attribute otherwise', () => {
  const { window, document } = setup();
  const dialog = document.querySelector('#close-tab-modal');
  click(window, document.querySelector('.editor-tabs__close'));
  assert.equal(dialog.hasAttribute('open'), true);
  dialog.removeAttribute('open');
  dialog.showModal = mock.fn();
  click(window, document.querySelector('.editor-tabs__close'));
  assert.equal(dialog.showModal.mock.callCount(), 1);
});

test('choosing Save removes the unsaved marks', () => {
  const { window, document } = setup();
  const dialog = document.querySelector('#close-tab-modal');
  assert.ok(document.querySelector('.editor-tabs__dot'));
  dialog.returnValue = 'save';
  dialog.dispatchEvent(new window.Event('close'));
  assert.equal(document.querySelector('.editor-tabs__dot'), null);
  assert.equal(document.querySelector('.editor-topbar__dot'), null);
  assert.equal(
    [...document.querySelectorAll('.visually-hidden')].some((note) => note.textContent.trim() === 'не сохранено'),
    false,
  );
});

test('choosing Close without saving hides the tab and selects the next one, Cancel changes nothing', () => {
  const { window, document } = setup();
  const dialog = document.querySelector('#close-tab-modal');
  dialog.returnValue = 'cancel';
  dialog.dispatchEvent(new window.Event('close'));
  assert.equal(tab(document, 'tab-order').hidden, false);
  dialog.returnValue = 'discard';
  dialog.dispatchEvent(new window.Event('close'));
  assert.equal(tab(document, 'tab-order').hidden, true);
  assert.equal(document.querySelector('#editor-panel').hidden, true);
  assert.equal(tab(document, 'tab-rules').getAttribute('aria-selected'), 'true');
  press(window, tab(document, 'tab-rules'), 'ArrowRight');
  assert.equal(tab(document, 'tab-rules').getAttribute('aria-selected'), 'true');
  dialog.returnValue = 'discard';
  dialog.dispatchEvent(new window.Event('close'));
  assert.equal(tab(document, 'tab-rules').hidden, true);
});

test('the autosave switch toggles, updates the status bar and is saved', () => {
  const { window, document, storage } = setup();
  const toggle = document.querySelector('.editor-toolbar__switch');
  const status = document.querySelector('.editor-status__cursor');
  assert.equal(toggle.getAttribute('aria-checked'), 'true');
  click(window, toggle);
  assert.equal(toggle.getAttribute('aria-checked'), 'false');
  assert.match(status.textContent, /Автосохранение: выкл/);
  assert.equal(storage.get('settings').autosave, false);
  click(window, toggle);
  assert.match(status.textContent, /Автосохранение: вкл/);
});

test('a saved autosave value and a corrupted settings object are handled', () => {
  const storage = memory();
  storage.set('settings', { autosave: false });
  const saved = setup(storage);
  assert.equal(saved.document.querySelector('.editor-toolbar__switch').getAttribute('aria-checked'), 'false');
  storage.set('settings', ['broken']);
  const broken = setup(storage);
  assert.equal(broken.document.querySelector('.editor-toolbar__switch').getAttribute('aria-checked'), 'true');
});

test('the view switch shows one view, marks the pressed buttons and is saved', () => {
  const { window, document, storage, api } = setup();
  assert.equal(api.view(), 'canvas');
  const code = document.querySelector('.editor-segmented__button[data-view="code"]');
  click(window, code);
  assert.equal(api.view(), 'code');
  assert.equal(code.getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelector('.editor-bottom-nav__item[data-view="canvas"]').getAttribute('aria-pressed'), 'false');
  assert.equal(storage.get('editor-view'), 'code');
});

test('a saved view is restored and an unknown one falls back to the canvas', () => {
  const storage = memory();
  storage.set('editor-view', 'code');
  assert.equal(setup(storage).api.view(), 'code');
  storage.set('editor-view', 'nonsense');
  assert.equal(setup(storage).api.view(), 'canvas');
});

test('Run is blocked while the page has errors and moves focus to the first problem', () => {
  const { window, document } = setup();
  const runs = mock.fn();
  document.querySelector('.app-page--editor').addEventListener('dslkit:run', runs);
  const event = press(window, document.querySelector('.app-page--editor'), 'Enter', { ctrlKey: true });
  assert.equal(event.defaultPrevented, true);
  assert.equal(document.activeElement, document.querySelector('.problems__location'));
  click(window, document.querySelector('.button--run'));
  assert.equal(runs.mock.callCount(), 0);
});

test('Run is performed when no button is disabled, and plain Enter does nothing', () => {
  const { window, document } = setup();
  const page = document.querySelector('.app-page--editor');
  const runs = mock.fn();
  page.addEventListener('dslkit:run', runs);
  document.querySelectorAll('.button--run').forEach((button) => button.setAttribute('aria-disabled', 'false'));
  press(window, page, 'Enter', { metaKey: true });
  click(window, document.querySelector('.button--run'));
  assert.equal(runs.mock.callCount(), 2);
  const plain = press(window, page, 'Enter');
  assert.equal(plain.defaultPrevented, false);
  click(window, page);
  assert.equal(runs.mock.callCount(), 2);
});

test('a missing problems link, dialog, close button, switch, status and main do not break the editor', () => {
  const minimal = new JSDOM(`<!doctype html><html><body>
    <div class="app-page--editor">
      <div class="editor-tabs__list"><button role="tab" id="t1" aria-controls="p1" aria-selected="true"><span>a.dsl</span></button></div>
      <div id="p1" role="tabpanel"></div>
      <button class="button--run" aria-disabled="true">Run</button>
      <button data-view="code">c</button>
    </div></body></html>`).window;
  const api = initEditor({ root: minimal.document, storage: memory() });
  assert.equal(api.view(), undefined);
  api.showView('code');
  minimal.document.querySelector('.button--run').dispatchEvent(new minimal.MouseEvent('click', { bubbles: true }));
  assert.equal(minimal.document.querySelector('#t1').getAttribute('aria-selected'), 'true');
});

test('a close button without a dialog does nothing', () => {
  const window = new JSDOM(`<!doctype html><html><body>
    <div class="app-page--editor">
      <div class="editor-tabs__list"><button role="tab" id="t1" aria-controls="p1" aria-selected="true"><span>a.dsl</span></button></div>
      <div id="p1" role="tabpanel"></div>
      <button class="editor-tabs__close" aria-label="close"></button>
    </div></body></html>`).window;
  initEditor({ root: window.document, storage: memory() });
  window.document.querySelector('.editor-tabs__close').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(window.document.querySelector('#t1').getAttribute('aria-selected'), 'true');
});
