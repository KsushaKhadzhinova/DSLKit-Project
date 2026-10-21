import { problem, wrap } from './common.js';
import { checkFlow, defineGraph, plain } from './graph.js';
import { fixed, sizer } from './svg.js';

const still = (look) => () => look;
const ARROW = still({ end: 'arrow' });
const DASHED = still({ end: 'arrow', dash: true });
const LINE = still({});
const longest = (lines) => Math.max(...lines.map((line) => line.length));

// A circle that grows with its label.
const roundSize = (min, wrapAt) => (node) => {
  const lines = wrap(node.label, wrapAt);
  const d = Math.max(min, longest(lines) * 7 + 30, lines.length * 18 + 30);
  return { lines, outline: 'ellipse', w: d, h: d };
};

// A symbol whose width is 1.5 times its height, as the GOST flowchart symbols are drawn.
const ratioSize = (a, wrapAt, outline) => (node) => {
  const lines = wrap(node.label, wrapAt);
  const h = Math.max(a, lines.length * 18 + 16, (longest(lines) * 7 + 28) / 1.5);
  return { lines, outline, w: h * 1.5, h };
};

const degrees = (model) => {
  const count = new Map(model.nodes.map((node) => [node.id, { in: 0, out: 0 }]));
  model.edges.forEach((edge) => {
    count.get(edge.from).out += 1;
    count.get(edge.to).in += 1;
  });
  return count;
};

const isolated = (model, skip) => {
  const count = degrees(model);
  return model.nodes
    .filter((node) => !skip.includes(node.kind) && count.get(node.id).in + count.get(node.id).out === 0)
    .map((node) => problem(node.line, 'warning', 'isolated', { id: node.id }));
};

const kindMap = (model) => new Map(model.nodes.map((node) => [node.id, node.kind]));

// ---------- DFD (Yourdon / Gane-Sarson) ----------
export const dfd = defineGraph({
  notation: 'dfd',
  nodes: { entity: 'entity', process: 'process', store: 'store' },
  edges: { flow: 'flow' },
  kinds: {
    entity: { shape: 'rect', size: sizer(110, 50, 'box', 16), text: plain, dot: 'shape=box, peripheries=2', mermaid: ['[', ']'], plantuml: 'rectangle' },
    process: { shape: 'circle', size: roundSize(96, 12), text: plain, dot: 'shape=circle', mermaid: ['((', '))'], plantuml: 'usecase' },
    store: { shape: 'store', size: sizer(130, 44, 'box', 18), text: plain, dot: 'shape=cds', mermaid: ['[(', ')]'], plantuml: 'database' },
  },
  edgeKinds: { flow: { look: ARROW, dot: 'arrowhead=normal', mermaid: '-->', plantuml: '-->' } },
  validate: (model) => {
    const out = [];
    const kinds = kindMap(model);
    model.edges.forEach((edge) => {
      if (kinds.get(edge.from) !== 'process' && kinds.get(edge.to) !== 'process')
        out.push(problem(edge.line, 'error', 'dfd-no-process', { from: edge.from, to: edge.to }));
      if (edge.label === '') out.push(problem(edge.line, 'warning', 'dfd-unlabelled', { from: edge.from, to: edge.to }));
    });
    const count = degrees(model);
    model.nodes
      .filter((node) => node.kind === 'process')
      .forEach((node) => {
        const { in: ins, out: outs } = count.get(node.id);
        if (ins === 0 && outs > 0) out.push(problem(node.line, 'error', 'dfd-miracle', { id: node.id }));
        if (outs === 0 && ins > 0) out.push(problem(node.line, 'error', 'dfd-black-hole', { id: node.id }));
      });
    return [...out, ...isolated(model, [])];
  },
});

