import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from './build-report.js';
import { pickQuestions, variantOf } from './variant.js';

test('pickQuestions selects the neighbours of the variant and wraps around the list', () => {
  assert.deepEqual(pickQuestions(26, 30), [25, 26, 27]);
  assert.deepEqual(pickQuestions(26, 16), [9, 10, 11]);
  assert.deepEqual(pickQuestions(26, 10), [5, 6, 7]);
  assert.deepEqual(pickQuestions(1, 10), [1, 2, 10]);
  assert.deepEqual(pickQuestions(10, 10), [1, 9, 10]);
  assert.deepEqual(pickQuestions(1, 1), [1]);
});

test('variantOf reads the variant number from variant.json', () => {
  assert.equal(
    variantOf(() => '{"variant": 26}'),
    26,
  );
});

test('build keeps only the answers around the variant', () => {
  const tpl = ['Intro', '{{answers}}', '1. one', '2. two', '3. three', '4. four', '{{/answers}}', 'Outro'].join('\n');
  assert.equal(
    build(tpl, () => '', 3),
    ['Intro', '2. two', '3. three', '4. four', 'Outro'].join('\n'),
  );
  assert.equal(
    build(tpl, () => '', 1),
    ['Intro', '1. one', '2. two', '4. four', 'Outro'].join('\n'),
  );
});

test('build accepts templates with Windows line endings', () => {
  const tpl = ['{{answers}}', '1. one', '2. two', '{{/answers}}'].join(String.fromCharCode(13, 10));
  assert.equal(
    build(tpl, () => '', 1),
    ['1. one', '2. two'].join(String.fromCharCode(10)),
  );
});
