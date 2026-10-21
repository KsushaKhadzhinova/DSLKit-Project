import { toDot, toMermaid, toPlantUml } from '../utils/dataParser.js';
import { generators as classGenerators, parseClassModel, render as renderClass } from './class.js';
import { parseHeader, problem, sourceLines } from './common.js';
import { erGenerators, erd, idef1, idef1x, renderEr } from './er.js';
import { dag, graphNotation, parseGraphTheory } from './graphs.js';
import { parseIdef0 } from './idef0.js';
import { generators as sequenceGenerators, parseSequence, render as renderSequence } from './sequence.js';
import { activity, bpmn, dfd, gostFlow, idef3, petri, state, usecase } from './specs.js';
import { communication, component, composite, deployment, idef5, object, overview, packages, profile } from './specs-uml.js';
import { generators as timingGenerators, parseTiming, render as renderTiming } from './timing.js';

export { analyzeDag, analyzeGraph, dijkstra, topologicalOrder } from './graphs.js';
export { MESSAGES, formatProblem } from './messages.js';
export { enabledTransitions, fire, initialMarking, isDeadlock } from './specs.js';
export { KEYWORDS, TEMPLATES } from './templates.js';

const fromSpec = (impl) => ({ parse: impl.parse, generators: impl.generators, render: impl.render });
const entry = (short, ru, en, impl) => ({ short, name: { ru, en }, ...impl });

const idef4 = (lines, header) => {
  const model = parseClassModel(lines, header, 'idef4');
  model.classes
    .filter((cls) => cls.stereotype === 'interface')
    .forEach((cls) => model.problems.push(problem(cls.line, 'warning', 'idef4-construct', { what: `interface ${cls.id}` })));
  model.relations
    .filter((relation) => relation.kind === 'realization')
    .forEach((relation) => model.problems.push(problem(relation.line, 'warning', 'idef4-construct', { what: 'realization' })));
  return model;
};

// Every notation of the editor. `generators` lists the text formats it can be exported to; `render` draws it in the browser.
export const NOTATIONS = {
  idef0: entry('IDEF0', 'IDEF0 — функциональное моделирование', 'IDEF0 — function modelling', {
    parse: (lines, header, source) => parseIdef0(source),
    generators: { graphviz: toDot, mermaid: toMermaid, plantuml: toPlantUml },
    render: null,
  }),
  idef1: entry('IDEF1', 'IDEF1 — информационное моделирование', 'IDEF1 — information modelling', { parse: idef1, generators: erGenerators, render: renderEr }),
  idef1x: entry('IDEF1X', 'IDEF1X — моделирование данных', 'IDEF1X — data modelling', { parse: idef1x, generators: erGenerators, render: renderEr }),
  idef3: entry('IDEF3', 'IDEF3 — потоки работ', 'IDEF3 — process flows', fromSpec(idef3)),
  idef4: entry('IDEF4', 'IDEF4 — объектно-ориентированное проектирование', 'IDEF4 — object-oriented design', {
    parse: idef4,
    generators: classGenerators,
    render: renderClass,
  }),
  idef5: entry('IDEF5', 'IDEF5 — онтологическое описание', 'IDEF5 — ontology description', fromSpec(idef5)),
  dfd: entry('DFD', 'DFD — диаграмма потоков данных', 'DFD — data flow diagram', fromSpec(dfd)),
  erd: entry('ERD', 'ERD — диаграмма «сущность — связь»', 'ERD — entity-relationship diagram', { parse: erd, generators: erGenerators, render: renderEr }),
  bpmn: entry('BPMN', 'BPMN — бизнес-процессы', 'BPMN — business processes', fromSpec(bpmn)),
  petri: entry('Petri', 'Сети Петри', 'Petri nets', fromSpec(petri)),
  gost: entry('ГОСТ', 'Блок-схемы по ГОСТ 19.701-90', 'GOST 19.701-90 flowcharts', fromSpec(gostFlow)),
  graph: entry('Graph', 'Графы', 'Graphs', { parse: parseGraphTheory, ...graphNotation }),
  dag: entry('DAG', 'DAG — ориентированный ациклический граф', 'DAG — directed acyclic graph', fromSpec(dag)),
  'uml-class': entry('UML · Class', 'UML — диаграмма классов', 'UML — class diagram', {
    parse: (lines, header) => parseClassModel(lines, header, 'uml-class'),
    generators: classGenerators,
    render: renderClass,
  }),
  'uml-object': entry('UML · Object', 'UML — диаграмма объектов', 'UML — object diagram', fromSpec(object)),
  'uml-component': entry('UML · Component', 'UML — диаграмма компонентов', 'UML — component diagram', fromSpec(component)),
  'uml-composite': entry('UML · Composite', 'UML — составная структура', 'UML — composite structure diagram', fromSpec(composite)),
  'uml-deployment': entry('UML · Deployment', 'UML — диаграмма развёртывания', 'UML — deployment diagram', fromSpec(deployment)),
  'uml-package': entry('UML · Package', 'UML — диаграмма пакетов', 'UML — package diagram', fromSpec(packages)),
  'uml-profile': entry('UML · Profile', 'UML — диаграмма профилей', 'UML — profile diagram', fromSpec(profile)),
  'uml-usecase': entry('UML · Use case', 'UML — диаграмма вариантов использования', 'UML — use case diagram', fromSpec(usecase)),
  'uml-activity': entry('UML · Activity', 'UML — диаграмма деятельности', 'UML — activity diagram', fromSpec(activity)),
  'uml-state': entry('UML · State', 'UML — диаграмма состояний', 'UML — state machine diagram', fromSpec(state)),
  'uml-sequence': entry('UML · Sequence', 'UML — диаграмма последовательности', 'UML — sequence diagram', {
    parse: parseSequence,
    generators: sequenceGenerators,
    render: renderSequence,
  }),
  'uml-communication': entry('UML · Communication', 'UML — диаграмма коммуникации', 'UML — communication diagram', fromSpec(communication)),
  'uml-timing': entry('UML · Timing', 'UML — диаграмма синхронизации', 'UML — timing diagram', {
    parse: parseTiming,
    generators: timingGenerators,
    render: renderTiming,
  }),
  'uml-overview': entry('UML · Overview', 'UML — обзор взаимодействий', 'UML — interaction overview diagram', fromSpec(overview)),
};

