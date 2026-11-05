// Writes README.md (Russian) and README.en.md (English) of the folder from the list of diagrams and the report of the last build.
// Usage: node docs/diagrams/readme.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { DIAGRAMS } from './diagrams.mjs';

const here = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const report = JSON.parse(readFileSync(`${here}report.json`, 'utf8'));
const NAMES = {
  c4: ['C4', 'C4'],
  'uml-usecase': ['UML: варианты использования', 'UML: use case'],
  'uml-class': ['UML: классы', 'UML: class'],
  'uml-object': ['UML: объекты', 'UML: object'],
  'uml-component': ['UML: компоненты', 'UML: component'],
  'uml-composite': ['UML: составная структура', 'UML: composite structure'],
  'uml-deployment': ['UML: развёртывание', 'UML: deployment'],
  'uml-package': ['UML: пакеты', 'UML: package'],
  'uml-profile': ['UML: профиль', 'UML: profile'],
  'uml-activity': ['UML: деятельность', 'UML: activity'],
  'uml-state': ['UML: состояния', 'UML: state machine'],
  'uml-sequence': ['UML: последовательность', 'UML: sequence'],
  'uml-communication': ['UML: коммуникация', 'UML: communication'],
  'uml-timing': ['UML: синхронизация', 'UML: timing'],
  'uml-overview': ['UML: обзор взаимодействий', 'UML: interaction overview'],
  idef0: ['IDEF0', 'IDEF0'],
  idef1: ['IDEF1', 'IDEF1'],
  idef1x: ['IDEF1X', 'IDEF1X'],
  idef3: ['IDEF3', 'IDEF3'],
  idef4: ['IDEF4', 'IDEF4'],
  idef5: ['IDEF5', 'IDEF5'],
  dfd: ['DFD', 'DFD'],
  erd: ['ERD', 'ERD'],
  bpmn: ['BPMN', 'BPMN'],
  petri: ['Сеть Петри', 'Petri net'],
  gost: ['Блок-схема ГОСТ 19.701-90', 'Flowchart (GOST 19.701-90)'],
  graph: ['Граф', 'Graph'],
  dag: ['DAG', 'DAG'],
  mindmap: ['Ментальная карта', 'Mind map'],
  orgchart: ['Оргструктура', 'Organisation chart'],
  network: ['Схема сети', 'Network scheme'],
  decision: ['Дерево решений', 'Decision tree'],
  epc: ['eEPC', 'eEPC'],
};

