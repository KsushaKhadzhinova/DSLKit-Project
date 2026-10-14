import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { STORAGE_KEYS, createCache, createHistory, loadFromLocalStorage, saveToLocalStorage } from '../../site/js/storage/localStorage.js';
import { parseDsl, sanitizeSvg, sourceKey, toDot } from '../../site/js/utils/dataParser.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const memory = () => createStorage(createMemoryBackend());
const { DOMParser } = new JSDOM('').window;
const parser = new DOMParser();

const SAMPLE = `diagram idef0 "Order process"
box A0 "Process order" {
 input: Order
 contro: Rules
 output: Invoice
}
box A1 "Ship goods" {
 input: Invoice
arrow A0.output -> A1.input
arrow A0 -> A1`;

test('save and load wrap the storage and return null for missing keys', () => {
  const storage = memory();
  assert.equal(loadFromLocalStorage('missing', storage), null);
  assert.equal(saveToLocalStorage('favorites', ['a'], storage), true);
  assert.deepEqual(loadFromLocalStorage('favorites', storage), ['a']);
});

test('the default storage helpers fall back to memory when there is no browser storage', () => {
  assert.equal(saveToLocalStorage('x', 1), true);
  assert.equal(loadFromLocalStorage('absent-key'), null);
});

test('the cache stores data with its save time and reports expiry', () => {
  let time = 1000;
  const cache = createCache({ storage: memory(), ttlMs: 500, now: () => time });
  assert.equal(cache.get('a'), null);
  cache.set('a', 'svg');
  assert.deepEqual(cache.get('a'), { data: 'svg', savedAt: 1000, expired: false });
  time = 1600;
  assert.equal(cache.get('a').expired, true);
});

test('the cache ignores damaged entries and damaged storage', () => {
  const storage = memory();
  const cache = createCache({ storage, ttlMs: 10 });
  storage.set(STORAGE_KEYS.diagramCache, 'broken');
  assert.equal(cache.get('a'), null);
  storage.set(STORAGE_KEYS.diagramCache, { a: 'text', b: { data: 1 } });
  assert.equal(cache.get('a'), null);
  assert.equal(cache.get('b'), null);
  assert.equal(cache.set('c', 'ok'), true);
  assert.equal(cache.get('c').data, 'ok');
});

test('the cache drops the oldest entries when it is full and can be cleared', () => {
  let time = 0;
  const cache = createCache({ storage: memory(), ttlMs: 1000, now: () => (time += 1), maxEntries: 2 });
  cache.set('one', 1);
  cache.set('two', 2);
  cache.set('three', 3);
  assert.equal(cache.get('one'), null);
  assert.equal(cache.get('two').data, 2);
  assert.equal(cache.get('three').data, 3);
  assert.equal(cache.clear(), true);
  assert.equal(cache.get('three'), null);
});

test('the default cache and history work without arguments', () => {
  const cache = createCache({ ttlMs: 10 });
  cache.set('a', 1);
  assert.equal(cache.get('a').data, 1);
  const history = createHistory();
  history.add({ key: 'k' });
  assert.equal(history.list().length, 1);
});

test('the history keeps the newest runs first, without repeats, up to the limit', () => {
  const history = createHistory({ storage: memory(), limit: 2 });
  history.add({ key: 'a' });
  history.add({ key: 'b' });
  history.add({ key: 'a' });
  assert.deepEqual(
    history.list().map((item) => item.key),
    ['a', 'b'],
  );
  history.add({ key: 'c' });
  assert.deepEqual(
    history.list().map((item) => item.key),
    ['c', 'a'],
  );
  history.clear();
  assert.deepEqual(history.list(), []);
});

test('a damaged history is treated as empty and bad items are dropped', () => {
  const storage = memory();
  const history = createHistory({ storage });
  storage.set(STORAGE_KEYS.history, 'broken');
  assert.deepEqual(history.list(), []);
  storage.set(STORAGE_KEYS.history, ['text', { key: 'ok' }, null]);
  assert.equal(history.list().length, 1);
});

test('parseDsl reads the diagram, boxes, ports and arrows and reports unknown lines', () => {
  const model = parseDsl(SAMPLE);
  assert.equal(model.type, 'idef0');
  assert.equal(model.title, 'Order process');
  assert.equal(model.boxes.length, 2);
  assert.deepEqual(model.boxes[0].ports.input, ['Order']);
  assert.deepEqual(model.boxes[0].ports.output, ['Invoice']);
  assert.deepEqual(model.arrows[0], { from: 'A0', fromPort: 'output', to: 'A1', toPort: 'input' });
  assert.deepEqual(model.arrows[1], { from: 'A0', fromPort: '', to: 'A1', toPort: '' });
  assert.deepEqual(model.skipped, [4]);
});

