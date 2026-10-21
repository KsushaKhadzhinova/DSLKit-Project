import { ID, STR, escapeXml, findCycle, parseAttrs, problem, quoteDot, unquote } from './common.js';
import { defineGraph, plain } from './graph.js';
import { edgeMarkup, sizer, svgDocument, SHAPES } from './svg.js';

const VERTEX = new RegExp(`^vertex\\s+(${ID})(?:\\s+${STR})?\\s*$`);
const EDGE = new RegExp(`^edge\\s+(${ID})\\s*(->|--)\\s*(${ID})((?:\\s+[\\w.-]+(?:=[\\w.-]+)?)*)(?:\\s+${STR})?\\s*$`);
const MODE = /^mode\s+(directed|undirected)\s*$/;
const PATH = new RegExp(`^path\\s+(${ID})\\s*->\\s*(${ID})\\s*$`);
const NUMBER = /^-?\d+(?:\.\d+)?$/;

export const parseGraphTheory = (lines, header) => {
  const model = { notation: 'graph', kind: '', title: header.title, directed: false, vertices: [], edges: [], queries: [], problems: [] };
  let mode = null;
  const arrows = [];
  lines.forEach(({ n, text: line }) => {
    let match;
    if ((match = MODE.exec(line))) mode = match[1];
    else if ((match = VERTEX.exec(line))) {
      const known = model.vertices.find((vertex) => vertex.id === match[1]);
      if (known) model.problems.push(problem(n, 'error', 'duplicate', { id: match[1], first: known.line }));
      else model.vertices.push({ id: match[1], label: unquote(match[2] ?? match[1]), line: n });
    } else if ((match = EDGE.exec(line))) {
      const attrs = parseAttrs(match[4]);
      arrows.push(match[2]);
      model.edges.push({ from: match[1], to: match[3], arrow: match[2], weight: attrs.weight, label: unquote(match[5] ?? ''), line: n });
    } else if ((match = PATH.exec(line))) model.queries.push({ from: match[1], to: match[2], line: n });
    else model.problems.push(problem(n, 'error', 'syntax', { text: line }));
  });
  model.directed = mode === null ? arrows.includes('->') : mode === 'directed';
  const known = (id) => model.vertices.some((vertex) => vertex.id === id);
  const bad = [];
  model.edges.forEach((edge) => {
    [edge.from, edge.to].filter((id) => !known(id)).forEach((id) => bad.push(problem(edge.line, 'error', 'unknown-ref', { id })));
    if (edge.arrow !== (model.directed ? '->' : '--'))
      bad.push(problem(edge.line, 'error', 'graph-arrow-mode', { mode: model.directed ? 'directed' : 'undirected' }));
    if (edge.weight !== undefined && !NUMBER.test(String(edge.weight))) bad.push(problem(edge.line, 'error', 'graph-weight', { value: edge.weight }));
  });
  model.problems.push(...bad);
  model.edges = model.edges.filter(
    (edge) =>
      known(edge.from) && known(edge.to) && (edge.weight === undefined || NUMBER.test(String(edge.weight))) && edge.arrow === (model.directed ? '->' : '--'),
  );
  model.edges.forEach((edge) => (edge.weight = edge.weight === undefined ? 1 : Number(edge.weight)));
  model.weighted = model.edges.some((edge) => edge.weight !== 1);
  model.queries.forEach((query) => {
    [query.from, query.to].filter((id) => !known(id)).forEach((id) => model.problems.push(problem(query.line, 'error', 'unknown-ref', { id })));
  });
  model.queries = model.queries.filter((query) => known(query.from) && known(query.to));
  model.empty = model.vertices.length === 0;
  model.problems.push(...graphInfo(model));
  return model;
};

// ---------- analysis ----------
const neighbours = (model) => {
  const next = new Map(model.vertices.map((vertex) => [vertex.id, []]));
  model.edges.forEach((edge) => {
    next.get(edge.from).push({ to: edge.to, weight: edge.weight });
    if (!model.directed) next.get(edge.to).push({ to: edge.from, weight: edge.weight });
  });
  return next;
};

const components = (model) => {
  const parent = new Map(model.vertices.map((vertex) => [vertex.id, vertex.id]));
  const root = (id) => (parent.get(id) === id ? id : root(parent.get(id)));
  model.edges.forEach((edge) => parent.set(root(edge.from), root(edge.to)));
  return model.vertices.map((vertex) => root(vertex.id));
};

