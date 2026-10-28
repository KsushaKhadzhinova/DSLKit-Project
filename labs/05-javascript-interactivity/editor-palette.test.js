import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { readCode, showCode } from '../../site/js/components/code-lines.js';
import { initEditorPalette } from '../../site/js/components/editor-palette.js';
import { TEMPLATES } from '../../site/js/notations/index.js';

const pages = { ru: readFileSync('site/app/editor.html', 'utf8'), en: readFileSync('site/en/app/editor.html', 'utf8') };
const SVG = (nodes) => `<svg viewBox="0 0 600 400" width="600" height="400">${nodes}</svg>`;
const NODES =
  '<g class="notation__node" data-id="Customer"><rect/></g><g class="notation__node" data-id="2"><rect/></g><g class="notation__node" data-id="Bank"><rect/></g>';

const setup = ({ lang = 'ru', template = 'dfd', svg = true } = {}) => {
  const window = new JSDOM(pages[lang], { url: 'http://localhost/', pretendToBeVisual: true }).window;
  const { document } = window;
  showCode(document, document.querySelector('.code__lines'), TEMPLATES[template]);
  const remote = document.querySelector('.canvas__remote');
  if (svg) {
    remote.innerHTML = SVG(NODES);
    remote.querySelector('svg').getBoundingClientRect = () => ({ left: 100, top: 100, right: 700, bottom: 500, width: 600, height: 400 });
  }
  const api = initEditorPalette({ root: document });
  const $ = (selector) => document.querySelector(selector);
  const code = () => readCode($('.code__lines'));
  const fire = (target, type, init = {}) => target.dispatchEvent(new window.MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
  const runs = [];
  $('.app-page--editor').addEventListener('dslkit:run', () => runs.push(1));
  return { window, document, api, $, code, fire, runs, remote };
};

test('a page without the sidebar or the board returns null', () => {
  const bare = new JSDOM('<!doctype html><html><body><div class="app-page--editor"></div></body></html>').window;
  assert.equal(initEditorPalette({ root: bare.document }), null);
});

test('the palette lists the elements of the notation of the code, in Russian and English', () => {
  const ru = setup();
  assert.deepEqual(
    [...ru.document.querySelectorAll('.palette__item')].map((node) => node.textContent),
    ['Сущность', 'Процесс', 'Хранилище данных'],
  );
  assert.equal(ru.api.notation(), 'dfd');
  const en = setup({ lang: 'en' });
  assert.deepEqual(
    [...en.document.querySelectorAll('.palette__item')].map((node) => node.textContent),
    ['Entity', 'Process', 'Data store'],
  );
  assert.equal(en.$('.palette__connect').hidden, false);
  assert.equal(en.$('.palette__link').options.length, 1);
});

test('the palette follows the notation after a run, and the link controls hide where links are written in the code', () => {
  const t = setup();
  showCode(t.document, t.$('.code__lines'), TEMPLATES.erd);
  t.fire(t.$('.app-page--editor'), 'dslkit:run');
  assert.equal(t.api.notation(), 'erd');
  assert.equal(t.api.refresh(), 'erd');
  showCode(t.document, t.$('.code__lines'), TEMPLATES['uml-timing']);
  t.api.refresh();
  assert.equal(t.$('.palette__connect').hidden, true);
  showCode(t.document, t.$('.code__lines'), 'diagram nonsense');
  t.api.refresh();
  assert.equal(t.api.notation(), 'idef0');
  showCode(t.document, t.$('.code__lines'), 'box A1 "x"');
  t.api.refresh();
  assert.equal(t.api.notation(), 'idef0');
});

test('pressing an item adds the element to the code and runs the drawing', () => {
  const t = setup();
  t.fire(t.document.querySelectorAll('.palette__item')[1], 'click');
  assert.match(t.code(), /process P1 "Process"$/);
  assert.equal(t.$('.palette__message').textContent, 'Добавлено: P1.');
  assert.equal(t.runs.length >= 1, true);
  t.fire(t.$('.palette'), 'click');
});

test('a second start of a flow is refused with the reason', () => {
  const t = setup({ template: 'bpmn' });
  const before = t.code();
  const start = [...t.document.querySelectorAll('.palette__item')].find((node) => node.dataset.keyword === 'start');
  t.fire(start, 'click');
  assert.equal(t.code(), before);
  assert.match(t.$('.palette__message').textContent, /^Не добавлено: .*начальный/);
});

test('an item is dragged onto the drawing and written with the place, a drop outside does nothing', () => {
  const t = setup();
  const item = t.document.querySelectorAll('.palette__item')[1];
  t.fire(item, 'pointerdown', { clientX: 10, clientY: 10, button: 0 });
  t.fire(t.document, 'pointermove', { clientX: 12, clientY: 12 });
  assert.equal(t.document.querySelector('.palette__ghost'), null);
  t.fire(t.document, 'pointermove', { clientX: 200, clientY: 250 });
  const ghost = t.document.querySelector('.palette__ghost');
  assert.equal(ghost.textContent, 'Процесс');
  t.fire(t.document, 'pointermove', { clientX: 210, clientY: 260 });
  t.fire(t.document, 'pointerup', { clientX: 250, clientY: 300 });
  assert.equal(t.document.querySelector('.palette__ghost'), null);
  assert.match(t.code(), /process P1 "Process" pos=150x200$/);
  t.fire(item, 'click');
  assert.equal(t.code().match(/process P/g).length, 1);
  t.fire(item, 'click');
  assert.equal(t.code().match(/process P/g).length, 2);
  t.fire(item, 'pointerdown', { clientX: 10, clientY: 10, button: 0 });
  t.fire(t.document, 'pointermove', { clientX: 30, clientY: 30 });
  t.fire(t.document, 'pointerup', { clientX: 20, clientY: 20 });
  assert.equal(t.$('.palette__message').textContent, 'Перетащите элемент на доску или нажмите на него.');
});

test('a short press and a right button do not drag, a cancelled drag removes the ghost', () => {
  const t = setup({ svg: false });
  const item = t.document.querySelectorAll('.palette__item')[0];
  t.fire(item, 'pointerdown', { clientX: 1, clientY: 1, button: 2 });
  t.fire(t.document, 'pointermove', { clientX: 99, clientY: 99 });
  t.fire(t.document, 'pointerup', { clientX: 99, clientY: 99 });
  assert.equal(t.document.querySelector('.palette__ghost'), null);
  t.fire(item, 'pointerdown', { clientX: 1, clientY: 1, button: 0 });
  t.fire(t.document, 'pointerup', { clientX: 1, clientY: 1 });
  t.fire(t.$('.palette'), 'pointerdown');
  t.fire(item, 'pointerdown', { clientX: 1, clientY: 1, button: 0 });
  t.fire(t.document, 'pointermove', { clientX: 50, clientY: 50 });
  assert.ok(t.document.querySelector('.palette__ghost'));
  t.fire(t.document, 'pointercancel');
  assert.equal(t.document.querySelector('.palette__ghost'), null);
  t.fire(t.document, 'pointercancel');
  t.fire(item, 'pointerdown', { clientX: 1, clientY: 1, button: 0 });
  t.fire(t.document, 'pointermove', { clientX: 50, clientY: 50 });
  t.fire(t.document, 'pointerup', { clientX: 50, clientY: 50 });
  assert.equal(t.$('.palette__message').textContent, 'Перетащите элемент на доску или нажмите на него.');
});

const pickBlock = (t, id) => t.fire(t.remote.querySelector(`[data-id="${id}"]`), 'pointerdown', { button: 0 });

test('Connect joins two blocks and the gate refuses a link the notation forbids', () => {
  const t = setup();
  const mode = t.$('.palette__mode');
  t.fire(mode, 'click');
  assert.equal(mode.getAttribute('aria-pressed'), 'true');
  assert.ok(t.remote.classList.contains('canvas__remote--connect'));
  assert.equal(t.$('.palette__message').textContent, 'Выберите блок, из которого идёт связь.');
  pickBlock(t, 'Customer');
  assert.ok(t.remote.querySelector('[data-id="Customer"]').classList.contains('notation__node--selected'));
  assert.match(t.$('.palette__message').textContent, /Customer →/);
  pickBlock(t, 'Bank');
  assert.match(t.$('.palette__message').textContent, /^Связь Customer → Bank отклонена: .*не касается процесса/);
  assert.equal(mode.getAttribute('aria-pressed'), 'true');
  const before = t.code();
  pickBlock(t, 'Customer');
  pickBlock(t, '2');
  assert.equal(t.$('.palette__message').textContent, 'Связь Customer → 2 добавлена.');
  assert.equal(t.code(), `${before}\nflow Customer -> 2`);
  t.fire(t.remote.querySelector('svg'), 'pointerdown', { button: 0 });
  t.fire(mode, 'click');
  assert.equal(mode.getAttribute('aria-pressed'), 'false');
  assert.equal(t.$('.palette__message').textContent, 'Соединение отменено.');
});

test('outside the Connect mode the press on a block is left to the dragging', () => {
  const t = setup();
  let seen = 0;
  t.remote.addEventListener('pointerdown', () => (seen += 1));
  pickBlock(t, 'Customer');
  assert.equal(seen, 1);
  assert.equal(t.$('.palette__message').textContent, '');
});

test('Connect works from the keyboard and Escape cancels it', () => {
  const t = setup({ lang: 'en' });
  const key = (target, init) => target.dispatchEvent(new t.window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  t.fire(t.$('.palette__mode'), 'click');
  key(t.remote.querySelector('svg'), { key: 'Enter' });
  key(t.remote.querySelector('[data-id="Customer"]'), { key: 'a' });
  assert.equal(t.$('.palette__message').textContent, 'Pick the block the link starts from.');
  key(t.remote.querySelector('[data-id="Customer"]'), { key: 'Enter' });
  key(t.remote.querySelector('[data-id="2"]'), { key: ' ' });
  assert.equal(t.$('.palette__message').textContent, 'The link Customer → 2 is added.');
  key(t.$('.app-page--editor'), { key: 'Escape' });
  assert.equal(t.$('.palette__mode').getAttribute('aria-pressed'), 'false');
  key(t.$('.app-page--editor'), { key: 'Escape' });
  key(t.remote.querySelector('[data-id="Customer"]'), { key: 'Enter' });
  assert.equal(t.$('.palette__mode').getAttribute('aria-pressed'), 'false');
  assert.equal(t.$('.palette__message').textContent, 'Connecting is cancelled.');
});

test('the link type is taken from the list of the notation', () => {
  const t = setup({ template: 'erd' });
  t.remote.innerHTML = SVG('<g class="notation__node" data-id="Customer"></g><g class="notation__node" data-id="Order"></g>');
  t.fire(t.$('.palette__mode'), 'click');
  t.$('.palette__link').value = '';
  pickBlock(t, 'Customer');
  pickBlock(t, 'Order');
  assert.match(t.code(), /relationship Customer 1:N Order$/);
});

const stubRect = (node, left, top, width, height) => {
  node.getBoundingClientRect = () => ({ left, top, right: left + width, bottom: top + height, width, height });
};
const dropOn = (t, x, y) => {
  const item = t.document.querySelectorAll('.palette__item')[1];
  t.fire(item, 'pointerdown', { clientX: 10, clientY: 10, button: 0 });
  t.fire(t.document, 'pointermove', { clientX: 200, clientY: 200 });
  t.fire(t.document, 'pointerup', { clientX: x, clientY: y });
};

test('an element dropped onto a block moves down to the first free place, and stays inside the drawing', () => {
  const t = setup();
  const nodes = t.remote.querySelectorAll('.notation__node');
  stubRect(nodes[0], 200, 200, 100, 60);
  stubRect(nodes[1], 200, 260, 100, 60);
  stubRect(nodes[2], 400, 440, 100, 40);
  dropOn(t, 250, 230);
  assert.match(t.code(), /pos=150x281$/);
  dropOn(t, 450, 450);
  assert.match(t.code(), /pos=350x340$/);
  dropOn(t, 600, 300);
  assert.match(t.code(), /pos=500x200$/);
});

test('a drawing without a viewBox still gets its element dropped at the pointer', () => {
  const t = setup();
  t.remote.querySelector('svg').removeAttribute('viewBox');
  dropOn(t, 250, 230);
  assert.match(t.code(), /process P1 "Process" pos=150x130$/);
});

test('a pressed block is selected, Delete and the button remove it with its links', () => {
  const t = setup();
  const press = (node) => node.dispatchEvent(new t.window.MouseEvent('click', { bubbles: true }));
  const key = (node, init) => node.dispatchEvent(new t.window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  const button = t.$('.palette__remove');
  t.fire(button, 'click');
  assert.equal(t.$('.palette__message').textContent, 'Сначала нажмите на блок на доске.');
  press(t.remote.querySelector('[data-id="Bank"]'));
  assert.equal(t.api.picked(), 'Bank');
  assert.ok(t.remote.querySelector('[data-id="Bank"]').classList.contains('notation__node--picked'));
  assert.match(t.$('.palette__message').textContent, /Выбран блок Bank/);
  press(t.remote.querySelector('svg'));
  assert.equal(t.api.picked(), null);
  assert.equal(t.remote.querySelectorAll('.notation__node--picked').length, 0);
  press(t.remote.querySelector('[data-id="Bank"]'));
  t.fire(button, 'click');
  assert.equal(t.$('.palette__message').textContent, 'Удалено: Bank, связей: 2.');
  assert.ok(!t.code().includes('Bank'));
  press(t.remote.querySelector('[data-id="Customer"]'));
  assert.equal(key(t.remote.querySelector('[data-id="Customer"]'), { key: 'a' }), true);
  assert.equal(key(t.remote.querySelector('[data-id="Customer"]'), { key: 'Delete' }), false);
  assert.ok(!t.code().includes('Customer'));
  assert.equal(key(t.remote.querySelector('svg'), { key: 'Delete' }), true);
  t.fire(t.remote.querySelector('[data-id="2"]'), 'click');
  t.remote.querySelector('[data-id="2"]').dispatchEvent(new t.window.KeyboardEvent('keydown', { bubbles: true, key: 'Backspace' }));
  assert.ok(!t.code().includes('process 2'));
});

test('a block that is gone from the code says so and the Connect mode does not select', () => {
  const t = setup();
  t.remote.innerHTML = '<svg viewBox="0 0 600 400"><g class="notation__node" data-id="Ghost"></g></svg>';
  t.remote.querySelector('[data-id="Ghost"]').dispatchEvent(new t.window.MouseEvent('click', { bubbles: true }));
  t.fire(t.$('.palette__remove'), 'click');
  assert.equal(t.$('.palette__message').textContent, 'Сначала нажмите на блок на доске.');
  t.fire(t.$('.palette__mode'), 'click');
  t.remote.querySelector('[data-id="Ghost"]').dispatchEvent(new t.window.MouseEvent('click', { bubbles: true }));
  assert.equal(t.api.picked(), null);
  const key = new t.window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Delete' });
  t.remote.querySelector('[data-id="Ghost"]').dispatchEvent(key);
  assert.equal(key.defaultPrevented, false);
});
