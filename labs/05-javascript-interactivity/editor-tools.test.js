import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { readCode, showCode } from '../../site/js/components/code-lines.js';
import { initEditorTools } from '../../site/js/components/editor-tools.js';
import { initEditor } from '../../site/js/components/editor.js';
import { TEMPLATES } from '../../site/js/notations/index.js';
import { addCommit, assistant, diffLines, diffText, fixCode, nearestKeyword, replaceAll, searchLines, shortHash } from '../../site/js/utils/editor-tools.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const pages = { ru: readFileSync('site/app/editor.html', 'utf8'), en: readFileSync('site/en/app/editor.html', 'utf8') };
const memory = () => createStorage(createMemoryBackend());
const BROKEN = 'diagram idef0 "T"\nbox A1 "One" {\n input: X\n contro: Y\n output: Z\n}\nbox A2 "Two" {\n input: Z\n arrow A1.output -> A2.input';

test('search finds every place with line and column and can match the case', () => {
  assert.deepEqual(
    searchLines('Box a\nbox box', 'box').map((m) => [m.line, m.column]),
    [
      [1, 1],
      [2, 1],
      [2, 5],
    ],
  );
  assert.equal(searchLines('Box', 'box', true).length, 0);
  assert.equal(searchLines('Box', '').length, 0);
});

test('replace all changes every place and tells how many', () => {
  assert.deepEqual(replaceAll('a.b a.b', 'a.b', '$&'), { text: '$& $&', count: 2 });
  assert.deepEqual(replaceAll('abc', 'x', 'y'), { text: 'abc', count: 0 });
  assert.equal(replaceAll('Box box', 'box', 'b', true).text, 'Box b');
});

test('the diff marks added, removed and unchanged lines like git diff', () => {
  const ops = diffLines('a\nb\nc', 'a\nc\nd');
  assert.deepEqual(
    ops.map((op) => op.type),
    ['same', 'del', 'same', 'add'],
  );
  assert.equal(diffText(ops), ' a\n-b\n c\n+d');
  assert.deepEqual(diffLines('', 'x'), [{ type: 'add', text: 'x' }]);
  assert.deepEqual(diffLines('x', ''), [{ type: 'del', text: 'x' }]);
  assert.deepEqual(
    diffLines('a', 'a\nb').map((op) => op.type),
    ['same', 'add'],
  );
  assert.deepEqual(
    diffLines('b', 'a\nb').map((op) => op.type),
    ['add', 'same'],
  );
  assert.deepEqual(
    diffLines('a\nb', 'a').map((op) => op.type),
    ['same', 'del'],
  );
  assert.deepEqual(
    diffLines('a\nb', 'b\na')
      .map((op) => op.type)
      .sort(),
    ['add', 'del', 'same'],
  );
});

test('commits keep the newest first, skip an unchanged code and are limited', () => {
  assert.equal(shortHash('abc').length, 7);
  let state = addCommit([], 'one', ' first ', 1);
  assert.equal(state.added, true);
  assert.equal(state.commits[0].message, 'first');
  assert.equal(addCommit(state.commits, 'one', 'again', 2).added, false);
  state = addCommit(state.commits, 'two', '', 3);
  assert.equal(state.commits[0].message, 'Без сообщения');
  let list = state.commits;
  for (let i = 0; i < 60; i += 1) list = addCommit(list, `v${i}`, 'm', i).commits;
  assert.equal(list.length, 50);
});

test('the nearest keyword is found for a typo only', () => {
  assert.equal(nearestKeyword('contro'), 'control');
  assert.equal(nearestKeyword('ab'), null);
  assert.equal(nearestKeyword('input'), null);
  assert.equal(nearestKeyword('zzzzzzzz'), null);
});

test('fixCode repairs a mistyped keyword and closes a block, and leaves clean code alone', () => {
  const result = fixCode(BROKEN);
  assert.ok(result.code.includes(' control: Y'));
  assert.equal(result.fixes.length, 1);
  assert.equal(fixCode(TEMPLATES.idef0).fixes.length, 0);
  assert.equal(fixCode('diagram idef1 "T"\nentity A {\n id: int pk').code.endsWith('}'), true);
  const middle = fixCode('diagram idef1 "T"\nentity A {\n id: int pk\nrelationship A 1:N A "x"');
  assert.equal(middle.code.split('\n')[3], '}');
  assert.equal(fixCode('diagram idef0 "T"\n12345').fixes.length, 0);
});

