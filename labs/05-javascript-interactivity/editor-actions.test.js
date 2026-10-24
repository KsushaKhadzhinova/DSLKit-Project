import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { readCode, showCode } from '../../site/js/components/code-lines.js';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, initEditorActions } from '../../site/js/components/editor-actions.js';
import { initEditor } from '../../site/js/components/editor.js';
import { clearPositions, formatCode } from '../../site/js/utils/format-code.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const pages = { ru: readFileSync('site/app/editor.html', 'utf8'), en: readFileSync('site/en/app/editor.html', 'utf8') };
const memory = () => createStorage(createMemoryBackend());
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const setup = ({ lang = 'ru', clipboard = { writeText: async () => {} }, storage = memory(), prepare = () => {} } = {}) => {
  const window = new JSDOM(pages[lang], { url: 'http://localhost/' }).window;
  const { document } = window;
  prepare(document);
  initEditor({ root: document, storage, setTimer: () => 0, clearTimer: () => {} });
  const api = initEditorActions({ root: document, storage, clipboard });
  const press = (selector) => document.querySelector(selector).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const note = () => document.querySelector('.editor-status__saved').textContent;
  const code = () => readCode(document.querySelector('.code__lines'));
  const write = async (text) => {
    showCode(document, document.querySelector('.code__lines'), text);
    await tick();
  };
  return { window, document, api, storage, press, note, code, write };
};

test('a page without the editor returns null', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initEditorActions({ root: document, storage: memory() }), null);
});

test('undo and redo walk through the states of the code', async () => {
  const { api, press, note, code, write } = setup();
  const first = code();
  await write('diagram idef0 "One"');
  await write('diagram idef0 "Two"');
  assert.equal(api.states().length, 3);
  press('[data-action="undo"]');
  assert.equal(code(), 'diagram idef0 "One"');
  assert.match(note(), /отменено/);
  await tick();
  assert.equal(api.states().length, 3);
  press('[data-action="undo"]');
  assert.equal(code(), first);
  press('[data-action="undo"]');
  assert.equal(note(), 'Отменять нечего.');
  press('[data-action="redo"]');
  press('[data-action="redo"]');
  assert.equal(code(), 'diagram idef0 "Two"');
  assert.match(note(), /возвращено/);
  press('[data-action="redo"]');
  assert.equal(note(), 'Возвращать нечего.');
});

test('a new change after undo drops the redo branch and the history is limited', async () => {
  const { api, press, code, write } = setup();
  await write('diagram idef0 "A"');
  press('[data-action="undo"]');
  await tick();
  await write('diagram idef0 "B"');
  press('[data-action="redo"]');
  assert.equal(code(), 'diagram idef0 "B"');
  for (let index = 0; index < 110; index += 1) await write(`diagram idef0 "N${index}"`);
  assert.equal(api.states().length, 100);
  assert.equal(api.position(), 99);
});

test('English messages are used on the English page', async () => {
  const { press, note, write } = setup({ lang: 'en' });
  press('[data-action="undo"]');
  assert.equal(note(), 'Nothing to undo.');
  await write('diagram idef0 "One"');
  press('[data-action="undo"]');
  assert.equal(note(), 'Change undone.');
});

test('Save and Ctrl+S ask the autosave to save at once, even with the switch off', () => {
  const window = new JSDOM(pages.ru, { url: 'http://localhost/' }).window;
  const { document } = window;
  const storage = memory();
  initEditor({ root: document, storage, setTimer: () => 0, clearTimer: () => {}, now: () => Date.UTC(2026, 9, 24, 9, 30) });
  initEditorActions({ root: document, storage });
  document.querySelector('.editor-toolbar__switch').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(document.querySelector('.editor-toolbar__switch').getAttribute('aria-checked'), 'false');
  document.querySelector('[data-action="save"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.match(storage.get('editor-source'), /^diagram idef0/);
  assert.match(document.querySelector('.editor-status__saved').textContent, /Сохранено/);
  storage.set('editor-source', 'old');
  const other = new window.KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true });
  document.querySelector('.code').dispatchEvent(other);
  assert.equal(other.defaultPrevented, true);
  assert.match(storage.get('editor-source'), /^diagram idef0/);
  const plain = new window.KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true });
  document.querySelector('.code').dispatchEvent(plain);
  assert.equal(plain.defaultPrevented, false);
});

