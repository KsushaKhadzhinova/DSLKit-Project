import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { readCode, showCode } from '../../site/js/components/code-lines.js';
import { initEditorActions } from '../../site/js/components/editor-actions.js';
import { initEditor } from '../../site/js/components/editor.js';
import { initReviewPanel } from '../../site/js/components/review-panel.js';
import { initToasts } from '../../site/js/components/toast.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const pages = { ru: readFileSync('site/app/editor.html', 'utf8'), en: readFileSync('site/en/app/editor.html', 'utf8') };
const NL = String.fromCharCode(10);
const src = (...lines) => lines.join(NL);
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const BROKEN = src('diagram bpmn "T"', 'start s "S"', 'task a "A"', 'end e "E"', 'flow s -> a', 'flow a -> ghost');
const CLEAN = src('diagram bpmn "T"', 'start s "Start"', 'task a "Do"', 'end e "End"', 'flow s -> a', 'flow a -> e');
const HALF = src('diagram bpmn "T"', 'start s "S"', 'task a "A"', 'task other "O"', 'end e "E"', 'flow s -> a', 'flow a -> e', 'flow other -> e');
const HINTS = src('diagram dfd "T"', 'process p1', 'process p2', 'flow p1 -> p2 "x"', 'flow p2 -> p1 "y"');
const AI_VARIANT = {
  id: 'ai-1',
  source: 'ai',
  title: { ru: 'Свой', en: 'Own' },
  code: CLEAN,
  changes: [{ rule: 'ai', line: null, ru: 'связано', en: 'linked' }],
  errors: 0,
  warnings: 0,
};

const setup = async ({ lang = 'ru', code = BROKEN, fetchImpl, withActions = false } = {}) => {
  const storage = createStorage(createMemoryBackend());
  const window = new JSDOM(pages[lang], { url: 'http://localhost/app/editor.html' }).window;
  const { document } = window;
  initEditor({ root: document, storage, setTimer: () => 0, clearTimer: () => {} });
  initToasts({ root: document, storage });
  if (withActions) initEditorActions({ root: document, storage, clipboard: { writeText: async () => {} } });
  const lines = document.querySelector('.code__lines');
  showCode(document, lines, code);
  await tick();
  const api = initReviewPanel({ root: document, fetchImpl });
  const $ = (selector) => document.querySelector(selector);
  const click = (target) => (typeof target === 'string' ? $(target) : target).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return { window, document, api, $, click, lines, code: () => readCode(lines) };
};

const answer = (body, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });

test('a page without the editor gets no panel', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initReviewPanel({ root: document }), null);
});

test('both editor pages have the button that opens the panel', () => {
  for (const page of Object.values(pages)) assert.match(page, /data-review-open/);
});

test('the button opens the panel with the problems and the variants side by side', async () => {
  const { $, click, document } = await setup({ fetchImpl: async () => answer({ available: false }) });
  assert.equal($('.review').hidden, true);
  click('[data-review-open]');
  await tick();
  assert.equal($('.review').hidden, false);
  assert.equal(document.activeElement, $('#review-title'));
  assert.match($('.review__status').textContent, /ошибок [1-9]/);
  const first = $('.review__item--error');
  assert.match(first.textContent, /Ошибка/);
  assert.equal(first.querySelector('.review__location').getAttribute('href'), '#line-3');
  assert.match(first.querySelector('.review__fix').textContent, /^Исправление:/);
  const variants = document.querySelectorAll('.review__variant');
  assert.ok(variants.length >= 1);
  const columns = variants[0].querySelectorAll('.review__column');
  assert.equal(columns.length, 2);
  assert.equal(columns[0].getAttribute('role'), 'group');
  assert.ok(columns[0].querySelector('.review__line--same'));
  assert.ok(columns[1].querySelector('.review__line--add'));
  assert.ok(columns[0].querySelector('.visually-hidden'));
  assert.equal($('[data-review-apply]').type, 'button');
  assert.equal($('[data-review-apply]').hidden, false);
  assert.equal($('.review__apply').textContent, 'Применить этот вариант');
  assert.equal($('[data-review-open]').dataset.reviewOpen, '');
  assert.equal($('.review__apply').closest('[hidden]'), null);
  assert.equal($('[data-review-apply]').disabled, false);
  assert.equal($('.review').getAttribute('aria-labelledby'), 'review-title');
  assert.equal($('.review__column-title').textContent, 'Что изменится');
  assert.ok([...document.querySelectorAll('.review__column-title')].some((node) => node.textContent === 'Было'));
});

test('applying a variant writes it into the editor through the history and undo takes it back', async () => {
  const { $, click, code, document, window } = await setup({ withActions: true, fetchImpl: async () => answer({ available: false }) });
  const runs = [];
  $('.app-page--editor').addEventListener('dslkit:run', () => runs.push('run'));
  click('[data-review-open]');
  await tick();
  click('[data-review-apply]');
  await tick();
  assert.notEqual(code(), BROKEN);
  assert.match(code(), /task ghost/);
  assert.equal(runs.length, 1);
  assert.match($('.toast__text').textContent, /Вариант применён/);
  assert.ok(window.document.querySelector('.review__status').textContent.length > 0);
  click('[data-action="undo"]');
  await tick();
  assert.equal(code(), BROKEN);
  assert.ok(document.querySelector('.review'));
});

