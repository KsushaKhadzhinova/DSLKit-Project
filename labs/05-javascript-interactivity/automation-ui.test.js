import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { showCode } from '../../site/js/components/code-lines.js';
import { initAutomation } from '../../site/js/components/automation.js';
import { initEditor } from '../../site/js/components/editor.js';
import { initEditorTools } from '../../site/js/components/editor-tools.js';
import { initToasts } from '../../site/js/components/toast.js';
import { createExpertStore } from '../../site/js/storage/expert.js';
import { KB_NOTATION } from '../../site/js/expert/kb-notation.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const pages = { ru: readFileSync('site/app/editor.html', 'utf8'), en: readFileSync('site/en/app/editor.html', 'utf8') };
const NL = String.fromCharCode(10);
const DESCRIPTION = 'Сначала клиент оформляет заказ, затем менеджер проверяет наличие. Если товар есть, то отправить заказ, иначе сообщить клиенту.';
const GOOD =
  'diagram dfd "Shop"' + NL + 'entity buyer "Buyer"' + NL + 'process p1 "Order"' + NL + 'flow buyer -> p1 "order"' + NL + 'flow p1 -> buyer "receipt"';
const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));
const wait = async (check) => {
  for (let tries = 0; tries < 400 && !check(); tries += 1) await tick(5);
};

// A fake server: the status and the answer of /api/ai/generate are set per test.
const server = ({ status = { available: false, model: '', maxImageMb: 5 }, generate } = {}) => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, body: options.body ? JSON.parse(options.body) : null, options });
    if (url === '/api/ai/status') {
      if (status === 'down') throw new Error('offline');
      if (status === 'bad') return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => status };
    }
    return generate(url, options);
  };
  return { fetchImpl, calls };
};
const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const refuse = (status, body = {}) => ({ ok: false, status, json: async () => body });
const AI_ON = { available: true, model: 'claude-test', maxImageMb: 1 };
const AI_BODY = { code: GOOD, notation: 'dfd', warnings: [{ line: 3, severity: 'warning', message: 'a warning' }], attempts: 2, model: 'claude-test' };

const setup = ({ lang = 'ru', search = '', fetchImpl = server().fetchImpl, storage = createStorage(createMemoryBackend()) } = {}) => {
  const window = new JSDOM(pages[lang], { url: `http://localhost/app/editor.html${search}` }).window;
  const { document } = window;
  initEditor({ root: document, storage, setTimer: () => 0, clearTimer: () => {} });
  initToasts({ root: document, storage });
  const api = initAutomation({ root: document, storage, fetchImpl });
  const $ = (selector) => document.querySelector(selector);
  const click = (target) => (typeof target === 'string' ? $(target) : target).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const runs = [];
  $('.app-page--editor').addEventListener('dslkit:run', () => runs.push('run'));
  const text = (value) => {
    $('.auto__text').value = value;
  };
  const toasts = () => [...document.querySelectorAll('.toast__text')].map((node) => node.textContent);
  return { window, document, api, $, click, text, runs, storage, toasts, status: () => $('.auto__status').textContent };
};

test('a page without the editor gets no wizard', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initAutomation({ root: document, storage: createStorage(createMemoryBackend()) }), null);
});

test('without a key the wizard says so and builds a description by rules, with the choice explained', async () => {
  const { $, click, text, api, document, status, runs } = setup();
  assert.equal($('.auto').hidden, true);
  click('[data-auto-open]');
  await wait(() => !$('.auto').hidden && /не подключён/.test($('.auto__note').textContent));
  assert.equal($('.auto').hidden, false);
  assert.match($('.auto__note').textContent, /ИИ не подключён: добавьте ключ в \.env сервера/);
  assert.equal($('.auto__check').hidden, true);
  text(DESCRIPTION);
  await api.build();
  assert.match($('.auto__preview').textContent, /^diagram bpmn "Процесс"/);
  assert.match(status(), /Диаграмма построена \(по правилам\)/);
  assert.match($('.auto__chosen').textContent, /^Нотация: BPMN/);
  assert.ok($('.auto__why li'));
  assert.equal($('.auto__output').hidden, false);
  assert.match($('.auto__output').textContent, /Ошибок и предупреждений нет|:/);
  assert.equal($('.auto__progress').hidden, true);
  assert.ok(document.querySelector('.toast'));
  assert.equal(api.insert(), true);
  assert.match(api.code(), /^diagram bpmn/);
  assert.deepEqual(runs, ['run']);
  assert.match(status(), /вставлен/);
  assert.equal(api.result().notation, 'bpmn');
});

