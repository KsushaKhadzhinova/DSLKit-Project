import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { ApiError } from '../../site/js/api/apiService.js';
import { initDiagramRunner } from '../../site/js/components/diagram-runner.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const html = readFileSync('site/app/editor.html', 'utf8');
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><rect width="5" height="5"/></svg>';
const memory = () => createStorage(createMemoryBackend());
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const click = (window, element) => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

const setup = ({ api = {}, storage = memory(), online = true, time = 1_700_000_000_000, autoRun = false } = {}) => {
  const window = new JSDOM(html, { url: 'http://localhost/' }).window;
  const logger = { error: mock.fn() };
  const fullApi = {
    renderDiagram: mock.fn(async () => SVG),
    checkHealth: mock.fn(async () => ({ status: 'pass' })),
    ...api,
  };
  const clock = { time };
  const runner = initDiagramRunner({ root: window.document, storage, api: fullApi, logger, now: () => clock.time, isOnline: () => online, autoRun });
  const $ = (selector) => window.document.querySelector(selector);
  return { window, document: window.document, runner, api: fullApi, logger, storage, clock, $ };
};

test('a page without the render button returns null', () => {
  const window = new JSDOM('<!doctype html><html><body><main class="app-page--editor"></main></body></html>').window;
  assert.equal(initDiagramRunner({ root: window.document, storage: memory() }), null);
  assert.equal(initDiagramRunner({ root: new JSDOM('<!doctype html><html><body></body></html>').window.document, storage: memory() }), null);
});

test('the service status shows that Kroki is reachable or not', async () => {
  const good = setup();
  await flush();
  assert.equal(good.$('.canvas__service').textContent, 'Сервис Kroki доступен');
  const bad = setup({
    api: {
      checkHealth: async () => {
        throw new ApiError('x', { kind: 'network' });
      },
    },
  });
  await flush();
  assert.match(bad.$('.canvas__service').textContent, /недоступен/);
});

test('the render button sends DOT built from the editor code and shows a sanitized SVG', async () => {
  const { window, api, $, document } = setup();
  click(window, $('.canvas__render'));
  await flush();
  const dot = api.renderDiagram.mock.calls[0].arguments[0];
  assert.match(dot, /^digraph diagram/);
  assert.match(dot, /A0 Process order/);
  assert.equal($('.canvas__remote').hidden, false);
  assert.equal($('.canvas__remote svg').getAttribute('role'), 'img');
  assert.equal($('.canvas__remote script'), null);
  assert.equal($('.canvas__diagram').hasAttribute('hidden'), true);
  assert.match($('.canvas__status').textContent, /получена от сервиса Kroki/);
  assert.equal($('.canvas').getAttribute('aria-busy'), 'false');
  assert.equal(document.querySelectorAll('.canvas__history-item').length, 1);
  assert.match($('.canvas__history-item').textContent, /Order process · 2023-11-14 22:13/);
});

test('the loader is shown while the request is running', async () => {
  let release;
  const { window, $ } = setup({ api: { renderDiagram: () => new Promise((resolve) => (release = resolve)) } });
  click(window, $('.canvas__render'));
  assert.equal($('.canvas').getAttribute('aria-busy'), 'true');
  assert.match($('.canvas__status').textContent, /Загрузка/);
  release(SVG);
  await flush();
  assert.equal($('.canvas').getAttribute('aria-busy'), 'false');
});

test('a second run with the same code uses the saved copy and the refresh button asks the server again', async () => {
  const { window, api, $ } = setup();
  click(window, $('.canvas__render'));
  await flush();
  click(window, $('.canvas__render'));
  await flush();
  assert.equal(api.renderDiagram.mock.callCount(), 1);
  assert.match($('.canvas__status').textContent, /сохранённая копия/);
  click(window, $('.canvas__refresh'));
  await flush();
  assert.equal(api.renderDiagram.mock.callCount(), 2);
});

test('an expired copy is requested again', async () => {
  const { window, api, $, clock } = setup();
  click(window, $('.canvas__render'));
  await flush();
  clock.time += 25 * 60 * 60 * 1000;
  click(window, $('.canvas__render'));
  await flush();
  assert.equal(api.renderDiagram.mock.callCount(), 2);
});