test('Check runs the diagram and moves focus to the first problem, or says there is none', () => {
  const { document, press, note } = setup();
  const runs = mock.fn();
  document.querySelector('.app-page--editor').addEventListener('dslkit:run', runs);
  press('[data-action="check"]');
  assert.equal(runs.mock.callCount(), 1);
  assert.equal(document.activeElement, document.querySelector('.problems__location'));
  assert.equal(note(), 'Проверка выполнена.');
  document.querySelector('.problems__list').replaceChildren();
  press('[data-action="check"]');
  assert.equal(note(), 'Проверка выполнена: проблем нет.');
});

test('Format indents the code by blocks and reports when nothing changes', async () => {
  const { press, note, code, write } = setup();
  await write('diagram idef0 "T"\nbox A0 "x" {\ninput: Order\n}\n');
  press('[data-action="format"]');
  assert.equal(code(), 'diagram idef0 "T"\nbox A0 "x" {\n  input: Order\n}');
  assert.equal(note(), 'Код отформатирован.');
  press('[data-action="format"]');
  assert.equal(note(), 'Код уже отформатирован.');
});

test('Share copies the code to the clipboard and reports a failure', async () => {
  const copied = [];
  const ok = setup({ clipboard: { writeText: async (text) => copied.push(text) } });
  await ok.api.actions.share();
  assert.deepEqual(copied, [ok.code()]);
  assert.equal(ok.note(), 'Код скопирован в буфер обмена.');
  const failing = setup({
    clipboard: {
      writeText: async () => {
        throw new Error('denied');
      },
    },
  });
  await failing.api.actions.share();
  assert.equal(failing.note(), 'Не удалось скопировать код.');
});

test('Auto layout removes the places written by moving blocks', async () => {
  const { press, note, code, write } = setup();
  press('[data-action="layout"]');
  assert.equal(note(), 'В коде нет ручного расположения блоков.');
  await write('diagram idef0 "T"\nbox A0 "x pos=1x1" pos=10x20 {');
  press('[data-action="layout"]');
  assert.equal(code(), 'diagram idef0 "T"\nbox A0 "x pos=1x1" {');
  assert.equal(note(), 'Ручное расположение блоков сброшено.');
});

test('the Theme button switches between light and dark and remembers the choice', () => {
  const { document, press, storage } = setup();
  document.documentElement.dataset.theme = 'light';
  press('[data-action="theme"]');
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(storage.get('theme'), 'dark');
  press('[data-action="theme"]');
  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.equal(storage.get('theme'), 'light');
});

test('the menu buttons and the Files section open and close the explorer', () => {
  const { document, press } = setup();
  const sidebar = document.querySelector('.editor-sidebar');
  press('.editor-topbar [data-action="sidebar"]');
  assert.ok(sidebar.classList.contains('editor-sidebar--open'));
  assert.equal(document.querySelector('.editor-topbar [data-action="sidebar"]').getAttribute('aria-pressed'), 'true');
  press('[data-panel="files"]');
  assert.equal(sidebar.classList.contains('editor-sidebar--open'), false);
  assert.equal(document.querySelector('[data-panel="files"]').getAttribute('aria-pressed'), 'false');
  press('[data-panel="files"]');
  assert.ok(sidebar.classList.contains('editor-sidebar--open'));
});

test('without the explorer the menu buttons do nothing', () => {
  const { document, api, press } = setup({ prepare: (document) => document.querySelector('.editor-sidebar').remove() });
  press('.editor-topbar [data-action="sidebar"]');
  assert.equal(api.actions.sidebar(), false);
  assert.equal(document.querySelector('.editor-sidebar'), null);
});

