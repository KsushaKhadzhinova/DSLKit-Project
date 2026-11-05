import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDiagram } from '../../site/js/notations/index.js';
import { BUILDABLE, buildBpmn, buildDfd, buildErd, buildGost, buildSequence } from '../../site/js/automation/builders.js';
import { buildFromCode, buildFromDescription, check, detectFormat, detectNotation } from '../../site/js/automation/build.js';
import {
  attrType,
  cleanLabel,
  detectLang,
  entityName,
  isExternal,
  isStore,
  nameOf,
  parseData,
  parseDescription,
  parseMessages,
  parseSteps,
  splitItems,
} from '../../site/js/automation/describe.js';
import { createRequestHistory } from '../../site/js/automation/history.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const NL = String.fromCharCode(10);
const lines = (...rows) => rows.join(NL);
const errors = (dsl) => parseDiagram(dsl).problems.filter((item) => item.severity === 'error');

test('the language is detected and labels are cleaned', () => {
  assert.equal(detectLang('Привет'), 'ru');
  assert.equal(detectLang('Hello'), 'en');
  assert.equal(cleanLabel('  "check" the order;  '), "'check' the order");
  assert.equal(cleanLabel('x'.repeat(10)), 'Xxxxxxxxxx');
  assert.ok(cleanLabel('слово '.repeat(30)).length <= 60);
  assert.equal(cleanLabel('a\\b'), "A'b");
});

test('items are split by lines, markers, sentences and "then" words', () => {
  assert.deepEqual(splitItems(lines('1. Ввести n', '- Вывести сумму', '* Конец.'), 'ru'), ['Ввести n', 'Вывести сумму', 'Конец']);
  assert.deepEqual(splitItems('Сначала проверить заказ, затем отправить его. Потом закрыть. В конце уведомить клиента', 'ru'), [
    'проверить заказ',
    'отправить его',
    'закрыть',
    'уведомить клиента',
  ]);
  assert.deepEqual(splitItems('First open it, then close it. Finally log.', 'en'), ['open it', 'close it', 'log']);
  assert.deepEqual(splitItems('Если ok, то идти и затем стоять', 'ru'), ['Если ok, то идти и затем стоять']);
  assert.deepEqual(splitItems(''), []);
});

test('steps, conditions with and without else, a separate else and loops are read', () => {
  const ru = parseSteps(
    splitItems(
      lines(
        'Принять заказ',
        'Если товар есть, то отправить, иначе отказать',
        'Если оплата прошла, отправить письмо',
        'Иначе позвонить',
        'Пока есть позиции, собирать их',
        'Повторять проверку пока ошибка',
      ),
      'ru',
    ),
    'ru',
  );
  assert.deepEqual(ru[0], { type: 'step', text: 'Принять заказ' });
  assert.deepEqual(ru[1], { type: 'decision', cond: 'Товар есть?', yes: 'Отправить', no: 'Отказать' });
  assert.deepEqual(ru[2], { type: 'decision', cond: 'Оплата прошла?', yes: 'Отправить письмо', no: 'Позвонить' });
  assert.deepEqual(ru[3], { type: 'loop', cond: 'Есть позиции?', body: 'Собирать их' });
  assert.deepEqual(ru[4], { type: 'loop', cond: 'Ошибка?', body: 'Проверку' });
  const en = parseSteps(
    splitItems(
      lines('If it is ready then ship it', 'Otherwise', 'wait', 'if paid, send mail', 'While busy do wait', 'Repeat check while failed', 'Else nothing'),
      'en',
    ),
    'en',
  );
  assert.deepEqual(en[0], { type: 'decision', cond: 'It is ready?', yes: 'Ship it', no: null });
  assert.deepEqual(en[1], { type: 'step', text: 'Wait' });
  assert.equal(en[2].type, 'decision');
  assert.equal(en[3].type, 'loop');
  assert.equal(en[4].type, 'loop');
  assert.deepEqual(en[5], { type: 'step', text: 'Else nothing' });
  assert.deepEqual(parseSteps(['Иначе позвонить'], 'ru'), [{ type: 'step', text: 'Иначе позвонить' }]);
});

test('names of entities and actors go to the base form', () => {
  assert.equal(entityName('заказов'), 'Заказ');
  assert.equal(entityName('клиента'), 'Клиент');
  assert.equal(entityName('платёжный сервис'), 'Платёжный_сервис');
  assert.equal(entityName('the orders'), 'Order');
  assert.equal(entityName('categories'), 'Category');
  assert.equal(nameOf('Courses'), 'course');
  assert.equal(attrType('дата_рождения'), 'date');
  assert.equal(attrType('price'), 'decimal');
  assert.equal(attrType('количество'), 'int');
  assert.equal(attrType('name'), 'string');
  assert.equal(isStore('База'), true);
  assert.equal(isStore('Клиент'), false);
  assert.equal(isExternal('Bank'), true);
  assert.equal(isExternal('Система'), false);
});

