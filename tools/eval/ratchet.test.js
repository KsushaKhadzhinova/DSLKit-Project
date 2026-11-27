import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareToBaseline, describeComparison, watched } from './ratchet.js';

const report = (over = {}) => ({
  sizes: { descriptions: { ru: 1 } },
  detection: { ru: { top1: 0.6, topK: 0.8, macroF1: 0.6, calibration: { ece: 0.1 } } },
  build: {
    ru: {
      auto: { elements: { f1: 0.7 }, relations: { f1: 0.5 }, validRate: 0.9 },
      gold: { elements: { f1: 0.8 }, relations: { f1: 0.6 }, validRate: 0.9 },
      roundTrip: { exactRate: 0.2 },
    },
  },
  check: { seeded: { recall: 0.9, perCategory: { syntax: { recall: 1 } } }, clean: { rate: 0.05 } },
  import: { elements: { f1: 0.8 }, relations: { f1: 0.7 } },
  stability: { rate: 1 },
  ...over,
});
const config = { tolerance: 0.01, overrides: { 'stability.rate': 0 } };

test('watched lists every metric with its direction', () => {
  const list = watched(report());
  assert.ok(list.some(([path, direction]) => path === 'detection.ru.calibration.ece' && direction === 'lower'));
  assert.ok(list.some(([path, direction]) => path === 'check.seeded.perCategory.syntax.recall' && direction === 'higher'));
});

test('an equal run is fine and tiny changes stay inside the tolerance', () => {
  const same = compareToBaseline(report(), report(), config);
  assert.equal(same.ok, true);
  assert.deepEqual(same.regressions, []);
  const near = report({ import: { elements: { f1: 0.795 }, relations: { f1: 0.7 } } });
  assert.equal(compareToBaseline(near, report(), config).ok, true);
});

test('a worse higher-is-better metric and a worse lower-is-better metric are flagged', () => {
  const worse = report({
    import: { elements: { f1: 0.5 }, relations: { f1: 0.7 } },
    check: { seeded: { recall: 0.9, perCategory: { syntax: { recall: 1 } } }, clean: { rate: 0.2 } },
  });
  const result = compareToBaseline(worse, report(), config);
  assert.equal(result.ok, false);
  assert.deepEqual(result.regressions.map((item) => item.path).sort(), ['check.clean.rate', 'import.elements.f1']);
});

test('an override sets its own tolerance', () => {
  const result = compareToBaseline(report({ stability: { rate: 0.995 } }), report(), config);
  assert.equal(result.ok, false);
  assert.equal(result.regressions[0].path, 'stability.rate');
});

test('a better metric is an improvement and a missing one makes the run fail', () => {
  const better = compareToBaseline(report({ stability: { rate: 1 }, import: { elements: { f1: 0.9 }, relations: { f1: 0.7 } } }), report(), {
    tolerance: 0.01,
  });
  assert.equal(better.ok, true);
  assert.equal(better.improvements[0].path, 'import.elements.f1');
  const missing = compareToBaseline(report({ stability: {} }), report(), config);
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.missing, ['stability.rate']);
});

test('a changed size of the set is reported', () => {
  assert.equal(compareToBaseline(report({ sizes: { descriptions: { ru: 2 } } }), report(), config).sizeChanged, true);
});

test('describeComparison tells the verdict, the details and the hint to renew', () => {
  const worse = report({ import: { elements: { f1: 0.5 }, relations: { f1: 0.9 } }, sizes: { descriptions: { ru: 2 } } });
  const text = describeComparison(compareToBaseline(worse, report({ stability: { rate: 1 } }), config));
  assert.match(text, /WORSE/);
  assert.match(text, /worse: import.elements.f1: 0.8 -> 0.5 \(-0.3\)/);
  assert.match(text, /better than the baseline/);
  assert.match(text, /size of the gold set changed/);
  assert.match(text, /\(\+0.2\)/);
  const missing = describeComparison(compareToBaseline(report({ stability: {} }), report(), config));
  assert.match(missing, /missing in the run: stability.rate/);
  assert.match(describeComparison(compareToBaseline(report(), report(), config)), /no metric is worse/);
});