test('the run event from the editor starts a render', async () => {
  const { window, api, $ } = setup();
  $('.app-page--editor').dispatchEvent(new window.CustomEvent('dslkit:run', { bubbles: true }));
  await flush();
  assert.equal(api.renderDiagram.mock.callCount(), 1);
});

test('without a saved copy each failure shows its own message and is logged', async () => {
  const cases = [
    [{ kind: 'timeout' }, /не ответил вовремя/],
    [{ kind: 'network' }, /временно недоступен/],
    [{ kind: 'invalid' }, /неожиданный ответ/],
    [{ kind: 'http', status: 429 }, /Слишком много запросов/],
    [{ kind: 'http', status: 400 }, /не принял код/],
    [{ kind: 'http', status: 500 }, /код 500/],
    [{ kind: 'strange' }, /временно недоступен/],
  ];
  for (const [info, pattern] of cases) {
    const { window, $, logger } = setup({
      api: {
        renderDiagram: async () => {
          throw new ApiError('x', info);
        },
      },
    });
    click(window, $('.canvas__render'));
    await flush();
    assert.match($('.canvas__status').textContent, pattern);
    assert.equal(logger.error.mock.callCount(), 1);
    assert.equal($('.canvas__remote').hidden, true);
  }
});

test('an error without a status is logged with an empty status', async () => {
  const { window, $, logger } = setup({
    api: {
      renderDiagram: async () => {
        throw new ApiError('x', { kind: 'network' });
      },
    },
  });
  click(window, $('.canvas__render'));
  await flush();
  assert.deepEqual(logger.error.mock.calls[0].arguments.slice(1), ['network', '']);
});

test('offline without a saved copy shows the offline message and sends nothing', async () => {
  const { window, api, $ } = setup({ online: false });
  click(window, $('.canvas__render'));
  await flush();
  assert.match($('.canvas__status').textContent, /Нет соединения с интернетом\. Сохранённой копии/);
  assert.equal(api.renderDiagram.mock.callCount(), 0);
});

test('offline with a saved copy shows it labelled as cached data', async () => {
  const storage = memory();
  const first = setup({ storage });
  click(first.window, first.$('.canvas__render'));
  await flush();
  const second = setup({ storage, online: false });
  click(second.window, second.$('.canvas__refresh'));
  await flush();
  assert.match(second.$('.canvas__status').textContent, /Кэшированные данные от 2023-11-14 22:13\. Нет соединения/);
  assert.equal(second.$('.canvas__remote').hidden, false);
});

test('a server failure with an expired copy still shows the old copy as cached data', async () => {
  const storage = memory();
  const first = setup({ storage });
  click(first.window, first.$('.canvas__render'));
  await flush();
  const second = setup({
    storage,
    time: 1_700_000_000_000 + 48 * 60 * 60 * 1000,
    api: {
      renderDiagram: async () => {
        throw new ApiError('x', { kind: 'network' });
      },
    },
  });
  click(second.window, second.$('.canvas__render'));
  await flush();
  assert.match(second.$('.canvas__status').textContent, /Кэшированные данные/);
});

test('a broken SVG from the server is reported and not cached', async () => {
  const { window, $, storage } = setup({ api: { renderDiagram: async () => '<svg><g></svg>' } });
  click(window, $('.canvas__render'));
  await flush();
  assert.match($('.canvas__status').textContent, /неожиданный ответ/);
  assert.equal(storage.get('diagram_cache'), null);
});

test('a cached copy that cannot be shown falls through to a new request', async () => {
  const storage = memory();
  const first = setup({ storage });
  click(first.window, first.$('.canvas__render'));
  await flush();
  const entries = storage.get('diagram_cache');
  for (const key of Object.keys(entries)) entries[key].data = '<svg><g></svg>';
  storage.set('diagram_cache', entries);
  const second = setup({ storage });
  click(second.window, second.$('.canvas__render'));
  await flush();
  assert.equal(second.api.renderDiagram.mock.callCount(), 1);
});

