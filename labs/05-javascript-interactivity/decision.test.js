import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDiagram } from '../../site/js/notations/index.js';
import {
  CR_LIMIT,
  SAATY_SCALE,
  ahp,
  ahpPriorities,
  explainResult,
  matrixFromWeights,
  normalizeWeights,
  problemErrors,
  rank,
  reciprocal,
  sensitivity,
  solve,
  topsis,
  weightedSum,
} from '../../site/js/decision/methods.js';
import { methodName, toDsl, toMarkdown } from '../../site/js/decision/report.js';
import { createDecisionStore } from '../../site/js/decision/store.js';
import { TASKS, TASK_KEYS, taskProblem } from '../../site/js/decision/tasks.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const problem = {
  title: 'Phones',
  criteria: [
    { name: 'Price', weight: 5, direction: 'min' },
    { name: 'Camera', weight: 3, direction: 'max' },
    { name: 'Battery', weight: 2, direction: 'max' },
  ],
  alternatives: [
    { name: 'A', scores: [300, 8, 7] },
    { name: 'B', scores: [500, 9, 9] },
    { name: 'C', scores: [400, 7, 8] },
  ],
};

test('the weights are normalised, and zero weights fall back to equal ones', () => {
  assert.deepEqual(normalizeWeights([1, 1, 2]), [0.25, 0.25, 0.5]);
  assert.deepEqual(normalizeWeights([0, 0]), [0.5, 0.5]);
});

test('a problem is checked before it is solved', () => {
  assert.deepEqual(problemErrors(problem), []);
  assert.deepEqual(problemErrors(null), ['criteria', 'alternatives']);
  assert.deepEqual(problemErrors({ criteria: [], alternatives: [] }), ['criteria', 'alternatives']);
  assert.deepEqual(problemErrors({ ...problem, criteria: [{ name: 'x', weight: -1, direction: 'max' }, ...problem.criteria.slice(1)] }), ['criterion']);
  assert.deepEqual(problemErrors({ ...problem, criteria: problem.criteria.map((item) => ({ ...item, direction: 'up' })) }), ['criterion']);
  assert.deepEqual(problemErrors({ ...problem, alternatives: [{ name: 'A', scores: [1] }, problem.alternatives[1]] }), ['scores']);
  assert.deepEqual(problemErrors({ ...problem, alternatives: [{ name: 'A', scores: [1, 2, NaN] }, problem.alternatives[1]] }), ['scores']);
  assert.deepEqual(problemErrors({ ...problem, criteria: problem.criteria.map((item) => ({ ...item, weight: 0 })) }), ['weights']);
  assert.deepEqual(solve({ criteria: [] }), { ok: false, errors: ['criteria', 'alternatives'] });
});

test('the weighted sum scales the criteria and honours the direction', () => {
  const scores = weightedSum(problem);
  assert.equal(scores.length, 3);
  assert.equal(scores[0], 0.65);
  assert.equal(scores[1], 0.5);
  assert.equal(scores[2], 0.35);
  assert.deepEqual(weightedSum({ ...problem, alternatives: problem.alternatives.map((item) => ({ ...item, scores: [1, 1, 1] })) }), [1, 1, 1]);
  assert.deepEqual(weightedSum(problem, [1, 0, 0]), [1, 0, 0.5]);
});

test('TOPSIS gives closeness to the ideal alternative', () => {
  const scores = topsis(problem);
  assert.ok(scores.every((value) => value >= 0 && value <= 1));
  assert.equal(rank(problem, scores)[0].name, 'A');
  const equal = topsis({ ...problem, alternatives: problem.alternatives.map((item) => ({ ...item, scores: [1, 1, 1] })) });
  assert.deepEqual(equal, [1, 1, 1]);
  assert.deepEqual(topsis({ ...problem, alternatives: problem.alternatives.map((item) => ({ ...item, scores: [0, 0, 0] })) }), [1, 1, 1]);
});