const text = {
  ru: {
    file: 'README.md',
    other: 'README.en.md',
    h1: 'Диаграммы системы DSLKit',
    intro: [
      'Здесь собраны диаграммы, которые описывают саму систему DSLKit: сайт и редактор, серверные части, клиент на React, развёртывание в Docker и организацию работы. Каждая диаграмма сделана **в самом сервисе**: текст на языке DSLKit набран в настоящем редакторе, нарисован его собственным движком в браузере и выгружен его же функциями экспорта (`serializeSvg` для SVG и `rasterize` для PNG).',
      'Для каждой диаграммы есть два варианта подписей, русский и английский: файлы лежат в папках `ru` и `en`.',
    ],
    index: 'Состав',
    columns: ['№', 'Вид', 'Диаграмма', 'Файлы'],
    how: 'Как посмотреть и открыть в редакторе',
    howText: [
      'Рисунки: `png/ru/…`, `png/en/…` (растр с белым фоном, масштаб 2) и `svg/ru/…`, `svg/en/…` (векторные).',
      'Исходный текст: `dsl/ru/…`, `dsl/en/…`. Откройте редактор (`site/app/editor.html`, для английского `site/en/app/editor.html`), вставьте текст в поле кода, выберите движок «Собственный (в браузере)».',
      'Перестроить всё: запустить сайт (`node tools/serve.js site 5188`) и выполнить `node docs/diagrams/build.mjs`; тексты лежат в `docs/diagrams/diagrams.mjs` в одном месте для двух языков.',
    ],
    check: 'Как проверена правильность отрисовки',
    checkText: [
      'Каждый исходный текст сначала разобран парсером сервиса: ни ошибок, ни предупреждений (`node docs/diagrams/check.mjs`).',
      'Затем он набран в настоящем редакторе в браузере, и на странице измерено: рисунок появился; код в редакторе равен исходному; ни одна подпись не выходит за рисунок; подписи не налезают друг на друга; подпись внутри фигуры целиком лежит внутри её контура (проверка по настоящему контуру ромба, эллипса, прямоугольника); подпись на связи не спрятана под фигурой; подпись под значком не касается значка; в рисунке нет `NaN`; все подписи из исходного текста есть в рисунке.',
      'Результат последнего прогона: 68 из 68 рисунков проходят все проверки (`report.json`). Русский вариант всех 34 диаграмм просмотрен глазами после последних правок. Английский просмотрен после правки размеров фигур, а после этого его рисунки пересобраны из тех же исходных структур и прошли те же автоматические проверки.',
    ],
    found: 'Что нашла проверка в самом сервисе',
    foundText: [
      'Размеры фигур считались по семь пикселей на символ, как для прямоугольника. Поэтому текст в ромбах и эллипсах выходил за контур, широкие буквы (Ш, Ж, W, M) вылезали за края, а узкие оставляли пустое место. Исправлено: ширина текста считается по таблице ширин букв, а ромб и эллипс растут, пока весь блок текста не поместится внутри контура (коммиты `fix(notations)` в ветке `work/part1-finish`, тесты `labs/08-frontend-testing/shape-fit.test.js`).',
      'Подписи из нескольких строк под значком (начало и конец BPMN) налезали на сам значок. Исправлено.',
      'Метки решений и слияний в диаграммах деятельности, состояний и обзора взаимодействий были в ромбе фиксированного размера 44 на 44 и не помещались. Теперь ромб растёт под метку.',
    ],
    limits: 'Известные ограничения сервиса',
    limitsText: [
      'Составная структура (UML composite): части не рисуются внутри классификатора, порты стоят отдельными квадратами и привязаны к частям только по смыслу (атрибуты `in=` и `of=` в рисунке не используются). Так же рисует и стандартный шаблон сервиса, поэтому диаграмма 07 показана как есть.',
      'Кратчайший путь графа (диаграмма 28) и критический путь DAG (диаграмма 29) сервис называет в панели результатов, на рисунке они не подсвечены.',
      'В диаграммах 20 (IDEF3) и 22 (IDEF5) раскладка автоматическая, некоторые связи идут рядом с узлами.',
    ],
    open: 'Диаграмма',
    pngs: 'PNG',
    svgs: 'SVG',
    dsl: 'код',
    switchLang: 'English version',
  },
  en: {
    file: 'README.en.md',
    other: 'README.md',
    h1: 'Diagrams of the DSLKit system',
    intro: [
      'These diagrams describe the DSLKit system itself: the site and the editor, the server parts, the React client, the deployment in Docker and the organisation of the work. Every diagram is made **in the service itself**: the text in the DSLKit language was typed into the real editor, drawn by its own engine in the browser and exported by its own export functions (`serializeSvg` for SVG and `rasterize` for PNG).',
      'Each diagram has two caption variants, Russian and English: the files are in the folders `ru` and `en`.',
    ],
    index: 'Contents',
    columns: ['No.', 'Kind', 'Diagram', 'Files'],
    how: 'How to look at them and open them in the editor',
    howText: [
      'Pictures: `png/ru/…`, `png/en/…` (raster with a white background, scale 2) and `svg/ru/…`, `svg/en/…` (vector).',
      'Source text: `dsl/ru/…`, `dsl/en/…`. Open the editor (`site/app/editor.html`, for English `site/en/app/editor.html`), paste the text into the code field, choose the engine "Own (in the browser)".',
      'Rebuild everything: serve the site (`node tools/serve.js site 5188`) and run `node docs/diagrams/build.mjs`; the texts are in `docs/diagrams/diagrams.mjs`, in one place for both languages.',
    ],
    check: 'How the drawing was verified',
    checkText: [
      'Every source was first read by the parser of the service: no errors and no warnings (`node docs/diagrams/check.mjs`).',
      'Then it was typed into the real editor in a browser, and the page was measured: the drawing appeared; the code in the editor equals the source; no label leaves the drawing; labels do not run over each other; a label inside a shape lies wholly inside its outline (tested against the real outline of the diamond, ellipse or rectangle); a label on a link is not hidden behind a shape; a caption under a symbol does not touch the symbol; there is no `NaN` in the drawing; every label of the source is in the drawing.',
      'Result of the last run: 68 of 68 drawings pass all the checks (`report.json`). The Russian variant of all 34 diagrams was looked at by eye after the last changes. The English one was looked at after the fix of the shape sizes, and after that its drawings were rebuilt from the same source structures and passed the same automatic checks.',
    ],
    found: 'What the check found in the service itself',
    foundText: [
      'The size of a shape was counted as seven pixels for every character, as for a rectangle. So the text in diamonds and ellipses ran over the outline, wide letters (Ш, Ж, W, M) stuck out and narrow ones left empty room. Fixed: the width of a text comes from a table of letter widths, and a diamond and an ellipse grow until the whole block of text fits inside the outline (commits `fix(notations)` in the branch `work/part1-finish`, tests `labs/08-frontend-testing/shape-fit.test.js`).',
      'Captions of several lines under a symbol (BPMN start and end) ran over the symbol. Fixed.',
      'The labels of decisions and merges in activity, state and interaction overview diagrams sat in a diamond of a fixed size of 44 by 44 and did not fit. Now the diamond grows to the label.',
    ],
    limits: 'Known limits of the service',
    limitsText: [
      'Composite structure (UML composite): parts are not drawn inside the classifier, ports are separate squares and tied to their parts only by meaning (the attributes `in=` and `of=` are not used in the drawing). The stock template of the service is drawn the same way, so diagram 07 is shown as it is.',
      'The shortest path of a graph (diagram 28) and the critical path of a DAG (diagram 29) are named by the service in the results panel, they are not highlighted in the drawing.',
      'In diagrams 20 (IDEF3) and 22 (IDEF5) the layout is automatic, some links run close to nodes.',
    ],
    open: 'Diagram',
    pngs: 'PNG',
    svgs: 'SVG',
    dsl: 'code',
    switchLang: 'Русская версия',
  },
};

