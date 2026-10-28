import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { readCode, showCode } from '../../site/js/components/code-lines.js';
import { RUN_DELAY_MS, initCodeInput } from '../../site/js/components/code-input.js';

const pages = { ru: readFileSync('site/app/editor.html', 'utf8'), en: readFileSync('site/en/app/editor.html', 'utf8') };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const setup = ({ lang = 'ru' } = {}) => {
  const window = new JSDOM(pages[lang], { url: 'http://localhost/', pretendToBeVisual: true }).window;
  const { document } = window;
  const timers = [];
  const cleared = [];
  const api = initCodeInput({ root: document, setTimer: (fn, ms) => timers.push({ fn, ms }) - 1, clearTimer: (id) => cleared.push(id) });
  const input = document.querySelector('.code__input');
  const runs = [];
  document.querySelector('.app-page--editor').addEventListener('dslkit:run', () => runs.push(1));
  const key = (init) => {
    const event = new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    input.dispatchEvent(event);
    return event;
  };
  const type = (value, caret = value.length) => {
    input.value = value;
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  return { window, document, api, input, timers, cleared, runs, key, type, lines: () => readCode(document.querySelector('.code__lines')) };
};

test('a page without the text field returns null', () => {
  const { document } = new JSDOM('<!doctype html><html><body><div class="app-page--editor"><ol class="code__lines"></ol></div></body></html>').window;
  assert.equal(initCodeInput({ root: document }), null);
});

test('the field holds the same text as the lines, also after the lines change from outside', async () => {
  const t = setup();
  assert.equal(t.input.value, t.lines());
  showCode(t.document, t.document.querySelector('.code__lines'), 'diagram idef0 "New"');
  await tick();
  assert.equal(t.input.value, 'diagram idef0 "New"');
});

test('typing redraws the lines and asks for a run after a short pause, a new key restarts the pause', () => {
  const t = setup();
  t.type('diagram idef0 "A"\nbox A1 "One"');
  assert.equal(t.lines(), 'diagram idef0 "A"\nbox A1 "One"');
  assert.equal(t.timers.length, 1);
  assert.equal(t.timers[0].ms, RUN_DELAY_MS);
  assert.equal(t.api.pending(), true);
  t.type('diagram idef0 "B"');
  assert.deepEqual(t.cleared, [0]);
  t.timers[1].fn();
  assert.equal(t.runs.length, 1);
  assert.equal(t.api.pending(), false);
  assert.equal(t.lines(), 'diagram idef0 "B"');
});

test('the cursor position is shown in Russian and in English', () => {
  const ru = setup();
  ru.type('one\ntwo three', 7);
  assert.match(ru.document.querySelector('.editor-status__cursor').textContent, /Автосохранение: вкл · стр\. 2, стлб\. 4/);
  assert.deepEqual(ru.api.position(), { line: 2, column: 4 });
  const en = setup({ lang: 'en' });
  en.type('one\ntwo', 5);
  assert.match(en.document.querySelector('.editor-status__cursor').textContent, /line 2, col\. 2/);
  ['keyup', 'click', 'focus'].forEach((name) => en.input.dispatchEvent(new en.window.Event(name)));
});

test('Tab writes an indent, Shift+Tab and Ctrl+Tab are left to the browser', () => {
  const t = setup();
  t.type('a', 1);
  assert.equal(t.key({ key: 'Tab' }).defaultPrevented, true);
  assert.equal(t.input.value, 'a  ');
  assert.equal(t.key({ key: 'Tab', shiftKey: true }).defaultPrevented, false);
  assert.equal(t.key({ key: 'Tab', ctrlKey: true }).defaultPrevented, false);
  assert.equal(t.key({ key: 'x' }).defaultPrevented, false);
});

test('Enter keeps the indent of the line and adds one after an opening brace', () => {
  const t = setup();
  t.type('box A1 {', 8);
  t.key({ key: 'Enter' });
  assert.equal(t.input.value, 'box A1 {\n  ');
  t.type('box A1 {\n  input: X', 19);
  t.key({ key: 'Enter' });
  assert.equal(t.input.value, 'box A1 {\n  input: X\n  ');
  t.type('plain', 5);
  t.key({ key: 'Enter' });
  assert.equal(t.input.value, 'plain\n');
  assert.equal(t.key({ key: 'Enter', ctrlKey: true }).defaultPrevented, false);
  assert.equal(t.key({ key: 'Enter', shiftKey: true }).defaultPrevented, false);
});

test('a closing brace on an indented empty line steps one indent back', () => {
  const t = setup();
  t.type('box A1 {\n  ', 11);
  t.key({ key: '}' });
  assert.equal(t.input.selectionStart, 9);
  t.type('a {\n    ', 8);
  t.key({ key: '}' });
  assert.equal(t.input.selectionStart, 6);
  t.type('x', 1);
  t.key({ key: '}' });
  assert.equal(t.input.selectionStart, 1);
  t.type('', 0);
  t.key({ key: '}' });
  t.type(' ', 1);
  t.key({ key: '}' });
  t.key({ key: '}', ctrlKey: true });
});

test('a link of the problems panel puts the cursor on the line of the problem', () => {
  const t = setup();
  t.type('one\ntwo\nthree', 0);
  const page = t.document.querySelector('.app-page--editor');
  const link = (href) => {
    const a = t.document.createElement('a');
    a.className = 'problems__location';
    if (href) a.setAttribute('href', href);
    page.append(a);
    return a;
  };
  const click = (node) => node.dispatchEvent(new t.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.equal(click(link('#line-3')), false);
  assert.equal(t.input.selectionStart, 8);
  click(link('#line-1'));
  assert.equal(t.input.selectionStart, 0);
  assert.equal(click(link(null)), true);
  assert.equal(click(link('#nowhere')), true);
  click(page);
});

test('the field works on a page without the cursor note', () => {
  const window = new JSDOM(
    '<!doctype html><html lang="ru"><body><div class="app-page--editor"><div class="code"><ol class="code__lines"><li class="code__line"><code>a</code></li></ol><textarea class="code__input"></textarea></div></div></body></html>',
  ).window;
  const api = initCodeInput({ root: window.document, setTimer: () => 0, clearTimer: () => {} });
  const input = window.document.querySelector('.code__input');
  input.value = 'b';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(api.position().line, 1);
});
