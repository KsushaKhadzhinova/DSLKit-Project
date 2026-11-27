// Makes docs/eval/check.json: clean DSLKit diagrams and the same kinds of diagrams with one seeded defect.
// The truth of a case comes from how it is made (which defect was seeded on which line), never from the answer of the checker.
// Run: node docs/eval/src/make-check.mjs   (the output is deterministic).
import { writeFileSync } from 'node:fs';

const DOMAINS = [
  {
    en: ['Receive order', 'Check stock', 'Pack goods', 'Send invoice', 'In stock?', 'Customer', 'Warehouse', 'Orders'],
    ru: ['Принять заказ', 'Проверить наличие', 'Упаковать товар', 'Выставить счёт', 'Товар есть?', 'Клиент', 'Склад', 'Заказы'],
  },
  {
    en: ['Submit application', 'Review documents', 'Sign contract', 'Issue loan', 'Documents complete?', 'Applicant', 'Bank', 'Loans'],
    ru: ['Подать заявку', 'Проверить документы', 'Подписать договор', 'Выдать кредит', 'Документы полные?', 'Заявитель', 'Банк', 'Кредиты'],
  },
  {
    en: ['Register user', 'Confirm email', 'Create profile', 'Send welcome', 'Email valid?', 'Visitor', 'Mailer', 'Users'],
    ru: [
      'Зарегистрировать пользователя',
      'Подтвердить почту',
      'Создать профиль',
      'Отправить приветствие',
      'Почта верна?',
      'Посетитель',
      'Почтовый сервис',
      'Пользователи',
    ],
  },
  {
    en: ['Accept ticket', 'Diagnose fault', 'Repair device', 'Close ticket', 'Fault found?', 'Client', 'Workshop', 'Tickets'],
    ru: ['Принять обращение', 'Найти неисправность', 'Починить устройство', 'Закрыть обращение', 'Неисправность найдена?', 'Клиент', 'Мастерская', 'Обращения'],
  },
  {
    en: ['Book room', 'Verify payment', 'Issue key', 'Check out guest', 'Payment done?', 'Guest', 'Front desk', 'Bookings'],
    ru: ['Забронировать номер', 'Проверить оплату', 'Выдать ключ', 'Оформить выезд', 'Оплата прошла?', 'Гость', 'Администратор', 'Брони'],
  },
  {
    en: ['Enroll student', 'Assign group', 'Hold exam', 'Issue grade', 'Exam passed?', 'Student', 'Dean office', 'Grades'],
    ru: ['Зачислить студента', 'Назначить группу', 'Провести экзамен', 'Выставить оценку', 'Экзамен сдан?', 'Студент', 'Деканат', 'Оценки'],
  },
  {
    en: ['Create request', 'Approve budget', 'Buy equipment', 'Register asset', 'Budget approved?', 'Employee', 'Finance', 'Assets'],
    ru: ['Создать заявку', 'Утвердить бюджет', 'Закупить оборудование', 'Поставить на учёт', 'Бюджет утверждён?', 'Сотрудник', 'Бухгалтерия', 'Активы'],
  },
  {
    en: ['Take sample', 'Run analysis', 'Write report', 'Send result', 'Sample valid?', 'Patient', 'Laboratory', 'Results'],
    ru: ['Взять образец', 'Выполнить анализ', 'Составить отчёт', 'Отправить результат', 'Образец годен?', 'Пациент', 'Лаборатория', 'Результаты'],
  },
  {
    en: ['Plan route', 'Load truck', 'Deliver parcel', 'Confirm receipt', 'Address found?', 'Sender', 'Courier', 'Parcels'],
    ru: ['Составить маршрут', 'Загрузить машину', 'Доставить посылку', 'Подтвердить получение', 'Адрес найден?', 'Отправитель', 'Курьер', 'Посылки'],
  },
  {
    en: ['Draft article', 'Edit text', 'Publish page', 'Archive version', 'Text approved?', 'Author', 'Editor', 'Articles'],
    ru: ['Написать статью', 'Отредактировать текст', 'Опубликовать страницу', 'Архивировать версию', 'Текст одобрен?', 'Автор', 'Редактор', 'Статьи'],
  },
  {
    en: ['Scan badge', 'Open gate', 'Log entry', 'Notify guard', 'Badge valid?', 'Visitor', 'Guard', 'Journal'],
    ru: ['Считать пропуск', 'Открыть шлюз', 'Записать вход', 'Уведомить охрану', 'Пропуск верен?', 'Посетитель', 'Охранник', 'Журнал'],
  },
  {
    en: ['Choose seat', 'Pay ticket', 'Print ticket', 'Board plane', 'Seat free?', 'Passenger', 'Airline', 'Tickets'],
    ru: ['Выбрать место', 'Оплатить билет', 'Напечатать билет', 'Посадить в самолёт', 'Место свободно?', 'Пассажир', 'Авиакомпания', 'Билеты'],
  },
];

