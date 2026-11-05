import { NOTATIONS, formatProblem, parseDiagram } from '../notations/index.js';
import { declares, setNodePosition } from './node-position.js';

// Names of the elements for the palette; a keyword without a name is shown as it is written in the code.
const NAMES = {
  box: ['Блок функции', 'Function box'],
  entity: ['Сущность', 'Entity'],
  process: ['Процесс', 'Process'],
  store: ['Хранилище данных', 'Data store'],
  start: ['Начало', 'Start'],
  end: ['Конец', 'End'],
  task: ['Задача', 'Task'],
  intermediate: ['Промежуточное событие', 'Intermediate event'],
  exclusive: ['Исключающий шлюз', 'Exclusive gateway'],
  parallel: ['Параллельный шлюз', 'Parallel gateway'],
  place: ['Позиция', 'Place'],
  transition: ['Переход', 'Transition'],
  decision: ['Решение', 'Decision'],
  question: ['Вопрос', 'Question'],
  outcome: ['Исход', 'Outcome'],
  actor: ['Актор', 'Actor'],
  usecase: ['Вариант использования', 'Use case'],
  participant: ['Участник', 'Participant'],
  lifeline: ['Линия жизни', 'Lifeline'],
  class: ['Класс', 'Class'],
  interface: ['Интерфейс', 'Interface'],
  vertex: ['Вершина', 'Vertex'],
  state: ['Состояние', 'State'],
  root: ['Корень', 'Root'],
  topic: ['Тема', 'Topic'],
  unit: ['Подразделение', 'Unit'],
  person: ['Человек', 'Person'],
  system: ['Система', 'System'],
  external: ['Внешняя система', 'External system'],
  container: ['Контейнер', 'Container'],
  database: ['База данных', 'Database'],
  cloud: ['Облако', 'Cloud'],
  router: ['Маршрутизатор', 'Router'],
  switch: ['Коммутатор', 'Switch'],
  server: ['Сервер', 'Server'],
  client: ['Клиент', 'Client'],
  event: ['Событие', 'Event'],
  function: ['Функция', 'Function'],
  and: ['И', 'AND'],
  or: ['ИЛИ', 'OR'],
  xor: ['Исключающее ИЛИ', 'XOR'],
  component: ['Компонент', 'Component'],
  package: ['Пакет', 'Package'],
  object: ['Объект', 'Object'],
  node: ['Узел', 'Node'],
  device: ['Устройство', 'Device'],
  artifact: ['Артефакт', 'Artifact'],
  merge: ['Слияние', 'Merge'],
  fork: ['Развилка', 'Fork'],
  join: ['Соединение', 'Join'],
  kind: ['Вид', 'Kind'],
  individual: ['Индивид', 'Individual'],
  interaction: ['Взаимодействие', 'Interaction'],
  profile: ['Профиль', 'Profile'],
  metaclass: ['Метакласс', 'Metaclass'],
  stereotype: ['Стереотип', 'Stereotype'],
  classifier: ['Классификатор', 'Classifier'],
  part: ['Часть', 'Part'],
  port: ['Порт', 'Port'],
  element: ['Элемент', 'Element'],
  environment: ['Среда', 'Environment'],
  uob: ['Единица работы', 'Unit of behaviour'],
  referent: ['Ссылка', 'Referent'],
  note: ['Примечание', 'Note'],
  comment: ['Комментарий', 'Comment'],
  connector: ['Соединитель', 'Connector'],
  data: ['Данные', 'Data'],
};

