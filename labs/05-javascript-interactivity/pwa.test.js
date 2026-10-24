import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import { registerServiceWorker } from '../../site/js/components/pwa.js';

const ORIGIN = 'https://dslkit.test';
const workerPath = resolve('site/sw.js');
const workerSource = readFileSync(workerPath, 'utf8');

// A tiny cache storage: caches keyed by name, entries keyed by address.
const fakeCaches = () => {
  const stores = new Map();
  const address = (request) => new URL(typeof request === 'string' ? request : request.url, `${ORIGIN}/`).href;
  const store = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  };
  return {
    stores,
    open: async (name) => ({
      put: async (request, response) => void store(name).set(address(request), response),
      add: async (path) => {
        store(name).set(address(path), await sandbox.fetch(path));
      },
    }),
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    match: async (request, options = {}) => {
      const wanted = address(request);
      const strip = (url) => (options.ignoreSearch ? url.split('?')[0] : url);
      for (const entries of stores.values()) {
        for (const [url, response] of entries) if (strip(url) === strip(wanted)) return response;
      }
      return undefined;
    },
  };
};

let sandbox;
const load = ({ failing = new Set() } = {}) => {
  const listeners = {};
  const calls = { skipWaiting: 0, claim: 0, fetched: [] };
  const caches = fakeCaches();
  sandbox = {
    self: {
      addEventListener: (type, handler) => (listeners[type] = handler),
      skipWaiting: () => void calls.skipWaiting++,
      clients: { claim: async () => void calls.claim++ },
      location: new URL(`${ORIGIN}/sw.js`),
    },
    caches,
    Promise,
    Response,
    URL,
    fetch: async (request) => {
      const url = typeof request === 'string' ? new URL(request, `${ORIGIN}/`).href : request.url;
      calls.fetched.push(url);
      if (failing.has('all') || [...failing].some((part) => part !== 'all' && url.includes(part))) throw new TypeError('offline');
      if (url.includes('missing')) return new Response('no', { status: 404 });
      return new Response(`fresh ${url}`, { status: 200 });
    },
  };
  runInNewContext(workerSource, sandbox, { filename: workerPath });
  const wait = [];
  const dispatch = (type, extra = {}) => {
    const event = { waitUntil: (promise) => wait.push(promise), respondWith: (promise) => (event.answer = promise), ...extra };
    listeners[type](event);
    return event;
  };
  return { listeners, calls, caches, sandbox, dispatch, settle: () => Promise.all(wait) };
};
const request = (path, extra = {}) => ({ url: `${ORIGIN}/${path}`, method: 'GET', mode: 'cors', ...extra });
const textOf = async (response) => response.text();

test('the worker installs the shell of the site, one missing file does not stop it, and it takes over at once', async () => {
  const worker = load({ failing: new Set(['app/welcome.html']) });
  worker.dispatch('install');
  await worker.settle();
  const names = [...worker.caches.stores.keys()];
  assert.deepEqual(names, ['dslkit-v2']);
  const saved = [...worker.caches.stores.get('dslkit-v2').keys()];
  assert.ok(saved.includes(`${ORIGIN}/app/editor.html`));
  assert.ok(saved.includes(`${ORIGIN}/js/script.js`));
  assert.ok(!saved.includes(`${ORIGIN}/app/welcome.html`), 'the failing file is skipped');
  assert.equal(worker.calls.skipWaiting, 1);
});

test('on activation the caches of older versions are deleted and the open pages are claimed', async () => {
  const worker = load();
  worker.caches.stores.set('dslkit-v0', new Map());
  worker.caches.stores.set('dslkit-v2', new Map());
  worker.dispatch('activate');
  await worker.settle();
  assert.deepEqual([...worker.caches.stores.keys()], ['dslkit-v2']);
  assert.equal(worker.calls.claim, 1);
});

test('requests that are not GET or go to another server are left to the network', () => {
  const worker = load();
  assert.equal(worker.dispatch('fetch', { request: request('app/editor.html', { method: 'POST' }) }).answer, undefined);
  assert.equal(worker.dispatch('fetch', { request: { url: 'https://kroki.io/graphviz/svg', method: 'GET', mode: 'cors' } }).answer, undefined);
});

test('a page comes from the network and a good answer is kept', async () => {
  const worker = load();
  const event = worker.dispatch('fetch', { request: request('app/editor.html', { mode: 'navigate' }) });
  const response = await event.answer;
  assert.equal(await textOf(response), `fresh ${ORIGIN}/app/editor.html`);
  assert.ok(await worker.caches.match(request('app/editor.html')));
  const bad = await worker.dispatch('fetch', { request: request('missing.html', { mode: 'navigate' }) }).answer;
  assert.equal(bad.status, 404);
  assert.equal(await worker.caches.match(request('missing.html')), undefined, 'an error answer is not kept');
});

