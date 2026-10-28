import { TEMPLATES, parseDiagram } from '../notations/index.js';

const HOUR = 3600000;
// The diagrams of the first visit: one of the first notations each, changed at different times, some of them published.
const PLAN = [
  ['idef0', 2 * HOUR, true],
  ['bpmn', 26 * HOUR, false],
  ['uml-class', 3 * 24 * HOUR, true],
  ['erd', 6 * 24 * HOUR, false],
  ['dfd', 12 * 24 * HOUR, true],
  ['petri', 30 * 24 * HOUR, false],
];

export const starterProjects = () =>
  PLAN.map(([notation, age, published]) => ({
    title: parseDiagram(TEMPLATES[notation]).title,
    notation,
    source: TEMPLATES[notation],
    age,
    published,
  }));
