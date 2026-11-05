import { parseDiagram } from '../notations/index.js';
import { createFacts, infer, conclusions } from './engine.js';
import { KB_NOTATION } from './kb-notation.js';
import { KB_REVIEW } from './kb-review.js';

const FLOW = new Set(['bpmn', 'gost', 'uml-activity', 'uml-state']);
const ACYCLIC = new Set(['dag', 'orgchart', 'mindmap', 'decision']);
const START = /start|initial/;
const END = /end|final|stop|terminate/;
const LONG_LABEL = 40;
const PRIORITY = { high: 0, medium: 1, low: 2 };

// One shape for every notation: the elements and the links with their lines.
export const normalize = (model) => {
  const boxes = (model.boxes ?? []).map((box, index) => ({ id: box.id, label: box.name, line: model.boxLines?.[index], kind: 'box' }));
  const items = model.nodes ?? model.vertices ?? model.entities ?? model.classes ?? model.participants ?? model.lifelines ?? boxes;
  const nodes = items.map((item) => ({ id: String(item.id), label: String(item.label ?? item.id), line: item.line, kind: String(item.kind ?? '') }));
  const links = model.edges ?? model.relations ?? model.messages ?? (model.arrows ?? []).map((arrow, index) => ({ ...arrow, line: model.arrowLines?.[index] }));
  return { nodes, edges: links.map((link) => ({ from: String(link.from), to: String(link.to), line: link.line })) };
};

// Back edges of a depth-first walk are the cycles; the depth is the longest chain that does not use them.
const walk = ({ nodes, edges }) => {
  const next = new Map(nodes.map((node) => [node.id, []]));
  edges.forEach((edge) => next.get(edge.from)?.push(edge));
  const state = new Map();
  const depth = new Map();
  const back = [];
  const visit = (id) => {
    state.set(id, 1);
    let best = 0;
    next.get(id).forEach((edge) => {
      if (!next.has(edge.to)) return;
      if (state.get(edge.to) === 1) return back.push(edge);
      if (state.get(edge.to) === undefined) visit(edge.to);
      best = Math.max(best, 1 + depth.get(edge.to));
    });
    depth.set(id, best);
    state.set(id, 2);
  };
  nodes.forEach((node) => state.has(node.id) || visit(node.id));
  return { cycles: back, depth: Math.max(0, ...depth.values()) };
};

const groupLines = (groups) => groups.flatMap((group) => group.map((node) => node.line));
const lineList = (lines) => [...new Set(lines.filter((line) => Number.isInteger(line)))].sort((a, b) => a - b);

// The facts of a review, from the model of the diagram.
export const extractFacts = (model) => {
  const { nodes, edges } = normalize(model);
  const key = model.notation ?? 'idef0';
  const { cycles, depth } = walk({ nodes, edges });
  const used = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  const dangling = edges.length > 0 || nodes.length > 1 ? nodes.filter((node) => !used.has(node.id)) : [];
  const long = nodes.filter((node) => node.label.length > LONG_LABEL);
  const byLabel = Map.groupBy(nodes, (node) => node.label.trim().toLowerCase());
  const duplicates = [...byLabel.values()].filter((group) => group.length > 1);
  const byId = Map.groupBy(nodes, (node) => node.id.toLowerCase());
  const caseGroups = [...byId.values()].filter((group) => new Set(group.map((node) => node.id)).size > 1);
  const russian = nodes.filter((node) => /[а-яё]/i.test(node.label) && !/[a-z]/i.test(node.label));
  const latin = nodes.filter((node) => /[a-z]/i.test(node.label) && !/[а-яё]/i.test(node.label));
  const mixed = russian.length >= 2 && latin.length >= 2;
  const odd = russian.length < latin.length ? russian : latin;
  const errors = model.problems.filter((item) => item.severity === 'error');
  const flow = FLOW.has(key);
  return {
    notation: key,
    nodes: nodes.length,
    edges: edges.length,
    empty: nodes.length === 0,
    single: nodes.length === 1,
    errors: errors.length,
    errorLines: lineList(errors.map((item) => item.line)),
    warnings: model.problems.length - errors.length,
    dangling: dangling.length,
    danglingLines: lineList(dangling.map((node) => node.line)),
    cycles: cycles.length,
    cycleLines: lineList(cycles.map((edge) => edge.line)),
    acyclic: ACYCLIC.has(key),
    flow,
    noStart: flow && !nodes.some((node) => START.test(node.kind)),
    noEnd: flow && !nodes.some((node) => END.test(node.kind)),
    longLabels: long.length,
    longLines: lineList(long.map((node) => node.line)),
    duplicates: duplicates.length,
    duplicateLines: lineList(groupLines(duplicates)),
    caseIds: caseGroups.length,
    caseLines: lineList(groupLines(caseGroups)),
    depth,
    mixed,
    mixedLines: mixed ? lineList(odd.map((node) => node.line)) : [],
  };
};

const fill = (text, facts, lines) => text.replace(/\{(\w+)\}/g, (_, name) => (name === 'lines' ? lines.join(', ') : String(facts[name])));

// The review of a code: facts, the fired rules and the recommendations (the important first, each with its lines).
export const reviewDiagram = (code, lang = 'ru', rules = KB_REVIEW.rules) => {
  const model = parseDiagram(code);
  const facts = extractFacts(model);
  const { trace } = infer(rules, createFacts(facts));
  const byId = new Map(rules.map((item) => [item.id, item]));
  const recommendations = trace
    .filter((step) => byId.get(step.rule).priority !== undefined)
    .map((step) => {
      const item = byId.get(step.rule);
      const lines = item.lines ? facts[item.lines] : [];
      return {
        id: item.id,
        priority: item.priority,
        cf: step.result,
        lines,
        text: fill(item.text[lang], facts, lines),
        reason: fill(item.reason[lang], facts, lines),
      };
    })
    .sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority] || b.cf - a.cf || a.id.localeCompare(b.id));
  return { facts, trace, recommendations };
};

// The facts of a free description: every task whose words occur in the text gets a certainty that grows with the number of words.
export const factsFromDescription = (text, keywords = KB_NOTATION.keywords) => {
  const low = String(text).toLowerCase();
  const facts = {};
  Object.entries(keywords).forEach(([task, words]) => {
    const found = [...words.ru, ...words.en].filter((word) => low.includes(word)).length;
    if (found > 0) facts[`task:${task}`] = { value: true, cf: Math.min(0.9, 0.35 + 0.2 * found) };
  });
  return facts;
};

// The best notations for the facts: [{ key, cf }].
export const rankNotations = (facts, rules = KB_NOTATION.rules) => {
  const { facts: all, trace } = infer(rules, facts);
  return { ranking: conclusions(all, 'notation:').map((item) => ({ key: item.fact.slice('notation:'.length), cf: item.cf })), trace, facts: all };
};

// The trace of a run as readable lines: the rule, its reason, the conclusion and its certainty in percent.
export const traceLines = (trace, rules, lang = 'ru') =>
  trace.map((step) => {
    const found = rules.find((item) => item.id === step.rule);
    return `${step.rule}: ${found.reason[lang]} → ${step.fact} (${Math.round(step.result * 100)} %)`;
  });