// Elements of the notations whose statements are not plain `<keyword> <id> "Label"` lines.
const OWN = {
  idef0: [
    {
      keyword: 'box',
      prefix: 'A',
      make: (id, code, lang) =>
        lang === 'ru'
          ? `box ${id} "${id} Функция" {\n input: Вход\n control: Правило\n output: Выход\n}`
          : `box ${id} "${id} function" {\n input: Input\n control: Rule\n output: Output\n}`,
    },
    {
      keyword: 'box',
      prefix: 'A',
      label: ['Блок с механизмом', 'Box with mechanism'],
      make: (id, code, lang) =>
        lang === 'ru'
          ? `box ${id} "${id} Функция" {\n input: Вход\n control: Правило\n output: Выход\n mechanism: Исполнитель\n}`
          : `box ${id} "${id} function" {\n input: Input\n control: Rule\n output: Output\n mechanism: Performer\n}`,
    },
  ],
  idef1: [{ keyword: 'entity', prefix: 'E', make: (id) => `entity ${id} {\n  id: int pk\n}` }],
  idef1x: [{ keyword: 'entity', prefix: 'E', make: (id) => `entity ${id} {\n  ${id.toLowerCase()}_id: int pk\n}` }],
  erd: [{ keyword: 'entity', prefix: 'E', make: (id) => `entity ${id} {\n  id: int pk\n}` }],
  'uml-class': [
    { keyword: 'class', prefix: 'C', make: (id) => `class ${id} {\n  + name: String\n}` },
    { keyword: 'interface', prefix: 'I', make: (id) => `interface ${id} {\n  + run(): void\n}` },
  ],
  idef4: [{ keyword: 'class', prefix: 'C', make: (id) => `class ${id} {\n  + name: String\n}` }],
  'uml-sequence': [
    { keyword: 'actor', prefix: 'user', make: (id) => `actor ${id}` },
    { keyword: 'participant', prefix: 'service', make: (id) => `participant ${id}` },
  ],
  'uml-timing': [{ keyword: 'lifeline', prefix: 'line', make: (id) => `lifeline ${id} "${id}" states Low, High` }],
  graph: [{ keyword: 'vertex', prefix: 'V', make: (id) => `vertex ${id}` }],
};

// A port belongs to a part or a classifier, so it is made for the first one of the code.
const OWNERS = /^(?:classifier|part)\s+(\S+)/m;

// The ways to connect two elements, written the way the notation expects them.
const OWN_LINKS = {
  // The output of a box can feed the input, the control or the mechanism of another box.
  idef0: [
    { id: 'output → input', make: (a, b) => `arrow ${a}.output -> ${b}.input` },
    { id: 'output → control', make: (a, b) => `arrow ${a}.output -> ${b}.control` },
    { id: 'output → mechanism', make: (a, b) => `arrow ${a}.output -> ${b}.mechanism` },
  ],
  idef1: [{ id: 'relationship', make: (a, b) => `relationship ${a} 1:N ${b}` }],
  idef1x: [{ id: 'nonidentifying', make: (a, b) => `nonidentifying ${a} -> ${b}` }],
  erd: [{ id: 'relationship', make: (a, b) => `relationship ${a} 1:N ${b}` }],
  graph: [{ id: 'edge', make: (a, b) => `edge ${a} -- ${b}` }],
  'uml-class': [
    { id: 'association', make: (a, b) => `${a} --> ${b}` },
    { id: 'inheritance', make: (a, b) => `${a} --|> ${b}` },
    { id: 'realization', make: (a, b) => `${a} ..|> ${b}` },
    { id: 'composition', make: (a, b) => `${a} *-- ${b}` },
    { id: 'aggregation', make: (a, b) => `${a} o-- ${b}` },
    { id: 'dependency', make: (a, b) => `${a} ..> ${b}` },
  ],
  idef4: [
    { id: 'association', make: (a, b) => `${a} --> ${b}` },
    { id: 'inheritance', make: (a, b) => `${a} --|> ${b}` },
    { id: 'composition', make: (a, b) => `${a} *-- ${b}` },
  ],
  'uml-sequence': [
    { id: 'call', make: (a, b) => `${a} -> ${b} : message` },
    { id: 'return', make: (a, b) => `${a} --> ${b} : result` },
    { id: 'async', make: (a, b) => `${a} ->> ${b} : signal` },
  ],
};

const nameOf = (keyword) => NAMES[keyword] ?? [keyword, keyword];

// The elements that can be put on the board of a notation.
// The new element is written in the language of the interface: a Russian page puts Russian names into the code.
export const paletteFor = (notation, lang = 'en') => {
  const at = lang === 'ru' ? 0 : 1;
  const own = OWN[notation];
  if (own) return own.map((item) => ({ ...item, label: item.label ?? nameOf(item.keyword), make: (id, code) => item.make(id, code, lang) }));
  const nodes = NOTATIONS[notation]?.nodes ?? {};
  return Object.keys(nodes).map((keyword) => ({
    keyword,
    prefix: keyword.slice(0, 1).toUpperCase(),
    label: nameOf(keyword),
    make:
      keyword === 'port'
        ? (id, code) => `port ${id} "${nameOf(keyword)[at]}" of=${OWNERS.exec(code)?.[1] ?? id}`
        : (id) => `${keyword} ${id} "${nameOf(keyword)[at]}"`,
  }));
};