test('data: lists, attributes, relations with and without quantity, owner verbs and many-to-many', () => {
  const ru = parseData(
    splitItems(
      lines(
        'Сущности: клиент, заказ, позиция',
        'У клиента много заказов',
        'Заказ содержит позиции',
        'Заказ принадлежит клиенту',
        'Клиент (имя, email и телефон)',
        'Заказ: номер, дата',
        'У клиента есть адрес',
        'У клиента есть заказы',
        'Клиент имеет возраст',
        'Студенты и курсы связаны как многие ко многим',
        'Студент изучает много курсов',
        'У клиента есть паспорт',
        'Привет',
      ),
      'ru',
    ),
    'ru',
  );
  const names = ru.entities.map((entity) => entity.name);
  assert.deepEqual(names.slice(0, 3), ['Клиент', 'Заказ', 'Позиция']);
  assert.ok(ru.strong >= 8);
  assert.ok(ru.relations.some((item) => item.from === 'Клиент' && item.to === 'Заказ' && item.card === '1:N'));
  assert.ok(ru.relations.some((item) => item.from === 'Заказ' && item.to === 'Позиция'));
  assert.ok(ru.relations.some((item) => item.from === 'Клиент' && item.to === 'Заказ' && item.label === 'принадлежит'));
  assert.ok(ru.relations.some((item) => item.card === 'N:M' && item.from === 'Студент'));
  assert.deepEqual(
    ru.entities.find((entity) => entity.name === 'Клиент').attrs.map((attr) => attr.name),
    ['имя', 'email', 'телефон', 'адрес', 'возраст', 'паспорт'],
  );
  const en = parseData(
    splitItems(
      lines(
        'Entities: customer, order',
        'A customer has many orders',
        'An order contains several items',
        'Each order has a date and a total',
        'A student enrolls in many courses',
        'An order belongs to a customer',
        'A user has an address',
        'Students and courses are related as many-to-many',
      ),
      'en',
    ),
    'en',
  );
  assert.ok(en.relations.some((item) => item.from === 'Customer' && item.to === 'Order'));
  assert.ok(en.relations.some((item) => item.from === 'Order' && item.to === 'Item'));
  assert.ok(en.relations.some((item) => item.card === 'N:M'));
  assert.deepEqual(
    en.entities.find((entity) => entity.name === 'Order').attrs.map((attr) => attr.type),
    ['date', 'decimal'],
  );
  assert.ok(parseData(splitItems('Entities: customer, order. A customer has orders', 'en'), 'en').relations.length === 1);
  assert.deepEqual(parseData([], 'ru'), { entities: [], relations: [], strong: 0 });
});

test('messages: actors, receivers, replies, stores and external parties', () => {
  const ru = parseMessages(
    splitItems(
      'Пользователь отправляет запрос системе. Система проверяет данные в базе. База возвращает результат. Система отвечает пользователю. Пользователь',
      'ru',
    ),
    'ru',
  );
  assert.deepEqual(
    ru.map((message) => [message.from, message.to, message.kind]),
    [
      ['Пользователь', 'Система', 'sync'],
      ['Система', 'База', 'sync'],
      ['База', 'Система', 'return'],
      ['Система', 'Пользователь', 'return'],
    ],
  );
  assert.equal(ru[0].rest, 'Запрос');
  assert.equal(ru[0].text, 'отправляет запрос');
  assert.equal(ru[3].rest, 'Отвечает');
  const en = parseMessages(
    splitItems(
      'The user sends a request to the server. The server checks the data in the database. The database returns the result. The server confirms. A bank pays the shop. The shop ships goods to the customer.',
      'en',
    ),
    'en',
  );
  assert.equal(en[0].to, 'Server');
  assert.equal(en[1].to, 'Database');
  assert.equal(en[2].kind, 'return');
  assert.equal(en[3].to, 'Database');
  assert.equal(en[4].to, 'Shop');
  assert.equal(en.at(-1).to, 'Customer');
  assert.deepEqual(parseMessages(['просто слово', 'It rains'], 'ru'), []);
  const fallback = parseMessages(['The robot paints walls', 'The class sees it'], 'en');
  assert.deepEqual(
    fallback.map((message) => message.verb),
    ['paints', 'sees'],
  );
  const same = parseMessages(['Система проверяет данные у пользователя', 'Система возвращает результат'], 'ru');
  assert.deepEqual([same[1].from, same[1].to], ['Система', 'Пользователь']);
  assert.equal(parseMessages(['Пользователь отправляет запрос системе срочно', 'Система отвечает'], 'ru')[0].rest, 'Запрос срочно');
  assert.equal(parseMessages(['Система проверяет данные'], 'ru')[0].to, 'Система');
  assert.equal(parseMessages(['Система возвращает данные'], 'ru')[0].to, 'Система');
  assert.deepEqual(parseMessages(['the sends'], 'en'), []);
});

