import { normalize } from '../expert/review.js';
import { ID, parseHeader, sourceLines } from '../notations/common.js';
import { KEYWORDS, NOTATIONS, NOTATION_KEYS, formatProblem, parseDiagram } from '../notations/index.js';
import { formatCode } from './format-code.js';
import { normalizeLanguage } from './lang.js';

// The review of a user's diagram: what is wrong with the code and the corrected variants of it.
// Everything here is deterministic and works without a network: the problems come from the parser and the validator of the notation
// (the same ones the problems panel shows) plus a few rules of the review itself; every fix is a list of edits of the lines of the code.
// A variant is the code after the fixes of one level. It is parsed again and offered only when it has fewer problems than the original.

const both = (ru, en) => ({ ru, en });
const fill = (text, params) => text.replace(/\{(\w+)\}/g, (_, name) => params[name]);
const MAX_PASSES = 4;
const LONG_LABEL = 40;
const START = ['start', 'initial'];
const END = ['end', 'final'];
const WEIGHT = { error: 100, warning: 10, info: 1 };
const BASES = [...new Set(NOTATION_KEYS.map((key) => key.split('-')[0]))];

// ----- edits: the only way a fix changes the code
const edit = {
  replace: (line, text) => ({ op: 'replace', line, text }),
  remove: (line) => ({ op: 'remove', line }),
  before: (line, text) => ({ op: 'before', line, text }),
  after: (line, text) => ({ op: 'after', line, text }),
};
const unique = (list) => [...new Set(list)];

// Applies the edits to the lines of the code (the numbers are the lines of the code as it is now). A removal beats a replacement.
export const applyEdits = (code, edits) => {
  const out = [];
  String(code)
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const mine = edits.filter((item) => item.line === index + 1);
      out.push(...unique(mine.filter((item) => item.op === 'before').map((item) => item.text)));
      const replaced = mine.filter((item) => item.op === 'replace').at(-1);
      if (!mine.some((item) => item.op === 'remove')) out.push(replaced ? replaced.text : raw);
      out.push(...unique(mine.filter((item) => item.op === 'after').map((item) => item.text)));
    });
  return out.join('\n');
};

// A line-by-line difference (the longest common subsequence): [{ type: 'same' | 'del' | 'add', text }].
export const diffLines = (before, after) => {
  const a = String(before).split('\n');
  const b = String(after).split('\n');
  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1)
    for (let j = b.length - 1; j >= 0; j -= 1) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const rows = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ type: 'same', text: a[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      rows.push({ type: 'del', text: a[i] });
      i += 1;
    } else {
      rows.push({ type: 'add', text: b[j] });
      j += 1;
    }
  }
  a.slice(i).forEach((text) => rows.push({ type: 'del', text }));
  b.slice(j).forEach((text) => rows.push({ type: 'add', text }));
  return rows;
};

// ----- small text tools
const QUOTED = /("(?:[^"\\]|\\.)*")/;
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WORD = '\\w\\u00C0-\\u024F\\u0400-\\u04FF.-';

// Replaces the first match outside the quoted strings of the line.
const replaceOutside = (line, pattern, to) => {
  let done = false;
  return line
    .split(QUOTED)
    .map((part, index) => {
      if (index % 2 === 1 || done) return part;
      const next = part.replace(pattern, to);
      done = next !== part;
      return next;
    })
    .join('');
};
const renameIn = (line, from, to) => replaceOutside(line, new RegExp(`(?<![${WORD}])${escapeRegExp(from)}(?![${WORD}])`), to);

// The number of edits (insert, delete, change, swap of two neighbours) between two words.
const distance = (a, b) => {
  const table = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  table[0] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1)
    for (let j = 1; j <= b.length; j += 1) {
      table[i][j] = Math.min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) table[i][j] = Math.min(table[i][j], table[i - 2][j - 2] + 1);
    }
  return table[a.length][b.length];
};