const word = (domain, lang, at) => DOMAINS[domain][lang][at];
const q = (text) => text.replaceAll('"', "'");
const ident = (text) => text.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');

// A diagram is { notation, title, lines: [text of every line after the header] , header }.
// Every maker returns lines with a map of named line positions so that a mutation knows its line number.
const bpmnBase = (domain, lang, shape) => {
  const w = (at) => q(word(domain, lang, at));
  const lines = ['start s "' + (lang === 'ru' ? 'Начало' : 'Start') + '"', `task t1 "${w(0)}"`, `task t2 "${w(1)}"`];
  const flows = ['flow s -> t1', 'flow t1 -> t2'];
  if (shape === 0) {
    lines.push(`task t3 "${w(2)}"`, `end e "${lang === 'ru' ? 'Конец' : 'End'}"`);
    flows.push('flow t2 -> t3', 'flow t3 -> e');
  } else {
    lines.push(`exclusive g1 "${w(4)}"`, `task t3 "${w(2)}"`, `task t4 "${w(3)}"`, 'exclusive g2', `end e "${lang === 'ru' ? 'Конец' : 'End'}"`);
    flows.splice(
      1,
      1,
      'flow t1 -> t2',
      'flow t2 -> g1',
      `flow g1 -> t3 "${lang === 'ru' ? 'да' : 'yes'}"`,
      `flow g1 -> t4 "${lang === 'ru' ? 'нет' : 'no'}"`,
      'flow t3 -> g2',
      'flow t4 -> g2',
      'flow g2 -> e',
    );
  }
  return { notation: 'bpmn', header: `diagram bpmn "${w(0)}"`, lines: [...lines, ...flows] };
};

const gostBase = (domain, lang, shape) => {
  const w = (at) => q(word(domain, lang, at));
  const yes = lang === 'ru' ? 'Да' : 'Yes';
  const no = lang === 'ru' ? 'Нет' : 'No';
  const lines = [
    'start s "' + (lang === 'ru' ? 'Начало' : 'Start') + '"',
    `io i1 "${w(0)}"`,
    `decision d1 "${w(4)}"`,
    `process p1 "${w(1)}"`,
    `io o1 "${w(3)}"`,
    `end e "${lang === 'ru' ? 'Конец' : 'End'}"`,
  ];
  const flows = ['flow s -> i1', 'flow i1 -> d1', `flow d1 -> p1 "${yes}"`];
  if (shape === 0) flows.push(`flow d1 -> o1 "${no}"`, 'flow p1 -> o1', 'flow o1 -> e');
  else flows.push(`flow d1 -> i1 "${no}"`, 'flow p1 -> o1', 'flow o1 -> e');
  return { notation: 'gost', header: `diagram gost "${w(0)}"`, lines: [...lines, ...flows] };
};

const dfdBase = (domain, lang, shape) => {
  const w = (at) => q(word(domain, lang, at));
  const lines = [`entity ${ident(w(5))}`, `process 1 "${w(0)}"`, `process 2 "${w(1)}"`, `store D1 "${w(7)}"`];
  const flows = [
    `flow ${ident(w(5))} -> 1 "${lang === 'ru' ? 'запрос' : 'request'}"`,
    `flow 1 -> D1 "${lang === 'ru' ? 'запись' : 'record'}"`,
    `flow D1 -> 2 "${lang === 'ru' ? 'данные' : 'data'}"`,
  ];
  if (shape === 0) flows.push(`flow 2 -> ${ident(w(5))} "${lang === 'ru' ? 'ответ' : 'answer'}"`);
  else {
    lines.push(`entity ${ident(w(6))}`);
    flows.push(`flow 2 -> ${ident(w(6))} "${lang === 'ru' ? 'результат' : 'result'}"`, `flow ${ident(w(6))} -> 2 "${lang === 'ru' ? 'отчёт' : 'report'}"`);
  }
  return { notation: 'dfd', header: `diagram dfd "${w(3)}"`, lines: [...lines, ...flows] };
};