test('one description gives the title, the items and every reading at once', () => {
  const parsed = parseDescription(lines('Название: Заказ', '1. Принять заказ', '2. Отправить заказ'));
  assert.equal(parsed.title, 'Заказ');
  assert.equal(parsed.lang, 'ru');
  assert.equal(parsed.steps.length, 2);
  assert.equal(parsed.ordered, true);
  assert.equal(parseDescription('Title: x').title, '');
  assert.equal(parseDescription(lines('Просто текст', 'вторая строка'), 'ru').ordered, false);
  assert.equal(parseDescription(lines('Сначала один', 'вторая строка'), 'ru').ordered, true);
  assert.equal(parseDescription('').ordered, false);
});

test('every builder writes valid code and returns null when it has nothing', () => {
  const bpmn = buildFromDescription(
    'Сначала клиент оформляет заказ, затем менеджер проверяет наличие. Если товар есть, то отправить заказ, иначе сообщить клиенту. В конце закрыть заказ.',
  );
  assert.equal(bpmn.notation, 'bpmn');
  assert.deepEqual(errors(bpmn.dsl), []);
  assert.match(bpmn.dsl, /exclusive m1/);
  const loop = buildFromDescription(lines('1. Ввести число n', '2. Задать сумму равной нулю', '3. Пока i меньше n, прибавлять i к сумме', '4. Вывести сумму'), {
    notation: 'gost',
  });
  assert.match(loop.dsl, /io t1/);
  assert.match(loop.dsl, /preparation t2/);
  assert.match(loop.dsl, /flow t3 -> g1/);
  assert.deepEqual(errors(loop.dsl), []);
  const bpmnLoop = buildFromDescription(lines('Принять', 'Пока ошибка, исправлять', 'Закрыть'), { notation: 'bpmn' });
  assert.deepEqual(errors(bpmnLoop.dsl), []);
  const nested = buildFromDescription(lines('Если а, то б, иначе в', 'Если г, то д', 'Готово'), { notation: 'bpmn' });
  assert.deepEqual(errors(nested.dsl), []);
  const gostBranches = buildFromDescription(lines('Если а, то б, иначе в', 'Готово'), { notation: 'gost' });
  assert.deepEqual(errors(gostBranches.dsl), []);
  assert.doesNotMatch(gostBranches.dsl, /exclusive/);
  const erd = buildFromDescription('У клиента много заказов. Заказ содержит позиции. Клиент: имя, id. У клиента много заказов.');
  assert.equal(erd.notation, 'erd');
  assert.equal(erd.dsl.match(/relationship Клиент 1:N Заказ/g).length, 1);
  assert.equal(erd.dsl.match(/id: int pk/g).length, 3);
  assert.deepEqual(errors(erd.dsl), []);
  const sequence = buildFromDescription('Пользователь отправляет запрос системе. Система отвечает пользователю.', { notation: 'uml-sequence' });
  assert.match(sequence.dsl, /actor Пользователь/);
  assert.match(sequence.dsl, /participant Система/);
  assert.match(sequence.dsl, /Система --> Пользователь/);
  assert.deepEqual(errors(sequence.dsl), []);
  const dfd = buildFromDescription('Пользователь отправляет заявку в систему. Система сохраняет заявку в базе. База возвращает данные.', { notation: 'dfd' });
  assert.match(dfd.dsl, /store D1/);
  assert.deepEqual(errors(dfd.dsl), []);
  for (const build of [buildBpmn, buildGost, buildErd, buildSequence, buildDfd]) assert.equal(build(parseDescription('')), null);
  assert.deepEqual(BUILDABLE, ['bpmn', 'gost', 'erd', 'uml-sequence', 'dfd']);
  assert.match(buildBpmn({ ...parseDescription('Step one. Step two.'), title: 'Mine' }), /diagram bpmn "Mine"/);
});

