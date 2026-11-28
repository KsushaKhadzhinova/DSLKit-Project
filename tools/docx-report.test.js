import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashOf, reportDocx } from './docx-report.js';
import { unzip, zip } from './zip.js';

const png = Buffer.alloc(24);
png.writeUInt32BE(400, 16);
png.writeUInt32BE(300, 20);

const md = [
  '# Практическое занятие №1. Работа',
  '',
  '## 1 Цель работы',
  '',
  'Текст.',
  '',
  '## Заключение',
  '',
  'Готово, листинг в приложении А.',
  '',
  '## Приложение А (обязательное) Листинг файла a.js',
  '',
  '```js',
  'a',
  '```',
  '',
].join('\n');

const files = (extra = {}) => ({
  'variant.json': '{"variant":26}',
  'd/report.md': md,
  'd/report.meta.json': '{"group":"123","student":"Иванов"}',
  ...extra,
});
const reader = (all) => (p) => {
  if (!(p in all)) throw new Error(`no file ${p}`);
  return all[p];
};

test('without a stored contents cache the DOCX is not current and has no page numbers', () => {
  const all = files();
  const result = reportDocx('d', reader(all), () => png);
  assert.equal(result.current, false);
  assert.equal(result.docx, null);
  assert.deepEqual(result.errors, []);
  assert.match(unzip(result.base)['word/document.xml'].toString('utf8'), /ст\. гр\. 123<[^]*?>Иванов/);
});

test('a cache made for this document gives the numbers, a stale or broken one does not', () => {
  const first = reportDocx('d', reader(files()), () => png);
  const stored = JSON.stringify({ base: hashOf(first.base), pages: [3, 4, 5] });
  const current = reportDocx('d', reader(files({ 'd/report.toc.json': stored })), () => png);
  assert.equal(current.current, true);
  assert.deepEqual(current.errors, []);
  assert.match(unzip(current.docx)['word/document.xml'].toString('utf8'), /<w:t xml:space="preserve">5<\/w:t>/);
  const stale = reportDocx('d', reader(files({ 'd/report.md': md.replace('Текст.', 'Другой текст.'), 'd/report.toc.json': stored })), () => png);
  assert.equal(stale.current, false);
  assert.equal(reportDocx('d', reader(files({ 'd/report.toc.json': '{' })), () => png).current, false);
});

test('a report may switch the figure height check off in its meta data', () => {
  const text = md.replace('Текст.', 'Текст.\n\n![Высокая](a.png)\n');
  const tall = Buffer.from(png);
  tall.writeUInt32BE(1000, 16);
  tall.writeUInt32BE(2000, 20);
  const options = (extra) => reader(files({ 'd/report.md': text, 'd/report.meta.json': JSON.stringify({ group: '1', student: 'A', ...extra }) }));
  assert.deepEqual(reportDocx('d', options({}), () => tall).errors, ['A figure is taller than 60 percent of the page: crop the screenshot']);
  assert.deepEqual(reportDocx('d', options({ figureHeight: false }), () => tall).errors, []);
});

test('the hash covers the text and the sizes, not the pixels of a figure', () => {
  const withImage = (data) => {
    const text = md.replace('Текст.', 'Текст.\n\n![Схема](a.png)\n');
    return reportDocx('d', reader(files({ 'd/report.md': text })), () => data).base;
  };
  const other = Buffer.from(png);
  other.writeUInt8(255, 0);
  assert.equal(hashOf(withImage(png)), hashOf(withImage(other)));
  const bigger = Buffer.from(png);
  bigger.writeUInt32BE(800, 20);
  assert.notEqual(hashOf(withImage(png)), hashOf(withImage(bigger)));
  assert.notEqual(hashOf(zip({ 'word/document.xml': 'a', 'word/styles.xml': 'b' })), hashOf(zip({ 'word/document.xml': 'a', 'word/styles.xml': 'c' })));
});
