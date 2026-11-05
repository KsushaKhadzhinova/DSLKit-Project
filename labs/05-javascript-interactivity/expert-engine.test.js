import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TEMPLATES, parseDiagram } from '../../site/js/notations/index.js';
import {
  THRESHOLD,
  answerQuestion,
  combineCf,
  conclusions,
  createFacts,
  explain,
  infer,
  nextQuestion,
  premiseCf,
  ruleProblems,
} from '../../site/js/expert/engine.js';
import { KB_NOTATION } from '../../site/js/expert/kb-notation.js';
import { KB_REVIEW } from '../../site/js/expert/kb-review.js';
import { extractFacts, factsFromDescription, normalize, rankNotations, reviewDiagram } from '../../site/js/expert/review.js';
import { createExpertStore } from '../../site/js/storage/expert.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const NL = String.fromCharCode(10);
const lines = (...rows) => rows.join(NL);

test('certainty factors combine like MYCIN and do not depend on the order', () => {
  assert.equal(combineCf(0.6, 0.5), 0.8);
  assert.equal(combineCf(0.5, 0.6), 0.8);
  assert.equal(combineCf(-0.6, -0.5), -0.8);
  assert.equal(combineCf(0.6, -0.4), 0.333);
  assert.equal(combineCf(0, 0.7), 0.7);
});

test('premises compare values with every operator and give 0 for an unknown fact', () => {
  const facts = createFacts({ n: 5, flag: true, off: { value: false, cf: 0.5 }, neg: { value: true, cf: -0.8 } });
  assert.equal(premiseCf({ fact: 'flag' }, facts), 1);
  assert.equal(premiseCf({ fact: 'off', value: false }, facts), 0.5);
  assert.equal(premiseCf({ fact: 'neg' }, facts), 0.8);
  assert.equal(premiseCf({ fact: 'missing' }, facts), 0);
  const check = (op, value) => premiseCf({ fact: 'n', op, value }, facts);
  assert.deepEqual([check('=', 5), check('!=', 5), check('>', 4), check('>=', 5), check('<', 5), check('<=', 5), check('>', 5)], [1, 0, 1, 1, 0, 1, 0]);
  assert.equal(premiseCf({ fact: 'n', op: '>', value: 0 }, facts), 1);
});

test('forward chaining fires rules in a chain, combines the support and keeps a trace', () => {
  const rules = [
    { id: 'a', if: [{ fact: 'x' }], then: { fact: 'y', cf: 0.8 }, reason: { ru: 'а', en: 'a' } },
    { id: 'b', if: [{ fact: 'y' }], then: { fact: 'z', cf: 0.5 }, reason: { ru: 'б', en: 'b' } },
    { id: 'c', if: [{ fact: 'x' }], then: { fact: 'y', cf: 0.5, value: true }, reason: { ru: 'в', en: 'c' } },
    { id: 'weak', if: [{ fact: 'w' }], then: { fact: 'q', cf: 0.9 }, reason: { ru: 'г', en: 'd' } },
  ];
  const { facts, trace } = infer(rules, { x: true, w: { value: true, cf: THRESHOLD / 2 } });
  assert.equal(facts.get('y').cf, 0.9);
  assert.equal(facts.get('z').cf, 0.45);
  assert.equal(facts.has('q'), false);
  assert.deepEqual(
    trace.map((step) => step.rule),
    ['a', 'c', 'b'],
  );
  assert.deepEqual(
    conclusions(facts, '').map((item) => item.fact),
    ['y', 'z'],
  );
  const reasons = explain(trace, 'z');
  assert.equal(reasons[0].rule, 'b');
  assert.equal(reasons[0].because[0].rule, 'a');
  assert.deepEqual(explain(trace, 'z', new Set(['z'])), []);
  assert.equal(infer(rules, new Map([['x', { value: true, cf: 1 }]])).trace.length, 3);
});

