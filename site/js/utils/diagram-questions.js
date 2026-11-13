import { NOTATIONS, NOTATION_KEYS, formatProblem, parseDiagram } from '../notations/index.js';
import { parseHeader } from '../notations/common.js';

// Clarifying questions for an incomplete or ambiguous diagram. The rules are deterministic: they read the DSLKit code through the project parser,
// find what is missing (names, start and end, links, labels, cardinality, IDEF0 ports, actors, unknown types) and turn every gap into a question.
// Every question carries `apply(answer, code)`, which writes the answer into the code; the lines are found by their content, never by a number,
// so the answers can be applied in any order even after earlier answers added lines.
export const MAX_ANSWER = 120;
const START_KINDS = ['start', 'initial'];
const END_KINDS = ['end', 'final'];
// Elements that are drawn as a symbol and need no name.
const ANONYMOUS = ['start', 'end', 'initial', 'final', 'fork', 'join', 'merge', 'and', 'or', 'xor', 'connector', 'offpage'];
const CARDINALITIES = ['1:1', '1:N', 'N:1', 'N:M'];
const HEADER_PROBLEMS = ['header-unknown', 'header-kind', 'header-kind-unknown'];

const both = (ru, en = ru) => ({ ru, en });
const option = (value, ru, en = ru) => ({ value, label: both(ru, en) });
const escapeRe = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (text) => String(text).replace(/\s+/g, ' ').trim().slice(0, MAX_ANSWER);
const quoted = (text) => `"${clean(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const splitLines = (code) => code.split(/\r?\n/);
const headerAt = (lines) => lines.findIndex((line) => line.trim() !== '' && !line.trim().startsWith('//'));

// `diagram uml class "Title"` for the key `uml-class`.
const headerText = (key, title) => `diagram ${key.startsWith('uml-') ? `uml ${key.slice(4)}` : key}${title ? ` ${quoted(title)}` : ''}`;
const nodeLabel = (node) => (node.label === node.id ? node.id : `${node.label} (${node.id})`);
const nodeOptions = (nodes) => nodes.map((node) => option(node.id, nodeLabel(node)));
const isOption = (question, answer) => question.options.some((item) => item.value === answer);

// Writing helpers: they get the lines and return the new code, or the same code when nothing fits.
const append = (code, text) => `${code.replace(/\s+$/, '')}\n${text}${code.endsWith('\n') ? '\n' : ''}`;
const insertAfter = (code, index, text) => {
  const lines = splitLines(code);
  lines.splice(index + 1, 0, text);
  return lines.join('\n');
};
const insertDeclaration = (code, text, declaration = null) => {
  const lines = splitLines(code);
  const last = declaration === null ? -1 : lines.findLastIndex((line) => declaration.test(line));
  return insertAfter(code, last >= 0 ? last : headerAt(lines), text);
};
const editLine = (code, find, change) => {
  const lines = splitLines(code);
  const at = lines.findIndex(find);
  if (at < 0) return code;
  lines[at] = change(lines[at]);
  return lines.join('\n');
};
const unique = (base, taken) => {
  let id = base;
  for (let n = 2; taken.includes(id); n += 1) id = `${base}${n}`;
  return id;
};

const nodeStart = (id) => new RegExp(`^\\s*[\\w-]+\\s+${escapeRe(id)}(?=\\s|$)`);
const edgeStart = (from, to) => new RegExp(`^\\s*[\\w-]+\\s+${escapeRe(from)}\\s*->\\s*${escapeRe(to)}(?=\\s|$)`);
const addAfterMatch = (re, text) => (line) => line.replace(re, (head) => `${head} ${text}`);
const sameText = (text) => (line) => line.trim() === text;

const question = (id, kind, text, extra) => ({ id, kind, text, options: [], priority: 2, target: { line: 0, id: '' }, ...extra });

// ---------- the header ----------
const headerQuestions = ({ lines, model, notation }) => {
  const bad = model.problems.some((item) => HEADER_PROBLEMS.includes(item.code));
  const missing = model.problems.some((item) => item.code === 'no-header');
  if (!bad && !missing) return [];
  const keys = NOTATION_KEYS.includes(notation) ? [notation, ...NOTATION_KEYS.filter((key) => key !== notation)] : NOTATION_KEYS;
  const at = headerAt(lines);
  return [
    question('header', 'choice', both('Какая это нотация?', 'Which notation is this?'), {
      options: keys.map((key) => option(key, NOTATIONS[key].name.ru, NOTATIONS[key].name.en)),
      target: { line: at + 1, id: '' },
      priority: 0,
      apply(answer, code) {
        if (!isOption(this, answer)) return code;
        if (missing) return `${headerText(answer)}\n${code}`;
        const where = headerAt(splitLines(code));
        return editLine(
          code,
          (_, index) => index === where,
          (line) => headerText(answer, parseHeader(line.trim()).title),
        );
      },
    }),
  ];
};

// ---------- flow notations: start and end ----------
const keywordOf = (spec, kinds) => Object.keys(spec.nodes).find((word) => kinds.includes(spec.nodes[word]));
const edgeWord = (spec) => Object.keys(spec.edges)[0];

const addStart = (spec, code) => {
  const word = keywordOf(spec, START_KINDS);
  const model = parseDiagram(code);
  const steps = model.nodes.filter((node) => !START_KINDS.includes(node.kind));
  // A step nobody leads to is the natural first one; in a closed loop the first declared step is taken.
  const first = steps.find((node) => !model.edges.some((edge) => edge.to === node.id)) ?? steps[0];
  const id = unique(
    'start',
    model.nodes.map((node) => node.id),
  );
  return append(insertDeclaration(code, `${word} ${id} "Start"`), `${edgeWord(spec)} ${id} -> ${first.id}`);
};
const addEnd = (spec, code) => {
  const word = keywordOf(spec, END_KINDS);
  const model = parseDiagram(code);
  const steps = model.nodes.filter((node) => !END_KINDS.includes(node.kind));
  const open = steps.filter((node) => !model.edges.some((edge) => edge.from === node.id));
  const sinks = open.length > 0 ? open : steps.slice(-1);
  const id = unique(
    'end',
    model.nodes.map((node) => node.id),
  );
  const edges = sinks.map((node) => `${edgeWord(spec)} ${node.id} -> ${id}`).join('\n');
  return append(append(code, `${word} ${id} "End"`), edges);
};

const edgeOf = (model, problem) => model.edges.find((edge) => edge.line === problem.line);

const POOLS = {
  all: () => true,
  outside: (node) => ['entity', 'store'].includes(node.kind),
};
const CONNECTIONS = {
  isolated: { out: true, pool: 'all', text: (id) => both(`С каким элементом связать «${id}»?`, `Which element should "${id}" be connected to?`) },
  'flow-dead-end': { out: true, pool: 'all', text: (id) => both(`Куда ведёт «${id}»?`, `Where does "${id}" lead?`) },
  'flow-unreachable': { out: false, pool: 'all', text: (id) => both(`Какой элемент ведёт к «${id}»?`, `Which element leads to "${id}"?`) },
  'dfd-miracle': {
    out: false,
    pool: 'outside',
    text: (id) => both(`Откуда в процесс «${id}» приходят данные?`, `Where does the data for process "${id}" come from?`),
  },
  'dfd-black-hole': {
    out: true,
    pool: 'outside',
    text: (id) => both(`Куда процесс «${id}» отправляет результат?`, `Where does process "${id}" send its result?`),
  },
};

const connectQuestion = (ctx, item, rule) => {
  const { model, spec } = ctx;
  const node = model.nodes.find((entry) => entry.id === item.params.id);
  const others = model.nodes.filter((entry) => entry.id !== node.id && POOLS[rule.pool](entry));
  if (others.length === 0) return [];
  return [
    question(`connect:${node.id}:${rule.out ? 'out' : 'in'}`, 'choice', rule.text(node.id), {
      options: nodeOptions(others),
      target: { line: node.line, id: node.id },
      priority: item.severity === 'error' ? 1 : 2,
      apply(answer, code) {
        if (!isOption(this, answer)) return code;
        return append(code, `${edgeWord(spec)} ${rule.out ? `${node.id} -> ${answer}` : `${answer} -> ${node.id}`}`);
      },
    }),
  ];
};

const labelQuestion = (ctx, item) => {
  const edge = edgeOf(ctx.model, item);
  const word = ctx.lines[item.line - 1].trim().split(/\s+/)[0];
  const re = edgeStart(edge.from, edge.to);
  return [
    question(
      `label:${edge.from}->${edge.to}`,
      'text',
      both(`Как назвать связь «${edge.from}» → «${edge.to}»?`, `What is the label of the link "${edge.from}" → "${edge.to}"?`),
      {
        target: { line: edge.line, id: `${edge.from}->${edge.to}` },
        priority: 2,
        apply: (answer, code) =>
          clean(answer) === ''
            ? code
            : editLine(code, (line) => re.test(line) && !line.includes('"') && line.trim().startsWith(word), addAfterMatch(re, quoted(answer))),
      },
    ),
  ];
};

const startEndQuestion = (ctx, item, isStart) => {
  const { spec } = ctx;
  if (!keywordOf(spec, isStart ? START_KINDS : END_KINDS) || ctx.model.nodes.length === 0) return [];
  return [
    question(
      isStart ? 'flow-start' : 'flow-end',
      'yesno',
      isStart
        ? both(
            'У диаграммы нет начала. Добавить начальный элемент и соединить его с первым шагом?',
            'The diagram has no start. Add a start element and link it to the first step?',
          )
        : both(
            'У диаграммы нет конца. Добавить конечный элемент и соединить с ним последние шаги?',
            'The diagram has no end. Add an end element and link the last steps to it?',
          ),
      {
        target: { line: item.line, id: '' },
        priority: 1,
        apply: (answer, code) => (answer === 'yes' ? (isStart ? addStart(spec, code) : addEnd(spec, code)) : code),
      },
    ),
  ];
};

// A word at the start of a line that is not a keyword of the notation: the user says what the element is.
const typeQuestion = (ctx, item) => {
  const { spec } = ctx;
  const text = ctx.lines[item.line - 1].trim();
  const match = /^([\w-]+)\s+\S/.exec(text);
  if (!match || Object.hasOwn(spec.nodes, match[1]) || Object.hasOwn(spec.edges, match[1])) return [];
  const words = Object.keys(text.includes('->') ? spec.edges : spec.nodes);
  return [
    question(`type:${item.line}`, 'choice', both(`Что такое «${match[1]}» в строке ${item.line}?`, `What is "${match[1]}" on line ${item.line}?`), {
      options: words.map((word) => option(word, word)),
      target: { line: item.line, id: match[1] },
      priority: 1,
      apply(answer, code) {
        if (!isOption(this, answer)) return code;
        return editLine(code, sameText(text), (line) => line.replace(match[1], answer));
      },
    }),
  ];
};

// An element used in a link but never declared: the user says what it is (graphs) or whether it is an actor (sequence).
const declareQuestion = (ctx, item) => {
  const { spec, model, key } = ctx;
  const id = item.params.id;
  const text = both(`«${id}» используется, но не описан. Что это?`, `"${id}" is used but never declared. What is it?`);
  if (key === 'uml-sequence') {
    return [
      question(`declare:${id}`, 'choice', text, {
        options: [option('participant', 'Участник', 'Participant'), option('actor', 'Действующее лицо', 'Actor')],
        target: { line: item.line, id },
        priority: 1,
        apply(answer, code) {
          return isOption(this, answer) ? insertDeclaration(code, `${answer} ${id}`, /^\s*(participant|actor)\s/) : code;
        },
      }),
    ];
  }
  const words = Object.keys(spec.nodes);
  return [
    question(`declare:${id}`, 'choice', text, {
      options: words.map((word) => option(word, word)),
      target: { line: item.line, id },
      priority: 1,
      apply(answer, code) {
        return isOption(this, answer) ? insertDeclaration(code, `${answer} ${id}`, new RegExp(`^\\s*(${words.join('|')})\\s`)) : code;
      },
    }),
  ];
};

// ---------- IDEF0 ----------
const PORT_TEXT = {
  input: (id) => both(`Что поступает на вход блока ${id}?`, `What goes into box ${id}?`),
  control: (id) => both(`Чем управляется блок ${id} (правило, стандарт, регламент)?`, `What controls box ${id} (a rule, a standard, a regulation)?`),
  output: (id) => both(`Что получается на выходе блока ${id}?`, `What does box ${id} produce?`),
  mechanism: (id) => both(`Кто или что выполняет блок ${id} (человек, система)?`, `Who or what carries out box ${id} (a person, a system)?`),
};

const PORT_LINE = /^\s*(input|control|output|mechanism)\s*:/;
const portQuestion = (id, port, line, priority) => {
  const re = new RegExp(`^\\s*box\\s+${escapeRe(id)}(?=\\s)`);
  return question(`port:${id}:${port}`, 'text', PORT_TEXT[port](id), {
    target: { line, id },
    priority,
    apply: (answer, code) => {
      const at = splitLines(code).findIndex((entry) => re.test(entry));
      if (clean(answer) === '' || at < 0) return code;
      // The new port goes after the ports the box already has, with the same indent.
      const rows = splitLines(code);
      let end = at;
      while (PORT_LINE.test(rows[end + 1] ?? '')) end += 1;
      const indent = end > at ? /^\s*/.exec(rows[end])[0] : '  ';
      return insertAfter(code, end, `${indent}${port}: ${clean(answer)}`);
    },
  });
};

const idef0Questions = ({ model }) => {
  const wired = (box, port) => model.arrows.some((arrow) => arrow.to === box.id && arrow.toPort === port);
  const list = [];
  model.boxes.forEach((box, index) => {
    const line = model.boxLines[index];
    const gaps = model.problems.filter((item) => item.params?.id === box.id);
    ['output', 'control'].forEach((port) => {
      if (gaps.some((item) => item.code === `idef0-no-${port}`)) list.push(portQuestion(box.id, port, line, 1));
    });
    if (box.ports.input.length === 0 && !wired(box, 'input')) list.push(portQuestion(box.id, 'input', line, 3));
    if (box.ports.mechanism.length === 0 && !wired(box, 'mechanism')) list.push(portQuestion(box.id, 'mechanism', line, 4));
  });
  return list;
};

// ---------- ERD, IDEF1, IDEF1X ----------
const cardinalityQuestion = (ctx, item) => {
  const text = ctx.lines[item.line - 1].trim();
  const match = /^(relationship\s+\S+\s+)(\S+)/.exec(text);
  return [
    question(`cardinality:${item.line}`, 'choice', both(`Какая кратность у связи «${text}»?`, `What is the cardinality of "${text}"?`), {
      options: CARDINALITIES.map((card) => option(card, card)),
      target: { line: item.line, id: match[2] },
      priority: 1,
      apply(answer, code) {
        return isOption(this, answer) ? editLine(code, sameText(text), (line) => line.replace(match[1] + match[2], match[1] + answer)) : code;
      },
    }),
  ];
};

const keyQuestion = (ctx, item) => {
  const id = item.params.id;
  const re = new RegExp(`^\\s*entity\\s+${escapeRe(id)}(?=\\s).*\\{\\s*$`);
  const name = ctx.lines.some((line) => /^\s*id\s*:/.test(line)) ? `${id.toLowerCase()}_id` : 'id';
  return [
    question(
      `key:${id}`,
      'yesno',
      both(`У сущности «${id}» нет ключа. Добавить атрибут ${name} (первичный ключ)?`, `Entity "${id}" has no key. Add the attribute ${name} (primary key)?`),
      {
        target: { line: item.line, id },
        priority: 2,
        apply: (answer, code) => {
          const at = splitLines(code).findIndex((line) => re.test(line));
          return answer === 'yes' && at >= 0 ? insertAfter(code, at, `  ${name}: int pk`) : code;
        },
      },
    ),
  ];
};

const relationLabelQuestions = ({ model, lines, key }) =>
  !['erd', 'idef1'].includes(key)
    ? []
    : model.relations
        .filter((relation) => relation.label === '')
        .map((relation) => {
          // The cardinality as it is written in this very line tells the relationships between the same two entities apart.
          const card = lines[relation.line - 1].trim().split(/\s+/)[2];
          const re = new RegExp(`^\\s*relationship\\s+${escapeRe(relation.from)}\\s+${escapeRe(card)}\\s+${escapeRe(relation.to)}\\s*$`);
          return question(
            `relation:${relation.from}:${relation.to}`,
            'text',
            both(
              `Как называется связь «${relation.from}» — «${relation.to}» (например: «оформляет»)?`,
              `What is the relationship "${relation.from}" - "${relation.to}" called (for example: "places")?`,
            ),
            {
              target: { line: relation.line, id: `${relation.from}-${relation.to}` },
              priority: 3,
              apply: (answer, code) =>
                clean(answer) === ''
                  ? code
                  : editLine(
                      code,
                      (line) => re.test(line),
                      (line) => `${line.trimEnd()} ${quoted(answer)}`,
                    ),
            },
          );
        });

// ---------- sequence ----------
const sequenceQuestions = ({ model }) => {
  const list = [];
  const declared = model.participants;
  if (declared.length > 1 && !declared.some((item) => item.kind === 'actor')) {
    list.push(
      question('actor', 'choice', both('Кто здесь пользователь (действующее лицо)?', 'Who is the user (the actor) here?'), {
        options: [
          ...declared.map((item) => option(item.id, nodeLabel(item))),
          option('none', 'Никто, все участники — системы', 'Nobody, all participants are systems'),
        ],
        target: { line: declared[0].line, id: '' },
        priority: 3,
        apply(answer, code) {
          const re = new RegExp(`^(\\s*)participant(\\s+${escapeRe(answer)}(?=\\s|$))`);
          return isOption(this, answer)
            ? editLine(
                code,
                (line) => re.test(line),
                (line) => line.replace(re, '$1actor$2'),
              )
            : code;
        },
      }),
    );
  }
  model.messages
    .filter((message) => message.text === '')
    .forEach((message) => {
      const re = new RegExp(`^\\s*${escapeRe(message.from)}\\s*(-->|->>|->)\\s*${escapeRe(message.to)}\\s*(:\\s*)?$`);
      list.push(
        question(
          `message:${message.line}`,
          'text',
          both(`Что передаётся в сообщении «${message.from}» → «${message.to}»?`, `What is sent in the message "${message.from}" → "${message.to}"?`),
          {
            target: { line: message.line, id: `${message.from}->${message.to}` },
            priority: 2,
            apply: (answer, code) =>
              clean(answer) === ''
                ? code
                : editLine(
                    code,
                    (line) => re.test(line),
                    (line) => `${line.replace(/\s*:\s*$/, '')} : ${clean(answer)}`,
                  ),
          },
        ),
      );
    });
  return list;
};

// ---------- graph notations: names and actors ----------
const unnamedQuestions = ({ model }) =>
  model.nodes
    .filter((node) => node.label === node.id && !ANONYMOUS.includes(node.kind))
    .map((node) =>
      question(`name:${node.id}`, 'text', both(`Как назвать элемент «${node.id}»?`, `What is the name of the element "${node.id}"?`), {
        target: { line: node.line, id: node.id },
        priority: 2,
        apply: (answer, code) => {
          const re = nodeStart(node.id);
          return clean(answer) === '' ? code : editLine(code, (line) => re.test(line) && !line.includes('"'), addAfterMatch(re, quoted(answer)));
        },
      }),
    );

const actorQuestions = ({ model, spec, key }) => {
  const cases = model.nodes.filter((node) => node.kind === 'usecase');
  if (key !== 'uml-usecase' || cases.length === 0 || model.nodes.some((node) => node.kind === 'actor')) return [];
  return [
    question('usecase-actor', 'text', both('Кто пользуется системой? Назовите действующее лицо.', 'Who uses the system? Name the actor.'), {
      target: { line: cases[0].line, id: '' },
      priority: 2,
      apply: (answer, code) => {
        if (clean(answer) === '') return code;
        const now = parseDiagram(code);
        const id = unique(
          'user',
          now.nodes.map((node) => node.id),
        );
        const links = now.nodes.filter((node) => node.kind === 'usecase').map((node) => `${edgeWord(spec)} ${id} -> ${node.id}`);
        return links.reduce(append, insertDeclaration(code, `actor ${id} ${quoted(answer)}`));
      },
    }),
  ];
};

// ---------- the list ----------
const PROBLEM_RULES = (ctx, item) => {
  const graph = ctx.spec?.nodes !== undefined;
  const { code } = item;
  if (code === 'unknown-ref') return graph || ctx.key === 'uml-sequence' ? declareQuestion(ctx, item) : [];
  if (code === 'erd-cardinality') return cardinalityQuestion(ctx, item);
  if (code === 'erd-no-pk') return keyQuestion(ctx, item);
  if (!graph) return [];
  if (code === 'flow-no-start') return startEndQuestion(ctx, item, true);
  if (code === 'flow-no-end') return startEndQuestion(ctx, item, false);
  if (code === 'syntax') return typeQuestion(ctx, item);
  if (['dfd-unlabelled', 'flow-unlabelled-branch', 'gost-decision-label'].includes(code)) return labelQuestion(ctx, item);
  return Object.hasOwn(CONNECTIONS, code) ? connectQuestion(ctx, item, CONNECTIONS[code]) : [];
};

// The questions about the code, the most important first: errors, then warnings, then the details that only make the diagram clearer.
export const buildQuestions = (code, notation) => {
  const source = String(code);
  const model = parseDiagram(source);
  const key = model.notation;
  const ctx = { source, lines: splitLines(source), model, key, notation, spec: key === null ? undefined : NOTATIONS[key] };
  const list = [...headerQuestions(ctx), ...model.problems.flatMap((item) => PROBLEM_RULES(ctx, item))];
  if (key === 'idef0') list.push(...idef0Questions(ctx));
  if (key === 'uml-sequence') list.push(...sequenceQuestions(ctx));
  if (ctx.spec?.nodes !== undefined) list.push(...unnamedQuestions(ctx), ...actorQuestions(ctx));
  if (model.relations) list.push(...relationLabelQuestions(ctx));
  const seen = new Set();
  return list
    .filter((item) => !seen.has(item.id) && seen.add(item.id))
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.priority - b.item.priority || a.item.target.line - b.item.target.line || a.index - b.index)
    .map(({ item }) => item);
};

// Plain data of a question, without the function: this is what goes over the network.
export const describeQuestion = ({ id, kind, text, options, target, priority }) => ({ id, kind, text, options, target, priority });

const errorsOf = (code) => {
  const model = parseDiagram(code);
  const problems = model.problems.map((item) => ({
    line: item.line,
    severity: item.severity,
    code: item.code,
    message: { ru: formatProblem(item, 'ru'), en: formatProblem(item, 'en') },
  }));
  return { notation: model.notation, problems, errors: problems.filter((item) => item.severity === 'error') };
};

// The new code must be a diagram the parser understands and must not have more errors than the old one: a completion never makes things worse.
export const checkCompletion = (before, after) => {
  const old = errorsOf(before);
  const now = errorsOf(after);
  const ok = now.notation !== null && now.errors.length <= old.errors.length;
  return { ok, valid: now.errors.length === 0, problems: now.problems, errorsBefore: old.errors.length, errorsAfter: now.errors.length };
};

const asMap = (answers) => (Array.isArray(answers) ? Object.fromEntries(answers.map((item) => [item.id, item.answer])) : answers);

// Applies the answers (`{ id: answer }` or `[{ id, answer }]`) and checks the result. The code of a refused result is the original one.
export const completeFromAnswers = (code, answers, notation) => {
  const given = asMap(answers);
  const applied = [];
  const next = buildQuestions(code, notation).reduce((current, item) => {
    const answer = given[item.id];
    if (answer === undefined || answer === null || clean(answer) === '') return current;
    const changed = item.apply(String(answer).trim(), current);
    if (changed !== current) applied.push(item.id);
    return changed;
  }, code);
  if (applied.length === 0)
    return { ok: false, reason: 'nothing', code, applied, valid: errorsOf(code).errors.length === 0, problems: errorsOf(code).problems };
  const verdict = checkCompletion(code, next);
  if (!verdict.ok) return { ...verdict, reason: 'worse', code, applied: [] };
  return { ...verdict, reason: '', code: next, applied };
};
