import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDiagram } from '../../site/js/notations/index.js';
import { goldGraph, toGraph } from './graph.js';

const graphOf = (lines) => toGraph(parseDiagram(lines.join('\n')));

test('toGraph drops start and end and keeps typed steps and flows', () => {
  const graph = graphOf([
    'diagram bpmn "T"',
    'start s "Go"',
    'task t1 "Check"',
    'exclusive g1 "Ok?"',
    'task t2 "Ship"',
    'end e "Done"',
    'flow s -> t1',
    'flow t1 -> g1',
    'flow g1 -> t2 "yes"',
    'flow t2 -> e',
  ]);
  assert.deepEqual(graph.elements, [
    { label: 'Check', type: '' },
    { label: 'Ok?', type: 'd' },
    { label: 'Ship', type: '' },
  ]);
  assert.deepEqual(graph.relations, [
    [0, 1],
    [1, 2],
  ]);
});

test('toGraph lets the flows pass through a gateway that has no text', () => {
  const graph = graphOf([
    'diagram bpmn "T"',
    'start s',
    'task a "A"',
    'task b "B"',
    'exclusive m',
    'task c "C"',
    'end e',
    'flow s -> a',
    'flow s -> b',
    'flow a -> m',
    'flow b -> m',
    'flow m -> c',
    'flow c -> e',
  ]);
  assert.equal(graph.elements.length, 3);
  assert.deepEqual(graph.relations.sort(), [
    [0, 2],
    [1, 2],
  ]);
});

test('toGraph types stores, external entities and participants', () => {
  const dfd = graphOf(['diagram dfd "T"', 'entity Client', 'process 1 "Work"', 'store D1 "Data"', 'flow Client -> 1 "x"', 'flow 1 -> D1 "y"']);
  assert.deepEqual(
    dfd.elements.map((item) => item.type),
    ['a', '', 's'],
  );
  const sequence = graphOf(['diagram uml sequence "T"', 'actor A', 'participant B', 'A -> B : hi']);
  assert.deepEqual(
    sequence.elements.map((item) => item.type),
    ['a', 'a'],
  );
});

test('goldGraph reads typed elements and chains of relations', () => {
  const gold = goldGraph({ el: ['Step', 'd:Is it?', 'a:Client', 's:Store'], rel: '0-1-2 2-3' });
  assert.deepEqual(gold.elements, [
    { label: 'Step', type: '' },
    { label: 'Is it?', type: 'd' },
    { label: 'Client', type: 'a' },
    { label: 'Store', type: 's' },
  ]);
  assert.deepEqual(gold.relations, [
    [0, 1],
    [1, 2],
    [2, 3],
  ]);
});

test('goldGraph accepts an empty list of relations', () => {
  assert.deepEqual(goldGraph({ el: ['A'], rel: '' }).relations, []);
});