test('the engine asks about a missing fact, takes the answer and stops asking when nothing is useful', () => {
  const kb = KB_NOTATION;
  let facts = createFacts({});
  let { trace } = infer(kb.rules, facts);
  const first = nextQuestion(kb, facts, trace);
  assert.equal(first.fact, 'task');
  facts = answerQuestion(first, facts, 'process');
  assert.equal(facts.get('task:process').value, true);
  assert.equal(facts.get('task:data').value, false);
  ({ trace } = infer(kb.rules, facts));
  const second = nextQuestion(kb, facts, trace);
  assert.equal(second.fact, 'algorithm');
  facts = answerQuestion(second, facts, true);
  assert.equal(facts.get('algorithm').value, true);
  assert.equal(answerQuestion(second, facts, false).get('algorithm').value, false);
  let guard = 0;
  while (guard < 10) {
    ({ trace } = infer(kb.rules, facts));
    const question = nextQuestion(kb, facts, trace);
    if (question === null) break;
    facts = answerQuestion(question, facts, false);
    guard += 1;
  }
  assert.equal(nextQuestion(kb, facts, infer(kb.rules, facts).trace), null);
  const { ranking } = rankNotations(facts);
  assert.equal(ranking[0].key, 'gost');
  assert.ok(ranking.some((item) => item.key === 'bpmn'));
  const other = rankNotations(answerQuestion(second, facts, false)).ranking;
  assert.equal(other[0].key, 'bpmn');
});

test('a condition of a question hides it until the condition holds, an unused fact is not asked', () => {
  const kb = {
    rules: [{ id: 'r', if: [{ fact: 'a' }], then: { fact: 'b', cf: 1 }, reason: { ru: '', en: '' } }],
    questions: [
      { fact: 'z', ask: {} },
      { fact: 'a', when: { fact: 'c' }, ask: {} },
    ],
  };
  assert.equal(nextQuestion(kb, createFacts({}), []), null);
  assert.equal(nextQuestion(kb, createFacts({ c: true }), []).fact, 'a');
});

test('the structure of a rule is checked', () => {
  const good = KB_NOTATION.rules[0];
  assert.deepEqual(ruleProblems(good), []);
  assert.deepEqual(ruleProblems(null), ['rule']);
  assert.deepEqual(ruleProblems([]), ['rule']);
  assert.deepEqual(ruleProblems({}), ['id', 'if', 'then', 'reason']);
  assert.ok(ruleProblems({ ...good, id: '' }).includes('id'));
  assert.ok(ruleProblems({ ...good, if: [] }).includes('if'));
  assert.ok(ruleProblems({ ...good, if: [{ fact: 'a', op: '~' }] }).includes('if'));
  assert.ok(ruleProblems({ ...good, then: { fact: 'a', cf: 0 } }).includes('then'));
  assert.ok(ruleProblems({ ...good, then: { fact: 'a', cf: 2 } }).includes('then'));
  assert.ok(ruleProblems({ ...good, reason: { ru: 'a' } }).includes('reason'));
  assert.ok(ruleProblems({ ...good, priority: 'urgent' }).includes('priority'));
  assert.ok(ruleProblems({ ...good, text: { ru: 'a' } }).includes('text'));
  assert.deepEqual(ruleProblems({ ...good, priority: 'low', text: { ru: 'a', en: 'b' } }), []);
});

test('the rules of both bases are valid, have unique ids and texts in two languages', () => {
  for (const kb of [KB_NOTATION, KB_REVIEW]) {
    const ids = kb.rules.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
    kb.rules.forEach((item) => assert.deepEqual(ruleProblems(item), [], item.id));
    kb.rules.filter((item) => item.priority).forEach((item) => assert.ok(item.text.ru && item.text.en));
  }
  assert.equal(KB_REVIEW.rules.filter((item) => item.priority === undefined).length, 0);
});

test('a description gives facts of tasks and the notations follow from them', () => {
  const facts = factsFromDescription('Сначала клиент отправляет заказ, затем менеджер проверяет заказ. Если товара нет, то отказ.');
  assert.ok(facts['task:process'].cf > 0.5);
  const { ranking, trace } = rankNotations(createFacts(facts));
  assert.equal(ranking[0].key, 'bpmn');
  assert.ok(trace.length > 0);
  assert.deepEqual(factsFromDescription('zzz'), {});
  assert.ok(factsFromDescription('database table entity attribute storage relation data flow')['task:data'].cf <= 0.9);
});