test('a clean diagram says so and offers nothing', async () => {
  const { $, click } = await setup({ code: CLEAN, fetchImpl: async () => answer({}, false) });
  click('[data-review-open]');
  await tick();
  assert.match($('.review__status').textContent, /Диаграмма в порядке|советов/);
  assert.equal($('.review__variants').hidden, true);
  assert.equal($('.review__variants').children.length, 0);
});

test('only hints are counted as hints and a problem that cannot be fixed asks for a hand', async () => {
  const hints = await setup({ code: HINTS, lang: 'en', fetchImpl: async () => answer({}, false) });
  hints.click('[data-review-open]');
  await tick();
  assert.match(hints.$('.review__status').textContent, /^Found: 0 errors, 0 warnings, \d+ hints/);
  const half = await setup({ code: HALF, lang: 'en', fetchImpl: async () => answer({}, false) });
  half.click('[data-review-open]');
  await tick();
  assert.match(half.$('.review__item--error .review__fix').textContent, /fixed by hand/);
  assert.match(half.$('.review__empty').textContent, /Nothing can be fixed automatically/);
  assert.equal(half.$('.review__subtitle').textContent, 'What is wrong');
});

test('check again reads the code of the editor once more, the panel closes with the button and with Escape', async () => {
  const { $, click, api, lines, document, window } = await setup({ code: CLEAN, fetchImpl: async () => answer({}, false) });
  click('[data-review-open]');
  await tick();
  showCode(document, lines, BROKEN);
  click('.review__actions .button--primary');
  assert.match($('.review__status').textContent, /ошибок [1-9]/);
  click('.review .button--icon');
  assert.equal($('.review').hidden, true);
  await api.open();
  $('.review').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
  assert.equal($('.review').hidden, false);
  $('.review').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal($('.review').hidden, true);
  assert.equal(api.close(), false);
  assert.ok(api.current().result.issues.length > 0);
});

test('with the AI connected the button asks the server and adds the variants of the model', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: options?.body ? JSON.parse(options.body) : null });
    if (url === '/api/ai/status') return answer({ available: true });
    return answer({ ai: true, variants: [AI_VARIANT] });
  };
  const { $, click, api, document } = await setup({ fetchImpl, lang: 'en' });
  click('[data-review-open]');
  await tick();
  assert.equal($('.review__actions button:last-child').hidden, false);
  click('.review__actions button:last-child');
  await tick();
  await tick();
  assert.deepEqual(calls[1].body, { mode: 'review', text: BROKEN, lang: 'en' });
  assert.equal($('.review__status').textContent, 'The AI variants are added.');
  assert.match($('.review__variant-title').textContent, /Own \(AI variant\)/);
  assert.equal(document.querySelectorAll('.review__variant').length, 1);
  assert.equal($('.review').getAttribute('aria-busy'), 'false');
  assert.equal(await api.refreshAi(), true);
});

test('an answer without usable AI variants, a refusal and a lost connection are told in words', async () => {
  const modes = {
    none: () => answer({ ai: true, variants: [] }),
    fallback: () => answer({ ai: false, aiError: 'upstream', variants: [] }),
    refused: () => answer({}, false),
    lost: () => {
      throw new Error('offline');
    },
  };
  const expected = { none: /не предложил/, fallback: /недоступен/, refused: /недоступен/, lost: /недоступен/ };
  for (const [mode, reply] of Object.entries(modes)) {
    const { $, api } = await setup({ fetchImpl: async (url) => (url === '/api/ai/status' ? answer({ available: true }) : reply()) });
    await api.open();
    await api.askAi();
    assert.match($('.review__status').textContent, expected[mode], mode);
  }
});

test('blank lines show in the difference and an answer that is not JSON is a refusal', async () => {
  const { $, click, api } = await setup({
    code: BROKEN.replace('flow s -> a', NL + 'flow s -> a'),
    fetchImpl: async (url) =>
      url === '/api/ai/status' ? answer({ available: true }) : { ok: true, status: 200, json: async () => Promise.reject(new Error('html')) },
  });
  click('[data-review-open]');
  await tick();
  assert.ok($('.review__code').textContent.length > 0);
  await api.askAi();
  assert.match($('.review__status').textContent, /недоступен/);
});

test('the status of the AI that cannot be read hides the button', async () => {
  const lost = await setup({
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });
  assert.equal(await lost.api.open(), false);
  assert.equal(lost.$('.review__actions button:last-child').hidden, true);
  const broken = await setup({ fetchImpl: async () => answer({}, false) });
  assert.equal(await broken.api.open(), false);
});

test('without a given fetch the panel uses the fetch of the window', async () => {
  const { api, window } = await setup();
  const urls = [];
  window.fetch = async (url) => {
    urls.push(url);
    return answer({ available: false });
  };
  await api.open();
  assert.deepEqual(urls, ['/api/ai/status']);
});
