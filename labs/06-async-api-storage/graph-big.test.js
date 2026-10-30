import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeGraph, parseDiagram } from '../../site/js/notations/index.js';

const chain = (count) =>
  [
    'diagram graph "Chain"',
    ...Array.from({ length: count }, (_, index) => `vertex v${index}`),
    ...Array.from({ length: count - 1 }, (_, index) => `edge v${index} -- v${index + 1}`),
  ].join('\n');

test('a big graph is analysed in linear time and gets no adjacency matrix, a small one gets it', () => {
  const started = Date.now();
  const big = parseDiagram(chain(1500));
  assert.ok(Date.now() - started < 3000);
  assert.equal(analyzeGraph(big).matrix.length, 0);
  assert.equal(
    big.problems.some((item) => item.code === 'graph-matrix'),
    false,
  );
  const small = parseDiagram(chain(5));
  assert.equal(analyzeGraph(small).matrix.length, 5);
  assert.equal(
    small.problems.some((item) => item.code === 'graph-matrix'),
    true,
  );
});
