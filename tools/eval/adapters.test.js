import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build, detect, graphOfCode, importCode, notations, review, roundTrip } from './adapters.js';

test('notations are the five that the builders can write', () => {
  assert.deepEqual([...notations].sort(), ['bpmn', 'dfd', 'erd', 'gost', 'uml-sequence']);
});

test('detect ranks only buildable notations and gives the certainty of the best', () => {
  const result = detect('Customer has many orders. Order contains many items.', 'en');
  assert.equal(result.ranking[0], 'erd');
  assert.ok(result.confidence > 0);
  assert.ok(result.ranking.every((key) => notations.includes(key)));
});

test('detect of a text with no signal gives an empty ranking and zero certainty', () => {
  const result = detect('xyz', 'en');
  assert.deepEqual(result.ranking, []);
  assert.equal(result.confidence, 0);
});

test('build gives the code of a description and counts the validator errors', () => {
  const result = build('First the clerk checks the order. Then the clerk ships the goods.', 'en', 'bpmn');
  assert.equal(result.ok, true);
  assert.equal(result.notation, 'bpmn');
  assert.equal(result.valid, true);
  assert.equal(result.errors, 0);
  assert.match(result.dsl, /^diagram bpmn/);
});

test('build tells why nothing was built', () => {
  assert.deepEqual(build('', 'en'), { ok: false, reason: 'empty', notation: null });
  assert.equal(build('hello', 'en', 'erd').reason, 'nothing-found');
});

test('graphOfCode and review read a diagram code', () => {
  const code = 'diagram bpmn "T"\nstart s\ntask a "A"\nend e\nflow s -> a\nflow a -> e';
  assert.equal(graphOfCode(code).elements.length, 1);
  const result = review(code);
  assert.equal(result.notation, 'bpmn');
  assert.deepEqual(
    result.issues.filter((issue) => issue.severity !== 'info'),
    [],
  );
  assert.equal(typeof result.questions, 'number');
  assert.ok(review('diagram bpmn "T"\ntask a "A"\nflow a -> b').issues.some((issue) => issue.rule === 'unknown-ref'));
});

test('importCode reads Mermaid and refuses what it cannot read', () => {
  const ok = importCode('graph TD\nA[Start] --> B[Done]');
  assert.equal(ok.ok, true);
  assert.equal(ok.valid, true);
  assert.equal(ok.graph.relations.length, 1);
  assert.deepEqual(importCode('digraph G { a -> b }'), { ok: false, reason: 'unknown' });
});

test('roundTrip exports a code to Mermaid and imports it again', () => {
  const result = roundTrip('diagram bpmn "T"\nstart s\ntask a "Check order"\ntask b "Ship goods"\nend e\nflow s -> a\nflow a -> b\nflow b -> e');
  assert.equal(result.first.elements.length, 2);
  assert.equal(result.back.ok, true);
});
