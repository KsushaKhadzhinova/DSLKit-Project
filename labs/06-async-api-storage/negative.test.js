import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { ApiError, createApi } from '../../site/js/api/apiService.js';
import { createCache, createHistory, STORAGE_KEYS } from '../../site/js/storage/localStorage.js';
import { parseDsl, sanitizeSvg, sourceKey, toDot, toMermaid, toPlantUml } from '../../site/js/utils/dataParser.js';
import { createMemoryBackend, createStorage, getStorage } from '../../site/js/utils/storage.js';
import { renderLocal } from '../../site/js/engines/local-engine.js';
import { isValidComment, isValidEmail, isValidName, isValidTeamSize, validateWaitlist } from '../../site/js/utils/validation.js';

const { DOMParser } = new JSDOM('').window;
const parser = new DOMParser();
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
const elapsed = (fn) => {
  const start = performance.now();
  const result = fn();
  return { result, ms: performance.now() - start };
};
const hangUntilAbort = (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));

// ---- DSL input: empty, huge, control characters, odd keys ----

test('parseDsl answers an empty model for an empty or blank source', () => {
  for (const source of ['', '   ', '\n\n\t\n']) {
    const model = parseDsl(source);
    assert.deepEqual(model.boxes, []);
    assert.deepEqual(model.arrows, []);
    assert.deepEqual(model.skipped, []);
  }
});

test('parseDsl reports every unknown line of a 1 MB input without stopping', () => {
  const line = 'x'.repeat(1000);
  const source = Array.from({ length: 1000 }, () => line).join('\n');
  const { result, ms } = elapsed(() => parseDsl(source));
  assert.equal(result.skipped.length, 1000);
  assert.ok(ms < 2000, `parsing took ${ms} ms`);
});

test('parseDsl keeps control characters in names without throwing', () => {
  const model = parseDsl('box A "Name\u0000\u0007x"\n  input: a\u0001b');
  assert.equal(model.boxes.length, 1);
  assert.equal(model.boxes[0].name, 'Name\u0000\u0007x');
});

test('parseDsl does not pollute Object.prototype with a __proto__ box id', () => {
  const model = parseDsl('box __proto__ "Evil"\n  input: polluted\narrow __proto__ -> __proto__');
  assert.equal(model.boxes[0].id, '__proto__');
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.input, undefined);
});

test('parseDsl ignores port lines that come before any box', () => {
  const model = parseDsl('input: orphan\nbox A "x"');
  assert.deepEqual(model.boxes[0].ports.input, []);
  assert.deepEqual(model.skipped, [1]);
});

test('parseDsl handles a long run of spaces after a box name in linear time', () => {
  const source = `box A "x"${' '.repeat(20000)}z`;
  const { ms } = elapsed(() => parseDsl(source));
  assert.ok(ms < 1000, `a 20 000-space line took ${ms} ms`);
});

test('parseDsl handles a long unbroken arrow token in linear time', () => {
  const source = `arrow ${'a.'.repeat(5000)}`;
  const { ms } = elapsed(() => parseDsl(source));
  assert.ok(ms < 1000, `a long arrow token took ${ms} ms`);
});

test('parseDsl keeps circular arrows and self loops', () => {
  const model = parseDsl('box A "a"\nbox B "b"\narrow A -> B\narrow B -> A\narrow A -> A');
  assert.equal(model.arrows.length, 3);
});

test('toPlantUml and toMermaid drop arrows that point at unknown boxes', () => {
  const model = parseDsl('box A "a"\narrow A -> GHOST');
  assert.equal(toMermaid(model).includes('GHOST'), false);
  assert.equal(toPlantUml(model).includes('GHOST'), false);
});

test('toDot escapes backslashes in titles', () => {
  const model = parseDsl('diagram idef0 "back\\slash"\nbox A "x"');
  assert.ok(toDot(model).includes('label="back\\\\slash"'), toDot(model));
});

