import { NOTATIONS, formatProblem, parseDiagram } from '../notations/index.js';
import { setNodePosition } from './node-position.js';

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
    { keyword: 'box', prefix: 'A', make: (id) => `box ${id} "${id} function" {\n input: Input\n control: Rule\n output: Output\n}` },
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

// The ways to connect two elements, written the way the notation expects them.
const OWN_LINKS = {
  idef0: [{ id: 'arrow', make: (a, b) => `arrow ${a}.output -> ${b}.input` }],
  idef1: [{ id: 'relationship', make: (a, b) => `relationship ${a} 1:N ${b}` }],
  idef1x: [{ id: 'nonidentifying', make: (a, b) => `nonidentifying ${a} -> ${b}` }],
  erd: [{ id: 'relationship', make: (a, b) => `relationship ${a} 1:N ${b}` }],
  graph: [{ id: 'edge', make: (a, b) => `edge ${a} -- ${b}` }],
};

const nameOf = (keyword) => NAMES[keyword] ?? [keyword, keyword];

// The elements that can be put on the board of a notation.
export const paletteFor = (notation) => {
  const own = OWN[notation];
  if (own) return own.map((item) => ({ ...item, label: nameOf(item.keyword) }));
  const nodes = NOTATIONS[notation]?.nodes ?? {};
  return Object.keys(nodes).map((keyword) => ({
    keyword,
    prefix: keyword.slice(0, 1).toUpperCase(),
    label: nameOf(keyword),
    make: (id) => `${keyword} ${id} "${nameOf(keyword)[1]}"`,
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

// The new element goes to the end of the code; a place on the board is written as pos=XxY.
export const addElement = (code, item, at) => {
  const id = nextId(code, item.prefix);
  const text = `${code.replace(/\s+$/, '')}\n${item.make(id)}`;
  const placed = at ? setNodePosition(text, id, at.x, at.y) : text;
  return { code: placed ?? text, id };
};

export const connectElements = (code, link, from, to) => `${code.replace(/\s+$/, '')}\n${link.make(from, to)}`;

const signature = (item) => `${item.code}${JSON.stringify(item.params)}`;

// The strict gate of hand work: a change is accepted only when it adds no error that the notation reports.
// A diagram that was already wrong stays editable, only new errors stop a change.
export const gate = (before, after, lang = 'ru') => {
  const known = new Set(parseDiagram(before).problems.filter((item) => item.severity === 'error').map(signature));
  const added = parseDiagram(after).problems.find((item) => item.severity === 'error' && !known.has(signature(item)));
  return added ? { ok: false, message: formatProblem(added, lang), problem: added } : { ok: true, message: '', problem: null };
};
