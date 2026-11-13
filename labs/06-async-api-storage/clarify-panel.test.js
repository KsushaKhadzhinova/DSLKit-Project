import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { showCode } from '../../site/js/components/code-lines.js';
import { initClarify } from '../../site/js/components/clarify-panel.js';
import { initEditor } from '../../site/js/components/editor.js';
import { initEditorActions } from '../../site/js/components/editor-actions.js';
import { initToasts } from '../../site/js/components/toast.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const pages = { ru: readFileSync('site/app/editor.html', 'utf8'), en: readFileSync('site/en/app/editor.html', 'utf8') };
const NL = String.fromCharCode(10);
const lines = (...rows) => rows.join(NL);
const BPMN = lines('diagram bpmn "x"', 'task a', 'task b "B"', 'flow a -> b');
const USECASE = lines('diagram uml usecase "u"', 'usecase a "A"', 'usecase b "B"');
const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));
const wait = async (check) => {
  for (let tries = 0; tries < 200 && !check(); tries += 1) await tick(5);
};
const ok = (body) => ({ ok: true, status: 200, json: async () => body });

const setup = ({
  lang = 'ru',
  code = BPMN,
  fetchImpl = async () => ({ ok: false, status: 404, json: async () => ({}) }),
  actions = false,
  native = false,
} = {}) => {
  const window = new JSDOM(pages[lang], { url: 'http://localhost/app/editor.html' }).window;
  const { document } = window;
  const storage = createStorage(createMemoryBackend());
  initEditor({ root: document, storage, setTimer: () => 0, clearTimer: () => {} });
  initToasts({ root: document, storage });
  if (actions) initEditorActions({ root: document, storage });
  showCode(document, document.querySelector('.code__lines'), code);
  const api = initClarify({ root: document, fetchImpl: native ? undefined : fetchImpl });
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const click = (target) => (typeof target === 'string' ? $(target) : target).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const key = (target, name) => target.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true }));
  const button = (pattern) => $$('.clarify button').find((node) => pattern.test(node.textContent) && !node.hidden);
  const runs = [];
  $('.app-page--editor').addEventListener('dslkit:run', () => runs.push('run'));
  const code$ = () =>
    $$('.code__line code')
      .map((node) => node.textContent)
      .join(NL);
  return { window, document, api, $, $$, click, key, button, runs, code: code$, status: () => $('.clarify__status').textContent };
};

test('a page without the editor gets no dialog', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initClarify({ root: document }), null);
});

test('the markup has a button that opens the dialog, in both languages', () => {
  assert.match(pages.ru, /data-clarify-open>Уточнить и дополнить</);
  assert.match(pages.en, /data-clarify-open>Clarify and complete</);
});

test('the dialog shows one question with progress and the answers complete the code in one step', async () => {
  const t = setup();
  assert.equal(t.$('.clarify').hidden, true);
  t.click('[data-clarify-open]');
  await tick();
  assert.equal(t.$('.clarify').hidden, false);
  assert.equal(t.$('.clarify').getAttribute('role'), 'dialog');
  assert.equal(t.$('.clarify__count').textContent, 'Вопрос 1 из 3');
  assert.equal(t.$('.clarify__bar').value, 1);
  assert.match(t.$('.clarify__text').textContent, /нет начала/);
  assert.equal(t.button(/Назад/).disabled, true);
  assert.equal(t.$$('.clarify__option').length, 2);
  assert.equal(t.document.activeElement.type, 'radio');
  t.click(t.$$('.clarify__option input')[0]);
  t.click(t.button(/Далее/));
  assert.equal(t.$('.clarify__count').textContent, 'Вопрос 2 из 3');
  t.click(t.button(/Назад/));
  assert.equal(t.$$('.clarify__option input')[0].checked, true);
  t.click(t.button(/Далее/));
  t.click(t.button(/Пропустить/));
  assert.equal(t.$('.clarify__count').textContent, 'Вопрос 3 из 3');
  assert.match(t.$('.auto__hint').textContent, /строка 2/);
  t.$('.clarify input[type="text"]').value = 'Receive';
  assert.equal(t.button(/Применить/).textContent, 'Применить ответы');
  assert.equal(t.$$('.clarify__nav button').filter((node) => !node.hidden && /Применить/.test(node.textContent)).length, 1);
  t.click(t.button(/Применить/));
  await wait(() => t.runs.length > 0);
  assert.match(t.status(), /Применено ответов: 2/);
  assert.match(t.code(), /task a "Receive"/);
  assert.match(t.code(), /start start "Start"/);
  assert.deepEqual(t.runs, ['run']);
  assert.equal(t.$('.clarify > button:last-child').hidden, false);
  assert.ok(t.document.querySelector('.toast'));
});

