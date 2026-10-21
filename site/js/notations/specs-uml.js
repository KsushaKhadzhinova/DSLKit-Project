import { findCycle, problem } from './common.js';
import { checkFlow, defineGraph, plain } from './graph.js';
import { fixed, sizer } from './svg.js';

const still = (look) => () => look;
const ARROW = still({ end: 'arrow' });
const OPEN = still({ end: 'open' });
const DASHED = still({ end: 'open', dash: true });
const LINE = still({});
const kindMap = (model) => new Map(model.nodes.map((node) => [node.id, node.kind]));
const edgeKind = (look, dot, mermaid, plantuml) => ({ look, dot, mermaid, plantuml });
const isolated = (model) => {
  const used = new Set(model.edges.flatMap((edge) => [edge.from, edge.to]));
  return model.nodes.length > 1
    ? model.nodes.filter((node) => !used.has(node.id)).map((node) => problem(node.line, 'warning', 'isolated', { id: node.id }))
    : [];
};
// Edge kinds that may only connect the listed node kinds: [edge kind, allowed kinds for `from`, allowed kinds for `to`, problem code].
const endpoints = (model, rules) => {
  const kinds = kindMap(model);
  return model.edges.flatMap((edge) => {
    const rule = rules.find(([kind]) => kind === edge.kind);
    return rule && !(rule[1].includes(kinds.get(edge.from)) && rule[2].includes(kinds.get(edge.to)))
      ? [problem(edge.line, 'error', rule[3], { from: edge.from, to: edge.to, kind: edge.kind })]
      : [];
  });
};

// ---------- object ----------
export const object = defineGraph({
  notation: 'uml-object',
  nodes: { object: 'object' },
  edges: { link: 'link' },
  kinds: { object: { shape: 'rect', size: sizer(110, 44, 'box', 20), text: plain, dot: 'shape=box', mermaid: ['[', ']'], plantuml: 'object' } },
  edgeKinds: { link: edgeKind(LINE, 'arrowhead=none', '---', '--') },
  validate: (model) => [
    ...model.nodes.filter((node) => !node.label.includes(':')).map((node) => problem(node.line, 'warning', 'uml-object-label', { id: node.id })),
    ...isolated(model),
  ],
});

// ---------- component ----------
export const component = defineGraph({
  notation: 'uml-component',
  nodes: { component: 'component', interface: 'interface' },
  edges: { provide: 'provide', require: 'require', delegate: 'delegate', depend: 'depend' },
  kinds: {
    component: { shape: 'component', size: sizer(120, 54, 'box', 18), text: plain, dot: 'shape=component', mermaid: ['[[', ']]'], plantuml: 'component' },
    interface: { shape: 'event-start', size: fixed(24, 24, 'ellipse', 14), text: plain, dot: 'shape=circle', mermaid: ['((', '))'], plantuml: 'interface' },
  },
  edgeKinds: {
    provide: edgeKind(LINE, 'arrowhead=none', '---', '--'),
    require: edgeKind(DASHED, 'style=dashed', '-.->', '..>'),
    delegate: edgeKind(OPEN, 'arrowhead=vee', '-->', '-->'),
    depend: edgeKind(DASHED, 'style=dashed', '-.->', '..>'),
  },
  validate: (model) => [
    ...endpoints(model, [
      ['provide', ['component'], ['interface'], 'uml-comp-iface'],
      ['require', ['component'], ['interface'], 'uml-comp-iface'],
      ['delegate', ['component', 'interface'], ['component', 'interface'], 'uml-comp-iface'],
      ['depend', ['component'], ['component'], 'uml-comp-depend'],
    ]),
    ...isolated(model),
  ],
});

