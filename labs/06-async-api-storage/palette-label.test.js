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