test('a completion is one step of the undo of the editor', async () => {
  const t = setup({ actions: true });
  await t.api.open();
  t.click(t.$$('.clarify__option input')[0]);
  await t.api.finish();
  await tick();
  assert.match(t.code(), /start start/);
  t.click('[data-action="undo"]');
  await tick();
  assert.equal(t.code(), BPMN);
});

test('skip on the last question applies what was answered, Enter goes on and Escape closes', async () => {
  const t = setup({ code: lines('diagram bpmn "x"', 'task a "A"', 'task b "B"', 'flow a -> b') });
  await t.api.open();
  assert.equal(t.$('.clarify__count').textContent, 'Вопрос 1 из 2');
  t.click(t.$$('.clarify__option input')[0]);
  t.click(t.button(/Далее/));
  t.click(t.$$('.clarify__option input')[1]);
  t.click(t.button(/Пропустить/));
  await wait(() => t.runs.length > 0);
  assert.match(t.code(), /start start/);
  assert.doesNotMatch(t.code(), /end end/);
  assert.deepEqual(t.api.answers(), {});
  const text = setup();
  await text.api.open();
  text.click(text.button(/Пропустить/));
  text.click(text.button(/Пропустить/));
  text.$('.clarify input[type="text"]').value = 'Name';
  text.key(text.$('.clarify__text'), 'Enter');
  assert.equal(text.runs.length, 0);
  text.key(text.$('.clarify input[type="text"]'), 'Enter');
  await wait(() => text.runs.length > 0);
  assert.match(text.status(), /Применено ответов: 1/);
  text.key(text.$('.clarify'), 'Escape');
  assert.equal(text.$('.clarify').hidden, true);
  assert.equal(text.api.close(), false);
});

test('without questions the dialog says the diagram looks complete', async () => {
  const t = setup({ code: lines('diagram bpmn "x"', 'start s "S"', 'task a "A"', 'end e "E"', 'flow s -> a', 'flow a -> e') });
  await t.api.open();
  assert.match(t.status(), /Вопросов нет/);
  assert.equal(t.$('.clarify__question').hidden, true);
  assert.equal(t.$('.clarify__count').textContent, '');
  assert.equal(t.button(/Применить/), undefined);
  assert.equal(t.document.activeElement, t.$('.clarify .button--icon'));
});

test('finishing without answers, with answers that change nothing and with answers that make it worse', async () => {
  const t = setup();
  await t.api.open();
  await t.api.finish();
  assert.match(t.status(), /Ответов нет/);
  const worse = setup({ code: USECASE });
  await worse.api.open();
  const connect = worse.api.questions().findIndex((item) => item.id === 'connect:a:out');
  for (let step = 0; step < connect; step += 1) worse.click(worse.button(/Пропустить/));
  worse.click(worse.$$('.clarify__option input')[0]);
  await worse.api.finish();
  assert.match(worse.status(), /стала бы хуже/);
  assert.equal(worse.code(), USECASE);
  const nothing = setup({ fetchImpl: async () => ok({ available: false }) });
  await nothing.api.open();
  nothing.api.questions()[0].apply = () => 'x';
  nothing.click(nothing.$$('.clarify__option input')[1]);
  await nothing.api.finish();
  assert.match(nothing.status(), /ничего не изменили/);
});

test('the finish button applies the answers before the last question and the browser fetch is the default', async () => {
  const t = setup({ native: true });
  assert.equal(await t.api.open(), 0);
  t.click(t.$$('.clarify__option input')[0]);
  t.click(t.$$('.clarify__nav button').find((node) => !node.hidden && node.textContent === 'Применить ответы'));
  await wait(() => t.runs.length > 0);
  assert.match(t.code(), /start start/);
});

test('the English texts and the repeat of the questions', async () => {
  const t = setup({ lang: 'en' });
  await t.api.open();
  assert.equal(t.$('.clarify__count').textContent, 'Question 1 of 3');
  assert.equal(t.$('.clarify .button--icon').getAttribute('aria-label'), 'Close');
  t.click(t.$$('.clarify__option input')[0]);
  assert.match(t.$$('.clarify__option')[1].textContent, /No/);
  await t.api.finish();
  assert.match(t.status(), /Answers applied: 1\./);
  assert.match(t.status(), /remarks/);
  t.click(t.$('.clarify > button:last-child'));
  await tick();
  assert.equal(t.$('.clarify > button:last-child').hidden, true);
  assert.ok(t.api.questions().length > 0);
});