// The closest of the options: the same word in another case, or one or two letters away for a longer word.
export const nearest = (word, options) => {
  const low = word.toLowerCase();
  const reach = word.length >= 6 ? 2 : word.length >= 3 ? 1 : 0;
  return options
    .map((option) => ({ option, gap: distance(low, option.toLowerCase()) }))
    .filter((item) => item.gap <= reach)
    .reduce((best, item) => (best && best.gap <= item.gap ? best : item), undefined)?.option;
};

// ----- the context of one review
const EDGE = new RegExp(`^(\\s*)([\\w-]+)\\s+(${ID})\\s*->\\s*(${ID})(.*)$`);

const context = (code, lang) => {
  const lines = code.split(/\r?\n/);
  const model = parseDiagram(code);
  const impl = model.notation ? NOTATIONS[model.notation] : undefined;
  const shape = normalize(model);
  const taken = new Set(shape.nodes.map((node) => node.id.toLowerCase()));
  const named = new Map();
  const last = lines.findLastIndex((line) => line.trim() !== '') + 1;
  return {
    lang,
    lines,
    model,
    impl,
    shape,
    header: sourceLines(code)[0]?.n ?? 1,
    last,
    text: (ru, en) => ({ ru, en })[normalizeLanguage(lang)],
    // A new identifier that is free; the same request gives the same identifier again.
    fresh: (base, tag = '') => {
      const key = `${base}|${tag}`;
      if (!named.has(key)) {
        let id = base;
        for (let n = 2; taken.has(id.toLowerCase()); n += 1) id = `${base}${n}`;
        taken.add(id.toLowerCase());
        named.set(key, id);
      }
      return named.get(key);
    },
  };
};

const keywordOf = (c, kinds) => Object.entries(c.impl.nodes).find(([, kind]) => kinds.includes(kind))?.[0];
// The keyword of an ordinary element: the kind that the diagram uses most, or the first one that is not a start or an end.
const plainKeyword = (c) => {
  const plain = Object.entries(c.impl?.nodes ?? {}).filter(([, kind]) => ![...START, ...END].includes(kind));
  const used = (kind) => c.model.nodes.filter((node) => node.kind === kind).length;
  return plain.sort((x, y) => used(y[1]) - used(x[1]))[0]?.[0];
};
const edgeKeyword = (c) => Object.keys(c.impl.edges)[0];
const fix = (ru, en, edits) => ({ title: both(ru, en), edits });

// The statement of a line with its block, when it opens one.
const removeStatement = (c, n) => {
  const edits = [edit.remove(n)];
  if (c.lines[n - 1].trim().endsWith('{')) {
    for (let at = n; at < c.lines.length; at += 1) {
      edits.push(edit.remove(at + 1));
      if (c.lines[at].trim() === '}') break;
    }
  }
  return edits;
};
const dropStatement = (ru, en) => (c, p) => fix(ru, en, removeStatement(c, p.line));
const labelEdge = (c, n, label) => {
  const match = EDGE.exec(c.lines[n - 1]);
  return fix(`Подписать связь «${label}»`, `Label the link "${label}"`, [
    edit.replace(n, `${match[1]}${match[2]} ${match[3]} -> ${match[4]} "${label}"${match[5]}`),
  ]);
};

// The end of the flow: an end element (the one that exists, or a new one) that the elements without a way out lead to.
const endFix = (c, sinks) => {
  const word = keywordOf(c, END);
  const link = edgeKeyword(c);
  const existing = c.model.nodes.find((node) => END.includes(node.kind));
  const id = existing ? existing.id : c.fresh('end');
  const edits = existing ? [] : [edit.after(c.header, `${word} ${id} "${c.text('Конец', 'End')}"`)];
  sinks.forEach((node) => edits.push(edit.after(c.last, `${link} ${node.id} -> ${id}`)));
  const names = sinks.map((node) => node.id).join(', ');
  return fix(
    existing ? `Связать «${names}» с конечным элементом «${id}»` : `Добавить конечный элемент «${id}»${names ? ` и связать с ним: ${names}` : ''}`,
    existing ? `Link "${names}" to the end element "${id}"` : `Add the end element "${id}"${names ? ` and link to it: ${names}` : ''}`,
    edits,
  );
};
const withoutExit = (c) => {
  const from = new Set(c.model.edges.map((link) => link.from));
  return c.model.nodes.filter((node) => !from.has(node.id) && !END.includes(node.kind) && !(START.includes(node.kind) && c.model.nodes.length > 1));
};