// ---------- composite structure ----------
export const composite = defineGraph({
  notation: 'uml-composite',
  nodes: { classifier: 'classifier', part: 'part', port: 'port' },
  edges: { connect: 'connect' },
  kinds: {
    classifier: { shape: 'rect', size: sizer(130, 54, 'box', 18), text: plain, dot: 'shape=box, style=bold', mermaid: ['[[', ']]'], plantuml: 'rectangle' },
    part: { shape: 'rect', size: sizer(110, 44, 'box', 18), text: plain, dot: 'shape=box', mermaid: ['[', ']'], plantuml: 'rectangle' },
    port: { shape: 'square', size: fixed(16, 16, 'box', 14), text: plain, dot: 'shape=square, width=0.2', mermaid: ['[', ']'], plantuml: 'rectangle' },
  },
  edgeKinds: { connect: edgeKind(LINE, 'arrowhead=none', '---', '--') },
  validate: (model) => {
    const out = [];
    const ids = new Set(model.nodes.map((node) => node.id));
    model.nodes
      .filter((node) => node.kind === 'port')
      .forEach((node) => {
        if (typeof node.attrs.of !== 'string') out.push(problem(node.line, 'error', 'uml-cs-port', { id: node.id }));
        else if (!ids.has(node.attrs.of)) out.push(problem(node.line, 'error', 'unknown-ref', { id: node.attrs.of }));
      });
    model.nodes
      .filter((node) => node.kind === 'part' && typeof node.attrs.in === 'string')
      .forEach((node) => {
        if (!ids.has(node.attrs.in)) out.push(problem(node.line, 'error', 'unknown-ref', { id: node.attrs.in }));
      });
    const kinds = kindMap(model);
    model.edges
      .filter((edge) => kinds.get(edge.from) === 'classifier' || kinds.get(edge.to) === 'classifier')
      .forEach((edge) => out.push(problem(edge.line, 'error', 'uml-cs-connect', { from: edge.from, to: edge.to })));
    return out;
  },
});

// ---------- deployment ----------
const NODES = ['node', 'device', 'environment'];
const nodeKind = (shape, tag) => ({ shape, size: sizer(130, 60, 'box', 18), text: tag, dot: 'shape=box3d', mermaid: ['[', ']'], plantuml: 'node' });
export const deployment = defineGraph({
  notation: 'uml-deployment',
  nodes: { node: 'node', device: 'device', environment: 'environment', artifact: 'artifact' },
  edges: { deploy: 'deploy', communicate: 'communicate' },
  edgeLabel: (edge) => (edge.kind === 'deploy' ? '«deploy»' : edge.label),
  kinds: {
    node: nodeKind('box3d', plain),
    device: nodeKind('box3d', (node) => `«device» ${node.label}`),
    environment: nodeKind('box3d', (node) => `«execution environment» ${node.label}`),
    artifact: {
      shape: 'rect',
      size: sizer(110, 44, 'box', 18),
      text: (node) => `«artifact» ${node.label}`,
      dot: 'shape=note',
      mermaid: ['[', ']'],
      plantuml: 'artifact',
    },
  },
  edgeKinds: { deploy: edgeKind(DASHED, 'style=dashed, arrowhead=vee', '-.->', '..>'), communicate: edgeKind(LINE, 'arrowhead=none', '---', '--') },
  validate: (model) => [
    ...endpoints(model, [
      ['deploy', ['artifact'], NODES, 'uml-deploy'],
      ['communicate', NODES, NODES, 'uml-communicate'],
    ]),
    ...isolated(model),
  ],
});

// ---------- package ----------
export const packages = defineGraph({
  notation: 'uml-package',
  nodes: { package: 'package', element: 'element' },
  edges: { import: 'import', access: 'access', merge: 'merge', contains: 'contains' },
  edgeLabel: (edge) => ({ import: '«import»', access: '«access»', merge: '«merge»' })[edge.kind] ?? edge.label,
  kinds: {
    package: { shape: 'package', size: sizer(130, 70, 'box', 18), text: plain, dot: 'shape=tab', mermaid: ['[[', ']]'], plantuml: 'package' },
    element: { shape: 'rect', size: sizer(100, 40, 'box', 18), text: plain, dot: 'shape=box', mermaid: ['[', ']'], plantuml: 'rectangle' },
  },
  edgeKinds: {
    import: edgeKind(DASHED, 'style=dashed, arrowhead=vee', '-.->', '..>'),
    access: edgeKind(DASHED, 'style=dashed, arrowhead=vee', '-.->', '..>'),
    merge: edgeKind(DASHED, 'style=dashed, arrowhead=vee', '-.->', '..>'),
    contains: edgeKind(LINE, 'arrowhead=odot', '---', '--'),
  },
  validate: (model) => {
    const out = endpoints(model, [
      ['import', ['package'], ['package'], 'uml-pkg-edge'],
      ['access', ['package'], ['package'], 'uml-pkg-edge'],
      ['merge', ['package'], ['package'], 'uml-pkg-edge'],
      ['contains', ['package'], ['package', 'element'], 'uml-pkg-contains'],
    ]);
    const owners = new Map();
    model.edges
      .filter((edge) => edge.kind === 'contains')
      .forEach((edge) => {
        if (owners.has(edge.to)) out.push(problem(edge.line, 'error', 'uml-pkg-owner', { id: edge.to, first: owners.get(edge.to) }));
        else owners.set(edge.to, edge.from);
      });
    const cycle = findCycle(model.edges.filter((edge) => edge.kind === 'contains'));
    if (cycle.length > 0)
      out.push(
        problem(cycle[0].line, 'error', 'uml-pkg-cycle', {
          path: cycle
            .map((edge) => edge.from)
            .concat(cycle[0].from)
            .join(' -> '),
        }),
      );
    return [...out, ...isolated(model)];
  },
});