export const dijkstra = (model, from, to) => {
  const next = neighbours(model);
  const dist = new Map(model.vertices.map((vertex) => [vertex.id, Infinity]));
  const prev = new Map();
  const todo = new Set(dist.keys());
  dist.set(from, 0);
  while (todo.size > 0) {
    const current = [...todo].reduce((best, id) => (dist.get(id) < dist.get(best) ? id : best));
    todo.delete(current);
    next.get(current).forEach(({ to: target, weight }) => {
      if (dist.get(current) + weight < dist.get(target)) {
        dist.set(target, dist.get(current) + weight);
        prev.set(target, current);
      }
    });
  }
  if (dist.get(to) === Infinity) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0]));
  return { distance: dist.get(to), path };
};

const kruskal = (model) => {
  const parent = new Map(model.vertices.map((vertex) => [vertex.id, vertex.id]));
  const root = (id) => (parent.get(id) === id ? id : root(parent.get(id)));
  const chosen = [...model.edges]
    .sort((a, b) => a.weight - b.weight)
    .filter((edge) => {
      const [a, b] = [root(edge.from), root(edge.to)];
      parent.set(a, b);
      return a !== b;
    });
  return { weight: chosen.reduce((sum, edge) => sum + edge.weight, 0), edges: chosen };
};

export const topologicalOrder = (nodes, edges) => {
  const indeg = new Map(nodes.map((id) => [id, 0]));
  edges.forEach((edge) => indeg.set(edge.to, indeg.get(edge.to) + 1));
  const ready = nodes.filter((id) => indeg.get(id) === 0);
  const order = [];
  while (ready.length > 0) {
    const id = ready.shift();
    order.push(id);
    edges
      .filter((edge) => edge.from === id)
      .forEach((edge) => {
        indeg.set(edge.to, indeg.get(edge.to) - 1);
        if (indeg.get(edge.to) === 0) ready.push(edge.to);
      });
  }
  return order.length === nodes.length ? order : null;
};

export const analyzeGraph = (model) => {
  const ids = model.vertices.map((vertex) => vertex.id);
  const roots = components(model);
  const count = new Set(roots).size;
  const degree = new Map(ids.map((id) => [id, { in: 0, out: 0 }]));
  model.edges.forEach((edge) => {
    degree.get(edge.from).out += 1;
    degree.get(edge.to).in += 1;
  });
  const loops = model.edges.filter((edge) => edge.from === edge.to).length;
  const pairs = model.edges.map((edge) => (model.directed ? [edge.from, edge.to] : [edge.from, edge.to].sort()).join('\u0000'));
  const cyclic = model.directed ? findCycle(model.edges).length > 0 : model.edges.length - ids.length + count > 0;
  const colour = new Map();
  let bipartite = true;
  ids.forEach((start) => {
    if (colour.has(start)) return;
    colour.set(start, 0);
    const queue = [start];
    while (queue.length > 0) {
      const id = queue.shift();
      model.edges
        .filter((edge) => edge.from === id || edge.to === id)
        .forEach((edge) => {
          const other = edge.from === id ? edge.to : edge.from;
          if (!colour.has(other)) {
            colour.set(other, 1 - colour.get(id));
            queue.push(other);
          } else if (colour.get(other) === colour.get(id)) bipartite = false;
        });
    }
  });
  return {
    vertices: ids.length,
    edges: model.edges.length,
    loops,
    multi: new Set(pairs).size < pairs.length,
    components: count,
    connected: count === 1,
    cyclic,
    isTree: count === 1 && model.edges.length === ids.length - 1 && (!model.directed || [...degree.values()].every((d) => d.in <= 1)),
    isDag: model.directed && !cyclic,
    bipartite,
    degree,
    matrix: ids.map((a) =>
      ids.map((b) => model.edges.filter((edge) => (edge.from === a && edge.to === b) || (!model.directed && edge.from === b && edge.to === a)).length),
    ),
    order: model.directed ? topologicalOrder(ids, model.edges) : null,
    mst: model.directed ? null : kruskal(model),
  };
};