test('the history keeps the requests, a click puts one back, the clear button empties it', async () => {
  const { $, click, text, api, document } = setup();
  assert.match($('.auto__empty').textContent, /Запросов пока не было/);
  text(DESCRIPTION);
  await api.build();
  assert.equal(document.querySelectorAll('[data-auto-reuse]').length, 1);
  text('');
  $('#auto-notation').value = 'bpmn';
  click('[data-auto-reuse]');
  assert.equal($('.auto__text').value, DESCRIPTION);
  assert.equal($('#auto-notation').value, 'auto');
  api.setMode('code');
  click('[data-auto-reuse]');
  assert.equal($('[data-auto-source="idea"]').getAttribute('aria-pressed'), 'true');
  const clear = [...document.querySelectorAll('.auto > button')].find((node) => /Очистить/.test(node.textContent));
  click(clear);
  assert.match($('.auto__empty').textContent, /Запросов пока не было/);
});

test('rules mode refuses an empty text, a notation it cannot build, a text without matches and an unknown notation', async () => {
  const { $, text, api, status } = setup();
  await api.build();
  assert.equal(status(), 'Введите текст.');
  text('Что-то');
  $('#auto-notation').value = 'mindmap';
  await api.build();
  assert.match(status(), /Без ИИ можно построить только/);
  $('#auto-notation').value = 'erd';
  text('Нечего строить');
  await api.build();
  assert.match(status(), /не нашлось фраз/);
  $('#auto-notation').value = 'auto';
  text('zzz');
  await api.build();
  assert.match(status(), /Не удалось определить нотацию/);
});

test('code mode imports Mermaid and PlantUML offline and explains what it cannot read', async () => {
  const { $, text, api, status } = setup();
  api.setMode('code');
  assert.equal($('.auto__hint').textContent, '');
  text('graph LR' + NL + 'A --> B');
  await api.build();
  assert.match(status(), /Диаграмма построена \(импорт\)/);
  assert.equal($('.auto__chosen').hidden, true);
  text('hello');
  await api.build();
  assert.match(status(), /Формат не распознан/);
  text('erDiagram' + NL + 'A ||--o{ B : has');
  await api.build();
  assert.match(status(), /«erDiagram» без ИИ не импортируется/);
  text('');
  await api.build();
  assert.equal(status(), 'Введите текст.');
});

test('a picture without a key is refused with an honest word', async () => {
  const { $, api, status, click } = setup();
  click('[data-auto-source="image"]');
  assert.equal($('[data-auto-source="image"]').getAttribute('aria-pressed'), 'true');
  assert.equal($('.auto__file').hidden, false);
  await api.build();
  assert.match(status(), /Картинки без ключа не поддерживаются/);
});