// The kinds of links between two elements; an empty list means the links of the notation are written in the code.
export const linksFor = (notation) => {
  if (OWN_LINKS[notation]) return OWN_LINKS[notation];
  const edges = NOTATIONS[notation]?.edges ?? {};
  return Object.keys(edges).map((keyword) => ({ id: keyword, make: (a, b) => `${keyword} ${a} -> ${b}` }));
};

const taken = (code, id) => new RegExp(`(^|[\\s.>])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s.:{"]|$)`, 'm').test(code);

// A new identifier that no line of the code uses yet: A4, E2, user3 ...
export const nextId = (code, prefix) => {
  let n = 1;
  while (taken(code, `${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
};

// The drawings of these notations have no blocks that stand where the code says, so a place is not written for them.
const NO_PLACE = new Set(['uml-sequence', 'uml-timing', 'graph']);

// The new element goes to the end of the code; a place on the board is written as pos=XxY.
// The drawing of IDEF0 is shifted inside the page, so a place taken from the page is moved back into the space of the layout.
const ORIGIN = { idef0: { x: 90, y: 40 } };

export const addElement = (code, notation, item, at) => {
  const id = nextId(code, item.prefix);
  const text = `${code.replace(/\s+$/, '')}\n${item.make(id, code)}`;
  const origin = ORIGIN[notation] ?? { x: 0, y: 0 };
  const placed = at && !NO_PLACE.has(notation) ? setNodePosition(text, id, at.x - origin.x, at.y - origin.y) : text;
  return { code: placed ?? text, id };
};

export const connectElements = (code, link, from, to) => `${code.replace(/\s+$/, '')}\n${link.make(from, to)}`;

const signature = (item) => `${item.code}${JSON.stringify(item.params)}`;

// A new element stands alone until it is connected, so these errors only say "not finished yet" and do not stop the adding.
const UNFINISHED = new Set([
  'flow-unreachable',
  'flow-dead-end',
  'flow-no-end',
  'flow-no-start',
  'idef3-junction',
  'idef3-unpaired',
  'idef3-no-start',
  'mm-unreachable',
  'dfd-miracle',
  'dfd-black-hole',
  'idef0-no-output',
  'idef0-no-control',
  'erd-no-pk',
  'idef1-no-attrs',
  'idef1x-fk-missing',
  'idef1x-dependent-orphan',
  'org-many-tops',
  'dt-roots',
  'dt-branches',
  'epc-start',
  'epc-end',
  'epc-alternate',
  'c4-database-source',
  'uml-timing-states',
  'dag-roots',
  'gost-decision',
  'gost-connector',
]);

// The strict gate of hand work: a change is accepted only when it adds no error that the notation reports.
// A diagram that was already wrong stays editable, only new errors stop a change.
// What is only unfinished (an element nobody is connected to yet) is tolerated, what is wrong is refused.
export const gate = (before, after, lang = 'ru') => {
  const known = new Set(
    parseDiagram(before)
      .problems.filter((item) => item.severity === 'error')
      .map(signature),
  );
  const added = parseDiagram(after).problems.find((item) => item.severity === 'error' && !known.has(signature(item)) && !UNFINISHED.has(item.code));
  return added ? { ok: false, message: formatProblem(added, lang), problem: added } : { ok: true, message: '', problem: null };
};

// Words that open a statement joining two elements, besides the lines that carry an arrow or a dash.
const LINK_WORDS =
  /^(arrow|flow|edge|relationship|identifying|nonidentifying|nonspecific|category|depend|precedence|transition|link|include|extend|generalize|association|message|connect|isa|partof|instanceof|path)\b/;
const LINK_MARKS = /->|--|\.\.|\*--|o--/;
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const unquoted = (line) => line.replace(/"(?:[^"\\]|\\.)*"/g, '""');

// Removes an element from the code with its whole block and every statement that joins it to another element.
// Returns null when the code has no such element.
export const removeElement = (code, id) => {
  const lines = code.split('\n');
  const at = lines.findIndex((line) => declares(line, id));
  if (at < 0) return null;
  let end = at;
  if (unquoted(lines[at]).trimEnd().endsWith('{')) {
    const close = lines.findIndex((line, index) => index > at && line.trim() === '}');
    end = close < 0 ? lines.length - 1 : close;
  }
  const word = new RegExp(`(?<![\\w.\\u00C0-\\u024F\\u0400-\\u04FF-])${escapeRegExp(id)}(?![\\w\\u00C0-\\u024F\\u0400-\\u04FF-])`);
  let links = 0;
  const kept = lines.filter((line, index) => {
    if (index >= at && index <= end) return false;
    const text = unquoted(line).trim();
    const joins = (LINK_MARKS.test(text) || LINK_WORDS.test(text)) && !text.startsWith('//') && word.test(text);
    if (joins) links += 1;
    return !joins;
  });
  return { code: kept.join('\n'), links };
};

const LABEL = /"((?:[^"\\]|\\.)*)"/;
const quoteLabel = (text) => `"${String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')}"`;

// The text of the first quoted string on the line that declares the element, or null when the element has no label in the code.
export const labelOf = (code, id) => {
  const line = code.split('\n').find((item) => declares(item, id));
  const found = line === undefined ? null : LABEL.exec(line);
  return found ? found[1].replace(/\\(.)/g, (_, char) => (char === 'n' ? '\n' : char)) : null;
};

// Writes a new label into the declaration of an element. Returns null when the element does not exist or has no label to change.
export const renameElement = (code, id, label) => {
  const lines = code.split('\n');
  const at = lines.findIndex((item) => declares(item, id));
  if (at < 0 || !LABEL.test(lines[at])) return null;
  lines[at] = lines[at].replace(LABEL, () => quoteLabel(label));
  return lines.join('\n');
};

// The picture of an element on its button: one of a few shapes, as in a shape library of a drawing tool.
const SHAPES = {
  circle: ['start', 'end', 'intermediate', 'place', 'vertex', 'initial', 'final', 'and', 'or', 'xor', 'port', 'connector', 'individual'],
  diamond: ['exclusive', 'decision', 'question', 'merge'],
  bar: ['fork', 'join', 'transition', 'parallel'],
  cylinder: ['database', 'store'],
  cloud: ['cloud'],
  actor: ['actor', 'person', 'client'],
  doc: ['note', 'comment', 'artifact', 'data'],
  hexagon: ['event', 'router', 'switch', 'server'],
  round: ['process', 'task', 'usecase', 'state', 'function', 'system', 'external', 'unit', 'topic', 'root', 'outcome', 'object', 'interaction'],
  class: ['class', 'interface', 'entity', 'classifier', 'metaclass', 'stereotype'],
};
const PATHS = {
  circle: '<circle cx="10" cy="10" r="6.5"/>',
  diamond: '<path d="M10 2.5l7.5 7.5-7.5 7.5L2.5 10z"/>',
  bar: '<rect x="3" y="8" width="14" height="4"/>',
  cylinder: '<ellipse cx="10" cy="5" rx="6" ry="2.5"/><path d="M4 5v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5"/>',
  cloud: '<path d="M6 15a3.5 3.5 0 010-7 4.5 4.5 0 018.6-1A3.8 3.8 0 0115 15z"/>',
  actor: '<circle cx="10" cy="5" r="2.5"/><path d="M10 7.5v6M5 10h10M10 13.5l-3.5 4M10 13.5l3.5 4"/>',
  doc: '<path d="M4 3h8l4 4v10H4zM12 3v4h4"/>',
  hexagon: '<path d="M6 3.5h8l3.5 6.5-3.5 6.5H6L2.5 10z"/>',
  round: '<rect x="2.5" y="5" width="15" height="10" rx="5"/>',
  class: '<rect x="3" y="3.5" width="14" height="13"/><path d="M3 8h14M3 12h14"/>',
  box: '<rect x="2.5" y="5" width="15" height="10" rx="1"/>',
};
const SHAPE_OF = Object.fromEntries(Object.entries(SHAPES).flatMap(([shape, words]) => words.map((word) => [word, shape])));

// The inner markup of a 20 by 20 icon for a keyword; every keyword has one.
export const glyphFor = (keyword) => PATHS[SHAPE_OF[keyword] ?? 'box'];
