import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { assets, esc, home, moodboard, palette, typography, wrap } from './figma-assets.js';

const parse = (svg) => new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document.documentElement;

test('esc escapes markup characters', () => {
  assert.equal(esc('<a&b>'), '&lt;a&amp;b&gt;');
});

test('wrap splits text by line length', () => {
  assert.deepEqual(wrap('aa bb cc', 5), ['aa bb', 'cc']);
  assert.deepEqual(wrap('word', 2), ['word']);
});

test('every asset is well-formed SVG with positive size', () => {
  for (const [name, svg] of Object.entries(assets())) {
    const root = parse(svg);
    assert.equal(root.tagName, 'svg', name);
    assert.ok(Number(root.getAttribute('width')) > 0 && Number(root.getAttribute('height')) > 0, name);
  }
});

test('palette shows both themes with contrast ratios', () => {
  const svg = palette();
  assert.match(svg, /светлая тема/);
  assert.match(svg, /тёмная тема/);
  assert.match(svg, /--color-primary/);
  assert.match(svg, /#2563eb · \d+\.\d:1/);
});

test('typography and moodboard contain the design language', () => {
  assert.match(typography(), /JetBrains Mono/);
  assert.match(typography(), /Пишите код — получайте диаграмму/);
  assert.match(moodboard(), /Золотое сечение/);
  assert.match(moodboard(), /1 : 1,618/);
});

test('home layout adapts to width and theme', () => {
  const desktop = home(1440);
  const tablet = home(768);
  const mobile = home(390, 'dark');
  assert.match(desktop, /Возможности/);
  assert.match(tablet, /Возможности/);
  assert.doesNotMatch(mobile, /Возможности/);
  assert.match(desktop, /Демо/);
  assert.doesNotMatch(mobile, /Демо/);
  assert.match(mobile, /fill="#1e1e2e"/);
  assert.match(desktop, /fill="#f8f9fc"/);
  for (const svg of [desktop, tablet, mobile]) assert.match(svg, /Записаться в бету/);
  assert.ok(parse(mobile).getAttribute('height') > parse(desktop).getAttribute('height') / 2);
});

test('design script writes all assets', async () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'design-')), 'out');
  process.argv[2] = dir;
  await import('./design.js');
  assert.equal(readdirSync(dir).length, 9);
  assert.equal(readFileSync(join(dir, 'palette.svg'), 'utf8'), palette());
});
