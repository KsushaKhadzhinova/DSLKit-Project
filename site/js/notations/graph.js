import { ID, STR, parseAttrs, problem, quoteDot, unquote } from './common.js';
import { SHAPES, renderLayout } from './svg.js';

const ATTRS = '((?:\\s+[\\w.-]+(?:=[\\w.-]+)?)*)';
const plain = (node) => node.label;
const identity = (node) => node;

// A graph notation is described by data: node keywords, edge keywords, symbol tables and a validator.
// parse() reads the statements, the generators and the SVG renderer work from the same tables.
export const defineGraph = (spec) => {
  const nodeRe = new RegExp(`^(${Object.keys(spec.nodes).join('|')})\\s+(${ID})(?:\\s+${STR})?${ATTRS}\\s*$`);
  const edgeRe = new RegExp(`^(${Object.keys(spec.edges).join('|')})\\s+(${ID})\\s*->\\s*(${ID})(?:\\s+${STR})?${ATTRS}\\s*$`);
  const init = spec.init ?? identity;
  const edgeLabel = spec.edgeLabel ?? ((edge) => edge.label);

  const parse = (lines, header) => {
    const model = { notation: spec.notation, kind: header.kind, title: header.title, nodes: [], edges: [], problems: [] };
    const pending = [];
    lines.forEach(({ n, text }) => {
      let match;
      if ((match = nodeRe.exec(text))) {
        const known = model.nodes.find((node) => node.id === match[2]);
        if (known) model.problems.push(problem(n, 'error', 'duplicate', { id: match[2], first: known.line }));
        else {
          const label = unquote(match[3] ?? match[2]);
          model.nodes.push(init({ id: match[2], kind: spec.nodes[match[1]], label, attrs: parseAttrs(match[4]), line: n }));
        }
      } else if ((match = edgeRe.exec(text))) {
        pending.push({ from: match[2], to: match[3], label: unquote(match[4] ?? ''), kind: spec.edges[match[1]], attrs: parseAttrs(match[5]), line: n });
      } else {
        model.problems.push(problem(n, 'error', 'syntax', { text }));
      }
    });
    pending.forEach((edge) => {
      const missing = [edge.from, edge.to].filter((id) => !model.nodes.some((node) => node.id === id));
      missing.forEach((id) => model.problems.push(problem(edge.line, 'error', 'unknown-ref', { id })));
      if (missing.length === 0) model.edges.push(edge);
    });
    model.problems.push(...spec.validate(model));
    model.empty = model.nodes.length === 0;
    return model;
  };

  const nameOf = (model) => new Map(model.nodes.map((node, index) => [node.id, `n${index}`]));
  const kindOf = (node) => spec.kinds[node.kind];

  const toDot = (model) => {
    const names = nameOf(model);
    const lines = ['digraph diagram {', '  rankdir=LR;', '  node [fontname="Helvetica"];', '  edge [fontname="Helvetica", fontsize=10];'];
    if (model.title) lines.push(`  label=${quoteDot(model.title)};`, '  labelloc=t;');
    model.nodes.forEach((node) => lines.push(`  ${names.get(node.id)} [label=${quoteDot(kindOf(node).text(node))}, ${kindOf(node).dot}];`));
    model.edges.forEach((edge) => {
      const label = edgeLabel(edge);
      lines.push(`  ${names.get(edge.from)} -> ${names.get(edge.to)} [${spec.edgeKinds[edge.kind].dot}${label ? `, label=${quoteDot(label)}` : ''}];`);
    });
    return [...lines, '}'].join('\n');
  };

  const toMermaid = (model) => {
    const names = nameOf(model);
    const text = (value) => String(value).replace(/"/g, '#quot;').replace(/\n/g, '<br/>');
    const lines = ['flowchart LR'];
    model.nodes.forEach((node) => {
      const [open, close] = kindOf(node).mermaid;
      lines.push(`  ${names.get(node.id)}${open}"${text(kindOf(node).text(node))}"${close}`);
    });
    model.edges.forEach((edge) => {
      const label = edgeLabel(edge);
      lines.push(`  ${names.get(edge.from)} ${spec.edgeKinds[edge.kind].mermaid}${label ? `|"${text(label)}"|` : ''} ${names.get(edge.to)}`);
    });
    return lines.join('\n');
  };

  const toPlantUml = (model) => {
    const names = nameOf(model);
    const text = (value) => String(value).replace(/"/g, "'").replace(/\r?\n/g, '\\n');
    const lines = ['@startuml', 'left to right direction'];
    if (model.title) lines.push(`title ${text(model.title)}`);
    model.nodes.forEach((node) => lines.push(`${kindOf(node).plantuml} "${text(kindOf(node).text(node))}" as ${names.get(node.id)}`));
    model.edges.forEach((edge) => {
      const label = edgeLabel(edge);
      lines.push(`${names.get(edge.from)} ${spec.edgeKinds[edge.kind].plantuml} ${names.get(edge.to)}${label ? ` : ${text(label)}` : ''}`);
    });
    return [...lines, '@enduml'].join('\n');
  };

  const render = (model) =>
    renderLayout({
      title: model.title,
      nodes: model.nodes,
      edges: model.edges,
      size: (node) => kindOf(node).size(node),
      draw: (item) => SHAPES[kindOf(item.node).shape](item),
      style: (edge, source, target) => spec.edgeKinds[edge.kind].look(edge, source, target),
      labelOf: edgeLabel,
    });

  return { parse, generators: { graphviz: toDot, mermaid: toMermaid, plantuml: toPlantUml, ...spec.custom }, render, spec };
};

export { plain };

// Shared structural checks for notations built around a start node, end nodes and flows between them
// (BPMN, UML activity, UML state machine, GOST flowcharts, IDEF3).
export const checkFlow = (model, cfg) => {
  const out = [];
  const { nodes, edges } = model;
  const incoming = new Map(nodes.map((node) => [node.id, []]));
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  edges.forEach((edge) => {
    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  });
  const starts = nodes.filter((node) => cfg.start.includes(node.kind));
  const ends = nodes.filter((node) => cfg.end.includes(node.kind));
  if (starts.length === 0) out.push(problem(1, 'error', 'flow-no-start', { kind: cfg.start[0] }));
  starts.slice(1).forEach((node) => out.push(problem(node.line, 'error', 'flow-multi-start', { kind: cfg.start[0], id: node.id })));
  if (cfg.requireEnd && ends.length === 0) out.push(problem(1, 'error', 'flow-no-end', { kind: cfg.end[0] }));
  starts.forEach((node) => incoming.get(node.id).forEach((edge) => out.push(problem(edge.line, 'error', 'flow-start-incoming', { id: node.id }))));
  ends.forEach((node) => outgoing.get(node.id).forEach((edge) => out.push(problem(edge.line, 'error', 'flow-end-outgoing', { id: node.id }))));

  const reached = new Set(starts.map((node) => node.id));
  const queue = [...reached];
  while (queue.length > 0) {
    outgoing.get(queue.shift()).forEach(({ to }) => {
      if (!reached.has(to)) {
        reached.add(to);
        queue.push(to);
      }
    });
  }
  if (starts.length > 0)
    nodes.filter((node) => !reached.has(node.id)).forEach((node) => out.push(problem(node.line, 'error', 'flow-unreachable', { id: node.id })));

  nodes
    .filter((node) => reached.has(node.id) && !cfg.end.includes(node.kind) && outgoing.get(node.id).length === 0)
    .forEach((node) => out.push(problem(node.line, cfg.deadEnd, 'flow-dead-end', { id: node.id })));

  nodes
    .filter((node) => cfg.gateways.includes(node.kind))
    .forEach((node) => {
      const ins = incoming.get(node.id).length;
      const outs = outgoing.get(node.id).length;
      if (ins >= 2 && outs >= 2) out.push(problem(node.line, 'warning', 'gateway-mixed', { id: node.id }));
      else if (ins <= 1 && outs <= 1) out.push(problem(node.line, 'warning', 'gateway-neither', { id: node.id }));
      else if (outs >= 2 && cfg.labelled.includes(node.kind)) {
        outgoing
          .get(node.id)
          .filter((edge) => edge.label === '')
          .forEach((edge) => out.push(problem(edge.line, 'warning', 'flow-unlabelled-branch', { id: node.id })));
      }
    });
  return out;
};
