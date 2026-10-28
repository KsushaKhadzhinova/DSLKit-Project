// DSLKit service worker: the pages and files of the site work without a network after the first visit.
// Only files of this site are cached. Requests to other servers, such as the Kroki diagram service, always go to the network.
const VERSION = 'dslkit-v3';
const SHELL = [
  './',
  'index.html',
  'en/index.html',
  'app/dashboard.html',
  'app/editor.html',
  'app/settings.html',
  'app/welcome.html',
  'app/login.html',
  'app/register.html',
  'en/app/dashboard.html',
  'en/app/editor.html',
  'en/app/settings.html',
  'en/app/welcome.html',
  'en/app/login.html',
  'en/app/register.html',
  'css/style.css',
  'js/script.js',
  'images/favicon.svg',
  'images/logo.svg',
  'images/logo-editor.svg',
  'images/loader.svg',
  'images/mascot.svg',
  'manifest.webmanifest',
];

const precache = async () => {
  const cache = await caches.open(VERSION);
  // One missing file must not stop the installation, so the files are added one by one.
  await Promise.allSettled(SHELL.map((path) => cache.add(path)));
};

const forgetOldCaches = async () => {
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name !== VERSION).map((name) => caches.delete(name)));
};

const keep = async (request, response) => {
  if (response.ok) (await caches.open(VERSION)).put(request, response.clone());
  return response;
};

// Pages: the network first so that a visitor sees the newest version, the saved copy when the network fails.
const page = async (request) => {
  try {
    return await keep(request, await fetch(request));
  } catch {
    const saved = await caches.match(request, { ignoreSearch: true });
    return saved ?? new Response('Нет соединения с сетью. No network connection.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
};

// Other files: the saved copy at once and a fresh copy in the background.
const file = async (request) => {
  const saved = await caches.match(request);
  const fresh = fetch(request).then((response) => keep(request, response));
  if (saved) {
    fresh.catch(() => {});
    return saved;
  }
  return fresh;
};

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(forgetOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? page(request) : file(request));
});
