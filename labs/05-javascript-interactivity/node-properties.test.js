import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TEMPLATES } from '../../site/js/notations/index.js';
import { propertiesOf, setKind, setLabel } from '../../site/js/utils/node-properties.js';

const DFD = TEMPLATES.dfd;

test('a block with a label and several kinds reports its keyword, kinds and label', () => {
  assert.deepEqual(propertiesOf(DFD, '2'), {
    id: '2',
    notation: 'dfd',
    keyword: 'process',
    kinds: ['entity', 'process', 'store'],
    label: 'Take payment',
    position: null,
  });
});

test('a block without a label still offers its kinds, with the label null', () => {
  assert.equal(propertiesOf(DFD, 'Customer').label, null);
  assert.equal(propertiesOf(DFD, 'Customer').keyword, 'entity');
});

test('a block with a label but one kind only offers the label alone', () => {
  const properties = propertiesOf(TEMPLATES.dag, 'fetch');
  assert.deepEqual(properties.kinds, []);
  assert.equal(properties.label, 'Fetch');
});

test('a block with nothing to edit, and an unknown block, have no properties', () => {
  assert.equal(propertiesOf(TEMPLATES['uml-sequence'], 'Customer'), null);
  assert.equal(propertiesOf(DFD, 'nobody'), null);
});

test('a keyword that is not a kind of the notation (a class in a flow diagram) offers no kinds', () => {
  const code = 'diagram dfd "T"\nwidget A "x"';
  assert.deepEqual(propertiesOf(code, 'A').kinds, []);
});

test('a code without a notation line is read as IDEF0', () => {
  assert.equal(propertiesOf('box A1 "x"', 'A1').notation, 'idef0');
});

test('the label is written back into the line of the block, and only there', () => {
  const next = setLabel(DFD, '2', 'Charge card');
  assert.match(next, /^process 2 "Charge card"$/m);
  assert.equal(next.split('\n').length, DFD.split('\n').length);
  assert.equal(setLabel(DFD, 'Customer', 'x'), null);
  assert.equal(setLabel(DFD, 'nobody', 'x'), null);
});

test('the kind is written as the keyword of the declaration, keeping indent and the rest of the line', () => {
  const next = setKind(DFD, 'Bank', 'store');
  assert.match(next, /^store Bank "Payment bank"$/m);
  const indented = 'diagram dfd "T"\n  entity A "x"';
  assert.equal(setKind(indented, 'A', 'process'), 'diagram dfd "T"\n  process A "x"');
});

test('a kind that does not exist, or a block that does not exist, changes nothing', () => {
  assert.equal(setKind(DFD, 'Bank', 'bogus'), null);
  assert.equal(setKind(DFD, 'nobody', 'store'), null);
  assert.equal(setKind(TEMPLATES.dag, 'fetch', 'task'), null);
});

test('the position of a block is read from pos=XxY of its line, and is null without it', () => {
  const placed = DFD.replace('process 2 "Take payment"', 'process 2 "Take payment" pos=120.5x40');
  assert.equal(propertiesOf(placed, '2').position, '120.5x40');
  assert.equal(propertiesOf(DFD, '2').position, null);
  const quoted = DFD.replace('process 2 "Take payment"', 'process 2 "a pos=1x1 b"');
  assert.equal(propertiesOf(quoted, '2').position, null);
});