const portLine = (word, ru, en) => (c, p) => {
  const box = c.model.boxes.find((item) => item.id === p.params.id);
  const text = c.text(ru, en);
  return fix(`Добавить «${word}: ${ru}» блоку ${box.id}`, `Add "${word}: ${en}" to the box ${box.id}`, [edit.after(p.line, ` ${word}: ${text}`)]);
};

// ----- the fixes of the problems of the parser and the validator, by the code of the problem
const FIXERS = {
  'no-header': (c, p) => fix('Добавить заголовок «diagram idef0»', 'Add the header "diagram idef0"', [edit.before(p.line, 'diagram idef0')]),
  'header-unknown': (c, p) => {
    const near = nearest(p.params.name, BASES);
    return near
      ? fix(`Исправить нотацию на «${near}»`, `Change the notation to "${near}"`, [
          edit.replace(p.line, c.lines[p.line - 1].replace(/^(\s*diagram\s+)\S+/, `$1${near}`)),
        ])
      : null;
  },
  'header-extra': (c, p) =>
    fix('Убрать лишнее слово из заголовка', 'Remove the extra word from the header', [
      edit.replace(p.line, c.lines[p.line - 1].replace(/^(\s*diagram\s+\S+)\s+[\w-]+/, '$1')),
    ]),
  duplicate: (c, p) => {
    const id = c.fresh(p.params.id);
    return fix(`Переименовать повтор «${p.params.id}» в «${id}»`, `Rename the repeated "${p.params.id}" to "${id}"`, [
      edit.replace(p.line, c.lines[p.line - 1].replace(/^(\s*\S+\s+)(\S+)/, `$1${id}`)),
    ]);
  },
  'unknown-ref': (c, p) => {
    const missing = p.params.id;
    const near = nearest(
      missing,
      c.shape.nodes.map((node) => node.id),
    );
    if (near)
      return fix(`Заменить «${missing}» на «${near}»`, `Replace "${missing}" with "${near}"`, [
        edit.replace(p.line, renameIn(c.lines[p.line - 1], missing, near)),
      ]);
    const word = plainKeyword(c);
    if (word) return fix(`Объявить элемент «${missing}»`, `Declare the element "${missing}"`, [edit.before(p.line, `${word} ${missing}`)]);
    return fix(`Убрать строку с неизвестным «${missing}»`, `Remove the line with the unknown "${missing}"`, removeStatement(c, p.line));
  },
  'flow-unreachable': (c, p) => {
    const kind = c.model.nodes.find((node) => node.id === p.params.id).kind;
    const linked = c.model.edges.some((link) => link.from === p.params.id || link.to === p.params.id);
    return linked || [...START, ...END].includes(kind) ? null : dropStatement('Убрать несвязанный элемент', 'Remove the unconnected element')(c, p);
  },
  isolated: dropStatement('Убрать несвязанный элемент', 'Remove the unconnected element'),
  unclosed: (c) => fix('Закрыть блок скобкой «}»', 'Close the block with "}"', [edit.after(c.last, '}')]),
  syntax: (c, p) => {
    const line = c.lines[p.line - 1];
    const word = /^\s*([a-z][\w-]*)/i.exec(line)?.[1];
    const words = c.impl?.nodes ? [...Object.keys(c.impl.nodes), ...Object.keys(c.impl.edges)] : [...KEYWORDS];
    const near = word && !KEYWORDS.has(word) ? nearest(word, words) : undefined;
    return near
      ? fix(`Исправить слово «${word}» на «${near}»`, `Change the word "${word}" to "${near}"`, [edit.replace(p.line, line.replace(word, near))])
      : fix('Убрать нераспознанную строку', 'Remove the unrecognised line', removeStatement(c, p.line));
  },
  'strict-dup-edge': dropStatement('Убрать повторную связь', 'Remove the repeated link'),
  'strict-self-loop': dropStatement('Убрать связь элемента с самим собой', 'Remove the link of an element to itself'),
  'flow-start-incoming': dropStatement('Убрать связь, входящую в начало', 'Remove the link that enters the start'),
  'flow-end-outgoing': dropStatement('Убрать связь, выходящую из конца', 'Remove the link that leaves the end'),
  'erd-dup-attr': dropStatement('Убрать повторный атрибут', 'Remove the repeated attribute'),
  'strict-pos': (c, p) =>
    fix('Убрать неверную позицию pos', 'Remove the wrong position pos', [edit.replace(p.line, replaceOutside(c.lines[p.line - 1], /\s+pos(?:=\S*)?/, ''))]),
  'dfd-unlabelled': (c, p) => labelEdge(c, p.line, c.text('данные', 'data')),
  'dfd-no-process': (c, p) => {
    const [, indent, link, from, to, rest] = EDGE.exec(c.lines[p.line - 1]);
    const word = keywordOf(c, ['process']);
    const id = c.fresh('proc', p.line);
    return fix(`Провести поток через процесс «${id}»`, `Route the flow through the process "${id}"`, [
      edit.before(p.line, `${indent}${word} ${id} "${c.text('Обработка', 'Processing')}"`),
      edit.replace(p.line, `${indent}${link} ${from} -> ${id}${rest}\n${indent}${link} ${id} -> ${to}${rest}`),
    ]);
  },
  'flow-unlabelled-branch': (c, p) => {
    const link = c.model.edges.find((item) => item.line === p.line);
    const branches = c.model.edges.filter((item) => item.from === link.from && item.label === '');
    const number = branches.findIndex((item) => item.line === p.line) + 1;
    return labelEdge(c, p.line, c.text(`вариант ${number}`, `option ${number}`));
  },
  'flow-no-start': (c) => {
    const word = keywordOf(c, START);
    const link = edgeKeyword(c);
    const id = c.fresh('start');
    const entered = new Set(c.model.edges.map((item) => item.to));
    const inner = c.model.nodes.filter((node) => ![...START, ...END].includes(node.kind));
    const entry = inner.find((node) => !entered.has(node.id)) ?? inner[0];
    const edits = [edit.after(c.header, `${word} ${id} "${c.text('Начало', 'Start')}"`)];
    if (entry) edits.push(edit.after(c.last, `${link} ${id} -> ${entry.id}`));
    return fix(
      `Добавить начало «${id}»${entry ? ` и связать с «${entry.id}»` : ''}`,
      `Add the start "${id}"${entry ? ` and link it to "${entry.id}"` : ''}`,
      edits,
    );
  },
  'flow-no-end': (c) => endFix(c, withoutExit(c)),
  'flow-dead-end': (c, p) => endFix(c, [c.model.nodes.find((node) => node.id === p.params.id)]),
  'erd-no-pk': (c, p) => {
    const entity = c.model.entities.find((item) => item.id === p.params.id);
    const known = entity.attrs.find((attr) => attr.name === 'id');
    if (known)
      return fix(`Сделать атрибут id ключом (pk) у «${entity.id}»`, `Make the attribute id the key (pk) of "${entity.id}"`, [
        edit.replace(known.line, `${c.lines[known.line - 1]} pk`),
      ]);
    const open = c.lines[p.line - 1].trim().endsWith('{');
    const edits = open
      ? [edit.after(p.line, '  id : int pk')]
      : [edit.replace(p.line, `${c.lines[p.line - 1]} {`), edit.after(p.line, '  id : int pk'), edit.after(p.line, '}')];
    return fix(`Добавить ключ «id : int pk» сущности «${entity.id}»`, `Add the key "id : int pk" to the entity "${entity.id}"`, edits);
  },
  'idef0-no-output': portLine('output', 'Результат', 'Result'),
  'idef0-no-control': portLine('control', 'Правила', 'Rules'),
  'idef0-arrow-from': (c, p) =>
    fix('Выпускать стрелку из порта output', 'Let the arrow leave from the port output', [
      edit.replace(p.line, c.lines[p.line - 1].replace(/^(\s*arrow\s+[^\s>]+?)\.\w+(\s*->)/, '$1.output$2')),
    ]),
  'idef0-arrow-to': (c, p) =>
    fix('Направить стрелку в порт input', 'Point the arrow at the port input', [
      edit.replace(p.line, c.lines[p.line - 1].replace(/->\s*([^\s.]+)\.\w+\s*$/, '-> $1.input')),
    ]),
};