test('the choice questions list their options and a passing diagram says so', async () => {
  const code = lines('diagram bpmn "x"', 'task a "A"', 'task b "B"', 'flow a -> b');
  const t = setup({ code });
  await t.api.open();
  t.click(t.$$('.clarify__option input')[0]);
  t.click(t.button(/Далее/));
  t.click(t.$$('.clarify__option input')[0]);
  await t.api.finish();
  assert.match(t.status(), /проходит проверку/);
  const dfd = setup({ code: lines('diagram dfd "s"', 'entity e "E"', 'process p "P"', 'foo q') });
  await dfd.api.open();
  assert.equal(dfd.api.questions()[0].kind, 'choice');
  assert.ok(dfd.$$('.clarify__option').length >= 2);
});

test('with the AI available the extra questions are added and the completion goes to the server', async () => {
  const calls = [];
  const extra = { id: 'ai-1', kind: 'text', text: { ru: 'Кто платит?', en: 'Who pays?' }, options: [], target: { line: 0, id: '' }, priority: 5 };
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, body: options.body ? JSON.parse(options.body) : null });
    if (url === '/api/ai/status') return ok({ available: true });
    const body = JSON.parse(options.body);
    if (body.step === 'questions') return ok({ questions: [{ id: 'flow-start' }, extra] });
    return ok({ ok: true, valid: true, code: `${BPMN}${NL}task z "Z"`, applied: ['flow-start', 'ai-1'] });
  };
  const t = setup({ fetchImpl });
  assert.equal(await t.api.open(), 1);
  assert.equal(t.api.questions().length, 4);
  assert.match(t.status(), /ИИ добавил вопросов: 1/);
  assert.equal(t.$('.clarify__count').textContent, 'Вопрос 1 из 4');
  t.click(t.$$('.clarify__option input')[0]);
  t.click(t.button(/Далее/));
  t.click(t.button(/Пропустить/));
  t.click(t.button(/Пропустить/));
  assert.equal(t.$('.auto__hint').hidden, true);
  t.$('.clarify input[type="text"]').value = 'client';
  t.click(t.button(/Применить/));
  await wait(() => t.runs.length > 0);
  assert.match(t.code(), /task z "Z"/);
  const complete = calls.find((call) => call.body?.step === 'complete');
  assert.deepEqual(
    complete.body.answers.map((item) => item.id),
    ['flow-start', 'ai-1'],
  );
  assert.equal(complete.body.answers[1].text, 'Кто платит?');
});

test('a server that fails or refuses leaves the local completion', async () => {
  const modes = {
    refuse: async (url) => (url === '/api/ai/status' ? ok({ available: true }) : { ok: false, status: 500, json: async () => ({}) }),
    notOk: async (url, options) =>
      url === '/api/ai/status' ? ok({ available: true }) : JSON.parse(options.body).step === 'questions' ? ok({}) : ok({ ok: false }),
    down: async (url, options) => {
      if (url === '/api/ai/status') return ok({ available: true });
      if (JSON.parse(options.body).step === 'questions') return ok({ questions: [] });
      throw new Error('offline');
    },
  };
  for (const fetchImpl of Object.values(modes)) {
    const t = setup({ fetchImpl });
    assert.equal(await t.api.open(), 0);
    t.click(t.$$('.clarify__option input')[0]);
    await t.api.finish();
    assert.match(t.code(), /start start/);
  }
});

test('an unavailable or broken status leaves the rules alone and a closed dialog ignores late questions', async () => {
  const down = setup({
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });
  assert.equal(await down.api.open(), 0);
  const badStatus = setup({ fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
  assert.equal(await badStatus.api.open(), 0);
  const extra = { id: 'ai-1', kind: 'text', text: { ru: 'Q', en: 'Q' }, options: [], target: { line: 0, id: '' }, priority: 5 };
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const late = setup({
    fetchImpl: async (url) => {
      if (url === '/api/ai/status') return ok({ available: true });
      await gate;
      return ok({ questions: [extra] });
    },
  });
  const pending = late.api.open();
  late.api.close();
  release();
  assert.equal(await pending, 0);
  assert.equal(
    late.api.questions().some((item) => item.id === 'ai-1'),
    false,
  );
});