test('without a network a page comes from the kept copy, else a short message with the code 503', async () => {
  const online = load();
  await online.dispatch('fetch', { request: request('app/editor.html?x=1', { mode: 'navigate' }) }).answer;
  const worker = load({ failing: new Set(['all']) });
  worker.caches.stores.set('dslkit-v2', new Map(online.caches.stores.get('dslkit-v2')));
  const again = await worker.dispatch('fetch', { request: request('app/editor.html?x=2', { mode: 'navigate' }) }).answer;
  assert.equal(await textOf(again), `fresh ${ORIGIN}/app/editor.html?x=1`);
  const none = await worker.dispatch('fetch', { request: request('app/unknown.html', { mode: 'navigate' }) }).answer;
  assert.equal(none.status, 503);
  assert.match(await textOf(none), /Нет соединения/);
  assert.equal(none.headers.get('content-type'), 'text/plain; charset=utf-8');
});

test('a file comes from the kept copy at once and is renewed in the background', async () => {
  const worker = load();
  const first = await worker.dispatch('fetch', { request: request('css/style.css') }).answer;
  assert.equal(await textOf(first), `fresh ${ORIGIN}/css/style.css`);
  worker.sandbox.fetch = async () => new Response('newer', { status: 200 });
  const second = await worker.dispatch('fetch', { request: request('css/style.css') }).answer;
  assert.equal(await textOf(second), `fresh ${ORIGIN}/css/style.css`, 'the old copy answers first');
  await new Promise((resolve) => setTimeout(resolve, 0));
  const kept = await worker.caches.match(request('css/style.css'));
  assert.equal(await textOf(kept), 'newer', 'the next visit gets the new copy');
});

test('a kept file still works when the network is gone, a file that was never kept is an error', async () => {
  const online = load();
  await online.dispatch('fetch', { request: request('js/script.js') }).answer;
  const worker = load({ failing: new Set(['all']) });
  worker.caches.stores.set('dslkit-v2', new Map(online.caches.stores.get('dslkit-v2')));
  const kept = await worker.dispatch('fetch', { request: request('js/script.js') }).answer;
  assert.equal(await textOf(kept), `fresh ${ORIGIN}/js/script.js`);
  await assert.rejects(worker.dispatch('fetch', { request: request('js/other.js') }).answer, TypeError);
});

test('the service worker is registered where the browser has one and a failure is only reported', async () => {
  const urls = [];
  const navigator = { serviceWorker: { register: async (url) => urls.push(url) } };
  await registerServiceWorker({ navigator, url: new URL('https://dslkit.test/sw.js') });
  assert.deepEqual(urls, ['https://dslkit.test/sw.js']);
  assert.equal(registerServiceWorker({ navigator: {} }), null);
  assert.equal(registerServiceWorker({}), null);
  const errors = [];
  const refusing = { serviceWorker: { register: () => Promise.reject(new Error('insecure')) } };
  assert.equal(await registerServiceWorker({ navigator: refusing, logger: { error: (...args) => errors.push(args[0]) } }), null);
  assert.equal(errors.length, 1);
  const real = new URL('../../site/sw.js', import.meta.url);
  const defaults = [];
  await registerServiceWorker({ navigator: { serviceWorker: { register: async (url) => defaults.push(url) } } });
  assert.equal(defaults[0], real.href);
});

test('the manifest names the app, starts at the dashboard and points to icons that exist', () => {
  const manifest = JSON.parse(readFileSync('site/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.name, 'DSLKit');
  assert.equal(manifest.display, 'standalone');
  assert.ok(existsSync(resolve('site', manifest.start_url)));
  assert.equal(manifest.theme_color, '#2563eb');
  const sizes = manifest.icons.filter((icon) => icon.type === 'image/png').map((icon) => icon.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
  manifest.icons.forEach((icon) => assert.ok(existsSync(resolve('site', icon.src)), icon.src));
});

test('the main pages link the manifest and the files of the worker shell exist', () => {
  const pages = [
    'index.html',
    'en/index.html',
    'app/dashboard.html',
    'app/editor.html',
    'app/settings.html',
    'app/welcome.html',
    'en/app/dashboard.html',
    'en/app/editor.html',
    'en/app/settings.html',
    'en/app/welcome.html',
  ];
  for (const page of pages) {
    const { document } = new JSDOM(readFileSync(resolve('site', page), 'utf8')).window;
    const link = document.querySelector('link[rel="manifest"]');
    assert.ok(link, page);
    assert.ok(existsSync(resolve('site', page, '..', link.getAttribute('href'))), `${page} manifest address`);
    assert.equal(document.querySelector('meta[name="theme-color"]').content, '#2563eb');
  }
  const shell = /const SHELL = \[(.*?)\];/s
    .exec(workerSource)[1]
    .match(/'([^']+)'/g)
    .map((item) => item.slice(1, -1));
  shell.filter((path) => path !== './').forEach((path) => assert.ok(existsSync(resolve('site', path)), path));
});