test('AHP finds the weights, the consistency index and the consistency ratio', () => {
  const consistent = ahpPriorities(matrixFromWeights([0.5, 0.25, 0.25]));
  assert.deepEqual(consistent.priorities, [0.5, 0.25, 0.25]);
  assert.equal(consistent.consistent, true);
  assert.equal(consistent.cr, 0);
  const saaty = ahpPriorities([
    [1, 3, 5],
    [1 / 3, 1, 3],
    [1 / 5, 1 / 3, 1],
  ]);
  assert.deepEqual(saaty.priorities, [0.637, 0.2583, 0.1047]);
  assert.equal(saaty.lambda, 3.0385);
  assert.equal(saaty.cr, 0.0332);
  const bad = ahpPriorities([
    [1, 9, 1 / 9],
    [1 / 9, 1, 9],
    [9, 1 / 9, 1],
  ]);
  assert.ok(bad.cr > CR_LIMIT);
  assert.equal(bad.consistent, false);
  assert.deepEqual(
    ahpPriorities([
      [1, 2],
      [0.5, 1],
    ]).cr,
    0,
  );
  assert.equal(ahpPriorities([[1]]).priorities[0], 1);
  assert.equal(SAATY_SCALE.length, 17);
  assert.deepEqual(
    reciprocal([
      [0, 3],
      [0, 0],
    ]),
    [
      [1, 3],
      [1 / 3, 1],
    ],
  );
});

test('AHP over a problem warns when the comparisons are inconsistent', () => {
  const result = solve(problem, 'ahp');
  assert.equal(result.ok, true);
  assert.equal(result.method, 'ahp');
  assert.equal(result.warning, false);
  assert.equal(result.ranking.length, 3);
  const bad = solve(problem, 'ahp', [
    [1, 9, 1 / 9],
    [1 / 9, 1, 9],
    [9, 1 / 9, 1],
  ]);
  assert.equal(bad.warning, true);
  assert.ok(bad.cr > 0.1);
  assert.ok(
    ahp({ ...problem, alternatives: problem.alternatives.map((item) => ({ ...item, scores: [0, 0, 0] })) }, matrixFromWeights([1, 1, 1])).scores.length === 3,
  );
});

test('solve ranks by every method and keeps the table order for equal scores', () => {
  for (const method of ['wsm', 'topsis', 'ahp']) {
    const result = solve(problem, method);
    assert.equal(result.ranking[0].place, 1);
    assert.equal(result.weights.length, 3);
  }
  assert.equal(solve(problem).method, 'wsm');
  assert.deepEqual(
    rank(problem, [0.5, 0.5, 0.1]).map((item) => item.name),
    ['A', 'B', 'C'],
  );
});

test('sensitivity shows where the winner changes when a weight moves', () => {
  const result = sensitivity(problem);
  assert.equal(result.length, 3);
  const price = result.find((item) => item.criterion === 'Price');
  assert.equal(price.points.length, 11);
  assert.equal(price.points.at(-1).winner, 'A');
  const camera = result.find((item) => item.criterion === 'Camera');
  assert.equal(camera.stable, false);
  assert.ok(camera.changes.length > 0);
  const topsisResult = sensitivity(problem, 'topsis', 4);
  assert.equal(topsisResult[0].points.length, 5);
  const single = sensitivity({
    criteria: [{ name: 'Only', weight: 1, direction: 'max' }],
    alternatives: [
      { name: 'A', scores: [1] },
      { name: 'B', scores: [2] },
    ],
  });
  assert.equal(single[0].stable, true);
  const zero = sensitivity({ ...problem, criteria: problem.criteria.map((item, index) => ({ ...item, weight: index === 0 ? 1 : 0 })) });
  assert.equal(zero.length, 3);
});

test('the explanation names the winner, the margin and the leading criteria', () => {
  const result = solve(problem, 'wsm');
  assert.match(explainResult(problem, result, 'ru'), /Лучшая альтернатива — «A»/);
  assert.match(explainResult(problem, result, 'en'), /The best alternative is "A"/);
  assert.match(explainResult(problem, result, 'en'), /leads in: Price/);
  const flat = solve(
    { ...problem, alternatives: problem.alternatives.map((item, index) => ({ ...item, scores: index === 0 ? [1, 1, 1] : [2, 2, 2] })) },
    'wsm',
  );
  assert.doesNotMatch(explainResult(problem, { ...flat, ranking: flat.ranking, weights: [0, 0, 0] }, 'en'), /leads in/);
});

test('a criterion with a zero weight does not break AHP and the Russian text has no leaders when none lead', () => {
  const zero = { ...problem, criteria: problem.criteria.map((item, index) => ({ ...item, weight: index === 0 ? 0 : 1 })) };
  assert.equal(solve(zero, 'ahp').ok, true);
  const dominant = {
    ...problem,
    alternatives: [
      { name: 'A', scores: [100, 9, 9] },
      { name: 'B', scores: [200, 5, 5] },
    ],
  };
  assert.match(explainResult(dominant, solve(dominant), 'en'), /leads in: Price, Camera/);
  const flat = solve(problem, 'wsm');
  assert.doesNotMatch(explainResult(problem, { ...flat, weights: [0, 0, 0] }, 'ru'), /Лидирует/);
});