const erdBase = (domain, lang, shape) => {
  const w = (at) => ident(word(domain, lang, at));
  const a = w(5);
  const b = w(7);
  const lines = [
    `entity ${a} {`,
    '  id: int pk',
    '  name: string',
    '}',
    `entity ${b} {`,
    '  id: int pk',
    `  ${a.toLowerCase()}_id: int fk -> ${a}`,
    '  created: date',
    '}',
  ];
  if (shape === 1)
    lines.push(`entity ${w(6)} {`, '  id: int pk', '  title: string', '}', `relationship ${w(6)} 1:N ${b} "${lang === 'ru' ? 'ведёт' : 'handles'}"`);
  lines.push(`relationship ${a} 1:N ${b} "${lang === 'ru' ? 'создаёт' : 'creates'}"`);
  return { notation: 'erd', header: `diagram erd "${word(domain, lang, 7)}"`, lines };
};

const sequenceBase = (domain, lang, shape) => {
  const w = (at) => q(word(domain, lang, at));
  const a = ident(w(5));
  const b = ident(w(6));
  const lines = [`actor ${a}`, `participant ${b}`, `${a} -> ${b} : ${w(0)}`, `${b} --> ${a} : ${w(3)}`];
  if (shape === 1) lines.push(`participant Log "${w(7)}"`, `${b} -> Log : ${w(1)}`);
  return { notation: 'uml-sequence', header: `diagram uml sequence "${w(0)}"`, lines };
};

const idef0Base = (domain, lang, shape) => {
  const w = (at) => q(word(domain, lang, at));
  const count = 3 + (shape % 3);
  const lines = [];
  for (let at = 0; at < count; at += 1) {
    lines.push(`box A${at + 1} "${w(at % 4)}" {`, ` input: In${at}`, ` control: Rule${at}`, ` output: Out${at}`, '}');
  }
  for (let at = 1; at < count; at += 1) lines.push(`arrow A${at}.output -> A${at + 1}.input`);
  return { notation: 'idef0', header: `diagram idef0 "${w(0)}"`, lines };
};

const MAKERS = { bpmn: bpmnBase, gost: gostBase, dfd: dfdBase, erd: erdBase, 'uml-sequence': sequenceBase, idef0: idef0Base };
const code = (diagram) => [diagram.header, ...diagram.lines].join('\n');
const lineOf = (diagram, predicate) => diagram.lines.findIndex(predicate) + 2;
const withLines = (diagram, lines) => ({ ...diagram, lines });
const insertAt = (diagram, at, extra) => withLines(diagram, [...diagram.lines.slice(0, at), ...extra, ...diagram.lines.slice(at)]);