// ---------- profile ----------
export const profile = defineGraph({
  notation: 'uml-profile',
  nodes: { profile: 'profile', metaclass: 'metaclass', stereotype: 'stereotype' },
  edges: { extend: 'extend', generalize: 'generalize' },
  kinds: {
    profile: {
      shape: 'package',
      size: sizer(130, 70, 'box', 18),
      text: (node) => `«profile» ${node.label}`,
      dot: 'shape=tab',
      mermaid: ['[[', ']]'],
      plantuml: 'package',
    },
    metaclass: {
      shape: 'rect',
      size: sizer(110, 44, 'box', 18),
      text: (node) => `«metaclass» ${node.label}`,
      dot: 'shape=box',
      mermaid: ['[', ']'],
      plantuml: 'class',
    },
    stereotype: {
      shape: 'rect',
      size: sizer(110, 44, 'box', 18),
      text: (node) => `«stereotype» ${node.label}`,
      dot: 'shape=box',
      mermaid: ['[', ']'],
      plantuml: 'class',
    },
  },
  edgeKinds: {
    extend: edgeKind(ARROW, 'arrowhead=normal', '-->', '--|>'),
    generalize: edgeKind(still({ end: 'triangle' }), 'arrowhead=empty', '-->', '--|>'),
  },
  validate: (model) => {
    const out = endpoints(model, [
      ['extend', ['stereotype'], ['metaclass'], 'uml-profile-extend'],
      ['generalize', ['stereotype'], ['stereotype'], 'uml-profile-generalize'],
    ]);
    const linked = new Set(model.edges.filter((edge) => edge.kind === 'extend' || edge.kind === 'generalize').map((edge) => edge.from));
    model.nodes
      .filter((node) => node.kind === 'stereotype' && !linked.has(node.id))
      .forEach((node) => out.push(problem(node.line, 'warning', 'uml-stereotype-idle', { id: node.id })));
    return out;
  },
});

// ---------- communication ----------
export const communication = defineGraph({
  notation: 'uml-communication',
  nodes: { object: 'object' },
  edges: { message: 'message' },
  kinds: { object: { shape: 'rect', size: sizer(110, 44, 'box', 20), text: plain, dot: 'shape=box', mermaid: ['[', ']'], plantuml: 'object' } },
  edgeKinds: { message: edgeKind(ARROW, 'arrowhead=normal', '-->', '-->') },
  validate: (model) => [
    ...model.edges
      .filter((edge) => !/^\d+(\.\d+)*\s*[:.)]?/.test(edge.label))
      .map((edge) => problem(edge.line, 'warning', 'uml-comm-number', { from: edge.from, to: edge.to })),
    ...isolated(model),
  ],
});