test('the report is Markdown and a decision diagram that the parser accepts', () => {
  for (const lang of ['ru', 'en']) {
    const ahpResult = solve(problem, 'ahp');
    const md = toMarkdown(problem, ahpResult, lang);
    assert.match(md, /^# Phones/);
    assert.match(md, /\| 1 \| A \|/);
    assert.match(md, /CR/);
    const dsl = toDsl({ ...problem, title: 'Phones "best"' }, ahpResult);
    assert.deepEqual(
      parseDiagram(dsl).problems.filter((item) => item.severity === 'error'),
      [],
    );
  }
  const bad = solve(problem, 'ahp', [
    [1, 9, 1 / 9],
    [1 / 9, 1, 9],
    [9, 1 / 9, 1],
  ]);
  assert.match(toMarkdown(problem, bad, 'ru'), /больше 0,1/);
  assert.match(toMarkdown(problem, bad, 'en'), /above 0.1/);
  assert.doesNotMatch(toMarkdown(problem, solve(problem, 'wsm'), 'en'), /CR/);
  assert.match(toMarkdown({ ...problem, criteria: problem.criteria.map((item) => ({ ...item, name: 'a|b' })) }, solve(problem), 'en'), /a\/b/);
  assert.equal(methodName('topsis', 'en'), 'TOPSIS');
  assert.equal(methodName('wsm', 'ru'), 'Взвешенная сумма');
});

test('every ready task is solvable in both languages and its decision diagram is valid', () => {
  assert.deepEqual(TASK_KEYS, ['notation', 'engine', 'export', 'custom']);
  for (const key of TASK_KEYS) {
    for (const lang of ['ru', 'en']) {
      const task = taskProblem(key, lang);
      assert.equal(task.title, TASKS[key].title[lang]);
      for (const method of ['wsm', 'ahp', 'topsis']) {
        const result = solve(task, method);
        assert.equal(result.ok, true, `${key} ${method}`);
        assert.deepEqual(
          parseDiagram(toDsl(task, result)).problems.filter((item) => item.severity === 'error'),
          [],
        );
      }
    }
  }
  assert.equal(taskProblem('custom', 'xx').title, TASKS.custom.title.ru);
  const task = taskProblem('engine');
  task.alternatives[0].scores[0] = 0;
  assert.equal(TASKS.engine.alternatives[0].scores[0], 10);
});

test('the tasks are kept per user, the same name replaces the task, the list is limited', () => {
  let time = 1000;
  const storage = createStorage(createMemoryBackend());
  const store = createDecisionStore({ storage, now: () => time++ });
  const ann = { id: 'u1' };
  assert.deepEqual(store.list(ann), []);
  assert.deepEqual(store.save(ann, '  ', {}), { ok: false, error: 'name' });
  const first = store.save(ann, 'Phones', { a: 1 });
  assert.equal(first.ok, true);
  const again = store.save(ann, 'Phones', { a: 2 });
  assert.equal(again.entry.id, first.entry.id);
  assert.equal(store.list(ann).length, 1);
  assert.deepEqual(store.list(ann)[0].state, { a: 2 });
  assert.deepEqual(store.list(null), []);
  store.save(null, 'Guest task', {});
  assert.equal(store.list(null).length, 1);
  assert.equal(store.list(ann).length, 1);
  for (let i = 0; i < 40; i += 1) store.save(ann, `Task ${i}`, {});
  assert.equal(store.list(ann).length, 30);
  assert.equal(store.list(ann)[0].name, 'Task 39');
  assert.deepEqual(store.remove(ann, 'nope'), { ok: false, error: 'unknown' });
  assert.deepEqual(store.remove(ann, store.list(ann)[0].id), { ok: true });
  storage.set('decision-tasks.u1', 'broken');
  assert.deepEqual(store.list(ann), []);
  storage.set('decision-tasks.u1', [{ id: 5 }, { id: 'x', name: 'ok' }]);
  assert.equal(store.list(ann).length, 1);
  const refusing = { get: () => [{ id: 'x', name: 'n' }], set: () => false };
  const closed = createDecisionStore({ storage: refusing });
  assert.equal(closed.save(ann, 'N', {}).error, 'storage');
  assert.equal(closed.remove(ann, 'x').error, 'storage');
});