test('the assistant fixes, explains, formats and creates, and says what it can do otherwise', () => {
  assert.ok(assistant('исправь ошибки', BROKEN).code.includes('control'));
  assert.equal(assistant('fix', TEMPLATES.idef0, 'en').code, undefined);
  assert.match(assistant('объясни', TEMPLATES.idef0).text, /Нотация: IDEF0/);
  assert.match(assistant('explain', 'diagram idef0', 'en').text, /Title: "—"/);
  assert.ok(assistant('форматируй', 'diagram idef0 "A"\nbox A1 "x" {\ninput: Y\n}').code.includes(' input'));
  assert.equal(assistant('создай erd', '').code, TEMPLATES.erd);
  assert.match(assistant('create idef0', '', 'en').text, /IDEF0 template/);
  assert.match(assistant('создай что-нибудь', '').text, /Я умею/);
  assert.match(assistant('привет', '', 'en').text, /I can/);
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const setup = ({ lang = 'ru', clipboard = { writeText: async () => {} }, storage = memory(), time = 1_700_000_000_000 } = {}) => {
  const window = new JSDOM(pages[lang], { url: 'http://localhost/' }).window;
  const { document } = window;
  initEditor({ root: document, storage, setTimer: () => 0, clearTimer: () => {} });
  const tools = initEditorTools({ root: document, storage, now: () => time, clipboard });
  const $ = (selector) => document.querySelector(selector);
  const press = (target) => (typeof target === 'string' ? $(target) : target).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const code = () => readCode($('.code__lines'));
  const put = (text) => showCode(document, $('.code__lines'), text);
  const type = (node, value) => {
    node.value = value;
    node.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  const key = (target, init) => target.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, ...init }));
  return { window, document, tools, $, press, code, put, type, key, storage };
};

test('a page without the editor returns null', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initEditorTools({ root: document, storage: memory() }), null);
});

test('the search panel opens from the activity bar, finds, jumps and replaces', () => {
  const { $, press, type, code, put, document, window, key } = setup();
  assert.equal($('.editor-tools').hidden, true);
  press('[data-panel="search"]');
  assert.equal($('.editor-tools').hidden, false);
  assert.equal($('[data-panel="search"]').getAttribute('aria-pressed'), 'true');
  put('diagram idef0 "T"\nbox A1 "One" {\n}\nbox A2 "Two" {\n}');
  const find = $('.editor-tools__view input');
  type(find, 'box');
  assert.equal($('.editor-tools__status').textContent, 'Найдено: 2');
  press($$('.editor-tools__hit')[1]);
  window.Element.prototype.scrollIntoView = () => {};
  assert.equal(document.querySelectorAll('.code__line--found').length, 1);
  press($$('.editor-tools__hit')[0]);
  assert.equal(document.querySelectorAll('.code__line--found').length, 1);
  press($('.editor-tools__view .editor-tools__list'));
  const replaceBox = [...document.querySelectorAll('.editor-tools__input')].find((node) => node.placeholder === 'Заменить на');
  replaceBox.value = 'node';
  const caseBox = document.querySelector('.editor-tools__check input');
  caseBox.checked = true;
  caseBox.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal($('.editor-tools__status').textContent, 'Найдено: 2');
  press($('.editor-tools__view .button'));
  assert.match($('.editor-tools__status').textContent, /Заменено: 2/);
  assert.ok(code().includes('node A1'));
  type(find, 'zzz');
  press($('.editor-tools__view .button'));
  assert.equal($('.editor-tools__status').textContent, 'Заменено: 0');
  press('[data-panel="search"]');
  assert.equal($('.editor-tools').hidden, true);
  key($('.app-page--editor'), { key: 'f', ctrlKey: true });
  assert.equal($('.editor-tools').hidden, false);
  key($('.editor-tools'), { key: 'a' });
  assert.equal($('.editor-tools').hidden, false);
  key($('.editor-tools'), { key: 'Escape' });
  assert.equal($('.editor-tools').hidden, true);
  key($('.app-page--editor'), { key: 'x', ctrlKey: true });
  key($('.app-page--editor'), { key: 'F', metaKey: true });
  assert.equal($('.editor-tools').hidden, false);
  key($('.editor-tools'), { key: 'Escape' });
  press('[data-panel="search"]');
  press('.editor-tools__close');
  assert.equal($('.editor-tools').hidden, true);
  function $$(selector) {
    return [...document.querySelectorAll(selector)];
  }
});

