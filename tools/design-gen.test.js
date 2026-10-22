import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { STRINGS, buildAll, screen } from './design-gen.js';
import { TOKENS } from './tokens.js';

const assets = buildAll(TOKENS);
const { DOMParser } = new JSDOM('').window;

test('the generator produces every asset group in both languages and themes', () => {
  const groups = Object.groupBy(assets, (asset) => asset.group);
  assert.deepEqual(Object.keys(groups).sort(), [
    'ab-tests',
    'components',
    'device-mockups',
    'foundations',
    'mockups-app',
    'mockups-site',
    'moodboard',
    'wireframes',
  ]);
  assert.equal(groups['mockups-site'].length, 24);
  assert.equal(groups['mockups-app'].length, 16);
  assert.equal(groups.components.length, 4);
  assert.equal(groups['ab-tests'].length, 8);
  for (const lang of ['ru', 'en']) for (const theme of ['light', 'dark']) assert.ok(assets.some((asset) => asset.name === `landing-desktop-${lang}-${theme}`));
});

test('every asset is a well-formed SVG with a unique name inside its group', () => {
  const seen = new Set();
  for (const { group, name, svg } of assets) {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    assert.equal(doc.querySelector('parsererror'), null, `${group}/${name}`);
    assert.equal(doc.documentElement.localName, 'svg');
    assert.ok(!seen.has(`${group}/${name}`), name);
    seen.add(`${group}/${name}`);
  }
});

test('Russian and English screens differ and the dark theme uses the dark background', () => {
  const ru = screen('landing', { lang: 'ru', theme: 'light', device: 'desktop' }, TOKENS);
  const en = screen('landing', { lang: 'en', theme: 'light', device: 'desktop' }, TOKENS);
  const dark = screen('landing', { lang: 'ru', theme: 'dark', device: 'desktop' }, TOKENS);
  assert.match(ru, new RegExp(STRINGS.ru.hero));
  assert.match(en, new RegExp(STRINGS.en.hero));
  assert.notEqual(ru, en);
  assert.match(dark, new RegExp(TOKENS.dark.background));
});

test('wireframes use only grays and moodboards name the reference sites', () => {
  const wire = assets.find((asset) => asset.group === 'wireframes').svg;
  assert.doesNotMatch(wire, /#2563eb|#7c3aed/);
  const board = assets.find((asset) => asset.name === 'moodboard-ru').svg;
  for (const site of ['mermaid.js.org', 'drawio.com', 'plantuml.com', 'attio.com', 'minimal.gallery']) assert.match(board, new RegExp(site));
});

test('the A and B landing variants differ and no variant uses a violet gradient', () => {
  const a = screen('landing', { lang: 'ru', theme: 'light', device: 'desktop', variant: 'a' }, TOKENS);
  const b = screen('landing', { lang: 'ru', theme: 'light', device: 'desktop', variant: 'b' }, TOKENS);
  assert.notEqual(a, b);
  assert.match(b, /url\(#dots\)/);
  assert.doesNotMatch(a + b, /7c3aed|linearGradient/i);
});