test('with a key the description goes to the server, the answer is shown with its warnings and attempts', async () => {
  const { fetchImpl, calls } = server({ status: AI_ON, generate: async () => ok(AI_BODY) });
  const { $, click, text, api, status, window } = setup({ fetchImpl, search: '?auto=1' });
  await wait(() => /claude-test/.test($('.auto__note').textContent));
  assert.equal($('.auto').hidden, false);
  assert.match($('.auto__note').textContent, /ИИ подключён \(модель claude-test\)/);
  assert.match($('.auto__note').textContent, /отправляются в Anthropic/);
  assert.equal($('.auto__check').hidden, false);
  text('интернет-магазин');
  $('#auto-notation').value = 'dfd';
  await api.build();
  const sent = calls.find((call) => call.url === '/api/ai/generate');
  assert.deepEqual(sent.body, { mode: 'idea', text: 'интернет-магазин', notation: 'dfd', lang: 'ru' });
  assert.equal(sent.options.method, 'POST');
  assert.match(status(), /ИИ, попыток: 2/);
  assert.match($('.auto__preview').textContent, /^diagram dfd/);
  assert.match($('.auto__output').textContent, /a warning/);
  assert.equal($('.auto__chosen').hidden, true);
  assert.equal(window.document.querySelector('.auto__progress').hidden, true);
  $('.auto__check input').checked = true;
  text(DESCRIPTION);
  $('#auto-notation').value = 'auto';
  await api.build();
  assert.match(status(), /по правилам/);
  assert.equal(calls.filter((call) => call.url === '/api/ai/generate').length, 1);
  $('.auto__check input').checked = false;
  api.setMode('code');
  text('hello');
  await api.build();
  assert.equal(calls.filter((call) => call.url === '/api/ai/generate').length, 2);
  text('graph LR' + NL + 'A --> B');
  await api.build();
  assert.match(status(), /импорт/);
  assert.equal(calls.filter((call) => call.url === '/api/ai/generate').length, 2);
  click('.auto > .auto__head button');
  assert.equal($('.auto').hidden, true);
});

test('a result without warnings and a result of an unknown shape are both shown', async () => {
  const { fetchImpl } = server({ status: AI_ON, generate: async () => ok({ ...AI_BODY, warnings: [] }) });
  const { $, text, api } = setup({ fetchImpl });
  await api.refreshStatus();
  text('x');
  await api.build();
  assert.match($('.auto__output').textContent, /Ошибок и предупреждений нет/);
  const second = server({ status: { available: true }, generate: async () => ok({ ...AI_BODY, warnings: undefined }) });
  const other = setup({ fetchImpl: second.fetchImpl });
  await other.api.refreshStatus();
  other.text('x');
  await other.api.build();
  assert.match(other.$('.auto__output').textContent, /Ошибок и предупреждений нет/);
});

test('every failure of the server has its own word and the build button comes back', async () => {
  const cases = [
    [() => refuse(503), /ИИ не подключён: добавьте ключ в \.env сервера/],
    [() => refuse(429), /Лимит запросов к ИИ/],
    [() => refuse(422, { problems: [] }), /не смог получить корректный код/],
    [() => refuse(413), /слишком велик/],
    [() => refuse(415), /не поддерживается/],
    [() => refuse(502), /Сбой ИИ-сервиса/],
    [() => refuse(400), /Запрос отклонён/],
    [() => ({ ok: false, status: 502, json: async () => Promise.reject(new Error('no json')) }), /Сбой ИИ-сервиса/],
  ];
  for (const [answer, pattern] of cases) {
    const { fetchImpl } = server({ status: AI_ON, generate: async () => answer() });
    const { $, text, api, status } = setup({ fetchImpl });
    await api.refreshStatus();
    text('x');
    await api.build();
    assert.match(status(), pattern);
    assert.equal($('.auto__actions .button--primary').disabled, false);
    assert.equal($('.auto__output').hidden, true);
  }
  const down = server({
    status: AI_ON,
    generate: async () => {
      throw new Error('network');
    },
  });
  const failing = setup({ fetchImpl: down.fetchImpl });
  await failing.api.refreshStatus();
  failing.text('x');
  await failing.api.build();
  assert.match(failing.status(), /Нет связи с сервером/);
});

test('the cancel button aborts the request', async () => {
  const { fetchImpl } = server({
    status: AI_ON,
    generate: (url, options) =>
      new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      }),
  });
  const { $, text, api, click, status } = setup({ fetchImpl });
  await api.refreshStatus();
  text('x');
  const pending = api.build();
  await tick();
  assert.equal($('.auto__progress').hidden, false);
  assert.equal($('.auto__actions .button--primary').disabled, true);
  assert.equal($('.auto').getAttribute('aria-busy'), 'true');
  click('.auto__actions .button:not(.button--primary)');
  await pending;
  assert.match(status(), /Построение отменено/);
  assert.equal($('.auto__progress').hidden, true);
  click('.auto__actions .button:not(.button--primary)');
});