test('parseDsl handles a diagram without a title, blank lines, a port before any box and non-text input', () => {
  const model = parseDsl('diagram erd\n\ninput: Orphan\nbox B "Name"');
  assert.equal(model.type, 'erd');
  assert.equal(model.title, '');
  assert.deepEqual(model.skipped, [3]);
  assert.equal(model.boxes[0].id, 'B');
  assert.deepEqual(parseDsl(undefined).boxes, []);
  assert.deepEqual(parseDsl('a\r\nb').skipped, [1, 2]);
});

test('toDot builds Graphviz text with titles, details and edge labels', () => {
  const dot = toDot(parseDsl(SAMPLE));
  assert.match(dot, /^digraph diagram \{/);
  assert.match(dot, /label="Order process";/);
  assert.match(dot, /"A0" \[label="A0 Process order\\ninput: Order\\noutput: Invoice"\];/);
  assert.match(dot, /"A0" -> "A1" \[label="from: output to: input"\];/);
  assert.match(dot, /"A0" -> "A1";/);
});

test('toDot escapes quotes, backslashes and line breaks and skips an empty title', () => {
  const dot = toDot({
    title: '',
    boxes: [{ id: 'X', name: 'say "hi" \\ now\nnext', ports: { input: [], control: [], output: [], mechanism: [] } }],
    arrows: [],
  });
  assert.doesNotMatch(dot, /label="[^"]*";\s+labelloc/);
  assert.match(dot, /say \\"hi\\" \\\\ now\\nnext/);
});

test('the cache key is stable and differs for different sources', () => {
  assert.equal(sourceKey('abc'), sourceKey('abc'));
  assert.notEqual(sourceKey('abc'), sourceKey('abd'));
  assert.match(sourceKey(''), /^dot-[0-9a-f]+$/);
});

test('sanitizeSvg removes scripts, handlers and javascript links but keeps the drawing', () => {
  const svg = sanitizeSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" onload="x()"><script>alert(1)</script><foreignObject><p>x</p></foreignObject><a xlink:href="javascript:alert(1)"><rect onclick="y()" width="1" height="1"/></a><a href="https://example.com"><text>ok</text></a></svg>',
    parser,
  );
  assert.equal(svg.querySelector('script'), null);
  assert.equal(svg.querySelector('foreignObject'), null);
  assert.equal(svg.hasAttribute('onload'), false);
  assert.equal(svg.querySelector('rect').hasAttribute('onclick'), false);
  assert.equal(svg.querySelector('a').hasAttribute('xlink:href'), false);
  assert.equal(svg.querySelectorAll('a')[1].getAttribute('href'), 'https://example.com');
  assert.ok(svg.querySelector('text'));
});

test('sanitizeSvg rejects broken XML and documents that are not SVG', () => {
  assert.equal(sanitizeSvg('<svg><g></svg>', parser), null);
  assert.equal(sanitizeSvg('<html xmlns="http://www.w3.org/1999/xhtml"></html>', parser), null);
});

test('cache lifetime boundary: an entry is fresh at exactly the lifetime and expired one millisecond later', () => {
  let time = 0;
  const cache = createCache({ storage: memory(), ttlMs: 1000, now: () => time });
  cache.set('a', 1);
  time = 999;
  assert.equal(cache.get('a').expired, false);
  time = 1000;
  assert.equal(cache.get('a').expired, false);
  time = 1001;
  assert.equal(cache.get('a').expired, true);
});

test('cache size boundary: exactly the maximum keeps every entry, one more drops the oldest', () => {
  let time = 0;
  const cache = createCache({ storage: memory(), ttlMs: 1000, now: () => (time += 1), maxEntries: 3 });
  for (const key of ['a', 'b', 'c']) cache.set(key, key);
  assert.deepEqual(
    ['a', 'b', 'c'].map((key) => cache.get(key) !== null),
    [true, true, true],
  );
  cache.set('d', 'd');
  assert.deepEqual(
    ['a', 'b', 'c', 'd'].map((key) => cache.get(key) !== null),
    [false, true, true, true],
  );
});
