// The report of a run as Markdown, in Russian and in English. Numbers come only from the report object, never from the product.
const T = {
  ru: {
    title: 'Базовая линия точности автоматизации',
    intro: 'Числа получены командой `npm run eval` на эталонном наборе `docs/eval/` без сети и без ключа ИИ. Подробности устройства: `docs/eval/README.md`.',
    sizes: 'Объём набора',
    sizeRows: ['Описаний на языке', 'Диаграмм с засеянной ошибкой', 'Чистых диаграмм', 'Кодов Mermaid, PlantUML, DOT'],
    detection: 'Определение нотации',
    detectionHead: ['Язык', 'top-1', 'top-3', 'macro-F1', 'ECE'],
    perClass: 'По классам (точность / полнота / F1)',
    classHead: ['Нотация', 'Язык', 'Точность', 'Полнота', 'F1', 'Примеров'],
    build: 'Построение по описанию',
    buildHead: ['Режим', 'Язык', 'F1 элементов', 'F1 связей', 'Без ошибок валидатора', 'Точное совпадение'],
    modes: { auto: 'автоопределение нотации', gold: 'нотация задана' },
    roundTrip: 'Повтор «построить, экспортировать в Mermaid, импортировать, сравнить»',
    roundTripHead: ['Язык', 'Точных', 'Из'],
    check: 'Проверка диаграмм',
    checkRows: [
      'Полнота найденных засеянных ошибок',
      'Полнота с совпадением строки',
      'Доля засеянных, на которых что-то отмечено',
      'Ложные срабатывания на чистых (ошибки и предупреждения)',
      'Засеянных, по которым задан вопрос',
      'Чистых, по которым задан вопрос',
    ],
    categoryHead: ['Категория', 'Найдено', 'Из', 'Полнота'],
    import: 'Точность импорта',
    importHead: ['Формат', 'Принято', 'Из', 'F1 элементов', 'F1 связей'],
    timing: 'Время и стабильность',
    timingNote: 'Время зависит от машины и в сравнении с базовой линией не участвует.',
    stability: 'Стабильность (два прогона дают то же)',
    errors: '20 самых частых ошибок',
    errorsHead: ['№', 'Причина', 'Раз', 'Пример'],
    weak: 'Слабые места',
  },
  en: {
    title: 'Accuracy baseline of the automation',
    intro: 'The numbers come from `npm run eval` on the gold set in `docs/eval/`, with no network and no AI key. How it works: `docs/eval/README.en.md`.',
    sizes: 'Size of the set',
    sizeRows: ['Descriptions per language', 'Diagrams with a seeded defect', 'Clean diagrams', 'Mermaid, PlantUML, DOT codes'],
    detection: 'Notation detection',
    detectionHead: ['Language', 'top-1', 'top-3', 'macro-F1', 'ECE'],
    perClass: 'Per class (precision / recall / F1)',
    classHead: ['Notation', 'Language', 'Precision', 'Recall', 'F1', 'Cases'],
    build: 'Building from a description',
    buildHead: ['Mode', 'Language', 'Element F1', 'Relation F1', 'No validator errors', 'Exact match'],
    modes: { auto: 'notation detected', gold: 'notation given' },
    roundTrip: 'Round trip: build, export to Mermaid, import, compare',
    roundTripHead: ['Language', 'Exact', 'Of'],
    check: 'Diagram checks',
    checkRows: [
      'Recall of seeded defects',
      'Recall with the line matching',
      'Share of seeded diagrams with any finding',
      'False alarms on clean diagrams (errors and warnings)',
      'Seeded diagrams that got a question',
      'Clean diagrams that got a question',
    ],
    categoryHead: ['Category', 'Found', 'Of', 'Recall'],
    import: 'Import fidelity',
    importHead: ['Format', 'Accepted', 'Of', 'Element F1', 'Relation F1'],
    timing: 'Time and stability',
    timingNote: 'Time depends on the machine and does not take part in the comparison with the baseline.',
    stability: 'Stability (two runs give the same answers)',
    errors: 'The 20 most frequent mistakes',
    errorsHead: ['#', 'Reason', 'Times', 'Example'],
    weak: 'Weak spots',
  },
};