// ---------- BPMN ----------
const BPMN_FLOW = { start: ['start'], end: ['end'], requireEnd: true, deadEnd: 'error', gateways: ['exclusive', 'parallel'], labelled: ['exclusive'] };
export const bpmn = defineGraph({
  notation: 'bpmn',
  nodes: { start: 'start', end: 'end', intermediate: 'intermediate', task: 'task', exclusive: 'exclusive', parallel: 'parallel' },
  edges: { flow: 'flow' },
  kinds: {
    start: { shape: 'event-start', size: fixed(36, 36, 'ellipse', 14), text: plain, dot: 'shape=circle', mermaid: ['((', '))'], plantuml: 'circle' },
    intermediate: {
      shape: 'event-middle',
      size: fixed(36, 36, 'ellipse', 14),
      text: plain,
      dot: 'shape=doublecircle',
      mermaid: ['(((', ')))'],
      plantuml: 'circle',
    },
    end: { shape: 'event-end', size: fixed(36, 36, 'ellipse', 14), text: plain, dot: 'shape=circle, penwidth=3', mermaid: ['(((', ')))'], plantuml: 'circle' },
    task: { shape: 'rounded', size: sizer(110, 50, 'box', 16), text: plain, dot: 'shape=box, style=rounded', mermaid: ['(', ')'], plantuml: 'rectangle' },
    exclusive: { shape: 'diamond-x', size: fixed(44, 44, 'diamond', 14), text: plain, dot: 'shape=diamond', mermaid: ['{', '}'], plantuml: 'diamond' },
    parallel: {
      shape: 'diamond-plus',
      size: fixed(44, 44, 'diamond', 14),
      text: plain,
      dot: 'shape=diamond, peripheries=2',
      mermaid: ['{', '}'],
      plantuml: 'diamond',
    },
  },
  edgeKinds: { flow: { look: ARROW, dot: 'arrowhead=normal', mermaid: '-->', plantuml: '-->' } },
  validate: (model) => {
    const count = degrees(model);
    const split = model.nodes
      .filter((node) => node.kind === 'task' && count.get(node.id).out > 1)
      .map((node) => problem(node.line, 'warning', 'bpmn-implicit-split', { id: node.id }));
    return [...checkFlow(model, BPMN_FLOW), ...split];
  },
});

// ---------- Petri nets ----------
const count = (value) => (/^\d+$/.test(String(value ?? 0)) ? Number(value ?? 0) : 0);
export const weightOf = (edge) => (/^[1-9]\d*$/.test(String(edge.attrs.weight ?? 1)) ? Number(edge.attrs.weight ?? 1) : 1);

export const petri = defineGraph({
  notation: 'petri',
  nodes: { place: 'place', transition: 'transition' },
  edges: { arc: 'arc' },
  init: (node) => ({ ...node, tokens: count(node.attrs.tokens) }),
  edgeLabel: (edge) => (weightOf(edge) > 1 ? String(weightOf(edge)) : edge.label),
  kinds: {
    place: {
      shape: 'place',
      size: fixed(44, 44, 'ellipse', 14),
      text: (node) => (node.tokens > 0 ? `${node.label} (${node.tokens})` : node.label),
      dot: 'shape=circle',
      mermaid: ['((', '))'],
      plantuml: 'circle',
    },
    transition: {
      shape: 'bar',
      size: fixed(12, 48, 'box', 14),
      text: plain,
      dot: 'shape=box, style=filled, fillcolor="#1e293b", fontcolor=white',
      mermaid: ['[', ']'],
      plantuml: 'rectangle',
    },
  },
  edgeKinds: { arc: { look: ARROW, dot: 'arrowhead=normal', mermaid: '-->', plantuml: '-->' } },
  validate: (model) => {
    const out = [];
    const kinds = kindMap(model);
    model.edges.forEach((edge) => {
      if (kinds.get(edge.from) === kinds.get(edge.to)) out.push(problem(edge.line, 'error', 'petri-bipartite', { from: edge.from, to: edge.to }));
      if ('weight' in edge.attrs && !/^[1-9]\d*$/.test(String(edge.attrs.weight)))
        out.push(problem(edge.line, 'error', 'petri-weight', { value: edge.attrs.weight }));
    });
    model.nodes
      .filter((node) => 'tokens' in node.attrs && !/^\d+$/.test(String(node.attrs.tokens)))
      .forEach((node) => out.push(problem(node.line, 'error', 'petri-tokens', { id: node.id, value: node.attrs.tokens })));
    return [...out, ...isolated(model, [])];
  },
});

