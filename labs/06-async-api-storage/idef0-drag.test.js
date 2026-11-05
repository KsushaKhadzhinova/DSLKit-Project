import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { TEMPLATES, parseDiagram, renderNotation } from '../../site/js/notations/index.js';
import { parseDsl } from '../../site/js/utils/dataParser.js';
import { setNodePosition } from '../../site/js/utils/node-position.js';

const SOURCE = [
  'diagram idef0 "T"',
  'box A1 "One" {',
  ' input: X',
  ' control: R',
  ' output: Y',
  '}',
  'box A2 "Two" {',
  ' input: Y',
  ' control: R',
  ' output: Z',
  '}',
  'arrow A1.output -> A2.input',
].join('\n');

test('a box line may carry a place before or after the brace', () => {
  const model = parseDsl('box A1 "One" pos=10x20 {\nbox A2 "Two" { pos=30.5x-40\nbox A3 "Three"');
  assert.deepEqual(
    model.boxes.map((box) => box.pos),
    ['10x20', '30.5x-40', undefined],
  );
  assert.deepEqual(model.skipped, []);
});

test('moving an IDEF0 box writes its place and the drawing keeps it', () => {
  const moved = setNodePosition(SOURCE, 'A2', 400, 300);
  assert.match(moved, /box A2 "Two" pos=400x300 \{/);
  const svg = renderNotation(parseDiagram(moved));
  const doc = new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document;
  const box = doc.querySelector('[data-id="A2"]');
  assert.ok(box.classList.contains('notation__node'));
  assert.equal(box.getAttribute('data-cx'), '400');
  assert.equal(box.getAttribute('data-cy'), '300');
  const other = doc.querySelector('[data-id="A1"]');
  assert.ok(Number(other.getAttribute('data-cx')) < 400);
});

test('moving a box again replaces the old place, and the move is rejected for an unknown box', () => {
  const once = setNodePosition(SOURCE, 'A1', 100, 100);
  const twice = setNodePosition(once, 'A1', 120, 90);
  assert.equal((twice.match(/pos=/g) ?? []).length, 1);
  assert.equal(setNodePosition(SOURCE, 'A9', 1, 1), null);
});

test('a malformed place of an IDEF0 box is a strict error, a good one is not', () => {
  const bad = parseDiagram(SOURCE.replace('box A1 "One" {', 'box A1 "One" pos=abc {'));
  assert.ok(bad.problems.some((item) => item.code === 'strict-pos'));
  const good = parseDiagram(SOURCE.replace('box A1 "One" {', 'box A1 "One" pos=10x10 {'));
  assert.ok(!good.problems.some((item) => item.code === 'strict-pos'));
});

test('moving an entity or a class keeps the code valid and the drawing at the new place', () => {
  for (const [key, id] of [
    ['erd', 'Customer'],
    ['uml-class', 'Payable'],
    ['uml-class', 'Person'],
    ['idef4', 'Vehicle'],
  ]) {
    const moved = setNodePosition(TEMPLATES[key], id, 333, 222);
    assert.ok(moved.includes(' pos=333x222'), key);
    assert.deepEqual(
      parseDiagram(moved).problems.filter((item) => item.severity === 'error'),
      [],
      key,
    );
    assert.match(renderNotation(parseDiagram(moved)), /data-cx="333"/);
  }
});

test('an entity or a class line with a place and a brace opens a block that must be closed', () => {
  const entity = parseDiagram('diagram erd "T"\nentity A pos=10x20 {\n  id: int pk');
  assert.ok(entity.problems.some((item) => item.code === 'unclosed'));
  assert.equal(entity.entities[0].pos, '10x20');
  const noBrace = parseDiagram('diagram erd "T"\nentity A pos=10x20');
  assert.equal(noBrace.entities[0].pos, '10x20');
  const cls = parseDiagram('diagram uml class "T"\nclass A pos=5x6 {\n  + x: int\n}\nclass A pos=1x1 {\n}');
  assert.equal(cls.classes[0].pos, '5x6');
  assert.ok(cls.problems.some((item) => item.code === 'duplicate'));
  assert.equal(parseDiagram('diagram uml class "T"\nclass B').classes[0].pos, undefined);
  assert.equal(parseDiagram('diagram erd "T"\nentity B').entities[0].pos, undefined);
});

test('a place goes before the brace and an abstract class can be moved', () => {
  assert.equal(setNodePosition('diagram uml class "T"\nabstract class P {\n}', 'P', 1, 2), 'diagram uml class "T"\nabstract class P pos=1x2 {\n}');
  assert.equal(setNodePosition('class Q', 'Q', 3, 4), 'class Q pos=3x4');
});
