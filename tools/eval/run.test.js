import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONFIG } from './config.js';
import { evaluateChecks, evaluateDescriptions, evaluateImports, runEval } from './run.js';

const GOOD = 'diagram bpmn "T"\nstart s\ntask a "Check order"\ntask b "Ship goods"\nend e\nflow s -> a\nflow a -> b\nflow b -> e';

// A stub of the product: the answers are fixed, so the numbers of the harness can be computed by hand.
const stub = (over = {}) => ({
  notations: ['bpmn', 'gost'],
  detect: (text) => (text === 'miss' ? { ranking: [], confidence: 0 } : { ranking: ['bpmn', 'gost'], confidence: 0.8 }),
  build: (text, lang, notation) =>
    text === 'fail'
      ? { ok: false, reason: 'empty', notation: null }
      : { ok: true, notation: notation === 'auto' ? 'bpmn' : notation, dsl: text === 'bad' ? 'BAD' : GOOD, valid: text !== 'bad' },
  graphOfCode: (code) =>
    code === 'BAD'
      ? { elements: [{ label: 'Nothing', type: '' }], relations: [] }
      : {
          elements: [
            { label: 'Check order', type: '' },
            { label: 'Ship goods', type: '' },
          ],
          relations: [[0, 1]],
        },
  roundTrip: (dsl) => ({
    first: { elements: [{ label: 'Check order', type: '' }], relations: [] },
    back: dsl === 'BAD' ? { ok: false } : { ok: true, graph: { elements: [{ label: 'Check order', type: '' }], relations: [] } },
  }),
  review: (code) => ({
    issues: code.includes('flow') ? [{ rule: 'syntax', severity: 'error', line: 2 }] : [{ rule: 'naming-long-label', severity: 'info', line: 1 }],
    questions: code.includes('ask') ? 1 : 0,
  }),
  importCode: (code) =>
    code === 'refused'
      ? { ok: false, reason: 'unknown' }
      : { ok: true, valid: true, dsl: 'x', graph: { elements: [{ label: 'One', type: '' }], relations: [] } },
  ...over,
});

const descriptions = (cases) => ({ lang: 'en', cases });
const gold = (id, text, notation = 'bpmn') => ({ id, text, notation, level: 'easy', el: ['Check order', 'Ship goods'], rel: '0-1' });

test('evaluateDescriptions measures detection, calibration and building on a stub', () => {
  const file = descriptions([gold('a', 'ok'), gold('b', 'ok', 'gost'), gold('c', 'miss'), gold('d', 'fail'), gold('e', 'bad')]);
  const { report, errors, times } = evaluateDescriptions(file, stub(), CONFIG, () => 1);
  assert.equal(report.detection.total, 5);
  assert.equal(report.detection.top1, 0.6);
  assert.equal(report.detection.calibration.n, 5);
  assert.equal(report.detection.byLevel.easy.n, 5);
  assert.equal(report.build.auto.n, 5);
  assert.equal(report.build.auto.built, 4);
  assert.equal(report.build.auto.valid, 3);
  assert.equal(report.build.auto.exactRate, 0.6);
  assert.equal(report.build.gold.byNotation.gost.n, 1);
  assert.equal(report.build.roundTrip.n, 4);
  assert.equal(report.build.roundTrip.ok, 3);
  assert.equal(times.detect.length, 5);
  const reasons = errors.map((item) => item.reason);
  assert.ok(reasons.includes('detect bpmn as nothing'));
  assert.ok(reasons.includes('detect gost as bpmn'));
  assert.ok(reasons.includes('build(auto): nothing built (empty)'));
  assert.ok(reasons.includes('build(auto): the built code has validator errors'));
  assert.ok(reasons.includes('build(auto) bpmn: expected elements are missing'));
  assert.ok(reasons.includes('build(auto) bpmn: extra elements'));
  assert.ok(reasons.includes('build(auto) bpmn: expected relations are missing'));
});

test('evaluateDescriptions reports extra relations of a built graph', () => {
  const extra = stub({
    graphOfCode: () => ({
      elements: [
        { label: 'Check order', type: '' },
        { label: 'Ship goods', type: '' },
      ],
      relations: [
        [0, 1],
        [1, 0],
      ],
    }),
  });
  const { errors } = evaluateDescriptions(descriptions([gold('a', 'ok')]), extra, CONFIG, () => 0);
  assert.deepEqual(
    errors.map((item) => item.reason),
    ['build(auto) bpmn: extra relations', 'build(gold notation) bpmn: extra relations'],
  );
});

