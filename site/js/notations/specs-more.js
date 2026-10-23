import { findCycle, problem } from './common.js';
import { defineGraph, plain } from './graph.js';
import { degrees, isolated, kindMap } from './specs.js';
import { fixed, sizer } from './svg.js';

const still = (look) => () => look;
const LINE = still({});
const ARROW = still({ end: 'arrow' });

const incoming = (model) => {
  const into = new Map(model.nodes.map((node) => [node.id, []]));
  model.edges.forEach((edge) => into.get(edge.to).push(edge));
  return into;
};

// Nodes that nothing leads to, and the nodes that can be reached from them.
const reachableFrom = (model, startIds) => {
  const seen = new Set(startIds);
  const queue = [...seen];
  while (queue.length > 0) {
    const id = queue.shift();
    model.edges
      .filter((edge) => edge.from === id)
      .forEach((edge) => {
        if (!seen.has(edge.to)) {
          seen.add(edge.to);
          queue.push(edge.to);
        }
      });
  }
  return seen;
};

const loopProblems = (model, code) => {
  const cycle = findCycle(model.edges);
  return cycle.length > 0 ? [problem(cycle[0].line, 'error', code, { path: cycle.map((edge) => edge.from).join(' → ') })] : [];
};

// ---------- Mind map ----------
export const mindmap = defineGraph({
  notation: 'mindmap',
  nodes: { root: 'root', topic: 'topic' },
  edges: { branch: 'branch' },
  kinds: {
    root: {
      shape: 'ellipse',
      size: sizer(140, 64, 'ellipse', 14),
      text: plain,
      dot: 'shape=ellipse, style=filled, fillcolor="#e8efff"',
      mermaid: ['((', '))'],
      plantuml: 'usecase',
    },
    topic: { shape: 'pill', size: sizer(100, 36, 'box', 18), text: plain, dot: 'shape=box, style=rounded', mermaid: ['([', '])'], plantuml: 'rectangle' },
  },
  edgeKinds: { branch: { look: LINE, dot: 'arrowhead=none', mermaid: '---', plantuml: '--' } },
  validate: (model) => {
    const out = [];
    const roots = model.nodes.filter((node) => node.kind === 'root');
    if (model.nodes.length > 0 && roots.length !== 1) out.push(problem(roots[1]?.line ?? 1, 'error', 'mm-root', { n: roots.length }));
    const into = incoming(model);
    model.nodes
      .filter((node) => node.kind === 'topic' && into.get(node.id).length > 1)
      .forEach((node) => out.push(problem(node.line, 'error', 'mm-parent', { id: node.id })));
    if (roots.length === 1) {
      const seen = reachableFrom(model, [roots[0].id]);
      model.nodes.filter((node) => !seen.has(node.id)).forEach((node) => out.push(problem(node.line, 'error', 'mm-unreachable', { id: node.id })));
    }
    return [...out, ...loopProblems(model, 'mm-cycle')];
  },
});

// ---------- Organisation chart ----------
export const orgchart = defineGraph({
  notation: 'orgchart',
  nodes: { unit: 'unit', person: 'person' },
  edges: { leads: 'leads' },
  kinds: {
    unit: { shape: 'rect', size: sizer(130, 46, 'box', 18), text: plain, dot: 'shape=box, style=bold', mermaid: ['[', ']'], plantuml: 'rectangle' },
    person: { shape: 'rounded', size: sizer(120, 46, 'box', 16), text: plain, dot: 'shape=box, style=rounded', mermaid: ['(', ')'], plantuml: 'card' },
  },
  edgeKinds: { leads: { look: LINE, dot: 'arrowhead=none', mermaid: '---', plantuml: '--' } },
  validate: (model) => {
    const out = [];
    const into = incoming(model);
    model.nodes.filter((node) => into.get(node.id).length > 1).forEach((node) => out.push(problem(node.line, 'warning', 'org-many-bosses', { id: node.id })));
    const tops = model.nodes.filter((node) => into.get(node.id).length === 0 && model.edges.some((edge) => edge.from === node.id));
    if (tops.length > 1) out.push(problem(tops[1].line, 'warning', 'org-many-tops', { n: tops.length }));
    return [...out, ...loopProblems(model, 'org-cycle'), ...isolated(model, [])];
  },
});

