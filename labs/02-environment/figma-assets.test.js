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

const boxes = (svg) => {
  const doc = parse(svg).ownerDocument;
  const num = (el, name) => Number(el.getAttribute(name));
  const texts = [...doc.querySelectorAll('text')].map((el) => {
    const size = num(el, 'font-size');
    const w = el.textContent.length * size * (el.getAttribute('font-family').includes('Mono') ? 0.6 : 0.56);
    const anchor = el.getAttribute('text-anchor');
    const x0 = num(el, 'x') - (anchor === 'middle' ? w / 2 : anchor === 'end' ? w : 0);
    return { text: el.textContent, x0, x1: x0 + w, y0: num(el, 'y') - size, y1: num(el, 'y') };
  });
  const rects = [...doc.querySelectorAll('rect')].map((el) => ({
    x0: num(el, 'x'),
    y0: num(el, 'y'),
    x1: num(el, 'x') + num(el, 'width'),
    y1: num(el, 'y') + num(el, 'height'),
  }));
  return { texts, rects, width: num(doc.documentElement, 'width') };
};

test('home prototypes have no overlapping or overflowing text at any width', () => {
  for (const width of [390, 768, 1440]) {
    for (const theme of ['light', 'dark']) {
      const { texts, rects, width: w } = boxes(home(width, theme));
      assert.equal(w, width);
      texts.forEach((a, i) => {
        assert.ok(a.x0 >= 0 && a.x1 <= width, `${width}: "${a.text}" leaves the page`);
        texts.slice(i + 1).forEach((b) => {
          const overlap = a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1;
          assert.ok(!overlap, `${width}: "${a.text}" overlaps "${b.text}"`);
        });
        const holder = rects
          .filter((r) => r.x1 - r.x0 < width && r.x0 <= a.x0 && a.x0 <= r.x1 && r.y0 <= a.y1 && a.y1 <= r.y1)
          .sort((p, q) => (p.x1 - p.x0) * (p.y1 - p.y0) - (q.x1 - q.x0) * (q.y1 - q.y0))[0];
        if (holder) assert.ok(a.x1 <= holder.x1 + 1 && a.y0 >= holder.y0 - 1, `${width}: "${a.text}" sticks out of its box`);
      });
    }
  }
});