test('git: commit, status line, compare, restore, copy the diff', async () => {
  const written = [];
  const { $, press, type, code, put, storage, document, window } = setup({
    clipboard: { writeText: async (text) => written.push(text) },
    time: 1_700_000_000_000,
  });
  press('[data-panel="git"]');
  assert.match($('.editor-tools__summary').textContent, /не отслеживается/);
  assert.match($('.editor-tools__empty').textContent, /пока нет/);
  press([...document.querySelectorAll('.editor-tools__view .button')].find((b) => b.textContent === 'Закоммитить'));
  assert.equal(storage.get('git-commits').length, 1);
  assert.match($('.editor-tools__status').textContent, /создан/);
  assert.match($('.editor-tools__summary').textContent, /совпадает/);
  const firstCode = code();
  press([...document.querySelectorAll('.editor-tools__view .button')].find((b) => b.textContent === 'Закоммитить'));
  assert.match($('.editor-tools__status').textContent, /Нет изменений/);
  put(`${firstCode}\n// note`);
  press('[data-panel="git"]');
  press('[data-panel="git"]');
  assert.match($('.editor-tools__summary').textContent, /\+1 −0/);
  assert.match($('.editor-status__branch').textContent, /main\*/);
  type($('.editor-tools__view input'), 'second');
  press([...document.querySelectorAll('.editor-tools__view .button')].find((b) => b.textContent === 'Закоммитить'));
  assert.equal(document.querySelectorAll('.editor-tools__commit').length, 2);
  press('.editor-tools__commit [data-act="diff"]');
  assert.equal($('.editor-tools__diff').hidden, false);
  press('.editor-tools__log');
  press(document.querySelectorAll('.editor-tools__commit [data-act="restore"]')[1]);
  assert.equal(code(), firstCode);
  assert.match($('.editor-tools__status').textContent, /возвращён/);
  press([...document.querySelectorAll('.editor-tools__view .button')].find((b) => b.textContent === 'Скопировать diff'));
  await tick();
  assert.equal(written.length, 1);
  assert.match($('.editor-tools__status').textContent, /скопирован/);
  window.close();
});

test('copying the diff reports a failure and works without commits', async () => {
  const { $, press, document } = setup({
    clipboard: {
      writeText: async () => {
        throw new Error('no');
      },
    },
  });
  press('[data-panel="git"]');
  press([...document.querySelectorAll('.editor-tools__view .button')].find((b) => b.textContent === 'Скопировать diff'));
  await tick();
  assert.match($('.editor-tools__status').textContent, /Не удалось/);
});

test('commits survive a reload and a damaged store is ignored', () => {
  const storage = memory();
  const first = setup({ storage });
  first.press('[data-panel="git"]');
  first.press([...first.document.querySelectorAll('.editor-tools__view .button')].find((b) => b.textContent === 'Закоммитить'));
  const second = setup({ storage });
  assert.equal(second.tools.commits().length, 1);
  const broken = memory();
  broken.set('git-commits', 'oops');
  assert.equal(setup({ storage: broken }).tools.commits().length, 0);
});

test('the assistant panel answers, applies the code and reacts to Enter and the quick buttons', () => {
  const { $, press, type, code, put, key, document } = setup();
  press('[data-panel="ai"]');
  assert.equal($('[data-panel="ai"]').getAttribute('aria-pressed'), 'true');
  put(BROKEN);
  const ask = [...document.querySelectorAll('.editor-tools__input')].find((node) => node.placeholder === 'Спросите помощника');
  document.defaultView.Element.prototype.scrollIntoView = () => {};
  type(ask, 'исправь ошибки');
  key(ask, { key: 'a' });
  key(ask, { key: 'Enter' });
  assert.ok(code().includes(' control: Y'));
  assert.equal(document.querySelectorAll('.editor-tools__message--user').length, 1);
  const buttons = [...document.querySelectorAll('.editor-tools__view .button')];
  type(ask, '   ');
  press(buttons.find((b) => b.textContent === 'Отправить'));
  assert.equal(document.querySelectorAll('.editor-tools__message--user').length, 1);
  press(buttons.find((b) => b.textContent === 'Объяснить диаграмму'));
  assert.match($('.editor-tools__chat').lastChild.textContent, /Нотация/);
  press(buttons.find((b) => b.textContent === 'Форматировать'));
  assert.match($('.editor-tools__chat').lastChild.textContent, /отформатирован/);
  type(ask, 'создай dfd');
  press(buttons.find((b) => b.textContent === 'Отправить'));
  assert.equal(code(), TEMPLATES.dfd);
});