const yes = (flag) => (flag ? 'yes' : 'no');
const graphInfo = (model) => {
  if (model.vertices.length === 0) return [];
  const info = analyzeGraph(model);
  const out = [
    problem(1, 'info', 'graph-summary', {
      v: info.vertices,
      e: info.edges,
      directed: yes(model.directed),
      weighted: yes(model.weighted),
      loops: info.loops,
      multi: yes(info.multi),
    }),
    problem(1, 'info', 'graph-structure', {
      components: info.components,
      cyclic: yes(info.cyclic),
      tree: yes(info.isTree),
      dag: yes(info.isDag),
      bipartite: yes(info.bipartite),
    }),
    problem(1, 'info', 'graph-degrees', {
      list: model.vertices
        .map(
          (vertex) =>
            `${vertex.id}=${model.directed ? `${info.degree.get(vertex.id).in}/${info.degree.get(vertex.id).out}` : info.degree.get(vertex.id).in + info.degree.get(vertex.id).out}`,
        )
        .join(', '),
    }),
    problem(1, 'info', 'graph-matrix', { matrix: info.matrix.map((row, index) => `${model.vertices[index].id}: ${row.join(' ')}`).join('; ') }),
  ];
  if (info.order) out.push(problem(1, 'info', 'graph-order', { order: info.order.join(' -> ') }));
  if (info.mst)
    out.push(problem(1, 'info', 'graph-mst', { weight: info.mst.weight, edges: info.mst.edges.map((edge) => `${edge.from}-${edge.to}`).join(', ') }));
  model.queries.forEach((query) => {
    if (model.edges.some((edge) => edge.weight < 0)) out.push(problem(query.line, 'error', 'graph-negative', {}));
    else {
      const found = dijkstra(model, query.from, query.to);
      out.push(
        found
          ? problem(query.line, 'info', 'graph-path', { from: query.from, to: query.to, path: found.path.join(' -> '), distance: found.distance })
          : problem(query.line, 'warning', 'graph-path-none', { from: query.from, to: query.to }),
      );
    }
  });
  return out;
};

// ---------- generators ----------
const toDot = (model) => {
  const link = model.directed ? '->' : '--';
  const lines = [
    `${model.directed ? 'digraph' : 'graph'} diagram {`,
    '  node [shape=circle, fontname="Helvetica"];',
    '  edge [fontname="Helvetica", fontsize=10];',
  ];
  if (model.title) lines.push(`  label=${quoteDot(model.title)};`, '  labelloc=t;');
  model.vertices.forEach((vertex, index) => lines.push(`  v${index} [label=${quoteDot(vertex.label)}];`));
  const at = (id) => model.vertices.findIndex((vertex) => vertex.id === id);
  model.edges.forEach((edge) => lines.push(`  v${at(edge.from)} ${link} v${at(edge.to)} [label=${quoteDot(edgeText(model, edge))}];`));
  return [...lines, '}'].join('\n');
};

const edgeText = (model, edge) => [edge.label, model.weighted ? String(edge.weight) : ''].filter(Boolean).join(' ');