test('an empty editor is not sent', async () => {
  const { window, $, api, document } = setup();
  document.querySelectorAll('.code__line code').forEach((line) => (line.textContent = ''));
  click(window, $('.canvas__render'));
  await flush();
  assert.match($('.canvas__status').textContent, /нет кода/);
  assert.equal(api.renderDiagram.mock.callCount(), 0);
});

test('a newer run cancels the previous request and the cancelled one stays silent', async () => {
  const signals = [];
  const resolvers = [];
  const { window, $, logger } = setup({
    api: {
      renderDiagram: (dot, { signal }) =>
        new Promise((resolve, reject) => {
          signals.push(signal);
          resolvers.push(resolve);
          signal.addEventListener('abort', () => reject(new ApiError('cancelled', { kind: 'aborted' })));
        }),
    },
  });
  click(window, $('.canvas__refresh'));
  click(window, $('.canvas__refresh'));
  await flush();
  assert.equal(signals[0].aborted, true);
  assert.equal(logger.error.mock.callCount(), 0);
  assert.equal($('.canvas').getAttribute('aria-busy'), 'true');
  resolvers[1](SVG);
  await flush();
  assert.equal($('.canvas').getAttribute('aria-busy'), 'false');
});

test('a history item shows its saved copy and an unknown item does nothing', async () => {
  const { window, $, document, clock } = setup();
  click(window, $('.canvas__render'));
  await flush();
  $('.canvas__remote').replaceChildren();
  click(window, $('.canvas__history-item'));
  assert.ok($('.canvas__remote svg'));
  assert.match($('.canvas__status').textContent, /сохранённая копия/);
  $('.canvas__remote').replaceChildren();
  $('.canvas__history-item').dataset.key = 'missing';
  click(window, $('.canvas__history-item'));
  assert.equal($('.canvas__remote svg'), null);
  click(window, $('.canvas__history'));
  assert.equal(clock.time > 0, true);
});

test('the history shows a placeholder title for diagrams without a name', async () => {
  const { window, $, document } = setup();
  document.querySelector('.code__line code').textContent = 'diagram idef0';
  document.querySelectorAll('.code__line code')[1].textContent = 'box A0 "Only"';
  click(window, $('.canvas__render'));
  await flush();
  assert.match($('.canvas__history-item').textContent, /^Без названия/);
});

test('the runner works on a page without the optional elements', async () => {
  const window = new JSDOM(
    `<!doctype html><html><body><main class="app-page--editor"><div class="canvas"><button class="canvas__render"></button><p class="canvas__status"></p><div class="canvas__remote" hidden></div></div><ol><li class="code__line"><code>box A "B"</code></li></ol></main></body></html>`,
    { url: 'http://localhost/' },
  ).window;
  const api = { renderDiagram: async () => SVG, checkHealth: async () => ({}) };
  const runner = initDiagramRunner({ root: window.document, storage: memory(), api, isOnline: () => true, autoRun: false });
  assert.equal(await runner.run(), true);
  assert.equal(window.document.querySelector('.canvas__remote').hidden, false);
});

test('the default api and clock are used when none are passed', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '' }));
  const window = new JSDOM(html, { url: 'http://localhost/' }).window;
  const runner = initDiagramRunner({ root: window.document, storage: memory(), isOnline: () => false, autoRun: false });
  assert.equal(await runner.run(), false);
  await flush();
  fetchMock.mock.restore();
});

test('the default online check reads navigator.onLine', async () => {
  const window = new JSDOM(html, { url: 'http://localhost/' }).window;
  const runner = initDiagramRunner({
    root: window.document,
    storage: memory(),
    api: { renderDiagram: async () => SVG, checkHealth: async () => ({}) },
    autoRun: false,
  });
  assert.equal(await runner.run(), true);
});

test('the default logger is console', async () => {
  const window = new JSDOM(html, { url: 'http://localhost/' }).window;
  const error = mock.method(console, 'error', () => {});
  const runner = initDiagramRunner({
    root: window.document,
    storage: memory(),
    isOnline: () => false,
    api: { renderDiagram: async () => SVG, checkHealth: async () => ({}) },
    autoRun: false,
  });
  await runner.run();
  assert.equal(error.mock.callCount(), 1);
  error.mock.restore();
});