test('the review finds the problems of a diagram with their lines', () => {
  const bad = lines(
    'diagram bpmn "Check"',
    'task t1 "Check the order and make sure that the customer has paid the whole sum"',
    'task T1 "Проверить заказ"',
    'task t2 "Проверить заказ"',
    'task t3 "Send the invoice"',
    'task t4 "Другое действие"',
    'flow t2 -> t3',
    'flow t3 -> t2',
  );
  const review = reviewDiagram(bad, 'en');
  const ids = review.recommendations.map((item) => item.id);
  for (const id of ['r-no-start', 'r-no-end', 'r-cycle-flow', 'r-dangling', 'r-duplicates', 'r-long-labels', 'r-mixed']) assert.ok(ids.includes(id), id);
  assert.equal(review.recommendations[0].priority, 'high');
  assert.match(review.recommendations.find((item) => item.id === 'r-long-labels').text, /lines: 2/);
  assert.ok(review.recommendations.every((item) => item.reason.length > 0 && !item.text.includes('{')));
  const ru = reviewDiagram(bad, 'ru');
  assert.match(ru.recommendations.find((item) => item.id === 'r-dangling').text, /строки/);
});

test('the review of an empty, single, broken, cyclic, big and deep diagram', () => {
  const ids = (code) => reviewDiagram(code, 'ru').recommendations.map((item) => item.id);
  assert.ok(ids('diagram dag "A"').includes('r-empty'));
  assert.ok(ids(lines('diagram dag "A"', 'task a "A"')).includes('r-single'));
  assert.ok(ids(lines('diagram dfd "A"', 'flow a -> b')).includes('r-errors'));
  assert.ok(ids(lines('diagram dag "A"', 'task a "A"', 'task b "B"', 'depend a -> b', 'depend b -> a')).includes('r-cycle-acyclic'));
  const many = (count) =>
    lines(
      'diagram dag "Chain"',
      ...Array.from({ length: count }, (_, i) => `task n${i} "Node ${i}"`),
      ...Array.from({ length: count - 1 }, (_, i) => `depend n${i} -> n${i + 1}`),
    );
  assert.ok(ids(many(30)).includes('r-big'));
  assert.ok(ids(many(30)).includes('r-deep'));
  assert.ok(ids(many(60)).includes('r-huge'));
  assert.ok(!ids(many(60)).includes('r-big'));
  assert.deepEqual(reviewDiagram(TEMPLATES.erd, 'en').recommendations, []);
});

test('the facts are taken from every shape of model', () => {
  const shapes = ['idef0', 'erd', 'uml-class', 'uml-sequence', 'uml-timing', 'graph', 'bpmn'];
  for (const key of shapes) {
    const facts = extractFacts(parseDiagram(TEMPLATES[key]));
    assert.ok(facts.nodes > 0, key);
  }
  const model = parseDiagram(TEMPLATES.idef0);
  assert.equal(normalize(model).edges.length, 2);
  assert.equal(extractFacts(parseDiagram(lines('diagram graph "G"', 'vertex A', 'vertex B'))).dangling, 2);
  assert.equal(extractFacts(parseDiagram(lines('diagram erd "G"', 'entity A {', 'id: int pk', '}', 'entity a {', 'id: int pk', '}'))).caseIds, 1);
});