// ---------- C4 model (context and containers) ----------
export const c4 = defineGraph({
  notation: 'c4',
  nodes: { person: 'person', system: 'system', external: 'external', container: 'container', database: 'database' },
  edges: { uses: 'uses' },
  kinds: {
    person: { shape: 'actor', size: fixed(70, 84, 'box', 12), text: plain, dot: 'shape=box', mermaid: ['([', '])'], plantuml: 'actor' },
    system: {
      shape: 'rounded',
      size: sizer(150, 64, 'box', 20),
      text: plain,
      dot: 'shape=box, style="rounded,filled", fillcolor="#e8efff"',
      mermaid: ['[', ']'],
      plantuml: 'rectangle',
    },
    external: {
      shape: 'rect',
      size: sizer(150, 64, 'box', 20),
      text: plain,
      dot: 'shape=box, style=filled, fillcolor="#f1f5f9"',
      mermaid: ['[', ']'],
      plantuml: 'rectangle',
    },
    container: { shape: 'rounded', size: sizer(140, 56, 'box', 18), text: plain, dot: 'shape=box, style=rounded', mermaid: ['[', ']'], plantuml: 'component' },
    database: { shape: 'cylinder', size: sizer(120, 60, 'box', 16), text: plain, dot: 'shape=cylinder', mermaid: ['[(', ')]'], plantuml: 'database' },
  },
  edgeKinds: { uses: { look: ARROW, dot: 'arrowhead=normal', mermaid: '-->', plantuml: '-->' } },
  validate: (model) => {
    const out = [];
    const kinds = kindMap(model);
    model.edges.forEach((edge) => {
      if (edge.label === '') out.push(problem(edge.line, 'warning', 'c4-unlabelled', { from: edge.from, to: edge.to }));
      if (kinds.get(edge.from) === 'database') out.push(problem(edge.line, 'warning', 'c4-database-source', { id: edge.from }));
    });
    return [...out, ...isolated(model, [])];
  },
});

// ---------- Network diagram ----------
export const network = defineGraph({
  notation: 'network',
  nodes: { cloud: 'cloud', router: 'router', switch: 'switch', server: 'server', client: 'client', database: 'database' },
  edges: { link: 'link' },
  kinds: {
    cloud: { shape: 'ellipse', size: sizer(110, 56, 'ellipse', 14), text: plain, dot: 'shape=ellipse, style=dashed', mermaid: ['((', '))'], plantuml: 'cloud' },
    router: { shape: 'hexagon', size: sizer(100, 48, 'box', 14), text: plain, dot: 'shape=hexagon', mermaid: ['{{', '}}'], plantuml: 'node' },
    switch: { shape: 'rect', size: sizer(100, 40, 'box', 14), text: plain, dot: 'shape=box, style=bold', mermaid: ['[', ']'], plantuml: 'rectangle' },
    server: { shape: 'box3d', size: sizer(110, 50, 'box', 14), text: plain, dot: 'shape=box3d', mermaid: ['[', ']'], plantuml: 'node' },
    client: { shape: 'rounded', size: sizer(100, 44, 'box', 14), text: plain, dot: 'shape=box, style=rounded', mermaid: ['(', ')'], plantuml: 'agent' },
    database: { shape: 'cylinder', size: sizer(100, 56, 'box', 14), text: plain, dot: 'shape=cylinder', mermaid: ['[(', ')]'], plantuml: 'database' },
  },
  edgeKinds: { link: { look: LINE, dot: 'arrowhead=none', mermaid: '---', plantuml: '--' } },
  validate: (model) => {
    const out = [];
    const kinds = kindMap(model);
    model.edges.forEach((edge) => {
      if (kinds.get(edge.from) === 'client' && kinds.get(edge.to) === 'client')
        out.push(problem(edge.line, 'warning', 'net-client-client', { from: edge.from, to: edge.to }));
    });
    return [...out, ...isolated(model, [])];
  },
});