test('toPlantUml gives every box a unique node name when ids repeat', () => {
  const model = parseDsl('box A "first"\nbox A "second"\narrow A -> A');
  const names = [...toPlantUml(model).matchAll(/ as (\w+)/g)].map((match) => match[1]);
  assert.equal(new Set(names).size, names.length, `duplicate node names: ${names}`);
});

test('sourceKey is stable and separates similar sources', () => {
  assert.equal(sourceKey('abc'), sourceKey('abc'));
  assert.notEqual(sourceKey('abc'), sourceKey('abd'));
  assert.notEqual(sourceKey(''), sourceKey(' '));
  assert.match(sourceKey('\u{1F600}'), /^dot-[0-9a-f]+$/);
});

// ---- SVG sanitizer: hostile markup from a remote service ----

const HOSTILE = [
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
  '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>x</text></a></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><a href="JaVaScRiPt:alert(1)"><text>x</text></a></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><a href="&#x09;javascript:alert(1)"><text>x</text></a></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><a href="data:text/html,hi"><text>x</text></a></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="vbscript:msgbox"><text>x</text></a></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><iframe src="https://evil.test"/></foreignObject></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.test/x.png"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><use href="data:image/svg+xml,x"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="href" to="javascript:alert(1)"/><a><text>x</text></a></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(https://evil.test/x.css);</style></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(javascript:alert(1))"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><rect style="\\75 rl(javascript:alert(1))"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><text href="javascript:alert(1)">x</text></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><svg:script xmlns:svg="http://www.w3.org/2000/svg">alert(1)</svg:script></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><html:script xmlns:html="http://www.w3.org/1999/xhtml">alert(1)</html:script></svg>',
];

test('sanitizeSvg removes scripts, handlers, unsafe links and external loads from hostile markup', () => {
  for (const payload of HOSTILE) {
    const svg = sanitizeSvg(payload, parser);
    if (svg === null) continue;
    const html = svg.outerHTML;
    assert.doesNotMatch(html, /<script/i, payload);
    assert.doesNotMatch(html, /<iframe|<image|<use|<animate|<style|foreignObject/i, payload);
    assert.doesNotMatch(html, /\bon[a-z]+=/i, payload);
    assert.doesNotMatch(html, /javascript:|vbscript:|data:|evil\.test/i, payload);
  }
});

test('sanitizeSvg returns null for markup that is not an SVG document', () => {
  assert.equal(sanitizeSvg('<html><body>hi</body></html>', parser), null);
  assert.equal(sanitizeSvg('not xml at all <<<', parser), null);
  assert.equal(sanitizeSvg('', parser), null);
});

test('sanitizeSvg keeps ordinary drawing elements and safe links', () => {
  const svg = sanitizeSvg(
    '<svg xmlns="http://www.w3.org/2000/svg"><a href="https://example.com"><rect width="1" height="1"/></a><a href="#top"/></svg>',
    parser,
  );
  assert.equal(svg.querySelectorAll('rect').length, 1);
  assert.equal(svg.querySelectorAll('a[href="https://example.com"]').length, 1);
});

test('renderLocal escapes hostile titles and box names so no markup reaches the page', () => {
  const source = 'diagram idef0 "<img src=x onerror=alert(1)>"\nbox A "<script>alert(2)</script>" {\n  input: <svg onload=alert(3)>\n}\narrow A -> A';
  const svg = sanitizeSvg(renderLocal(parseDsl(source)), parser);
  assert.ok(svg, 'the escaped drawing should still parse');
  assert.equal(svg.querySelectorAll('img, script').length, 0);
  assert.equal(svg.querySelectorAll('[onerror], [onload]').length, 0);
});

test('renderLocal survives an empty model and arrows to unknown boxes', () => {
  assert.doesNotThrow(() => renderLocal(parseDsl('')));
  assert.ok(sanitizeSvg(renderLocal(parseDsl('box A "a"\narrow A -> NOPE')), parser));
});

test('renderLocal handles a circular chain of boxes without looping forever', () => {
  const lines = ['box A "a"', 'box B "b"', 'box C "c"', 'arrow A -> B', 'arrow B -> C', 'arrow C -> A'];
  const { ms } = elapsed(() => renderLocal(parseDsl(lines.join('\n'))));
  assert.ok(ms < 1000);
});

