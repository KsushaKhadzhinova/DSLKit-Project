import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  calibration,
  checkRecall,
  classification,
  compareGraphs,
  falsePositiveRate,
  matchElements,
  prf,
  rate,
  stability,
  sumCounts,
  timing,
  topErrors,
} from './metrics.js';

test('rate and prf are zero-safe', () => {
  assert.equal(rate(1, 0), 0);
  assert.equal(rate(1, 3), 0.3333);
  assert.deepEqual(prf({ tp: 0, fp: 0, fn: 0 }), { tp: 0, fp: 0, fn: 0, precision: 0, recall: 0, f1: 0 });
  assert.deepEqual(prf({ tp: 2, fp: 2, fn: 0 }), { tp: 2, fp: 2, fn: 0, precision: 0.5, recall: 1, f1: 0.6667 });
});

test('sumCounts adds the counts of every list item', () => {
  const list = [
    { tp: 1, fp: 2, fn: 3 },
    { tp: 4, fp: 5, fn: 6 },
  ];
  assert.deepEqual(sumCounts(list), { tp: 5, fp: 7, fn: 9 });
});

test('classification gives top-1, top-k, per-class scores and a confusion matrix', () => {
  const cases = [
    { gold: 'a', ranking: ['a', 'b'] },
    { gold: 'a', ranking: ['b', 'a'] },
    { gold: 'b', ranking: ['b'] },
    { gold: 'b', ranking: [] },
  ];
  const result = classification(cases, ['a', 'b', 'c'], 2);
  assert.equal(result.top1, 0.5);
  assert.equal(result.topK, 0.75);
  assert.equal(result.perClass.a.precision, 1);
  assert.equal(result.perClass.a.recall, 0.5);
  assert.equal(result.perClass.c.support, 0);
  assert.equal(result.macroF1, 0.5834);
  assert.equal(result.matrix.a.b, 1);
  assert.equal(result.matrix.b.null, 1);
});

test('classification of nothing is zero and k defaults to 3', () => {
  const result = classification([], ['a']);
  assert.equal(result.top1, 0);
  assert.equal(result.macroF1, 0);
  assert.equal(result.k, 3);
});

test('calibration is 0 when the confidence equals the accuracy of every bin', () => {
  const result = calibration([
    { confidence: 1, correct: true },
    { confidence: 0.5, correct: true },
    { confidence: 0.5, correct: false },
  ]);
  assert.equal(result.ece, 0);
  assert.equal(result.bins.length, 2);
});

test('calibration measures the gap of an over-confident answer', () => {
  assert.equal(calibration([{ confidence: 0.9, correct: false }], 10).ece, 0.9);
  assert.deepEqual(calibration([]), { ece: 0, n: 0, bins: [] });
});

test('matchElements pairs the best labels once and respects the type', () => {
  const gold = [
    { label: 'Check order', type: '' },
    { label: 'Check order today', type: '' },
    { label: 'Ship', type: 'd' },
  ];
  const built = [
    { label: 'Check order', type: '' },
    { label: 'Ship', type: '' },
  ];
  assert.deepEqual([...matchElements(gold, built)], [[0, 0]]);
});

test('compareGraphs counts elements and relations and reports an exact match', () => {
  const gold = {
    elements: [
      { label: 'A step', type: '' },
      { label: 'B step', type: '' },
    ],
    relations: [[0, 1]],
  };
  assert.equal(compareGraphs(gold, gold).exact, true);
  const wrong = { elements: [...gold.elements, { label: 'Extra thing', type: '' }], relations: [[1, 0]] };
  const result = compareGraphs(gold, wrong);
  assert.deepEqual(result.elements, { tp: 2, fp: 1, fn: 0 });
  assert.deepEqual(result.relations, { tp: 0, fp: 1, fn: 1 });
  assert.equal(result.exact, false);
  assert.equal(compareGraphs(gold, wrong, 0.5, true).relations.tp, 1);
});

test('compareGraphs counts a repeated relation as many times as it is gold', () => {
  const elements = [
    { label: 'Client', type: 'a' },
    { label: 'Server', type: 'a' },
  ];
  const gold = {
    elements,
    relations: [
      [0, 1],
      [0, 1],
    ],
  };
  const built = {
    elements,
    relations: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  };
  assert.deepEqual(compareGraphs(gold, built).relations, { tp: 2, fp: 1, fn: 0 });
});

test('checkRecall is per category and overall', () => {
  const result = checkRecall([
    { category: 'x', detected: true },
    { category: 'x', detected: false },
    { category: 'y', detected: true },
  ]);
  assert.equal(result.recall, 0.6667);
  assert.deepEqual(result.perCategory.x, { n: 2, found: 1, recall: 0.5 });
  assert.equal(checkRecall([]).recall, 0);
});

test('falsePositiveRate is the share of flagged clean diagrams', () => {
  assert.deepEqual(falsePositiveRate([{ flagged: true }, { flagged: false }]), { n: 2, flagged: 1, rate: 0.5 });
  assert.equal(falsePositiveRate([]).rate, 0);
});

test('timing gives the median, the 95th percentile and the maximum', () => {
  assert.deepEqual(timing([5, 1, 3]), { n: 3, medianMs: 3, p95Ms: 5, maxMs: 5 });
  assert.deepEqual(timing([]), { n: 0, medianMs: 0, p95Ms: 0, maxMs: 0 });
});

test('stability is the share of the same answers', () => {
  assert.deepEqual(stability([1, [2], 'x'], [1, [2], 'y']), { n: 3, same: 2, rate: 0.6667 });
});

test('topErrors groups the reasons, most frequent first', () => {
  const errors = [
    { reason: 'b', example: 'e1' },
    { reason: 'a', example: 'e2' },
    { reason: 'b', example: 'e3' },
    { reason: 'c', example: 'e4' },
  ];
  assert.deepEqual(topErrors(errors, 2), [
    { reason: 'b', count: 2, example: 'e1' },
    { reason: 'a', count: 1, example: 'e2' },
  ]);
  assert.equal(topErrors([{ reason: 'z', example: 'q' }]).length, 1);
});