// ---------- interaction overview ----------
const OVERVIEW_FLOW = {
  start: ['start'],
  end: ['end'],
  requireEnd: true,
  deadEnd: 'error',
  gateways: ['decision', 'merge', 'fork', 'join'],
  labelled: ['decision'],
};
const barKind = {
  shape: 'bar',
  size: fixed(10, 56, 'box', 14),
  text: plain,
  dot: 'shape=box, style=filled, fillcolor=black, width=0.1, height=0.6, fontcolor=white',
  mermaid: ['[', ']'],
  plantuml: 'rectangle',
};
const rhombusKind = { shape: 'diamond', size: fixed(44, 44, 'diamond', 14), text: plain, dot: 'shape=diamond', mermaid: ['{', '}'], plantuml: 'diamond' };
export const overview = defineGraph({
  notation: 'uml-overview',
  nodes: { start: 'start', end: 'end', interaction: 'interaction', decision: 'decision', merge: 'merge', fork: 'fork', join: 'join' },
  edges: { flow: 'flow' },
  kinds: {
    start: {
      shape: 'dot',
      size: fixed(24, 24, 'ellipse', 8),
      text: plain,
      dot: 'shape=circle, style=filled, fillcolor=black, fontcolor=white',
      mermaid: ['((', '))'],
      plantuml: 'circle',
    },
    end: { shape: 'bullseye', size: fixed(28, 28, 'ellipse', 8), text: plain, dot: 'shape=doublecircle', mermaid: ['(((', ')))'], plantuml: 'circle' },
    interaction: {
      shape: 'frame',
      size: sizer(130, 56, 'box', 20),
      text: (node) => `ref ${node.label}`,
      dot: 'shape=box',
      mermaid: ['[[', ']]'],
      plantuml: 'rectangle',
    },
    decision: rhombusKind,
    merge: rhombusKind,
    fork: barKind,
    join: barKind,
  },
  edgeKinds: { flow: edgeKind(ARROW, 'arrowhead=normal', '-->', '-->') },
  validate: (model) => checkFlow(model, OVERVIEW_FLOW),
});

// ---------- IDEF5 ontology ----------
export const idef5 = defineGraph({
  notation: 'idef5',
  nodes: { kind: 'kind', individual: 'individual', process: 'process' },
  edges: { isa: 'isa', partof: 'partof', instanceof: 'instanceof', relation: 'relation' },
  kinds: {
    kind: { shape: 'ellipse', size: sizer(110, 50, 'ellipse', 16), text: plain, dot: 'shape=ellipse', mermaid: ['([', '])'], plantuml: 'usecase' },
    individual: { shape: 'rect', size: sizer(100, 40, 'box', 16), text: plain, dot: 'shape=box', mermaid: ['[', ']'], plantuml: 'rectangle' },
    process: { shape: 'rounded', size: sizer(110, 50, 'box', 16), text: plain, dot: 'shape=box, style=rounded', mermaid: ['(', ')'], plantuml: 'rectangle' },
  },
  edgeKinds: {
    isa: edgeKind(still({ end: 'triangle' }), 'arrowhead=empty', '-->', '--|>'),
    partof: edgeKind(still({ end: 'diamond' }), 'arrowhead=odiamond', '-->', 'o--'),
    instanceof: edgeKind(DASHED, 'style=dashed, arrowhead=vee', '-.->', '..>'),
    relation: edgeKind(ARROW, 'arrowhead=normal', '-->', '-->'),
  },
  edgeLabel: (edge) => (edge.kind === 'relation' ? edge.label : `«${edge.kind}»`),
  validate: (model) => {
    const out = [];
    const kinds = kindMap(model);
    model.edges.forEach((edge) => {
      const ends = [kinds.get(edge.from), kinds.get(edge.to)];
      const params = { from: edge.from, to: edge.to, kind: edge.kind };
      if (edge.kind === 'isa' && (ends[0] === 'individual' || ends[0] !== ends[1])) out.push(problem(edge.line, 'error', 'idef5-isa', params));
      if (edge.kind === 'instanceof' && !(ends[0] === 'individual' && ends[1] !== 'individual'))
        out.push(problem(edge.line, 'error', 'idef5-instanceof', params));
      if (edge.kind === 'partof' && ends[0] !== ends[1]) out.push(problem(edge.line, 'error', 'idef5-partof', params));
    });
    ['isa', 'partof'].forEach((kind) => {
      const cycle = findCycle(model.edges.filter((edge) => edge.kind === kind));
      if (cycle.length > 0)
        out.push(
          problem(cycle[0].line, 'error', 'idef5-cycle', {
            kind,
            path: cycle
              .map((edge) => edge.from)
              .concat(cycle[0].from)
              .join(' -> '),
          }),
        );
    });
    model.nodes
      .filter((node) => node.kind === 'individual' && !model.edges.some((edge) => edge.kind === 'instanceof' && edge.from === node.id))
      .forEach((node) => out.push(problem(node.line, 'warning', 'idef5-individual', { id: node.id })));
    return [...out, ...isolated(model)];
  },
});
