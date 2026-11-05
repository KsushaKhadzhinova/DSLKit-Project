import assert from 'node:assert/strict';
import { test } from 'node:test';
import { glyphFor, labelOf, renameElement } from '../../site/js/utils/palette.js';

const code = 'diagram dfd\nprocess P1 "Pay \\"now\\"\\nlater"\nentity E1';

test('labelOf reads the first quoted label of a declaration', () => {
  assert.equal(labelOf(code, 'P1'), 'Pay "now"\nlater');
  assert.equal(labelOf(code, 'E1'), null);
  assert.equal(labelOf(code, 'zzz'), null);
});

test('renameElement writes a new label with quotes, backslashes and line breaks escaped', () => {
  assert.equal(renameElement(code, 'P1', 'A "b" \\ c\nd').split('\n')[1], 'process P1 "A \\"b\\" \\\\ c\\nd"');
  assert.equal(renameElement(code, 'E1', 'x'), null);
  assert.equal(renameElement(code, 'zzz', 'x'), null);
});

test('every keyword has an icon, and shapes differ by kind', () => {
  assert.notEqual(glyphFor('database'), glyphFor('start'));
  assert.equal(glyphFor('unknown-keyword'), glyphFor('another'));
});

test('IDEF0 offers a plain box and a box with a mechanism, with their own names', async () => {
  const { paletteFor, linksFor } = await import('../../site/js/utils/palette.js');
  const items = paletteFor('idef0');
  assert.deepEqual(
    items.map((item) => item.label[0]),
    ['Блок функции', 'Блок с механизмом'],
  );
  assert.match(items[1].make('A9'), /mechanism: Performer/);
  assert.equal(linksFor('idef0').length, 3);
});

test('a new element is written with Russian names on a Russian page and with English names otherwise', async () => {
  const { paletteFor, addElement } = await import('../../site/js/utils/palette.js');
  const ru = paletteFor('idef0', 'ru');
  assert.match(ru[0].make('A9'), /Функция/);
  assert.match(ru[1].make('A9'), /Исполнитель/);
  assert.match(paletteFor('idef0', 'en')[0].make('A9'), /function/);
  const dfd = paletteFor('dfd', 'ru').find((item) => item.keyword === 'process');
  assert.equal(addElement('diagram dfd', 'dfd', dfd, null).code.split(String.fromCharCode(10))[1], 'process P1 "Процесс"');
  assert.match(
    paletteFor('dfd')
      .find((item) => item.keyword === 'process')
      .make('P1'),
    /"Process"/,
  );
  const port = paletteFor('uml-composite', 'ru').find((item) => item.keyword === 'port');
  assert.match(port.make('p1', 'classifier c "C"'), /port p1 "Порт" of=c/);
});