test('a NUL character in a title still yields a drawable SVG', () => {
  const svgText = renderLocal(parseDsl('diagram idef0 "bad\u0000title"\nbox A "x"'));
  assert.ok(sanitizeSvg(svgText, parser));
});

// ---- Storage: corrupted JSON, quota, broken localStorage ----

test('storage returns the fallback for corrupted JSON and for stored non-JSON text', () => {
  const backend = createMemoryBackend();
  backend.setItem('dslkit.settings', '{broken');
  const storage = createStorage(backend);
  assert.deepEqual(storage.get('settings', {}), {});
  backend.setItem('dslkit.raw', 'undefined');
  assert.equal(storage.get('raw', 'fallback'), 'fallback');
});

test('storage reports a quota error as false and keeps reads working', () => {
  const backend = createMemoryBackend();
  backend.setItem('dslkit.keep', '1');
  backend.setItem = () => {
    throw new Error('QuotaExceededError');
  };
  const storage = createStorage(backend);
  assert.equal(storage.set('big', 'x'.repeat(10)), false);
  assert.equal(storage.get('keep'), 1);
});

test('storage remove reports a failing backend as false', () => {
  const backend = createMemoryBackend();
  backend.removeItem = () => {
    throw new Error('SecurityError');
  };
  assert.equal(createStorage(backend).remove('x'), false);
});

test('getStorage falls back to memory when reading localStorage throws', () => {
  const win = {
    get localStorage() {
      throw new Error('SecurityError: storage is blocked');
    },
  };
  const storage = getStorage(win);
  assert.equal(storage.set('k', 'v'), true);
  assert.equal(storage.get('k'), 'v');
});

test('getStorage falls back to memory when localStorage is missing', () => {
  const storage = getStorage({ localStorage: null });
  assert.equal(storage.set('a', 1), true);
  assert.equal(storage.get('a'), 1);
});

test('cache ignores corrupted, non-object and array entries', () => {
  const backend = createMemoryBackend();
  const storage = createStorage(backend);
  const cache = createCache({ storage, ttlMs: 1000, now: () => 0 });
  backend.setItem('dslkit.diagram_cache', '[1,2,3]');
  assert.equal(cache.get('anything'), null);
  backend.setItem('dslkit.diagram_cache', '{"k":"string","j":null,"m":{"savedAt":"soon"}}');
  assert.equal(cache.get('k'), null);
  assert.equal(cache.get('j'), null);
  assert.equal(cache.get('m'), null);
});

test('cache answers null for prototype keys instead of inherited values', () => {
  const cache = createCache({ storage: createStorage(createMemoryBackend()), ttlMs: 1000, now: () => 0 });
  for (const key of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    assert.equal(cache.get(key), null, key);
  }
});

test('cache stores a __proto__ key as ordinary data', () => {
  const cache = createCache({ storage: createStorage(createMemoryBackend()), ttlMs: 1000, now: () => 5 });
  cache.set('__proto__', '<svg/>');
  assert.equal(cache.get('__proto__').data, '<svg/>');
  assert.equal({}.data, undefined);
});

test('cache rejects a saved time that is not a finite number', () => {
  const backend = createMemoryBackend();
  backend.setItem('dslkit.diagram_cache', '{"k":{"data":"<svg/>","savedAt":1e400}}');
  const cache = createCache({ storage: createStorage(backend), ttlMs: 1000, now: () => 0 });
  assert.equal(cache.get('k'), null);
});

test('cache evicts the oldest entries and keeps the newest when it is full', () => {
  let clock = 0;
  const cache = createCache({ storage: createStorage(createMemoryBackend()), ttlMs: 1000, now: () => clock, maxEntries: 2 });
  for (const key of ['a', 'b', 'c']) {
    clock += 1;
    cache.set(key, key);
  }
  assert.equal(cache.get('a'), null);
  assert.equal(cache.get('c').data, 'c');
});