test('sections that do not exist yet say so and keep the state', () => {
  const { document, press, note } = setup();
  press('[data-panel="search"]');
  assert.equal(note(), 'Раздел «Поиск» появится позже.');
  assert.equal(document.querySelector('[data-panel="search"]').getAttribute('aria-pressed'), 'false');
  press('[data-problems-tab="output"]');
  assert.equal(note(), 'Раздел «Вывод» появится позже.');
  press('[data-problems-tab="problems"]');
  assert.equal(note(), 'Раздел «Вывод» появится позже.');
});

test('the explorer opens a file as a tab and tells about a file without a tab', () => {
  const { document, press, note } = setup();
  press('[data-file="rules"]');
  assert.equal(document.querySelector('#tab-rules').getAttribute('aria-selected'), 'true');
  assert.equal(document.querySelector('[data-file="rules"]').getAttribute('aria-current'), 'true');
  assert.equal(document.querySelector('[data-file="order"]').hasAttribute('aria-current'), false);
  assert.ok(document.querySelector('[data-file="rules"]').classList.contains('file-tree__item--active'));
  press('[data-file="invoice"]');
  assert.equal(note(), 'Файл invoice.dsl пока нельзя открыть.');
});

test('the banner button shows and hides the problems panel', () => {
  const { document, press } = setup();
  const button = document.querySelector('.editor-banner [data-action="problems"]');
  press('.editor-banner [data-action="problems"]');
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.ok(document.querySelector('.problems').classList.contains('problems--open'));
  assert.equal(document.activeElement, document.querySelector('.problems__location'));
  press('.editor-banner [data-action="problems"]');
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(document.querySelector('.problems').classList.contains('problems--open'), false);
});

test('zoom buttons change the scale of the drawing within the limits and Fit resets it', () => {
  const { document, api, press } = setup();
  const remote = document.querySelector('.canvas__remote');
  press('[data-action="zoom-in"]');
  assert.equal(api.zoom(), 1 + ZOOM_STEP);
  assert.equal(remote.dataset.zoom, String(1 + ZOOM_STEP));
  assert.equal(remote.style.getPropertyValue('--canvas-zoom'), String(1 + ZOOM_STEP));
  for (let index = 0; index < 20; index += 1) press('[data-action="zoom-in"]');
  assert.equal(api.zoom(), ZOOM_MAX);
  press('[data-action="zoom-fit"]');
  assert.equal(api.zoom(), 1);
  assert.equal('zoom' in remote.dataset, false);
  assert.equal(remote.style.getPropertyValue('--canvas-zoom'), '');
  for (let index = 0; index < 20; index += 1) press('[data-action="zoom-out"]');
  assert.equal(api.zoom(), ZOOM_MIN);
});

test('zoom works without the drawing area and unknown buttons are ignored', () => {
  const { document, api, press } = setup({ prepare: (document) => document.querySelector('.canvas__remote').remove() });
  assert.equal(api.actions['zoom-in'](), 1.25);
  const page = document.querySelector('.app-page--editor');
  page.insertAdjacentHTML('beforeend', '<button type="button" data-action="constructor" id="odd">x</button>');
  press('#odd');
  press('.code');
  assert.equal(api.zoom(), 1.25);
});

test('the status note is optional', async () => {
  const { api } = setup({ prepare: (document) => document.querySelector('.editor-status__saved').remove() });
  assert.equal(api.actions.undo(), 'Отменять нечего.');
});

test('formatCode handles closing lines, quoted braces and blank lines', () => {
  assert.equal(formatCode('a {\n\n\n  b {\nc "}" \n} }\n\n}\n\n'), 'a {\n\n  b {\n    c "}"\n  } }\n\n}');
  assert.equal(formatCode('} else {\nx\n}'), '} else {\n  x\n}');
  assert.equal(formatCode('\n\nline'), 'line');
  assert.equal(formatCode(''), '');
});

test('clearPositions removes pos= outside of the quoted strings only', () => {
  assert.equal(clearPositions('box A "pos=1x1" pos=3x4  \nplain'), 'box A "pos=1x1"\nplain');
});