export const NOTATION_KEYS = Object.keys(NOTATIONS);
const UML_KINDS = NOTATION_KEYS.filter((key) => key.startsWith('uml-')).map((key) => key.slice(4));
const BASE_NAMES = [...new Set(NOTATION_KEYS.map((key) => key.split('-')[0]))];

const sortProblems = (model) => {
  model.problems = model.problems
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.line - b.item.line || a.index - b.index)
    .map(({ item }) => item);
  return model;
};

// Reads a source with a `diagram <notation> ["Title"]` first line. UML diagrams add the kind: `diagram uml class "Title"`.
export const parseDiagram = (source) => {
  const lines = sourceLines(source);
  const header = lines.length > 0 ? parseHeader(lines[0].text) : null;
  if (header === null) {
    const model = parseIdef0(source);
    if (lines.length > 0) model.problems.unshift(problem(lines[0].n, 'warning', 'no-header'));
    return sortProblems(model);
  }
  const failed = (code, params) => ({ notation: null, kind: '', title: header.title, empty: true, problems: [problem(lines[0].n, 'error', code, params)] });
  let key = header.notation;
  const extra = [];
  if (key === 'uml') {
    if (header.kind === '') return failed('header-kind', { list: UML_KINDS.join(', ') });
    key = `uml-${header.kind}`;
    if (!(key in NOTATIONS)) return failed('header-kind-unknown', { name: header.kind, list: UML_KINDS.join(', ') });
  } else if (!(key in NOTATIONS)) return failed('header-unknown', { name: key, list: BASE_NAMES.join(', ') });
  else if (header.kind !== '') extra.push(problem(lines[0].n, 'warning', 'header-extra', { name: key, kind: header.kind }));
  const model = NOTATIONS[key].parse(lines.slice(1), header, source);
  model.notation = key;
  model.problems.unshift(...extra);
  return sortProblems(model);
};

const FALLBACK = ['plantuml', 'mermaid', 'graphviz'];
const keyOf = (model) => model.notation ?? 'idef0';

// The text format a notation can really produce: the wanted one, or the first it supports.
export const pickFormat = (model, wanted) => {
  const formats = Object.keys(NOTATIONS[keyOf(model)].generators);
  return formats.includes(wanted) ? wanted : FALLBACK.find((format) => formats.includes(format));
};

export const generate = (model, format) => NOTATIONS[keyOf(model)].generators[pickFormat(model, format)](model);

// Notations other than IDEF0 are drawn by their own renderer; IDEF0 keeps the original box renderer.
export const hasLocalRenderer = (model) => NOTATIONS[keyOf(model)].render !== null;
export const renderNotation = (model) => NOTATIONS[keyOf(model)].render(model);

export const notationName = (model, lang) => NOTATIONS[keyOf(model)].name[lang === 'en' ? 'en' : 'ru'];
export const notationShort = (model) => NOTATIONS[keyOf(model)].short;
