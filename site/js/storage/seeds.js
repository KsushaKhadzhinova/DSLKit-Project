import { NOTATION_KEYS, TEMPLATES, parseDiagram } from '../notations/index.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;
// The diagrams of the first visit: the first six are the most used notations, changed at different times, some of them published.
const FIRST = [
  ['idef0', 2 * HOUR, true],
  ['bpmn', 26 * HOUR, false],
  ['uml-class', 3 * DAY, true],
  ['erd', 6 * DAY, false],
  ['dfd', 12 * DAY, true],
  ['petri', 30 * DAY, false],
];
// Every other notation of the editor follows, older and older, every third one published, so the list has an example of each kind.
const REST = NOTATION_KEYS.filter((key) => !FIRST.some(([notation]) => notation === key)).map((key, index) => [key, (31 + index) * DAY, index % 3 === 0]);
const PLAN = [...FIRST, ...REST];

export const starterProjects = () =>
  PLAN.map(([notation, age, published]) => ({
    title: parseDiagram(TEMPLATES[notation]).title,
    notation,
    source: TEMPLATES[notation],
    age,
    published,
  }));
