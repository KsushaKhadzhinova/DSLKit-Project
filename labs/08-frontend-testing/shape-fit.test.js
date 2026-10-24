import assert from 'node:assert/strict';
import { test } from 'node:test';
import { textWidth, wrap } from '../../site/js/notations/common.js';
import { fitOutline, sizer } from '../../site/js/notations/svg.js';
import { NOTATION_KEYS, TEMPLATES, parseDiagram, renderNotation } from '../../site/js/notations/index.js';

// A shape must grow with its text. The text block of a label has to lie inside the outline of the shape, for a rectangle, a diamond and an ellipse,
// in Russian and in English, for short and for long labels.

const LABELS = [
  'OK',
  'Да',
  'Нужна работа без интернета?',
  'Нужна точная раскладка графа?',
  'Это диаграмма последовательности?',
  'Is an exact graph layout needed?',
  'WWWWWWWW MMMMMMMM',
  'Шифрование ЖЖЖЖ ШШШШ ЩЩЩ',
  'iiii llll tttt ffff rrrr',
  'A very long label that has to wrap over several lines of the shape and still fit',
  'Проверить блокировку входа пользователя по числу неудачных попыток',
  'x',
  '1234567890 1234567890',
];

test('textWidth: capitals and wide letters are wider than narrow ones, it scales with the size and an empty text has no width', () => {
  assert.equal(textWidth(''), 0);
  assert.ok(textWidth('HHHH') > textWidth('hhhh'), 'capitals are wider than small letters');
  assert.ok(textWidth('wwww') > textWidth('aaaa'), 'w is wider than a');
  assert.ok(textWidth('aaaa') > textWidth('iiii'), 'a is wider than i');
  assert.ok(textWidth('ШШШШ') > textWidth('аааа'), 'the Cyrillic Ш is wider than а');
  assert.ok(textWidth('((((') < textWidth('aaaa'), 'brackets are narrow');
  assert.ok(textWidth('1111') > textWidth('iiii'), 'a digit is wider than i');
  assert.ok(textWidth('ЖЖЖЖ') > textWidth('ЯЯЯЯ') - 1, 'wide Cyrillic capitals are at least as wide as other capitals');
  assert.equal(textWidth('abc', 24), textWidth('abc', 12) * 2);
  assert.ok(textWidth(42) > 0, 'a number is read as text');
});

test('sizer: the text block fits inside a rectangle, a diamond and an ellipse for every label', () => {
  for (const outline of ['box', 'diamond', 'ellipse']) {
    for (const label of LABELS) {
      const { lines, w, h } = sizer(80, 40, outline, 16)({ label });
      const a = Math.max(...lines.map((line) => textWidth(line)));
      const b = lines.length * 18;
      assert.ok(Number.isInteger(w) && Number.isInteger(h), `${outline} ${label}: whole pixels`);
      if (outline === 'box') assert.ok(a + 20 <= w && b <= h, `${outline} ${JSON.stringify(label)}: ${a.toFixed(0)}x${b} in ${w}x${h}`);
      if (outline === 'diamond')
        assert.ok(a / w + b / h <= 1, `${outline} ${JSON.stringify(label)}: ${a.toFixed(0)}x${b} in ${w}x${h} gives ${(a / w + b / h).toFixed(2)}`);
      if (outline === 'ellipse') assert.ok((a / w) ** 2 + (b / h) ** 2 <= 1, `${outline} ${JSON.stringify(label)}: ${a.toFixed(0)}x${b} in ${w}x${h}`);
    }
  }
});

test('sizer: the minimum size is kept, a longer label never gives a smaller shape and a diamond is wider than a rectangle for the same text', () => {
  for (const outline of ['box', 'diamond', 'ellipse']) {
    const small = sizer(130, 70, outline, 14)({ label: 'a' });
    assert.ok(small.w >= 130 && small.h >= 70, `${outline} lost its minimum`);
    let previous = 0;
    for (const label of ['Да', 'Да нет', 'Да нет может быть', 'Да нет может быть конечно же да']) {
      const { w, h } = sizer(60, 30, outline, 14)({ label });
      assert.ok(w * h >= previous, `${outline}: ${label} gave a smaller shape`);
      previous = w * h;
    }
  }
  const box = sizer(60, 30, 'box', 16)({ label: 'Нужна точная раскладка' });
  const diamond = sizer(60, 30, 'diamond', 16)({ label: 'Нужна точная раскладка' });
  assert.ok(diamond.w > box.w && diamond.h > box.h);
});

test('fitOutline: an unknown outline is treated as a rectangle', () => {
  assert.deepEqual(fitOutline('something', 100, 18, 10, 10), { w: 128, h: 38 });
});

test('wrap and the sizer agree: no line of a wrapped label is wider than the shape', () => {
  for (const label of LABELS) {
    const lines = wrap(label, 14);
    const { w } = sizer(60, 30, 'box', 14)({ label });
    for (const line of lines) assert.ok(textWidth(line) + 20 <= w, `${JSON.stringify(line)} is wider than ${w}`);
  }
});

test('every starter template still draws with the new sizes: well-formed SVG, every node with a positive size, no NaN', () => {
  for (const key of NOTATION_KEYS) {
    const model = parseDiagram(TEMPLATES[key]);
    const svg = renderNotation(model);
    assert.ok(svg.startsWith('<svg'), key);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, key);
    for (const match of svg.matchAll(/<(?:rect|ellipse)[^>]*\b(?:width|rx)="(-?[\d.]+)"/g)) assert.ok(Number(match[1]) > 0, `${key}: a shape without size`);
  }
});