test('the page starts a run on its own when it opens', async () => {
  const { api, $ } = setup({ autoRun: true });
  await flush();
  assert.equal(api.renderDiagram.mock.callCount(), 1);
  assert.equal($('.canvas__remote').hidden, false);
});

test('the engine list offers three Kroki engines and the own engine', () => {
  const { document } = setup();
  assert.deepEqual(
    [...document.querySelectorAll('.canvas__engine option')].map((option) => option.value),
    ['graphviz', 'mermaid', 'plantuml', 'local'],
  );
});

test('each Kroki engine sends its own text type to its own endpoint', async () => {
  for (const [engine, pattern] of [
    ['graphviz', /^digraph/],
    ['mermaid', /^flowchart LR/],
    ['plantuml', /^@startuml/],
  ]) {
    const { window, api, $ } = setup();
    $('.canvas__engine').value = engine;
    click(window, $('.canvas__render'));
    await flush();
    const [source, options] = api.renderDiagram.mock.calls[0].arguments;
    assert.match(source, pattern);
    assert.equal(options.type, engine);
  }
});

test('the own engine draws live SVG in the browser without any request, even offline', async () => {
  const { window, api, $, document } = setup({ online: false });
  $('.canvas__engine').value = 'local';
  click(window, $('.canvas__render'));
  await flush();
  assert.equal(api.renderDiagram.mock.callCount(), 0);
  assert.match($('.canvas__status').textContent, /собственным движком/);
  assert.equal($('.canvas__remote').hidden, false);
  assert.equal(document.querySelectorAll('.canvas__remote .local-engine__box').length, 2);
  assert.match($('.canvas__remote svg').getAttribute('aria-label'), /Собственный движок/);
  assert.equal($('.canvas').getAttribute('aria-busy'), 'false');
});

test('changing the engine saves the choice and redraws', async () => {
  const { window, api, $, storage } = setup();
  $('.canvas__engine').value = 'mermaid';
  $('.canvas__engine').dispatchEvent(new window.Event('change', { bubbles: true }));
  await flush();
  assert.equal(storage.get('diagram_engine'), 'mermaid');
  assert.equal(api.renderDiagram.mock.callCount(), 1);
});

test('the saved engine is restored and an unknown saved value is ignored', () => {
  const storage = memory();
  storage.set('diagram_engine', 'plantuml');
  assert.equal(setup({ storage }).$('.canvas__engine').value, 'plantuml');
  const other = memory();
  other.set('diagram_engine', 'nonsense');
  assert.equal(setup({ storage: other }).$('.canvas__engine').value, 'graphviz');
});

test('the same code is cached separately for every engine', async () => {
  const { window, api, $ } = setup();
  click(window, $('.canvas__render'));
  await flush();
  $('.canvas__engine').value = 'mermaid';
  click(window, $('.canvas__render'));
  await flush();
  assert.equal(api.renderDiagram.mock.callCount(), 2);
});

test('a history item whose cached copy is gone says so', async () => {
  const { window, $, storage } = setup();
  click(window, $('.canvas__render'));
  await flush();
  storage.remove('diagram_cache');
  click(window, $('.canvas__history-item'));
  assert.match($('.canvas__status').textContent, /удалена из кэша/);
});

test('a response that arrives after a newer cached view is dropped', async () => {
  const storage = memory();
  const first = setup({ storage });
  click(first.window, first.$('.canvas__render'));
  await flush();
  let release;
  const second = setup({
    storage,
    api: { renderDiagram: () => new Promise((resolve) => (release = resolve)) },
  });
  second.$('.canvas__engine').value = 'mermaid';
  click(second.window, second.$('.canvas__render'));
  second.$('.canvas__engine').value = 'graphviz';
  click(second.window, second.$('.canvas__render'));
  release(SVG);
  await flush();
  assert.match(second.$('.canvas__status').textContent, /сохранённая копия/);
});
