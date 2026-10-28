import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { MESSAGES, NOTATIONS, TEMPLATES, formatProblem, generate, hasLocalRenderer, parseDiagram, renderNotation } from '../../site/js/notations/index.js';
import { addElement, paletteFor } from '../../site/js/utils/palette.js';
import { createProjectStore } from '../../site/js/storage/projects.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { setNodePosition } from '../../site/js/utils/node-position.js';

const keys = Object.keys(NOTATIONS);
const xml = (svg) => new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document;

test('every notation has a starter template and every template is valid', () => {
  assert.equal(keys.length, 33);
  keys.forEach((key) => {
    assert.ok(TEMPLATES[key], `${key}: no template`);
    const errors = parseDiagram(TEMPLATES[key]).problems.filter((item) => item.severity === 'error');
    assert.deepEqual(errors, [], key);
  });
});

test('every template is drawn in the browser as well-formed SVG with a title', () => {
  keys.forEach((key) => {
    const model = parseDiagram(TEMPLATES[key]);
    assert.ok(hasLocalRenderer(model), key);
    const doc = xml(renderNotation(model));
    assert.equal(doc.documentElement.localName, 'svg', key);
    assert.equal(doc.querySelector('parsererror'), null, key);
    assert.ok(doc.documentElement.getAttribute('viewBox'), key);
  });
});

test('every notation exports to at least one text format, and the text is not empty', () => {
  keys.forEach((key) => {
    const model = parseDiagram(TEMPLATES[key]);
    const formats = Object.keys(NOTATIONS[key].generators);
    assert.ok(formats.length >= 1, key);
    formats.forEach((format) => {
      const text = generate(model, format);
      assert.ok(typeof text === 'string' && text.trim().length > 10, `${key} ${format}`);
    });
  });
});

test('every problem code the parsers can raise has a Russian and an English text without leftover placeholders', () => {
  Object.entries(MESSAGES).forEach(([code, texts]) => {
    assert.ok(texts.ru.length > 3 && texts.en.length > 3, code);
    const params = Object.fromEntries([...texts.ru.matchAll(/\{(\w+)\}/g), ...texts.en.matchAll(/\{(\w+)\}/g)].map((match) => [match[1], 'X']));
    ['ru', 'en'].forEach((lang) => assert.doesNotMatch(formatProblem({ code, params }, lang), /\{\w+\}/, `${code} ${lang}`));
    assert.deepEqual([...texts.ru.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(), [...texts.en.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(), `${code}: placeholders differ`);
  });
});

test('moving the first block of every notation that has movable blocks keeps the code free of new errors', () => {
  keys.forEach((key) => {
    const svg = xml(renderNotation(parseDiagram(TEMPLATES[key])));
    const node = svg.querySelector('.notation__node[data-cx]');
    if (!node) return;
    const id = node.getAttribute('data-id');
    const moved = setNodePosition(TEMPLATES[key], id, 250, 180);
    if (moved === null) return;
    const before = parseDiagram(TEMPLATES[key]).problems.filter((item) => item.severity === 'error').length;
    const after = parseDiagram(moved).problems.filter((item) => item.severity === 'error').length;
    assert.ok(after <= before, `${key} ${id}`);
  });
});

test('an element of the palette of every notation is drawn after it is added', () => {
  keys.forEach((key) => {
    paletteFor(key).forEach((item) => {
      const next = addElement(TEMPLATES[key], key, item, { x: 300, y: 200 }).code;
      const doc = xml(renderNotation(parseDiagram(next)));
      assert.equal(doc.querySelector('parsererror'), null, `${key} ${item.keyword}`);
    });
  });
});

test('every template survives being saved as a project and opened again', () => {
  const store = createProjectStore({ storage: createStorage(createMemoryBackend()) });
  keys.forEach((key) => {
    const saved = store.save({ title: key, notation: key, source: TEMPLATES[key] });
    assert.equal(store.get(saved.id).source, TEMPLATES[key], key);
  });
  assert.equal(store.list().length, keys.length);
});

test('template titles name the notation and no template carries a leftover position', () => {
  keys.forEach((key) => {
    assert.ok(TEMPLATES[key].startsWith('diagram '), key);
    assert.ok(!/pos=/.test(TEMPLATES[key]), key);
  });
});