test('a picture is read, checked and sent as base64', async () => {
  const { fetchImpl, calls } = server({ status: AI_ON, generate: async () => ok(AI_BODY) });
  const { $, api, window, status, text } = setup({ fetchImpl });
  await api.refreshStatus();
  api.setMode('image');
  assert.match($('label[for="auto-text"]').textContent, /Картинка схемы/);
  await api.build();
  assert.match(status(), /Выберите картинку/);
  await api.takeFile(new window.File([PNG_BYTES], 'a.txt', { type: 'text/plain' }));
  assert.match(status(), /Нужна картинка/);
  await api.takeFile(new window.File([new Uint8Array(1.5 * 1024 * 1024)], 'big.png', { type: 'image/png' }));
  assert.match(status(), /больше 1 МБ/);
  await api.takeFile({ name: 'broken.png', type: 'image/png', size: 5, arrayBuffer: async () => Promise.reject(new Error('no')) });
  assert.match(status(), /Не удалось прочитать файл/);
  assert.equal(await api.takeFile(new window.File([PNG_BYTES], 'a.png', { type: 'image/png' })), true);
  assert.equal($('.auto__file-name').textContent, 'a.png');
  text('схема магазина');
  await api.build();
  const sent = calls.find((call) => call.url === '/api/ai/generate').body;
  assert.equal(sent.mode, 'image');
  assert.equal(sent.mediaType, 'image/png');
  assert.equal(Buffer.from(sent.image, 'base64').equals(Buffer.from(PNG_BYTES)), true);
  text('');
  await api.build();
  assert.equal(calls.filter((call) => call.url === '/api/ai/generate').length, 2);
});

test('files are taken from the file button, the file input and by drag and drop', async () => {
  const { $, api, window, click } = setup();
  api.setMode('code');
  assert.equal($('.auto__file-input').accept.includes('.mmd'), true);
  let opened = 0;
  $('.auto__file-input').addEventListener('click', () => (opened += 1));
  click('.auto__file > button');
  assert.equal(opened, 1);
  const file = new window.File(['graph LR\nA --> B'], 'x.mmd', { type: 'text/plain' });
  Object.defineProperty($('.auto__file-input'), 'files', { value: [file], configurable: true });
  $('.auto__file-input').dispatchEvent(new window.Event('change'));
  await wait(() => $('.auto__text').value !== '');
  assert.equal($('.auto__text').value, 'graph LR\nA --> B');
  assert.equal($('.auto__file-name').textContent, 'x.mmd');
  Object.defineProperty($('.auto__file-input'), 'files', { value: [], configurable: true });
  $('.auto__file-input').dispatchEvent(new window.Event('change'));
  const drag = new window.Event('dragover', { cancelable: true, bubbles: true });
  $('.auto').dispatchEvent(drag);
  assert.equal(drag.defaultPrevented, true);
  const drop = new window.Event('drop', { cancelable: true, bubbles: true });
  drop.dataTransfer = { files: [new window.File(['diagram graph "G"\nvertex A'], 'y.dsl')] };
  $('.auto').dispatchEvent(drop);
  await wait(() => $('.auto__file-name').textContent === 'y.dsl');
  await wait(() => $('.auto__text').value.startsWith('diagram'));
  assert.match($('.auto__text').value, /^diagram graph/);
  const empty = new window.Event('drop', { cancelable: true, bubbles: true });
  $('.auto').dispatchEvent(empty);
  const none = new window.Event('drop', { cancelable: true, bubbles: true });
  none.dataTransfer = { files: [] };
  $('.auto').dispatchEvent(none);
});

test('the status of the server is tolerated when it is down or answers with an error', async () => {
  for (const status of ['down', 'bad']) {
    const { fetchImpl } = server({ status });
    const { api } = setup({ fetchImpl });
    assert.equal(await api.refreshStatus(), false);
  }
});

test('Escape closes the panel and the English wizard speaks English', async () => {
  const { fetchImpl } = server({ status: { available: false } });
  const { $, api, document, window, text, status } = setup({ lang: 'en', fetchImpl });
  await api.open();
  assert.match($('.auto__note').textContent, /AI is not connected/);
  assert.equal($('.auto__title').textContent, 'Automatic build');
  text('A customer has many orders. An order contains many items.');
  await api.build();
  assert.match($('.auto__preview').textContent, /^diagram erd/);
  assert.match(status(), /The diagram is built \(by rules\)/);
  $('.auto').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal($('.auto').hidden, true);
  assert.equal(api.close(), false);
  assert.ok(document.querySelector('.toast'));
});