test('evaluateDescriptions of an empty file gives zeros', () => {
  const { report } = evaluateDescriptions(descriptions([]), stub(), CONFIG, () => 0);
  assert.equal(report.detection.top1, 0);
  assert.equal(report.build.auto.validRate, 0);
  assert.equal(report.build.roundTrip.exactRate, 0);
});

const seeded = (id, category, code, line = 2, askable = false) => ({ id, kind: 'seeded', category, notation: 'bpmn', line, askable, code });
const clean = (id, code) => ({ id, kind: 'clean', notation: 'bpmn', code });

test('evaluateChecks measures recall, line match, false alarms and questions', () => {
  const file = {
    cases: [
      seeded('s1', 'syntax', GOOD),
      seeded('s2', 'syntax', GOOD, 9),
      seeded('s3', 'deadend', GOOD),
      seeded('s4', 'syntax', 'plain ask', 1, true),
      clean('c1', 'plain'),
      clean('c2', `${GOOD} ask`),
    ],
  };
  const { report, errors } = evaluateChecks(file, stub(), () => 0);
  assert.equal(report.seeded.n, 4);
  assert.equal(report.seeded.found, 2);
  assert.equal(report.seeded.recall, 0.5);
  assert.equal(report.seeded.recallAtLine, 0.25);
  assert.equal(report.seeded.perCategory.syntax.n, 3);
  assert.equal(report.seeded.anyFindingRate, 0.75);
  assert.equal(report.clean.flagged, 1);
  assert.equal(report.questions.askableN, 1);
  assert.equal(report.questions.askedRate, 1);
  assert.equal(report.questions.cleanAsked, 1);
  assert.deepEqual(
    errors.map((item) => item.reason).sort(),
    ['check syntax: seeded defect not found (bpmn)', 'check: false alarm on a clean diagram (syntax)', 'check deadend: seeded defect not found (bpmn)'].sort(),
  );
});

test('evaluateChecks counts a finding of an unknown category as not detected', () => {
  const { report } = evaluateChecks({ cases: [seeded('s1', 'nonsense', GOOD)] }, stub(), () => 0);
  assert.equal(report.seeded.found, 0);
});

const imp = (id, code, format = 'mermaid') => ({ id, format, code, el: ['One'], rel: '' });

test('evaluateImports measures acceptance and fidelity per format', () => {
  const file = { cases: [imp('i1', 'good'), imp('i2', 'refused'), { ...imp('i3', 'good', 'dot'), el: ['One', 'Two'] }] };
  const { report, errors } = evaluateImports(file, stub(), CONFIG, () => 0);
  assert.equal(report.n, 3);
  assert.equal(report.ok, 2);
  assert.equal(report.valid, 2);
  assert.equal(report.exact, 1);
  assert.equal(report.byFormat.mermaid.ok, 1);
  assert.deepEqual(
    errors.map((item) => item.reason),
    ['import mermaid: refused (unknown)', 'import dot: elements or relations differ'],
  );
});

test('runEval gives the whole report and a stable answer', () => {
  const data = {
    descriptions: [descriptions([gold('a', 'ok')]), { lang: 'ru', cases: [gold('b', 'ok')] }],
    check: { cases: [seeded('s1', 'syntax', GOOD), clean('c1', 'plain')] },
    imports: { cases: [imp('i1', 'good')] },
  };
  const result = runEval(data, stub(), CONFIG, () => 0);
  assert.deepEqual(result.sizes, { descriptions: { en: 1, ru: 1 }, seeded: 1, clean: 1, imports: 1 });
  assert.equal(result.stability.rate, 1);
  assert.equal(result.timing.build.n, 4);
  assert.ok(result.topErrors.length >= 0);
});

test('runEval with one run still reports stability', () => {
  const data = { descriptions: [descriptions([gold('a', 'ok')])], check: { cases: [] }, imports: { cases: [] } };
  assert.equal(runEval(data, stub(), { ...CONFIG, stabilityRuns: 1 }, () => 0).stability.rate, 1);
});

test('runEval notices an answer that changes between runs', () => {
  let calls = 0;
  const flaky = stub({ detect: () => ({ ranking: [calls++ % 2 === 0 ? 'bpmn' : 'gost'], confidence: 0.5 }) });
  const data = { descriptions: [descriptions([gold('a', 'ok')])], check: { cases: [] }, imports: { cases: [] } };
  assert.ok(runEval(data, flaky, CONFIG, () => 0).stability.rate < 1);
});