for (const lang of ['ru', 'en']) {
  const t = text[lang];
  const i = lang === 'ru' ? 0 : 1;
  const L = (ru, en) => (lang === 'ru' ? ru : en);
  const out = [
    `# ${t.h1}`,
    '',
    ...t.intro.flatMap((p) => [p, '']),
    `[${t.switchLang}](${t.other})`,
    '',
    `## ${t.index}`,
    '',
    `| ${t.columns.join(' | ')} |`,
    '| --- | --- | --- | --- |',
  ];
  for (const d of DIAGRAMS) {
    const name = `${d.id}-${d.notation}`;
    out.push(
      `| ${d.id} | ${NAMES[d.notation][i]} | [${d.title[i]}](#${d.id}) | [${t.pngs}](png/${lang}/${name}.png), [${t.svgs}](svg/${lang}/${name}.svg), [${t.dsl}](dsl/${lang}/${name}.dsl) |`,
    );
  }
  out.push('');
  for (const section of ['how', 'check', 'found', 'limits']) {
    out.push(`## ${t[section]}`, '', ...t[`${section}Text`].map((p) => `- ${p}`), '');
  }
  out.push(`## ${L('Диаграммы', 'Diagrams')}`, '');
  for (const d of DIAGRAMS) {
    const name = `${d.id}-${d.notation}`;
    const entry = report.find((e) => e.lang === lang && e.id === d.id);
    out.push(
      `<a id="${d.id}"></a>`,
      '',
      `### ${d.id}. ${d.title[i]}`,
      '',
      d.about[i],
      '',
      `![${d.title[i]}](png/${lang}/${name}.png)`,
      '',
      `*${L('Рисунок', 'Figure')} ${Number(d.id)} – ${d.title[i]}. ${L('Размер', 'Size')}: ${entry?.size ?? ''}.*`,
      '',
    );
  }
  writeFileSync(`${here}${t.file}`, `${out.join('\n')}\n`);
}
console.log('written');