// ---------- Decision tree ----------
export const decision = defineGraph({
  notation: 'decision',
  nodes: { question: 'question', outcome: 'outcome' },
  edges: { answer: 'answer' },
  kinds: {
    question: { shape: 'diamond', size: sizer(130, 70, 'diamond', 14), text: plain, dot: 'shape=diamond', mermaid: ['{', '}'], plantuml: 'usecase' },
    outcome: {
      shape: 'pill',
      size: sizer(110, 40, 'box', 18),
      text: plain,
      dot: 'shape=box, style="rounded,filled", fillcolor="#e8efff"',
      mermaid: ['([', '])'],
      plantuml: 'rectangle',
    },
  },
  edgeKinds: { answer: { look: ARROW, dot: 'arrowhead=normal', mermaid: '-->', plantuml: '-->' } },
  validate: (model) => {
    const out = [];
    const into = incoming(model);
    const kinds = kindMap(model);
    const degree = degrees(model);
    model.edges.forEach((edge) => {
      if (kinds.get(edge.from) === 'outcome') out.push(problem(edge.line, 'error', 'dt-outcome-out', { id: edge.from }));
      else if (edge.label === '') out.push(problem(edge.line, 'error', 'dt-answer-label', { from: edge.from, to: edge.to }));
    });
    model.nodes.forEach((node) => {
      if (node.kind === 'question' && degree.get(node.id).out === 1) out.push(problem(node.line, 'warning', 'dt-branches', { id: node.id }));
      if (into.get(node.id).length > 1) out.push(problem(node.line, 'error', 'dt-many-parents', { id: node.id }));
    });
    const roots = model.nodes.filter((node) => into.get(node.id).length === 0 && degree.get(node.id).out > 0);
    if (roots.length > 1) out.push(problem(roots[1].line, 'warning', 'dt-roots', { n: roots.length }));
    return [...out, ...loopProblems(model, 'dt-cycle'), ...isolated(model, [])];
  },
});

// ---------- Event-driven process chain (eEPC) ----------
const connector = (shape, mermaid) => ({
  shape,
  size: fixed(44, 44, 'diamond', 6),
  text: plain,
  dot: 'shape=diamond, width=0.5, height=0.5',
  mermaid,
  plantuml: 'rectangle',
});
export const epc = defineGraph({
  notation: 'epc',
  nodes: { event: 'event', function: 'function', and: 'and', or: 'or', xor: 'xor' },
  edges: { flow: 'flow' },
  kinds: {
    event: {
      shape: 'hexagon',
      size: sizer(130, 50, 'box', 16),
      text: plain,
      dot: 'shape=hexagon, style=filled, fillcolor="#fde7ee"',
      mermaid: ['{{', '}}'],
      plantuml: 'hexagon',
    },
    function: {
      shape: 'rounded',
      size: sizer(130, 56, 'box', 16),
      text: plain,
      dot: 'shape=box, style="rounded,filled", fillcolor="#e1f5e8"',
      mermaid: ['(', ')'],
      plantuml: 'rectangle',
    },
    and: connector('diamond-plus', ['{', '}']),
    or: connector('diamond', ['{', '}']),
    xor: connector('diamond-x', ['{', '}']),
  },
  edgeKinds: { flow: { look: ARROW, dot: 'arrowhead=normal', mermaid: '-->', plantuml: '-->' } },
  validate: (model) => {
    const out = [];
    const kinds = kindMap(model);
    const degree = degrees(model);
    model.edges.forEach((edge) => {
      const ends = [kinds.get(edge.from), kinds.get(edge.to)];
      if (ends[0] === ends[1] && ['event', 'function'].includes(ends[0]))
        out.push(problem(edge.line, 'error', 'epc-alternate', { from: edge.from, to: edge.to, kind: ends[0] }));
    });
    model.nodes.forEach((node) => {
      const count = degree.get(node.id);
      if (count.in === 0 && count.out > 0 && node.kind !== 'event') out.push(problem(node.line, 'warning', 'epc-start', { id: node.id }));
      if (count.out === 0 && count.in > 0 && node.kind !== 'event') out.push(problem(node.line, 'warning', 'epc-end', { id: node.id }));
    });
    return [...out, ...isolated(model, [])];
  },
});