test('the edited rules of a developer are used by the wizard', async () => {
  const storage = createStorage(createMemoryBackend());
  const store = createExpertStore({ storage, bases: { notation: KB_NOTATION } });
  const rule = KB_NOTATION.rules.find((item) => item.id === 'n-process-bpmn');
  store.set({ role: 'developer' }, 'notation', rule.id, { ...rule, then: { ...rule.then, cf: 0.05 } });
  const { $, text, api } = setup({ storage });
  text('Сначала принять заказ, затем проверить его. Если товара нет, то отказать.');
  await api.build();
  assert.match($('.auto__chosen').textContent, /Нотация: Блок-схемы/);
});

test('the expert tab under the code reviews the diagram and the assistant builds from a description', async () => {
  const storage = createStorage(createMemoryBackend());
  const window = new JSDOM(pages.ru, { url: 'http://localhost/' }).window;
  const { document } = window;
  initEditor({ root: document, storage, setTimer: () => 0, clearTimer: () => {} });
  const tools = initEditorTools({ root: document, storage });
  const $ = (selector) => document.querySelector(selector);
  assert.equal(tools.selectTab('expert'), 'expert');
  assert.equal($('.expert-panel').hidden, false);
  assert.match($('.expert-panel__summary').textContent, /Замечаний/);
  assert.ok($('.expert-panel__item'));
  assert.ok($('.expert-panel__item details'));
  assert.equal($('.expert-panel a').getAttribute('href'), 'expert.html');
  $('.expert-panel button').click();
  assert.ok($('.expert-panel__item'));
  tools.selectTab('output');
  assert.equal($('.expert-panel').hidden, true);
  const answer = tools.ask('построй по описанию: ' + DESCRIPTION);
  assert.match(answer.text, /Построено по правилам/);
  assert.match(document.querySelector('.code__line code').textContent, /diagram bpmn/);
  tools.selectTab('expert');
  assert.match($('.expert-panel__summary').textContent, /Замечан/);
  showCode(document, $('.code__lines'), 'diagram bpmn "x"' + NL + 'task a "A"' + NL + 'task b "B"' + NL + 'flow a -> b');
  $('.expert-panel button').click();
  assert.match($('.expert-panel__list').textContent, /Добавьте начало процесса/);
});

test('the default fetch is the one of the window, a history entry restores its notation, and a build with remarks lists them', async () => {
  const storage = createStorage(createMemoryBackend());
  const window = new JSDOM(pages.ru, { url: 'http://localhost/app/editor.html' }).window;
  const { document } = window;
  const seen = [];
  window.fetch = async (url) => {
    seen.push(url);
    return { ok: true, json: async () => ({ available: false }) };
  };
  initEditor({ root: document, storage, setTimer: () => 0, clearTimer: () => {} });
  const api = initAutomation({ root: document, storage });
  await api.refreshStatus();
  assert.deepEqual(seen, ['/api/ai/status']);
  const $ = (selector) => document.querySelector(selector);
  assert.equal(api.insert(), false);
  $('.auto__text').value = 'Принять' + NL + 'Пока ошибка, исправлять' + NL + 'Закрыть';
  $('#auto-notation').value = 'bpmn';
  await api.build();
  assert.match($('.auto__output').textContent, /\[low\].*\(стр\. /);
  $('.auto__text').value = 'diagram bpmn "x"' + NL + 'task a "A"' + NL + 'task b "B"' + NL + 'flow a -> b';
  api.setMode('code');
  await api.build();
  assert.match($('.auto__output').textContent, /\[high\] Добавьте начало процесса/);
  api.setMode('idea');
  $('.auto__text').value = '';
  $('#auto-notation').value = 'auto';
  $('[data-auto-reuse]').click();
  assert.equal($('#auto-notation').value, 'bpmn');
});
