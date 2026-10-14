import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { ApiError, checkHealth, createApi, fetchData, postData, renderDiagram } from '../../site/js/api/apiService.js';
import { API_CONFIG } from '../../site/js/api/config.js';

const config = { baseUrl: 'https://api.test', diagramType: 'graphviz', outputFormat: 'svg', timeoutMs: 50, retries: 3, retryDelayMs: 10, maxRetryDelayMs: 40 };
const reply = (body, { status = 200, headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => headers[name] ?? null },
  text: async () => body,
  json: async () => JSON.parse(body),
});
const setup = (fetchImpl) => {
  const sleeps = [];
  const api = createApi({ config, fetchImpl, sleep: async (ms) => sleeps.push(ms) });
  return { api, sleeps };
};
const failure = async (promise) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return assert.fail('the call should have failed');
};
const hangUntilAbort = (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));

test('the config describes the Kroki service and holds no key', () => {
  assert.equal(API_CONFIG.baseUrl, 'https://kroki.io');
  assert.equal('apiKey' in API_CONFIG, false);
  assert.ok(API_CONFIG.retries <= 3);
});

test('fetchData sends a GET with query parameters and returns the text', async () => {
  const fetchImpl = mock.fn(async () => reply('hello'));
  const { api } = setup(fetchImpl);
  assert.equal(await api.fetchData('/items', { params: { q: 'a b', page: 2 } }), 'hello');
  assert.equal(fetchImpl.mock.calls[0].arguments[0], 'https://api.test/items?q=a+b&page=2');
  assert.equal(fetchImpl.mock.calls[0].arguments[1].method, 'GET');
  await api.fetchData('/plain');
  assert.equal(fetchImpl.mock.calls[1].arguments[0], 'https://api.test/plain');
});

test('checkHealth reads JSON', async () => {
  const { api } = setup(async () => reply('{"status":"pass"}'));
  assert.deepEqual(await api.checkHealth(), { status: 'pass' });
});

test('postData sends the body with its headers', async () => {
  const fetchImpl = mock.fn(async () => reply('ok'));
  const { api } = setup(fetchImpl);
  await api.postData('/x', 'body', { headers: { 'X-Test': '1' } });
  const options = fetchImpl.mock.calls[0].arguments[1];
  assert.equal(options.method, 'POST');
  assert.equal(options.body, 'body');
  assert.equal(options.headers['X-Test'], '1');
});

test('renderDiagram posts the source as text and returns the SVG', async () => {
  const fetchImpl = mock.fn(async () => reply('<svg xmlns="http://www.w3.org/2000/svg"></svg>'));
  const { api } = setup(fetchImpl);
  assert.match(await api.renderDiagram('digraph {}'), /<svg/);
  assert.equal(fetchImpl.mock.calls[0].arguments[0], 'https://api.test/graphviz/svg');
  assert.equal(fetchImpl.mock.calls[0].arguments[1].headers['Content-Type'], 'text/plain');
  await api.renderDiagram('digraph {}', { type: 'dot', format: 'png' });
  assert.equal(fetchImpl.mock.calls[1].arguments[0], 'https://api.test/dot/png');
});

test('an answer that is not an SVG is rejected as invalid', async () => {
  const { api } = setup(async () => reply('<html></html>'));
  const error = await failure(api.renderDiagram('x'));
  assert.equal(error instanceof ApiError, true);
  assert.equal(error.kind, 'invalid');
});

test('a body that cannot be read is invalid', async () => {
  const { api } = setup(async () => ({ ok: true, status: 200, text: async () => Promise.reject(new Error('broken')) }));
  assert.equal((await failure(api.fetchData('/x'))).kind, 'invalid');
});

test('client errors are not retried', async () => {
  const fetchImpl = mock.fn(async () => reply('nope', { status: 404 }));
  const { api, sleeps } = setup(fetchImpl);
  const error = await failure(api.fetchData('/missing'));
  assert.equal(error.kind, 'http');
  assert.equal(error.status, 404);
  assert.equal(fetchImpl.mock.callCount(), 1);
  assert.deepEqual(sleeps, []);
});

