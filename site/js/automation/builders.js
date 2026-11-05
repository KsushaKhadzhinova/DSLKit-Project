// The builders: a parsed description becomes DSLKit code for one of five notations. A builder returns null when the description has nothing for its notation.
import { isExternal, isStore } from './describe.js';

const NL = String.fromCharCode(10);
const WORDS = {
  ru: {
    start: 'Начало',
    end: 'Конец',
    yes: 'Да',
    no: 'Нет',
    process: 'Процесс',
    erd: 'Модель данных',
    sequence: 'Взаимодействие',
    dfd: 'Потоки данных',

    flowchart: 'Алгоритм',
  },
  en: {
    start: 'Start',
    end: 'End',
    yes: 'Yes',
    no: 'No',
    process: 'Process',
    erd: 'Data model',
    sequence: 'Interaction',
    dfd: 'Data flows',

    flowchart: 'Algorithm',
  },
};
const IO = /^(?:ввод|ввест|введите|вывод|вывест|выведите|читать|прочита|печат|input|read|output|print|display|show|enter)/i;
const PREPARATION = /^(?:задать|присво|инициализ|установ|set |initiali[sz]e|assign)/i;

const header = (notation, title, fallback) => `diagram ${notation} "${title || fallback}"`;

// A flowchart walker shared by BPMN and the GOST flowchart: it keeps the open ends ("tails") and joins them before the next element.
const walkSteps = (steps, T) => {
  const lines = [];
  const edges = [];
  const count = {};
  const next = (prefix) => {
    count[prefix] = (count[prefix] ?? 0) + 1;
    return `${prefix}${count[prefix]}`;
  };
  let tails = [{ id: 's' }];
  const link = (from, to, label) => edges.push(`flow ${from} -> ${to}${label ? ` "${label}"` : ''}`);
  const add = (line, id) => {
    if (tails.length > 1 && T.merge) {
      const merge = next('m');
      lines.push(T.merge(merge));
      tails.forEach((tail) => link(tail.id, merge, tail.label));
      tails = [{ id: merge }];
    }
    lines.push(line);
    tails.forEach((tail) => link(tail.id, id, tail.label));
    tails = [{ id }];
    return id;
  };
  const task = (text) => {
    const id = next('t');
    return add(T.task(id, text), id);
  };
  lines.push(T.start('s'));
  steps.forEach((step) => {
    if (step.type === 'step') return task(step.text);
    const id = next('g');
    add(T.decision(id, step.cond), id);
    if (step.type === 'loop') {
      tails = [{ id, label: T.yes }];
      const body = task(step.body);
      link(body, id);
      tails = [{ id, label: T.no }];
      return null;
    }
    tails = [{ id, label: T.yes }];
    const yes = task(step.yes);
    tails = [{ id, label: T.no }];
    const no = step.no ? [{ id: task(step.no) }] : [{ id, label: T.no }];
    tails = [{ id: yes }, ...no];
    return null;
  });
  add(T.end('e'), 'e');
  return [...lines, ...edges];
};

export const buildBpmn = (parsed) => {
  if (parsed.steps.length === 0) return null;
  const w = WORDS[parsed.lang];
  const body = walkSteps(parsed.steps, {
    yes: w.yes,
    no: w.no,
    start: (id) => `start ${id} "${w.start}"`,
    end: (id) => `end ${id} "${w.end}"`,
    task: (id, text) => `task ${id} "${text}"`,
    decision: (id, text) => `exclusive ${id} "${text}"`,
    merge: (id) => `exclusive ${id}`,
  });
  return [header('bpmn', parsed.title, w.process), ...body].join(NL);
};

export const buildGost = (parsed) => {
  if (parsed.steps.length === 0) return null;
  const w = WORDS[parsed.lang];
  const kind = (text) => (IO.test(text) ? 'io' : PREPARATION.test(text) ? 'preparation' : 'process');
  const body = walkSteps(parsed.steps, {
    yes: w.yes,
    no: w.no,
    start: (id) => `start ${id} "${w.start}"`,
    end: (id) => `end ${id} "${w.end}"`,
    task: (id, text) => `${kind(text)} ${id} "${text}"`,
    decision: (id, text) => `decision ${id} "${text}"`,
  });
  return [header('gost', parsed.title, w.flowchart), ...body].join(NL);
};

const entityBlock = (entity) => {
  const attrs = entity.attrs.some((attr) => attr.name === 'id') ? entity.attrs : [{ name: 'id', type: 'int', key: true }, ...entity.attrs];
  return [`entity ${entity.name} {`, ...attrs.map((attr) => `  ${attr.name}: ${attr.type}${attr.name === 'id' ? ' pk' : ''}`), '}'];
};

export const buildErd = (parsed) => {
  const { entities, relations } = parsed.data;
  if (entities.length === 0) return null;
  const w = WORDS[parsed.lang];
  const seen = new Set();
  const unique = relations.filter((relation) => {
    const key = `${relation.from}|${relation.to}|${relation.card}`;
    return seen.has(key) ? false : seen.add(key);
  });
  return [
    header('erd', parsed.title, w.erd),
    ...entities.flatMap(entityBlock),
    ...unique.map((relation) => `relationship ${relation.from} ${relation.card} ${relation.to} "${relation.label}"`),
  ].join(NL);
};

const participants = (messages) => [...new Set(messages.flatMap((message) => [message.from, message.to]))];

export const buildSequence = (parsed) => {
  if (parsed.messages.length === 0) return null;
  const w = WORDS[parsed.lang];
  return [
    header('uml sequence', parsed.title, w.sequence),
    ...participants(parsed.messages).map((name) => `${isExternal(name) ? 'actor' : 'participant'} ${name}`),
    ...parsed.messages.map((message) => `${message.from} ${message.kind === 'return' ? '-->' : '->'} ${message.to} : ${message.text}`),
  ].join(NL);
};

export const buildDfd = (parsed) => {
  if (parsed.messages.length === 0) return null;
  const w = WORDS[parsed.lang];
  let processes = 0;
  let stores = 0;
  const declared = participants(parsed.messages).map((name) => {
    if (isStore(name)) return { name, id: `D${(stores += 1)}`, line: `store D${stores} "${name}"` };
    if (isExternal(name)) return { name, id: name, line: `entity ${name}` };
    processes += 1;
    return { name, id: `p${processes}`, line: `process p${processes} "${name}"` };
  });
  const idOf = (name) => declared.find((item) => item.name === name).id;
  return [
    header('dfd', parsed.title, w.dfd),
    ...declared.map((item) => item.line),
    ...parsed.messages.map((message) => `flow ${idOf(message.from)} -> ${idOf(message.to)} "${message.rest}"`),
  ].join(NL);
};

export const BUILDERS = { bpmn: buildBpmn, gost: buildGost, erd: buildErd, 'uml-sequence': buildSequence, dfd: buildDfd };
export const BUILDABLE = Object.keys(BUILDERS);