// ----- the rules of the review itself, on top of the validator
const OWN = {
  'empty-code': both('Код пуст: нечего проверять', 'The code is empty: there is nothing to check'),
  'no-title': both('У диаграммы нет названия', 'The diagram has no title'),
  'empty-diagram': both('В диаграмме нет ни одного элемента', 'The diagram has no elements'),
  'naming-unreadable': both(
    'У элемента «{id}» нет понятной подписи: имя {id} ничего не говорит читателю',
    'The element "{id}" has no readable label: the name {id} says nothing to a reader',
  ),
  'naming-long-label': both('Подпись элемента «{id}» длиннее {n} знаков', 'The label of the element "{id}" is longer than {n} characters'),
  'disconnected-parts': both('Диаграмма распалась на {n} не связанных части', 'The diagram falls into {n} parts that are not connected'),
  'idef0-no-input': both(
    'У блока {id} нет входа (input): ICOM описывает, что функция преобразует',
    'The box {id} has no input: ICOM says what the function transforms',
  ),
};
const issue = (severity, line, rule, params, repair = null) => ({
  severity,
  line,
  rule,
  message: both(fill(OWN[rule].ru, params), fill(OWN[rule].en, params)),
  fix: repair,
});

const parts = (nodes, edges) => {
  const group = new Map(nodes.map((node) => [node.id, node.id]));
  const root = (id) => (group.get(id) === id ? id : root(group.get(id)));
  edges.forEach((link) => group.set(root(link.from), root(link.to)));
  const linked = new Set(edges.flatMap((link) => [link.from, link.to]));
  return Map.groupBy(
    nodes.filter((node) => linked.has(node.id)),
    (node) => root(node.id),
  );
};