test('auto detection chooses the notation of the text with the expert system', () => {
  const pick = (text) => buildFromDescription(text).notation;
  assert.equal(pick('У клиента много заказов. Заказ содержит позиции.'), 'erd');
  assert.equal(pick('Сначала принять заказ, затем проверить его. Если товара нет, то отказать.'), 'bpmn');
  assert.equal(pick('Пользователь отправляет запрос системе. Система проверяет данные в базе. База возвращает результат.'), 'dfd');
  assert.equal(pick('Клиент оформляет заказ. Менеджер проверяет заказ. Менеджер уведомляет клиента.'), 'uml-sequence');
  assert.equal(pick('Это алгоритм. Ввод числа, затем вывод результата.'), 'gost');
  const detection = detectNotation('Алгоритм и процесс', parseDescription('Алгоритм и процесс'));
  assert.ok(detection.trace.length > 0);
});

test('a description that cannot be built gives a reason', () => {
  assert.deepEqual(buildFromDescription('   '), { ok: false, reason: 'empty' });
  assert.equal(buildFromDescription(undefined).reason, 'empty');
  assert.equal(buildFromDescription('zzz').reason, 'unknown-notation');
  assert.equal(buildFromDescription('zzz', { notation: 'mindmap' }).reason, 'unknown-notation');
  assert.equal(buildFromDescription('Нечего строить', { notation: 'erd' }).reason, 'nothing-found');
  assert.equal(buildFromDescription('Нечего строить', { notation: 'erd', lang: 'en' }).notation, 'erd');
});

test('the check reports a notation, messages in the chosen language and validity', () => {
  const good = check('diagram dfd "A"' + NL + 'entity a' + NL + 'process p "P"' + NL + 'flow a -> p "x"' + NL + 'flow p -> a "y"', 'en');
  assert.equal(good.valid, true);
  assert.equal(good.notation, 'dfd');
  const bad = check('diagram dfd "A"' + NL + 'flow a -> b');
  assert.equal(bad.valid, false);
  assert.match(bad.problems[0].message, /[а-я]/i);
  assert.equal(check('diagram zzz').notation, null);
});

test('code in another language is imported, a file name tells the format when the text does not', () => {
  const mermaid = buildFromCode('graph LR' + NL + 'A --> B', { lang: 'en' });
  assert.equal(mermaid.ok, true);
  assert.equal(mermaid.format, 'mermaid');
  assert.equal(mermaid.kind, 'flowchart');
  assert.equal(mermaid.valid, true);
  assert.equal(buildFromCode('@startuml' + NL + 'A -> B : hi' + NL + '@enduml').format, 'plantuml');
  assert.equal(buildFromCode('diagram graph "G"' + NL + 'vertex A').format, 'dsl');
  assert.equal(buildFromCode('hello', { fileName: 'x.mmd' }).format, 'mermaid');
  assert.equal(buildFromCode('hello', { fileName: 'x.PUML' }).reason, 'unknown');
  const refused = buildFromCode('erDiagram' + NL + 'A ||--o{ B : has');
  assert.deepEqual([refused.ok, refused.reason, refused.name], [false, 'unsupported', 'erDiagram']);
  assert.equal(buildFromCode('').reason, 'empty');
  assert.equal(buildFromCode(undefined).reason, 'empty');
  assert.equal(detectFormat('digraph G {' + NL + 'a -> b' + NL + '}'), 'dot');
  assert.equal(detectFormat('plain'), 'text');
  assert.equal(detectFormat('plain', 'notes.txt'), 'text');
});

test('the history keeps the last requests per user, moves a repeat to the top and survives damage', () => {
  let time = 1;
  const storage = createStorage(createMemoryBackend());
  const history = createRequestHistory({ storage, now: () => time++ });
  const user = { id: 'u1' };
  assert.deepEqual(history.list(user), []);
  history.add(user, { mode: 'idea', text: 'one' });
  history.add(user, { mode: 'code', text: 'two', notation: 'bpmn' });
  const again = history.add(user, { mode: 'idea', text: 'one' });
  assert.deepEqual(
    again.map((item) => item.text),
    ['one', 'two'],
  );
  assert.equal(again[1].notation, 'bpmn');
  assert.equal(again[0].notation, 'auto');
  for (let i = 0; i < 15; i += 1) history.add(user, { mode: 'idea', text: `t${i}` });
  assert.equal(history.list(user).length, 10);
  assert.deepEqual(history.list(null), []);
  history.clear(user);
  assert.deepEqual(history.list(user), []);
  storage.set('automation-history.u1', 'broken');
  assert.deepEqual(history.list(user), []);
  storage.set('automation-history.u1', [
    { mode: 'x', text: 'a' },
    { mode: 'idea', text: 5 },
    { mode: 'image', text: 'ok' },
  ]);
  assert.equal(history.list(user).length, 1);
  const refusing = { get: () => [], set: () => false };
  assert.deepEqual(createRequestHistory({ storage: refusing }).add(user, { mode: 'idea', text: 'x' }), []);
});