test('only a developer can change a rule, the change is checked and can be reset', () => {
  const storage = createStorage(createMemoryBackend());
  const store = createExpertStore({ storage, bases: { notation: KB_NOTATION } });
  const developer = { role: 'developer' };
  const id = KB_NOTATION.rules[0].id;
  const changed = { ...KB_NOTATION.rules[0], then: { fact: KB_NOTATION.rules[0].then.fact, cf: 0.1 } };
  assert.deepEqual(store.set({ role: 'user' }, 'notation', id, changed), { ok: false, error: 'forbidden' });
  assert.deepEqual(store.set(null, 'notation', id, changed), { ok: false, error: 'forbidden' });
  assert.deepEqual(store.set(developer, 'notation', 'nope', changed), { ok: false, error: 'unknown' });
  assert.equal(store.set(developer, 'notation', id, { ...changed, id: 'other' }).error, 'invalid');
  assert.equal(store.set(developer, 'notation', id, { id }).error, 'invalid');
  assert.deepEqual(store.set(developer, 'notation', id, changed), { ok: true });
  assert.equal(store.rules('notation')[0].then.cf, 0.1);
  assert.equal(store.edited('notation', id), true);
  assert.equal(store.edited('notation', KB_NOTATION.rules[1].id), false);
  assert.deepEqual(store.reset({ role: 'user' }, 'notation', id), { ok: false, error: 'forbidden' });
  assert.deepEqual(store.reset(developer, 'notation', id), { ok: true, was: true });
  assert.equal(store.rules('notation')[0].then.cf, KB_NOTATION.rules[0].then.cf);
  assert.deepEqual(store.reset(developer, 'notation', id), { ok: true, was: false });
  store.set(developer, 'notation', id, changed);
  assert.deepEqual(store.resetAll({ role: 'admin' }), { ok: false, error: 'forbidden' });
  assert.deepEqual(store.resetAll(developer), { ok: true });
  assert.equal(store.edited('notation', id), false);
  assert.deepEqual(store.rules('missing'), []);
  assert.equal(store.original('notation', id).id, id);
});

test('the store survives a damaged value and a storage that refuses to write', () => {
  const backend = createMemoryBackend();
  const storage = createStorage(backend);
  const store = createExpertStore({ storage, bases: { notation: KB_NOTATION } });
  storage.set('expert-rules', [1, 2]);
  assert.equal(store.rules('notation').length, KB_NOTATION.rules.length);
  storage.set('expert-rules', { 'notation/n-data': { broken: true } });
  assert.equal(store.edited('notation', 'n-data'), false);
  const refusing = { get: () => ({}), set: () => false };
  const closed = createExpertStore({ storage: refusing, bases: { notation: KB_NOTATION } });
  const developer = { role: 'developer' };
  const id = KB_NOTATION.rules[0].id;
  assert.equal(closed.set(developer, 'notation', id, KB_NOTATION.rules[0]).error, 'storage');
  assert.equal(closed.reset(developer, 'notation', id).error, 'storage');
  assert.equal(closed.resetAll(developer).error, 'storage');
});

test('odd models and rules: a loop of rules, equal strengths, a link to nothing, a model without a notation', () => {
  const loop = [
    { id: 'p', if: [{ fact: 'q' }], then: { fact: 'r', cf: 0.5 }, reason: { ru: '', en: '' } },
    { id: 'q', if: [{ fact: 'r' }], then: { fact: 'q', cf: 0.5 }, reason: { ru: '', en: '' } },
    { id: 's', if: [{ fact: 's' }], then: { fact: 's', cf: 0.5 }, reason: { ru: '', en: '' } },
  ];
  assert.equal(infer(loop, { q: true }).trace.length, 1);
  const tie = [
    { id: 'b', if: [{ fact: 'x' }], then: { fact: 'k:b', cf: 0.5 }, reason: { ru: '', en: '' } },
    { id: 'a', if: [{ fact: 'x' }], then: { fact: 'k:a', cf: 0.5 }, reason: { ru: '', en: '' } },
  ];
  assert.deepEqual(
    conclusions(infer(tie, { x: true }).facts, 'k:').map((item) => item.fact),
    ['k:a', 'k:b'],
  );
  const facts = extractFacts({ problems: [], nodes: [{ id: 'a' }], edges: [{ from: 'a', to: 'zz' }] });
  assert.equal(facts.notation, 'idef0');
  assert.equal(facts.nodes, 1);
  assert.equal(facts.label, undefined);
});