const pct = (value) => `${Math.round(value * 1000) / 10} %`;
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => ' --- ').join('|')}|`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');

// The three lowest per-class F1 and the worst categories, as plain statements for the "weak spots" list.
const weakSpots = (report, lang) => {
  const classes = Object.entries(report.detection).flatMap(([code, part]) =>
    Object.entries(part.perClass).map(([name, item]) => ({ code, name, f1: item.f1 })),
  );
  const worstClasses = classes.sort((a, b) => a.f1 - b.f1).slice(0, 3);
  const categories = Object.entries(report.check.seeded.perCategory)
    .sort((a, b) => a[1].recall - b[1].recall)
    .slice(0, 3);
  const say = lang === 'ru' ? ['Нотация', 'категория проверки', 'полнота'] : ['Notation', 'check category', 'recall'];
  return [
    ...worstClasses.map((item) => `- ${say[0]} \`${item.name}\` (${item.code}): F1 ${pct(item.f1)}`),
    ...categories.map(([name, item]) => `- ${say[1]} \`${name}\`: ${say[2]} ${pct(item.recall)}`),
  ];
};

export const renderReport = (report, lang) => {
  const t = T[lang];
  const langs = Object.keys(report.detection);
  const out = [`# ${t.title}`, '', t.intro, '', `## ${t.sizes}`, ''];
  out.push(
    table(
      ['', ''],
      [
        [t.sizeRows[0], langs.map((code) => `${code}: ${report.sizes.descriptions[code]}`).join(', ')],
        [t.sizeRows[1], String(report.sizes.seeded)],
        [t.sizeRows[2], String(report.sizes.clean)],
        [t.sizeRows[3], String(report.sizes.imports)],
      ],
    ),
    '',
    `## ${t.detection}`,
    '',
    table(
      t.detectionHead,
      langs.map((code) => [
        code,
        pct(report.detection[code].top1),
        pct(report.detection[code].topK),
        pct(report.detection[code].macroF1),
        String(report.detection[code].calibration.ece),
      ]),
    ),
    '',
    `### ${t.perClass}`,
    '',
    table(
      t.classHead,
      langs.flatMap((code) =>
        Object.entries(report.detection[code].perClass).map(([name, item]) => [
          name,
          code,
          pct(item.precision),
          pct(item.recall),
          pct(item.f1),
          String(item.support),
        ]),
      ),
    ),
    '',
    `## ${t.build}`,
    '',
    table(
      t.buildHead,
      langs.flatMap((code) =>
        ['auto', 'gold'].map((mode) => [
          t.modes[mode],
          code,
          pct(report.build[code][mode].elements.f1),
          pct(report.build[code][mode].relations.f1),
          pct(report.build[code][mode].validRate),
          pct(report.build[code][mode].exactRate),
        ]),
      ),
    ),
    '',
    `### ${t.roundTrip}`,
    '',
    table(
      t.roundTripHead,
      langs.map((code) => [code, pct(report.build[code].roundTrip.exactRate), String(report.build[code].roundTrip.n)]),
    ),
    '',
    `## ${t.check}`,
    '',
    table(
      ['', ''],
      [
        [t.checkRows[0], pct(report.check.seeded.recall)],
        [t.checkRows[1], pct(report.check.seeded.recallAtLine)],
        [t.checkRows[2], pct(report.check.seeded.anyFindingRate)],
        [t.checkRows[3], pct(report.check.clean.rate)],
        [t.checkRows[4], pct(report.check.questions.askedRate)],
        [t.checkRows[5], `${report.check.questions.cleanAsked} / ${report.check.questions.cleanN}`],
      ],
    ),
    '',
    table(
      t.categoryHead,
      Object.entries(report.check.seeded.perCategory).map(([name, item]) => [name, String(item.found), String(item.n), pct(item.recall)]),
    ),
    '',
    `## ${t.import}`,
    '',
    table(
      t.importHead,
      Object.entries(report.import.byFormat).map(([name, item]) => [name, String(item.ok), String(item.n), pct(item.elements.f1), pct(item.relations.f1)]),
    ),
    '',
    `## ${t.timing}`,
    '',
    `${t.timingNote} ${t.stability}: ${pct(report.stability.rate)} (${report.stability.same} / ${report.stability.n}).`,
    '',
    `## ${t.weak}`,
    '',
    ...weakSpots(report, lang),
    '',
    `## ${t.errors}`,
    '',
    table(
      t.errorsHead,
      report.topErrors.map((item, at) => [String(at + 1), item.reason, String(item.count), item.example]),
    ),
    '',
  );
  return out.join('\n');
};