// The mutations: each returns { diagram, line } or null when the notation has no such defect. `askable` marks a defect a human would ask a question about.
const FLOWS = new Set(['bpmn', 'gost']);
const MUTATIONS = {
  syntax: [
    (d) => {
      const at = d.lines.findIndex((line) => /^(task|process|io|entity|box|actor)\b/.test(line));
      return at < 0
        ? null
        : {
            diagram: withLines(
              d,
              d.lines.map((line, i) => (i === at ? line.replace(/^\S+/, (head) => `${head}x`) : line)),
            ),
            line: at + 2,
          };
    },
    (d) => ({ diagram: { ...d, header: d.header.replace(/^diagram\s+\S+/, (head) => `${head}x`) }, line: 1 }),
    (d) => {
      const at = d.lines.findIndex((line) => line.includes('"'));
      return at < 0
        ? null
        : {
            diagram: withLines(
              d,
              d.lines.map((line, i) => (i === at ? line.replace(/"[^"]*$/, (tail) => tail.slice(0, -1)) : line)),
            ),
            line: at + 2,
          };
    },
  ],
  dangling: [
    (d) => (FLOWS.has(d.notation) ? { diagram: withLines(d, [...d.lines, 'flow t1 -> t9']), line: d.lines.length + 2 } : null),
    (d) => (d.notation === 'dfd' ? { diagram: withLines(d, [...d.lines, 'flow 1 -> 9 "lost"']), line: d.lines.length + 2 } : null),
    (d) => (d.notation === 'erd' ? { diagram: withLines(d, [...d.lines, 'relationship Ghost 1:N Ghost2 "has"']), line: d.lines.length + 2 } : null),
    (d) => (d.notation === 'uml-sequence' ? { diagram: withLines(d, [...d.lines, 'Nobody -> Somebody : call']), line: d.lines.length + 2 } : null),
    (d) => (d.notation === 'idef0' ? { diagram: withLines(d, [...d.lines, 'arrow A1.output -> A9.input']), line: d.lines.length + 2 } : null),
  ],
  unreachable: [
    (d) =>
      FLOWS.has(d.notation)
        ? {
            diagram: withLines(d, [
              ...d.lines.slice(0, -1).filter((l) => !l.startsWith('flow')),
              'task x1 "Orphan step"',
              ...d.lines.filter((l) => l.startsWith('flow')),
              'flow x1 -> e',
            ]),
            line: d.lines.filter((l) => !l.startsWith('flow')).length + 2,
          }
        : null,
    (d) => (d.notation === 'dfd' ? { diagram: insertAt(d, 1, ['entity Lonely']), line: 3 } : null),
    (d) => (d.notation === 'erd' ? { diagram: insertAt(d, 0, ['entity Lonely {', '  id: int pk', '}']), line: 2 } : null),
  ],
  deadend: [
    (d) =>
      FLOWS.has(d.notation)
        ? {
            diagram: withLines(d, [
              ...d.lines.filter((l) => !l.startsWith('flow')),
              'task x1 "Dangling step"',
              ...d.lines.filter((l) => l.startsWith('flow')),
              'flow t1 -> x1',
            ]),
            line: d.lines.filter((l) => !l.startsWith('flow')).length + 2,
            askable: true,
          }
        : null,
    (d) =>
      d.notation === 'dfd' ? { diagram: withLines(d, [...d.lines, 'process 3 "Sink"', 'flow 1 -> 3 "waste"']), line: d.lines.length + 2, askable: true } : null,
    (d) => {
      const last = d.lines.findLastIndex((l) => l.startsWith(' output:'));
      return d.notation === 'idef0'
        ? {
            diagram: withLines(
              d,
              d.lines.filter((_, i) => i !== last),
            ),
            line: d.lines.findLastIndex((l) => l.startsWith('box')) + 2,
            askable: true,
          }
        : null;
    },
  ],
  'notation-rule': [
    (d) =>
      FLOWS.has(d.notation)
        ? {
            diagram: withLines(d, [
              ...d.lines.filter((l) => !l.startsWith('flow')),
              'start s2 "Second start"',
              ...d.lines.filter((l) => l.startsWith('flow')),
              'flow s2 -> t1',
            ]),
            line: d.lines.filter((l) => !l.startsWith('flow')).length + 2,
          }
        : null,
    (d) => (FLOWS.has(d.notation) ? { diagram: withLines(d, [...d.lines, 'flow t1 -> s']), line: d.lines.length + 2 } : null),
    (d) =>
      d.notation === 'erd'
        ? {
            diagram: withLines(
              d,
              d.lines.map((l) => (l === '  id: int pk' ? '  id: int' : l)),
            ),
            line: 3,
          }
        : null,
    (d) =>
      d.notation === 'dfd' ? { diagram: withLines(d, [...d.lines, 'process 4 "Miracle"', 'flow 4 -> 2 "from nowhere"']), line: d.lines.length + 2 } : null,
    (d) =>
      d.notation === 'uml-sequence'
        ? {
            diagram: withLines(d, [
              ...d.lines.slice(0, 2),
              `${d.lines[1].split(' ')[1]} --> ${d.lines[0].split(' ')[1]} : answer without a call`,
              ...d.lines.slice(2),
            ]),
            line: 4,
          }
        : null,
    (d) =>
      d.notation === 'gost'
        ? {
            diagram: withLines(
              d,
              d.lines.filter((l) => !/^flow d1 -> (o1|i1)\b/.test(l)),
            ),
            line: lineOf(d, (l) => l.startsWith('decision')),
            askable: true,
          }
        : null,
  ],
  'level-balance': [
    (d) =>
      d.notation === 'idef0'
        ? {
            diagram: withLines(
              d,
              d.lines
                .slice(0, 10)
                .filter((l) => !l.startsWith('arrow'))
                .concat(['arrow A1.output -> A2.input']),
            ),
            line: null,
          }
        : null,
    (d) =>
      d.notation === 'idef0'
        ? {
            diagram: withLines(d, [
              ...d.lines.filter((l) => !l.startsWith('arrow')),
              ...Array.from(
                { length: 4 },
                (_, at) =>
                  `box A${d.lines.filter((x) => x.startsWith('box')).length + at + 1} "Extra ${at}" {\n input: X${at}\n control: Y${at}\n output: Z${at}\n}`,
              ),
              ...d.lines.filter((l) => l.startsWith('arrow')),
            ]),
            line: null,
          }
        : null,
    (d) =>
      d.notation === 'idef0'
        ? {
            diagram: withLines(
              d,
              d.lines.map((l) => (l === ' control: Rule1' ? '' : l)).filter((l) => l !== ''),
            ),
            line: 7,
          }
        : null,
  ],
};