// Token game: a marking maps place ids to token counts.
export const initialMarking = (model) => Object.fromEntries(model.nodes.filter((node) => node.kind === 'place').map((node) => [node.id, node.tokens]));
const arcsOf = (model, id) => ({ in: model.edges.filter((edge) => edge.to === id), out: model.edges.filter((edge) => edge.from === id) });
export const enabledTransitions = (model, marking) =>
  model.nodes
    .filter((node) => node.kind === 'transition' && arcsOf(model, node.id).in.every((edge) => marking[edge.from] >= weightOf(edge)))
    .map((node) => node.id);
export const fire = (model, marking, id) => {
  if (!enabledTransitions(model, marking).includes(id)) throw new Error(`Transition ${id} is not enabled`);
  const next = { ...marking };
  const { in: ins, out: outs } = arcsOf(model, id);
  ins.forEach((edge) => (next[edge.from] -= weightOf(edge)));
  outs.forEach((edge) => (next[edge.to] += weightOf(edge)));
  return next;
};
export const isDeadlock = (model, marking) => enabledTransitions(model, marking).length === 0;

// ---------- UML use case ----------
const UC_LABEL = { include: '«include»', extend: '«extend»' };
export const usecase = defineGraph({
  notation: 'uml-usecase',
  nodes: { actor: 'actor', usecase: 'usecase' },
  edges: { link: 'link', include: 'include', extend: 'extend', generalize: 'generalize' },
  edgeLabel: (edge) => UC_LABEL[edge.kind] ?? edge.label,
  kinds: {
    actor: { shape: 'actor', size: fixed(70, 84, 'box', 12), text: plain, dot: 'shape=box', mermaid: ['[', ']'], plantuml: 'actor' },
    usecase: { shape: 'ellipse', size: sizer(120, 56, 'ellipse', 16), text: plain, dot: 'shape=ellipse', mermaid: ['([', '])'], plantuml: 'usecase' },
  },
  edgeKinds: {
    link: { look: LINE, dot: 'arrowhead=none', mermaid: '---', plantuml: '--' },
    include: { look: DASHED, dot: 'style=dashed', mermaid: '-.->', plantuml: '..>' },
    extend: { look: DASHED, dot: 'style=dashed', mermaid: '-.->', plantuml: '..>' },
    generalize: { look: still({ end: 'triangle' }), dot: 'arrowhead=empty', mermaid: '-->', plantuml: '--|>' },
  },
  validate: (model) => {
    const out = [];
    const kinds = kindMap(model);
    model.edges.forEach((edge) => {
      const ends = [kinds.get(edge.from), kinds.get(edge.to)];
      const params = { from: edge.from, to: edge.to };
      if (edge.kind === 'link' && ends.slice().sort().join() !== 'actor,usecase') out.push(problem(edge.line, 'error', 'uc-link', params));
      if (['include', 'extend'].includes(edge.kind) && ends.some((kind) => kind !== 'usecase'))
        out.push(problem(edge.line, 'error', 'uc-include', { ...params, kind: edge.kind }));
      if (edge.kind === 'generalize' && ends[0] !== ends[1]) out.push(problem(edge.line, 'error', 'uc-generalize', params));
    });
    return [...out, ...isolated(model, [])];
  },
});

// ---------- UML activity ----------
const ACTIVITY_FLOW = {
  start: ['start'],
  end: ['end'],
  requireEnd: true,
  deadEnd: 'error',
  gateways: ['decision', 'merge', 'fork', 'join'],
  labelled: ['decision'],
};
const bar = {
  shape: 'bar',
  size: fixed(10, 56, 'box', 14),
  text: plain,
  dot: 'shape=box, style=filled, fillcolor=black, width=0.1, height=0.6, fontcolor=white',
  mermaid: ['[', ']'],
  plantuml: 'rectangle',
};
const rhombus = { shape: 'diamond', size: fixed(44, 44, 'diamond', 14), text: plain, dot: 'shape=diamond', mermaid: ['{', '}'], plantuml: 'diamond' };
export const activity = defineGraph({
  notation: 'uml-activity',
  nodes: { start: 'start', end: 'end', action: 'action', decision: 'decision', merge: 'merge', fork: 'fork', join: 'join' },
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
    action: { shape: 'rounded', size: sizer(110, 48, 'box', 16), text: plain, dot: 'shape=box, style=rounded', mermaid: ['(', ')'], plantuml: 'rectangle' },
    decision: rhombus,
    merge: rhombus,
    fork: bar,
    join: bar,
  },
  edgeKinds: { flow: { look: ARROW, dot: 'arrowhead=normal', mermaid: '-->', plantuml: '-->' } },
  validate: (model) => checkFlow(model, ACTIVITY_FLOW),
});

