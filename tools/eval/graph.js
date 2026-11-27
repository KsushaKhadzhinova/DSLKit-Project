import { normalize } from '../../site/js/expert/review.js';

// One comparable shape of a diagram: elements { label, type } and relations [from, to] (indexes of the elements).
// The types are coarse on purpose: 'd' a decision, 'a' an actor, an entity or a participant, 's' a store, '' any other step.
const DECISION = new Set(['decision', 'exclusive', 'inclusive', 'complex', 'event-based']);
const GATEWAY = new Set([...DECISION, 'parallel']);
const ENDS = /^(?:start|end|initial|final|stop|terminate)/;
const ACTOR_NOTATIONS = new Set(['erd', 'uml-sequence']);

const typeOf = (node, notation) => {
  if (DECISION.has(node.kind)) return 'd';
  if (node.kind === 'store') return 's';
  if (node.kind === 'entity' || ACTOR_NOTATIONS.has(notation)) return 'a';
  return '';
};

// A gateway that has no text of its own (its label is its id) only splits or joins flows, so it is not an element: the flows go through it.
const contractBare = (nodes, edges) => {
  const bare = new Set(nodes.filter((node) => GATEWAY.has(node.kind) && node.label === node.id).map((node) => node.id));
  let current = edges;
  bare.forEach((id) => {
    const into = current.filter((edge) => edge.to === id && edge.from !== id);
    const out = current.filter((edge) => edge.from === id && edge.to !== id);
    const rest = current.filter((edge) => edge.from !== id && edge.to !== id);
    current = [...rest, ...into.flatMap((a) => out.map((b) => ({ from: a.from, to: b.to })))];
  });
  return { nodes: nodes.filter((node) => !bare.has(node.id)), edges: current };
};

// The model of parseDiagram becomes a graph without the start and end marks.
export const toGraph = (model) => {
  const shape = normalize(model);
  const { nodes, edges } = contractBare(shape.nodes, shape.edges);
  const kept = nodes.filter((node) => !ENDS.test(node.kind));
  const index = new Map(kept.map((node, at) => [node.id, at]));
  return {
    elements: kept.map((node) => ({ label: node.label, type: typeOf(node, model.notation) })),
    relations: edges.filter((edge) => index.has(edge.from) && index.has(edge.to)).map((edge) => [index.get(edge.from), index.get(edge.to)]),
  };
};

// A gold entry: elements are "label", "d:label" (decision), "a:label" (actor, entity), "s:label" (store); relations are "0-1-2 2-3" chains of indexes.
export const goldGraph = ({ el, rel }) => ({
  elements: el.map((text) => {
    const found = /^([das]):(.*)$/.exec(text);
    return found ? { label: found[2], type: found[1] } : { label: text, type: '' };
  }),
  relations: rel
    .split(/\s+/)
    .filter((chain) => chain !== '')
    .flatMap((chain) => {
      const ids = chain.split('-').map(Number);
      return ids.slice(1).map((to, at) => [ids[at], to]);
    }),
});