const ownIssues = (c) => {
  const out = [];
  const { model } = c;
  const header = parseHeader(c.lines[c.header - 1].trim());
  if (c.impl && header && header.title === '')
    out.push(
      issue(
        'info',
        c.header,
        'no-title',
        {},
        fix('Добавить название диаграммы', 'Add a title to the diagram', [
          edit.replace(c.header, `${c.lines[c.header - 1].trimEnd()} "${c.text('Новая диаграмма', 'New diagram')}"`),
        ]),
      ),
    );
  if (c.impl && model.empty) out.push(issue('warning', c.header, 'empty-diagram', {}));
  c.shape.nodes.forEach((node) => {
    if (node.label.length > LONG_LABEL) out.push(issue('info', node.line, 'naming-long-label', { id: node.id, n: LONG_LABEL }));
  });
  if (Array.isArray(model.nodes)) {
    model.nodes
      .filter((node) => node.label === node.id && /^[a-z]{0,2}\d*$/i.test(node.id))
      .forEach((node) => out.push(issue('info', node.line, 'naming-unreadable', { id: node.id })));
    const groups = [...parts(model.nodes, model.edges).values()];
    if (groups.length > 1) out.push(issue('warning', groups[1][0].line, 'disconnected-parts', { n: groups.length }));
  }
  (model.boxes ?? []).forEach((box, index) => {
    const fed = model.arrows.some((arrow) => arrow.to === box.id && (arrow.toPort === '' || arrow.toPort === 'input'));
    if (box.ports.input.length === 0 && !fed) out.push(issue('info', model.boxLines[index], 'idef0-no-input', { id: box.id }));
  });
  return out;
};

