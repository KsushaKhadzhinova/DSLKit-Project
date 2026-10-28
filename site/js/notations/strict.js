import { problem } from './common.js';

// Strict conformance rules that every notation shares, on top of the rules of the notation itself.
// A rule here never replaces a rule of the notation: it catches what a hand-written or hand-drawn diagram most often gets wrong.

// Notations whose flows go from one element to another, so an element that points at itself is a mistake.
const NO_SELF_LOOP = new Set([
  'dfd',
  'bpmn',
  'idef3',
  'gost',
  'uml-activity',
  'uml-usecase',
  'uml-package',
  'orgchart',
  'mindmap',
  'dag',
  'c4',
  'network',
  'decision',
  'epc',
]);

const POSITION = /^-?\d+(?:\.\d+)?x-?\d+(?:\.\d+)?$/;
const key = (edge) => `${edge.from}\u0000${edge.to}\u0000${edge.kind}\u0000${edge.label}`;

const graphRules = (notation, model) => {
  const out = [];
  model.nodes.forEach((node) => {
    if (typeof node.attrs.pos === 'string' && !POSITION.test(node.attrs.pos))
      out.push(problem(node.line, 'error', 'strict-pos', { id: node.id, value: node.attrs.pos }));
    if (node.attrs.pos === true) out.push(problem(node.line, 'error', 'strict-pos', { id: node.id, value: '' }));
  });
  const lower = new Map();
  model.nodes.forEach((node) => {
    const same = lower.get(node.id.toLowerCase());
    if (same && same.id !== node.id) out.push(problem(node.line, 'warning', 'strict-id-case', { id: node.id, other: same.id }));
    else lower.set(node.id.toLowerCase(), node);
  });
  const labels = new Map();
  model.nodes.forEach((node) => {
    const at = `${node.kind}\u0000${node.label.trim().toLowerCase()}`;
    const first = labels.get(at);
    if (first && node.label !== node.id && node.label.trim().length >= 3)
      out.push(problem(node.line, 'warning', 'strict-dup-label', { id: node.id, other: first.id, label: node.label }));
    else labels.set(at, node);
  });
  const seen = new Set();
  model.edges.forEach((edge) => {
    if (seen.has(key(edge))) out.push(problem(edge.line, 'warning', 'strict-dup-edge', { from: edge.from, to: edge.to }));
    seen.add(key(edge));
    if (edge.from === edge.to && NO_SELF_LOOP.has(notation)) out.push(problem(edge.line, 'error', 'strict-self-loop', { id: edge.from }));
  });
  if (notation === 'dfd') {
    const kinds = new Map(model.nodes.map((node) => [node.id, node.kind]));
    model.nodes
      .filter((node) => node.kind === 'store')
      .forEach((node) => {
        const ins = model.edges.filter((edge) => edge.to === node.id && kinds.get(edge.from) === 'process').length;
        const outs = model.edges.filter((edge) => edge.from === node.id && kinds.get(edge.to) === 'process').length;
        if (ins > 0 && outs === 0) out.push(problem(node.line, 'warning', 'strict-store-write-only', { id: node.id }));
        if (outs > 0 && ins === 0) out.push(problem(node.line, 'warning', 'strict-store-read-only', { id: node.id }));
      });
  }
  return out;
};

const idef0Rules = (model) => {
  const out = [];
  const seen = new Set();
  model.arrows.forEach((arrow, index) => {
    const line = model.arrowLines[index];
    const id = `${arrow.from}.${arrow.fromPort || 'output'}->${arrow.to}.${arrow.toPort || 'input'}`;
    if (seen.has(id)) out.push(problem(line, 'warning', 'strict-dup-edge', { from: arrow.from, to: arrow.to }));
    seen.add(id);
    if (arrow.from === arrow.to) out.push(problem(line, 'warning', 'strict-idef0-feedback', { id: arrow.from }));
  });
  const numbers = model.boxes
    .map((box) => /^A(\d+)$/.exec(box.id))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b);
  numbers.forEach((n, at) => {
    if (at > 0 && n !== numbers[at - 1] + 1 && n !== numbers[at - 1])
      out.push(
        problem(model.boxLines[model.boxes.findIndex((box) => box.id === `A${n}`)], 'warning', 'strict-idef0-gap', {
          id: `A${n}`,
          previous: `A${numbers[at - 1]}`,
        }),
      );
  });
  model.boxes.forEach((box, index) => {
    ['input', 'control', 'output', 'mechanism'].forEach((port) => {
      const items = box.ports[port];
      if (new Set(items.map((item) => item.toLowerCase())).size !== items.length)
        out.push(problem(model.boxLines[index], 'warning', 'strict-idef0-port-dup', { id: box.id, port }));
    });
  });
  return out;
};

export const strictProblems = (notation, model) => {
  if (Array.isArray(model.nodes) && Array.isArray(model.edges)) return graphRules(notation, model);
  if (notation === 'idef0' && Array.isArray(model.boxes)) return idef0Rules(model);
  return [];
};