test('the bottom tabs show the output of the runs and the versions, the assistant tab opens the panel', async () => {
  const { $, press, document, put } = setup({ lang: 'en' });
  press('[data-problems-tab="output"]');
  assert.match($('.problems__extra').textContent, /No runs yet/);
  assert.equal($('.problems__list').hidden, true);
  $('.app-page--editor').dispatchEvent(new document.defaultView.CustomEvent('dslkit:run', { bubbles: true }));
  await tick();
  assert.match($('.problems__extra').textContent, /Run:/);
  for (let i = 0; i < 55; i += 1) $('.app-page--editor').dispatchEvent(new document.defaultView.CustomEvent('dslkit:run', { bubbles: true }));
  await tick();
  assert.equal(document.querySelectorAll('.problems__extra')[0].children.length, 50);
  press('[data-problems-tab="versions"]');
  assert.match(document.querySelectorAll('.problems__extra')[1].textContent, /No commits yet/);
  press('[data-panel="git"]');
  press([...document.querySelectorAll('.editor-tools__view .button')].find((b) => b.textContent === 'Commit'));
  put('diagram idef0 "Other"');
  press('[data-problems-tab="versions"]');
  assert.equal(document.querySelectorAll('.problems__extra')[1].children.length, 1);
  press('[data-problems-tab="ai"]');
  assert.equal($('.editor-tools').hidden, false);
  assert.equal($('[data-problems-tab="ai"]').getAttribute('aria-pressed'), 'true');
  press('[data-problems-tab="problems"]');
  assert.equal($('.problems__list').hidden, false);
  assert.equal($('.problems__extra').hidden, true);
});

test('the Fix button of a problem repairs the code through the assistant', () => {
  const { $, press, code, put, document, window } = setup();
  put(BROKEN);
  const item = document.createElement('li');
  item.className = 'problems__item';
  item.innerHTML = '<button type="button" class="button">Исправить</button>';
  $('.problems__list').append(item);
  press(item.querySelector('button'));
  assert.ok(code().includes(' control: Y'));
  assert.equal($('.editor-tools').hidden, false);
  press($('.problems__list'));
  mock.reset();
  window.close();
});

test('the panels work without the status branch, the problems panel and the activity buttons', async () => {
  const window = new JSDOM(
    '<!doctype html><html lang="ru"><body><div class="app-page app-page--editor"><ol class="code__lines"><li class="code__line"><code>diagram idef0</code></li></ol></div></body></html>',
  ).window;
  const tools = initEditorTools({ root: window.document, storage: memory() });
  assert.equal(tools.open('git'), 'git');
  assert.equal(tools.open(null), null);
  assert.equal(tools.selectTab('output'), 'output');
  assert.equal(tools.current(), null);
  window.document.querySelector('.app-page--editor').dispatchEvent(new window.CustomEvent('dslkit:run', { bubbles: true }));
  await tick();
});

test('the notation button of the menu opens the explorer and focuses the notation choice', () => {
  const { $, press, document } = setup();
  press('[data-notation-label]');
  assert.ok($('.editor-sidebar').classList.contains('editor-sidebar--open'));
  assert.equal(document.activeElement, $('[data-notation-select]'));
});

test('the notation button works on a page without the explorer', () => {
  const window = new JSDOM(
    '<!doctype html><html lang="ru"><body><div class="app-page app-page--editor"><button data-notation-label>x</button><ol class="code__lines"><li class="code__line"><code>diagram idef0</code></li></ol></div></body></html>',
  ).window;
  initEditorTools({ root: window.document, storage: memory() });
  window.document.querySelector('[data-notation-label]').click();
});

test('opening the explorer from the activity bar closes the drawer', () => {
  const { $, press } = setup();
  press('[data-panel="git"]');
  assert.equal($('.editor-tools').hidden, false);
  press('[data-panel="files"]');
  assert.equal($('.editor-tools').hidden, true);
  assert.equal($('[data-panel="git"]').getAttribute('aria-pressed'), 'false');
});