// ---------- UML state machine ----------
const STATE_FLOW = { start: ['initial'], end: ['final'], requireEnd: false, deadEnd: 'warning', gateways: [], labelled: [] };
const stateRef = (names, node) => (['initial', 'final'].includes(node.kind) ? '[*]' : names.get(node.id));
const stateNames = (model) => new Map(model.nodes.map((node, index) => [node.id, `n${index}`]));
const stateText = (value) => String(value).replace(/"/g, "'").replace(/\r?\n/g, '\\n');
const stateEdges = (model, names, lines) =>
  model.edges.forEach((edge) => {
    const from = stateRef(
      names,
      model.nodes.find((node) => node.id === edge.from),
    );
    const to = stateRef(
      names,
      model.nodes.find((node) => node.id === edge.to),
    );
    lines.push(`${from} --> ${to}${edge.label ? ` : ${stateText(edge.label)}` : ''}`);
  });
const stateDeclarations = (model, names) =>
  model.nodes.filter((node) => node.kind === 'state').map((node) => `state "${stateText(node.label)}" as ${names.get(node.id)}`);
export const state = defineGraph({
  notation: 'uml-state',
  nodes: { initial: 'initial', final: 'final', state: 'state' },
  edges: { transition: 'transition' },
  kinds: {
    initial: {
      shape: 'dot',
      size: fixed(24, 24, 'ellipse', 8),
      text: plain,
      dot: 'shape=circle, style=filled, fillcolor=black, fontcolor=white',
      mermaid: ['((', '))'],
      plantuml: 'circle',
    },
    final: { shape: 'bullseye', size: fixed(28, 28, 'ellipse', 8), text: plain, dot: 'shape=doublecircle', mermaid: ['(((', ')))'], plantuml: 'circle' },
    state: { shape: 'rounded', size: sizer(100, 46, 'box', 16), text: plain, dot: 'shape=box, style=rounded', mermaid: ['(', ')'], plantuml: 'rectangle' },
  },
  edgeKinds: { transition: { look: ARROW, dot: 'arrowhead=normal', mermaid: '-->', plantuml: '-->' } },
  custom: {
    mermaid: (model) => {
      const names = stateNames(model);
      const lines = ['stateDiagram-v2', ...stateDeclarations(model, names).map((line) => `  ${line}`)];
      const body = [];
      stateEdges(model, names, body);
      return [...lines, ...body.map((line) => `  ${line}`)].join('\n');
    },
    plantuml: (model) => {
      const names = stateNames(model);
      const body = [];
      stateEdges(model, names, body);
      return ['@startuml', ...(model.title ? [`title ${stateText(model.title)}`] : []), ...stateDeclarations(model, names), ...body, '@enduml'].join('\n');
    },
  },
  validate: (model) => {
    const out = checkFlow(model, STATE_FLOW);
    const seen = new Map();
    model.edges
      .filter((edge) => edge.label !== '')
      .forEach((edge) => {
        const key = `${edge.from}\u0000${edge.label}`;
        if (seen.has(key)) out.push(problem(edge.line, 'warning', 'state-nondeterministic', { id: edge.from, event: edge.label }));
        else seen.set(key, edge.line);
      });
    return out;
  },
});

// ---------- IDEF3 process flow ----------
const JUNCTIONS = { and: '&', or: 'O', xor: 'X' };
const junctionKind = () => ({
  shape: 'rect',
  size: (node) => ({ lines: [node.label], outline: 'box', w: 40, h: 40 }),
  text: (node) => node.label,
  dot: 'shape=box',
  mermaid: ['{{', '}}'],
  plantuml: 'rectangle',
});
export const idef3 = defineGraph({
  notation: 'idef3',
  nodes: { uob: 'uob', and: 'and', or: 'or', xor: 'xor', referent: 'referent' },
  edges: { precedence: 'precedence', relational: 'relational', objectflow: 'objectflow' },
  init: (node) => (node.kind in JUNCTIONS ? { ...node, label: node.attrs.sync ? JUNCTIONS[node.kind].repeat(2) : JUNCTIONS[node.kind] } : node),
  kinds: {
    uob: { shape: 'rounded', size: sizer(120, 54, 'box', 18), text: plain, dot: 'shape=box', mermaid: ['[', ']'], plantuml: 'rectangle' },
    and: junctionKind(),
    or: junctionKind(),
    xor: junctionKind(),
    referent: { shape: 'rounded', size: sizer(100, 40, 'box', 16), text: plain, dot: 'shape=note', mermaid: ['>', ']'], plantuml: 'rectangle' },
  },
  edgeKinds: {
    precedence: { look: ARROW, dot: 'arrowhead=normal', mermaid: '-->', plantuml: '-->' },
    relational: { look: DASHED, dot: 'style=dashed', mermaid: '-.->', plantuml: '..>' },
    objectflow: { look: still({ start: 'arrow', end: 'arrow' }), dot: 'dir=both', mermaid: '<-->', plantuml: '<-->' },
  },
  validate: (model) => {
    const out = [];
    const kinds = kindMap(model);
    const deg = degrees(model);
    model.edges
      .filter((edge) => edge.kind !== 'relational' && (kinds.get(edge.from) === 'referent' || kinds.get(edge.to) === 'referent'))
      .forEach((edge) => out.push(problem(edge.line, 'error', 'idef3-referent', { from: edge.from, to: edge.to })));
    const tally = { and: [0, 0], or: [0, 0], xor: [0, 0] };
    model.nodes
      .filter((node) => node.kind in JUNCTIONS)
      .forEach((node) => {
        const { in: ins, out: outs } = deg.get(node.id);
        if (ins === 1 && outs >= 2) tally[node.kind][0] += 1;
        else if (ins >= 2 && outs === 1) tally[node.kind][1] += 1;
        else out.push(problem(node.line, 'error', 'idef3-junction', { id: node.id }));
      });
    Object.entries(tally)
      .filter(([, [splits, joins]]) => splits !== joins)
      .forEach(([kind, [splits, joins]]) => out.push(problem(1, 'error', 'idef3-unpaired', { kind, splits, joins })));
    const flow = model.edges.filter((edge) => edge.kind !== 'relational');
    const incoming = new Set(flow.map((edge) => edge.to));
    const starts = model.nodes.filter((node) => node.kind !== 'referent' && !incoming.has(node.id));
    const reached = new Set(starts.map((node) => node.id));
    const queue = [...reached];
    while (queue.length > 0) {
      const current = queue.shift();
      flow.filter((edge) => edge.from === current && !reached.has(edge.to)).forEach((edge) => (reached.add(edge.to), queue.push(edge.to)));
    }
    if (model.nodes.some((node) => node.kind !== 'referent') && starts.length === 0) out.push(problem(1, 'error', 'idef3-no-start', {}));
    model.nodes
      .filter((node) => node.kind !== 'referent' && !reached.has(node.id))
      .forEach((node) => out.push(problem(node.line, 'error', 'flow-unreachable', { id: node.id })));
    return out;
  },
});

// ---------- GOST 19.701-90 flowchart ----------
const gost = (shape, minA, dot, mermaid, plantuml) => ({
  shape,
  size: ratioSize(minA, 18, shape === 'diamond' ? 'diamond' : 'box'),
  text: plain,
  dot,
  mermaid,
  plantuml,
});
const GOST_FLOW = { start: ['start'], end: ['end'], requireEnd: true, deadEnd: 'error', gateways: [], labelled: [] };
const FLOW_HIDDEN = ['comment'];
const connectorLink = (model) => {
  const groups = new Map();
  model.nodes
    .filter((node) => node.kind === 'connector' || node.kind === 'offpage')
    .forEach((node) => groups.set(`${node.kind}\u0000${node.label}`, [...(groups.get(`${node.kind}\u0000${node.label}`) ?? []), node]));
  return [...groups.values()];
};
export const gostFlow = defineGraph({
  notation: 'gost',
  nodes: {
    start: 'start',
    end: 'end',
    process: 'process',
    decision: 'decision',
    predefined: 'predefined',
    io: 'io',
    preparation: 'preparation',
    manual: 'manual',
    document: 'document',
    connector: 'connector',
    offpage: 'offpage',
    storage: 'storage',
    comment: 'comment',
  },
  edges: { flow: 'flow', note: 'note' },
  kinds: {
    start: gost('pill', 40, 'shape=box, style=rounded', ['([', '])'], 'rectangle'),
    end: gost('pill', 40, 'shape=box, style=rounded', ['([', '])'], 'rectangle'),
    process: gost('rect', 60, 'shape=box', ['[', ']'], 'rectangle'),
    decision: gost('diamond', 70, 'shape=diamond', ['{', '}'], 'diamond'),
    predefined: gost('predefined', 60, 'shape=box, peripheries=2', ['[[', ']]'], 'rectangle'),
    io: gost('parallelogram', 60, 'shape=parallelogram', ['[/', '/]'], 'rectangle'),
    preparation: gost('hexagon', 60, 'shape=hexagon', ['{{', '}}'], 'hexagon'),
    manual: gost('manual', 60, 'shape=trapezium', ['[/', '\\]'], 'rectangle'),
    document: gost('document', 60, 'shape=note', ['>', ']'], 'file'),
    connector: { shape: 'circle', size: roundSize(36, 4), text: plain, dot: 'shape=circle', mermaid: ['((', '))'], plantuml: 'circle' },
    offpage: gost('offpage', 50, 'shape=invhouse', ['>', ']'], 'rectangle'),
    storage: gost('cylinder', 60, 'shape=cylinder', ['[(', ')]'], 'database'),
    comment: gost('comment', 40, 'shape=plaintext', ['[', ']'], 'rectangle'),
  },
  edgeKinds: {
    // Arrowheads are drawn only where the direction is not the standard one (left to right).
    flow: { look: (edge, source, target) => ({ end: target.cx > source.cx ? null : 'arrow' }), dot: 'arrowhead=none', mermaid: '---', plantuml: '--' },
    note: { look: still({ dash: true }), dot: 'style=dashed, arrowhead=none', mermaid: '-.-', plantuml: '..' },
  },
  validate: (model) => {
    const out = [];
    const kinds = kindMap(model);
    const nodes = model.nodes.filter((node) => !FLOW_HIDDEN.includes(node.kind));
    const body = {
      ...model,
      nodes,
      edges: model.edges.filter((edge) => edge.kind === 'flow' && nodes.some((node) => node.id === edge.from) && nodes.some((node) => node.id === edge.to)),
    };
    const deg = degrees(body);
    model.edges
      .filter((edge) => edge.kind === 'note' && kinds.get(edge.from) !== 'comment' && kinds.get(edge.to) !== 'comment')
      .forEach((edge) => out.push(problem(edge.line, 'error', 'gost-note', { from: edge.from, to: edge.to })));
    model.edges
      .filter((edge) => edge.kind === 'flow' && (kinds.get(edge.from) === 'comment' || kinds.get(edge.to) === 'comment'))
      .forEach((edge) => out.push(problem(edge.line, 'error', 'gost-comment-flow', { from: edge.from, to: edge.to })));
    const links = [];
    connectorLink(model).forEach((group) => {
      if (group.length !== 2) group.forEach((node) => out.push(problem(node.line, 'error', 'gost-connector', { id: node.id, label: node.label })));
      else {
        const [first, second] = deg.get(group[0].id).out === 0 ? group : [group[1], group[0]];
        links.push({ from: first.id, to: second.id, label: '', kind: 'flow', attrs: {}, line: first.line });
      }
    });
    body.nodes
      .filter((node) => node.kind === 'decision')
      .forEach((node) => {
        const branches = body.edges.filter((edge) => edge.from === node.id);
        if (branches.length < 2) out.push(problem(node.line, 'error', 'gost-decision', { id: node.id }));
        branches.filter((edge) => edge.label === '').forEach((edge) => out.push(problem(edge.line, 'error', 'gost-decision-label', { id: node.id })));
      });
    out.push(...checkFlow({ ...body, edges: [...body.edges, ...links] }, GOST_FLOW));
    return out;
  },
});