const toMermaid = (model) => {
  const at = (id) => `v${model.vertices.findIndex((vertex) => vertex.id === id)}`;
  const link = model.directed ? '-->' : '---';
  return [
    'flowchart LR',
    ...model.vertices.map((vertex) => `  v${model.vertices.indexOf(vertex)}(("${vertex.label.replace(/"/g, '#quot;')}"))`),
    ...model.edges.map((edge) => {
      const text = edgeText(model, edge).replace(/"/g, '#quot;');
      return `  ${at(edge.from)} ${link}${text ? `|"${text}"|` : ''} ${at(edge.to)}`;
    }),
  ].join('\n');
};

// ---------- SVG: vertices on a circle ----------
const render = (model) => {
  const n = model.vertices.length;
  const radius = Math.max(70, n * 24);
  const size = radius * 2 + 140;
  const placed = new Map(
    model.vertices.map((vertex, index) => {
      const angle = (2 * Math.PI * index) / n - Math.PI / 2;
      const cx = size / 2 + radius * Math.cos(angle);
      const cy = size / 2 + 20 + radius * Math.sin(angle);
      return [vertex.id, { cx, cy, w: 40, h: 40, x: cx - 20, y: cy - 20, outline: 'ellipse', lines: [vertex.label], node: vertex }];
    }),
  );
  const look = { end: model.directed ? 'arrow' : null };
  const body =
    edgeMarkup(
      placed,
      model.edges,
      () => look,
      (edge) => edgeText(model, edge),
    ) + [...placed.values()].map((item) => `<g class="notation__node" data-id="${escapeXml(item.node.id)}">${SHAPES.circle(item)}</g>`).join('');
  return svgDocument(size, size + 40, model.title, body);
};

export const graphNotation = { generators: { graphviz: toDot, mermaid: toMermaid }, render };

// ---------- DAG ----------
const DAG_NUMBER = /^\d+(?:\.\d+)?$/;
const duration = (node) => (DAG_NUMBER.test(String(node.attrs.duration ?? 1)) ? Number(node.attrs.duration ?? 1) : 1);

export const analyzeDag = (model) => {
  const ids = model.nodes.map((node) => node.id);
  const order = topologicalOrder(ids, model.edges);
  const level = new Map(ids.map((id) => [id, 0]));
  const finish = new Map();
  const via = new Map();
  order.forEach((id) => {
    const preds = model.edges.filter((edge) => edge.to === id);
    preds.forEach((edge) => level.set(id, Math.max(level.get(id), level.get(edge.from) + 1)));
    const best = preds.reduce((top, edge) => (top === null || finish.get(edge.from) > finish.get(top) ? edge.from : top), null);
    finish.set(id, (best === null ? 0 : finish.get(best)) + duration(model.nodes.find((node) => node.id === id)));
    via.set(id, best);
  });
  const last = order.reduce((top, id) => (top === null || finish.get(id) > finish.get(top) ? id : top), null);
  const critical = [];
  for (let id = last; id !== null && id !== undefined; id = via.get(id)) critical.unshift(id);
  const reachable = (from, to, skip) => {
    const seen = new Set([from]);
    const queue = [from];
    while (queue.length > 0) {
      const id = queue.shift();
      model.edges
        .filter((edge) => edge.from === id && edge !== skip)
        .forEach((edge) => {
          if (!seen.has(edge.to)) {
            seen.add(edge.to);
            queue.push(edge.to);
          }
        });
    }
    return seen.has(to);
  };
  return {
    order,
    level,
    layers: [...Array(Math.max(...level.values(), 0) + 1).keys()].map((index) => ids.filter((id) => level.get(id) === index)),
    roots: ids.filter((id) => !model.edges.some((edge) => edge.to === id)),
    leaves: ids.filter((id) => !model.edges.some((edge) => edge.from === id)),
    critical,
    length: finish.get(last) ?? 0,
    redundant: model.edges.filter((edge) => reachable(edge.from, edge.to, edge)),
  };
};

export const dag = defineGraph({
  notation: 'dag',
  nodes: { task: 'task' },
  edges: { depend: 'depend' },
  kinds: {
    task: { shape: 'rounded', size: sizer(110, 48, 'box', 18), text: plain, dot: 'shape=box, style=rounded', mermaid: ['(', ')'], plantuml: 'rectangle' },
  },
  edgeKinds: { depend: { look: () => ({ end: 'arrow' }), dot: 'arrowhead=normal', mermaid: '-->', plantuml: '-->' } },
  init: (node) => ({ ...node, label: node.attrs.duration === undefined ? node.label : `${node.label} (${node.attrs.duration})` }),
  validate: (model) => {
    const out = [];
    model.nodes
      .filter((node) => node.attrs.duration !== undefined && !DAG_NUMBER.test(String(node.attrs.duration)))
      .forEach((node) => out.push(problem(node.line, 'error', 'dag-duration', { id: node.id, value: node.attrs.duration })));
    const cycle = findCycle(model.edges);
    if (cycle.length > 0) {
      return [
        ...out,
        problem(cycle[0].line, 'error', 'dag-cycle', {
          path: cycle
            .map((edge) => edge.from)
            .concat(cycle[0].from)
            .join(' -> '),
          lines: cycle.map((edge) => edge.line).join(', '),
        }),
      ];
    }
    if (model.nodes.length === 0) return out;
    const info = analyzeDag(model);
    return [
      ...out,
      problem(1, 'info', 'dag-order', { order: info.order.join(' -> ') }),
      problem(1, 'info', 'dag-layers', { layers: info.layers.map((layer, index) => `${index}: ${layer.join(', ')}`).join('; ') }),
      problem(1, 'info', 'dag-roots', { roots: info.roots.join(', '), leaves: info.leaves.join(', ') }),
      problem(1, 'info', 'dag-critical', { path: info.critical.join(' -> '), length: info.length }),
      ...info.redundant.map((edge) => problem(edge.line, 'info', 'dag-redundant', { from: edge.from, to: edge.to })),
    ];
  },
});