test('server errors are retried with growing delays and then reported', async () => {
  const fetchImpl = mock.fn(async () => reply('bad', { status: 503 }));
  const { api, sleeps } = setup(fetchImpl);
  const error = await failure(api.fetchData('/x'));
  assert.equal(error.status, 503);
  assert.equal(fetchImpl.mock.callCount(), 4);
  assert.deepEqual(sleeps, [10, 20, 40]);
});

test('a later success after a failure returns the data', async () => {
  let calls = 0;
  const fetchImpl = async () => (++calls < 3 ? reply('x', { status: 500 }) : reply('fine'));
  const { api } = setup(fetchImpl);
  assert.equal(await api.fetchData('/x'), 'fine');
});

test('429 waits for Retry-After and ignores values that are not numbers', async () => {
  const answers = [reply('', { status: 429, headers: { 'Retry-After': '1' } }), reply('', { status: 429, headers: { 'Retry-After': 'soon' } }), reply('done')];
  const { api, sleeps } = setup(async () => answers.shift());
  assert.equal(await api.fetchData('/x'), 'done');
  assert.deepEqual(sleeps, [40, 20]);
});

test('network failures are retried and reported as network errors', async () => {
  const fetchImpl = mock.fn(async () => {
    throw new TypeError('Failed to fetch');
  });
  const { api } = setup(fetchImpl);
  const error = await failure(api.fetchData('/x'));
  assert.equal(error.kind, 'network');
  assert.equal(fetchImpl.mock.callCount(), 4);
});

test('a request that takes too long is cancelled and reported as a timeout', async () => {
  const { api } = setup(hangUntilAbort);
  const error = await failure(api.fetchData('/slow', { retries: 0, timeoutMs: 5 }));
  assert.equal(error.kind, 'timeout');
});

test('the caller can cancel a request and it is not retried', async () => {
  const controller = new AbortController();
  const fetchImpl = mock.fn(hangUntilAbort);
  const { api } = setup(fetchImpl);
  const pending = failure(api.fetchData('/x', { signal: controller.signal }));
  controller.abort();
  assert.equal((await pending).kind, 'aborted');
  assert.equal(fetchImpl.mock.callCount(), 1);
});

test('a signal that is already aborted stops the request at once', async () => {
  const controller = new AbortController();
  controller.abort();
  const { api } = setup((url, { signal }) => (signal.aborted ? Promise.reject(new Error('aborted')) : Promise.resolve(reply('x'))));
  assert.equal((await failure(api.fetchData('/x', { signal: controller.signal }))).kind, 'aborted');
});

test('identical parallel requests without a signal share one call', async () => {
  const fetchImpl = mock.fn(async () => reply('shared'));
  const { api } = setup(fetchImpl);
  const [first, second] = await Promise.all([api.fetchData('/same'), api.fetchData('/same')]);
  assert.equal(first, second);
  assert.equal(fetchImpl.mock.callCount(), 1);
  await api.fetchData('/same');
  assert.equal(fetchImpl.mock.callCount(), 2);
});

test('requests with a signal are never merged', async () => {
  const fetchImpl = mock.fn(async () => reply('own'));
  const { api } = setup(fetchImpl);
  const { signal } = new AbortController();
  await Promise.all([api.fetchData('/same', { signal }), api.fetchData('/same', { signal })]);
  assert.equal(fetchImpl.mock.callCount(), 2);
});

test('the default instance is exported', () => {
  for (const fn of [fetchData, postData, checkHealth, renderDiagram]) assert.equal(typeof fn, 'function');
  assert.equal(typeof createApi({ config, fetchImpl: undefined }).fetchData, 'function');
});

test('the real sleep function is used when none is passed', async () => {
  let calls = 0;
  const fetchImpl = async () => (++calls < 2 ? reply('x', { status: 500 }) : reply('ok'));
  const api = createApi({ config: { ...config, retryDelayMs: 1 }, fetchImpl });
  assert.equal(await api.fetchData('/x'), 'ok');
});

test('identical requests that read the answer differently are not merged', async () => {
  const fetchImpl = mock.fn(async () => reply('{"status":"pass"}'));
  const { api } = setup(fetchImpl);
  const [text, json] = await Promise.all([api.fetchData('/health'), api.checkHealth()]);
  assert.equal(text, '{"status":"pass"}');
  assert.deepEqual(json, { status: 'pass' });
  assert.equal(fetchImpl.mock.callCount(), 2);
});