test('cache.set answers false when the quota is exceeded', () => {
  const backend = createMemoryBackend();
  backend.setItem = () => {
    throw new Error('QuotaExceededError');
  };
  const cache = createCache({ storage: createStorage(backend), ttlMs: 1000, now: () => 0 });
  assert.equal(cache.set('k', '<svg/>'), false);
});

test('history drops corrupted items and keeps plain objects only', () => {
  const backend = createMemoryBackend();
  backend.setItem('dslkit.run_history', '[null, 3, "x", {"key":"ok","at":1}, [1]]');
  assert.deepEqual(createHistory({ storage: createStorage(backend) }).list(), [{ key: 'ok', at: 1 }]);
});

test('history answers an empty list when the stored value is not an array', () => {
  const backend = createMemoryBackend();
  backend.setItem('dslkit.run_history', '{"key":"x"}');
  assert.deepEqual(createHistory({ storage: createStorage(backend) }).list(), []);
});

test('history keeps only the newest unique runs', () => {
  const history = createHistory({ storage: createStorage(createMemoryBackend()), limit: 2 });
  history.add({ key: 'a', at: 1 });
  history.add({ key: 'b', at: 2 });
  const list = history.add({ key: 'a', at: 3 });
  assert.deepEqual(
    list.map((item) => item.key),
    ['a', 'b'],
  );
});

test('history.add ignores a null entry instead of throwing', () => {
  const history = createHistory({ storage: createStorage(createMemoryBackend()) });
  history.add({ key: 'a', at: 1 });
  assert.doesNotThrow(() => history.add(null));
});

test('history clear removes the stored key', () => {
  const backend = createMemoryBackend();
  const history = createHistory({ storage: createStorage(backend) });
  history.add({ key: 'a', at: 1 });
  history.clear();
  assert.equal(backend.getItem(`dslkit.${STORAGE_KEYS.history}`), null);
});

// ---- Validation: blank, long, odd numbers ----

test('validation rejects blank, whitespace and control-character names', () => {
  for (const value of ['', ' ', '\t\t', 'A', 'Ann\u0000', 'Ann\nBob', '12345', '\u{1F600}\u{1F600}', null, undefined]) {
    assert.equal(isValidName(value), false, JSON.stringify(value));
  }
});

test('validation accepts a 60-character name and rejects 61', () => {
  assert.equal(isValidName(`A${'a'.repeat(59)}`), true);
  assert.equal(isValidName(`A${'a'.repeat(60)}`), false);
});

test('validation rejects emails that are too long, have no domain dot or a 1-letter top domain', () => {
  assert.equal(isValidEmail(`${'a'.repeat(120)}@x.io`), false);
  assert.equal(isValidEmail('a@b'), false);
  assert.equal(isValidEmail('a@b.c'), false);
  assert.equal(isValidEmail('a@b..com'), false);
  assert.equal(isValidEmail('a b@c.com'), false);
  assert.equal(isValidEmail(undefined), false);
});

test('validation team size rejects negative, fractional, exponent and hex values', () => {
  for (const value of [-1, 1.5, NaN, Infinity, 501, '-1', '1.5', '1e3', '0x1', '', '  ', '12abc', '999999999999999999999', 1e21]) {
    assert.equal(isValidTeamSize(value), false, String(value));
  }
});

test('validation team size accepts zero, padded numbers and the maximum', () => {
  assert.equal(isValidTeamSize(0), true);
  assert.equal(isValidTeamSize(' 7 '), true);
  assert.equal(isValidTeamSize('0000000000000000000000000000000000000000001'), true);
  assert.equal(isValidTeamSize(500), true);
});

test('validation comment rejects one character over 500', () => {
  assert.equal(isValidComment('x'.repeat(500)), true);
  assert.equal(isValidComment('x'.repeat(501)), false);
  assert.equal(isValidComment(null), true);
});

test('validateWaitlist reports every bad field at once and requires consent to be exactly true', () => {
  const invalid = validateWaitlist({ name: '', email: 'bad', notation: 'cobol', team: -3, comment: 'x'.repeat(600), consent: 'true' });
  assert.deepEqual(invalid, ['name', 'email', 'notation', 'team', 'comment', 'consent']);
  assert.deepEqual(validateWaitlist(), ['name', 'email', 'notation', 'team', 'consent']);
});