const cases = [];
const add = (entry) => cases.push({ id: `${entry.kind}-${String(cases.length + 1).padStart(3, '0')}`, ...entry });
const order = Object.keys(MAKERS);

// Clean diagrams: every notation, every domain, both languages, both shapes, in the same fixed pseudo-random order as the seeded ones.
let seed = 20261126;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const CLEAN_TARGET = 116;
const pool = [];
order.forEach((notation) => {
  for (let domain = 0; domain < DOMAINS.length; domain += 1) {
    [0, 1].forEach((shape) => {
      ['en', 'ru'].forEach((lang) => pool.push({ notation, lang, key: code(MAKERS[notation](domain, lang, shape)), weight: random() }));
    });
  }
});
const seenClean = new Set();
pool
  .sort((x, y) => x.weight - y.weight)
  .filter((item) => !seenClean.has(item.key) && seenClean.add(item.key))
  .slice(0, CLEAN_TARGET)
  .forEach((item) => add({ kind: 'clean', notation: item.notation, lang: item.lang, code: item.key }));

// Seeded diagrams: every defect kind on every base that can carry it, in a fixed pseudo-random order, until the target of the category is reached.
const TARGET = { syntax: 18, dangling: 18, unreachable: 16, deadend: 16, 'notation-rule': 18, 'level-balance': 16 };
Object.entries(TARGET).forEach(([category, total]) => {
  const options = [];
  order.forEach((notation) => {
    for (let domain = 0; domain < DOMAINS.length; domain += 1) {
      [0, 1].forEach((shape) => {
        MUTATIONS[category].forEach((mutation, which) => {
          const lang = (domain + shape) % 2 === 0 ? 'en' : 'ru';
          const found = mutation(MAKERS[notation](domain, lang, shape));
          if (found !== null) options.push({ notation, lang, which, found, key: code(found.diagram), weight: random() });
        });
      });
    }
  });
  const seen = new Set();
  options
    .sort((a, b) => a.weight - b.weight)
    .filter((option) => !seen.has(option.key) && seen.add(option.key))
    .slice(0, total)
    .forEach((option) =>
      add({
        kind: 'seeded',
        category,
        notation: option.notation,
        lang: option.lang,
        line: option.found.line,
        askable: option.found.askable === true,
        code: option.key,
      }),
    );
});

const out = { version: 1, note: 'Generated by docs/eval/src/make-check.mjs. The seeded defect and its line are known from how a case is made.', cases };
writeFileSync(new URL('../check.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(cases.filter((c) => c.kind === 'clean').length, 'clean', cases.filter((c) => c.kind === 'seeded').length, 'seeded');