const analyse = (code, lang) => {
  const c = context(code, lang);
  const found = c.model.problems.map((p) => ({
    severity: p.severity,
    line: p.line,
    rule: p.code,
    message: both(formatProblem(p, 'ru'), formatProblem(p, 'en')),
    fix: FIXERS[p.code] ? FIXERS[p.code](c, p) : null,
  }));
  const issues = [...found, ...ownIssues(c)].sort((a, b) => a.line - b.line || WEIGHT[b.severity] - WEIGHT[a.severity]);
  return { notation: c.model.notation, issues };
};

const score = (issues) => issues.reduce((sum, item) => sum + WEIGHT[item.severity], 0);
const count = (issues, severity) => issues.filter((item) => item.severity === severity).length;

// How many errors and warnings the validator finds in a code; the AI layer checks the variants of the model with it.
export const checkCode = (code) => {
  const model = parseDiagram(String(code));
  return { notation: model.notation ?? null, errors: count(model.problems, 'error'), warnings: count(model.problems, 'warning') };
};

// ----- the variants
const PLANS = [
  { id: 'minimal', levels: ['error'], title: both('Минимальные исправления: только ошибки', 'Minimal fix: the errors only') },
  {
    id: 'full',
    levels: ['error', 'warning', 'info'],
    format: true,
    title: both('Полная чистка: ошибки, предупреждения и оформление', 'Full clean-up: errors, warnings and layout'),
  },
];

// The mistakes of the header and of the lines that are not read change which elements exist, so they are fixed before the rest.
const FIRST = new Set(['no-header', 'header-unknown', 'header-extra', 'syntax']);

const variantOf = (code, first, plan, lang) => {
  let current = code;
  let issues = first.issues;
  const changes = [];
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const claimed = new Set();
    const edits = [];
    const fixable = issues.filter((item) => item.fix && plan.levels.includes(item.severity));
    const early = fixable.filter((item) => FIRST.has(item.rule));
    (early.length > 0 ? early : fixable).forEach((item) => {
      const lines = item.fix.edits.filter((one) => one.op === 'replace' || one.op === 'remove').map((one) => one.line);
      if (lines.some((line) => claimed.has(line))) return;
      lines.forEach((line) => claimed.add(line));
      edits.push(...item.fix.edits);
      changes.push({ rule: item.rule, line: pass === 0 ? item.line : null, ...item.fix.title });
    });
    const next = applyEdits(current, edits);
    if (next === current) break;
    current = next;
    issues = analyse(current, lang).issues;
  }
  if (plan.format) {
    const tidy = formatCode(current);
    if (tidy !== current) changes.push({ rule: 'format', line: null, ...both('Выровнены отступы и пустые строки', 'Indentation and blank lines are tidied') });
    current = tidy;
  }
  const after = analyse(current, lang).issues;
  return { id: plan.id, title: plan.title, code: current, changes, errors: count(after, 'error'), warnings: count(after, 'warning'), score: score(after) };
};

// The review of a code: { notation, issues: [{ severity, line, rule, message: { ru, en }, fix }], variants: [{ id, title, code, changes, errors, warnings }] }.
export const reviewCode = (code, { lang = 'ru' } = {}) => {
  const source = String(code);
  if (source.trim() === '') return { notation: null, issues: [issue('error', 1, 'empty-code', {})], variants: [] };
  const first = analyse(source, lang);
  const seen = new Set([source]);
  const variants = [];
  PLANS.forEach((plan) => {
    const { score: after, ...variant } = variantOf(source, first, plan, lang);
    if (after >= score(first.issues) || seen.has(variant.code)) return;
    seen.add(variant.code);
    variants.push(variant);
  });
  return { notation: first.notation ?? null, issues: first.issues, variants };
};