// ---- API client: network failure, timeouts, server errors, bad bodies ----

test('api reports a network failure after the configured retries', async () => {
  const fetchImpl = mock.fn(async () => {
    throw new TypeError('fetch failed');
  });
  const { api, sleeps } = setup(fetchImpl);
  const error = await failure(api.fetchData('/x'));
  assert.equal(error.kind, 'network');
  assert.equal(fetchImpl.mock.callCount(), 4);
  assert.equal(sleeps.length, 3);
});

test('api does not retry a 400 answer', async () => {
  const fetchImpl = mock.fn(async () => reply('bad', { status: 400 }));
  const { api } = setup(fetchImpl);
  const error = await failure(api.postData('/x', 'source'));
  assert.equal(error.kind, 'http');
  assert.equal(error.status, 400);
  assert.equal(fetchImpl.mock.callCount(), 1);
});

test('api retries a 503 and gives up with the status code', async () => {
  const fetchImpl = mock.fn(async () => reply('down', { status: 503 }));
  const { api } = setup(fetchImpl);
  const error = await failure(api.fetchData('/x'));
  assert.equal(error.status, 503);
  assert.equal(fetchImpl.mock.callCount(), 4);
});

test('api honours Retry-After on 429 and caps the wait', async () => {
  let calls = 0;
  const fetchImpl = mock.fn(async () => (calls++ === 0 ? reply('slow', { status: 429, headers: { 'Retry-After': '999' } }) : reply('ok')));
  const { api, sleeps } = setup(fetchImpl);
  assert.equal(await api.fetchData('/x'), 'ok');
  assert.deepEqual(sleeps, [40]);
});

test('api treats a timeout as final and does not retry it', async () => {
  const fetchImpl = mock.fn(hangUntilAbort);
  const { api } = setup(fetchImpl);
  const error = await failure(api.fetchData('/x'));
  assert.equal(error.kind, 'timeout');
  assert.equal(fetchImpl.mock.callCount(), 1);
});

test('api reports a body that cannot be read as invalid', async () => {
  const { api } = setup(async () => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => {
      throw new Error('stream reset');
    },
  }));
  const error = await failure(api.fetchData('/x'));
  assert.equal(error.kind, 'invalid');
});

test('renderDiagram refuses an HTML page with a 200 status', async () => {
  const { api } = setup(async () => reply('<!doctype html><html><body>Maintenance</body></html>'));
  const error = await failure(api.renderDiagram('digraph {}'));
  assert.ok(error instanceof ApiError);
  assert.equal(error.kind, 'invalid');
});

test('renderDiagram refuses an empty answer', async () => {
  const { api } = setup(async () => reply(''));
  const error = await failure(api.renderDiagram('digraph {}'));
  assert.equal(error.kind, 'invalid');
});

test('postData sends a 1 MB body unchanged', async () => {
  const body = 'a'.repeat(1024 * 1024);
  const fetchImpl = mock.fn(async () => reply('ok'));
  const { api } = setup(fetchImpl);
  await api.postData('/graphviz/svg', body);
  assert.equal(fetchImpl.mock.calls[0].arguments[1].body.length, body.length);
});

test('a caller abort during the retry wait stops further attempts', async () => {
  const controller = new AbortController();
  const fetchImpl = mock.fn(async () => reply('down', { status: 503 }));
  const api = createApi({ config, fetchImpl, sleep: async () => controller.abort() });
  await failure(api.fetchData('/x', { signal: controller.signal }));
  assert.equal(fetchImpl.mock.callCount(), 1);
});

test('a cancelled request reports an aborted kind, not a network error', async () => {
  const controller = new AbortController();
  const { api } = setup(mock.fn(hangUntilAbort));
  const pending = api.fetchData('/x', { signal: controller.signal });
  controller.abort();
  const error = await failure(pending);
  assert.equal(error.kind, 'aborted');
});
