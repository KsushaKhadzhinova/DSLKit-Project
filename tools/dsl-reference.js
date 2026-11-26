import { writeFileSync } from 'node:fs';
import { GRAMMAR, listNotations } from './render-api.js';
import { TEMPLATES, TEMPLATES_RU } from '../site/js/notations/index.js';

const TEXT = {
  ru: {
    title: 'Справочник языка DSLKit',
    intro:
      'DSLKit описывает диаграмму текстом: первая строка называет нотацию, остальные строки объявляют элементы и связи. Одна строка, один элемент или одна связь. Строки с «//» это комментарии, пустые строки игнорируются. Подписи пишутся в двойных кавычках, внутри кавычек «\\"» и «\n» работают как обычно. Положение блока на доске задаётся необязательным атрибутом pos=XxY. Цвет блока графовых нотаций (DFD, BPMN, ГОСТ, состояния и других, где блоки рисуются из фигур) задаётся необязательным атрибутом color=#rrggbb или color=#rgb, например process 2 "Оплата" color=#ffcc00. Допустим только такой вид: названия цветов и функции вроде rgb() отклоняются ошибкой. Цвет текста выбирается автоматически (чёрный или белый, контраст не ниже 4,5). В PlantUML и Mermaid цвет попадает у блок-схем (стиль узла); у остальных нотаций он не переносится, и редактор сообщает об этом.',
    grammar: 'Грамматика',
    pipeline: 'Как это работает',
    steps: [
      'Разбор: parseDiagram читает текст и строит модель с номерами строк и списком проблем.',
      'Проверка: каждая нотация и общие строгие правила (strict.js) сообщают об ошибках и предупреждениях на русском и английском.',
      'Отрисовка: собственный движок рисует SVG в браузере (site/js/notations), тот же код отдаёт сервер по POST /api/render.',
      'Экспорт: из той же модели получаются Graphviz, Mermaid и PlantUML; через /api/external/<язык> текст на другом языке рисует внешний сервис.',
    ],
    api: 'API',
    notations: 'Нотации',
    header: 'Заголовок',
    nodes: 'Элементы',
    edges: 'Связи',
    formats: 'Экспорт',
    example: 'Пример',
    exampleOther: 'Тот же пример на английском',
    none: 'пишутся в коде, см. пример',
    imports: 'Импорт файлов и картинок',
    importsIntro:
      'Мастер «Автоматическое построение» принимает файлы до 10 МБ. Формат определяется по содержимому, затем по расширению. Структурные форматы читает детерминированный импортёр без ключа ИИ (site/js/utils/diagram-file-import.js), картинки и PDF читает только ИИ сервера.',
    importsRows: [
      ['draw.io (.drawio, .dio, сжатое и несжатое), SVG (экспорт draw.io, Graphviz, Mermaid)', 'блок-схема ГОСТ, BPMN или граф, положения pos=XxY сохраняются'],
      ['JSON (nodes и edges, Cytoscape, Excalidraw, Lucid)', 'граф или блок-схема ГОСТ'],
      ['BPMN 2.0 XML (.bpmn)', 'BPMN с положениями из BPMNShape'],
      ['XMI (.xmi, .uml)', 'UML, диаграмма классов'],
      ['GraphML, GEXF, DOT (.dot, .gv), CSV и TSV со связями', 'граф'],
      ['Visio (.vdx, .vsdx)', 'блок-схема ГОСТ или граф'],
      ['Mermaid (.mmd, .md), PlantUML (.puml, .plantuml, .pu, .wsd), DSLKit (.dsl), текст', 'существующий импорт блок-схем, последовательностей и состояний'],
      ['png, jpeg, webp, gif, pdf', 'только ИИ с ключом на сервере; BMP не принимается'],
    ],
    importsHead: ['Формат', 'Результат'],
  },
  en: {
    title: 'DSLKit language reference',
    intro:
      'DSLKit describes a diagram as text: the first line names the notation, the other lines declare elements and links. One line is one element or one link. Lines starting with "//" are comments, blank lines are ignored. Labels go in double quotes; inside quotes backslash-quote and backslash-n work as usual. The place of a block on the board is the optional attribute pos=XxY. The colour of a block in graph notations (DFD, BPMN, GOST, state machines and others whose blocks are drawn from shapes) is the optional attribute color=#rrggbb or color=#rgb, for example process 2 "Pay" color=#ffcc00. Only this form is accepted: colour names and functions such as rgb() are rejected with an error. The text colour is chosen automatically (black or white, contrast at least 4.5). In PlantUML and Mermaid the colour is carried for flowcharts (a node style); other notations do not carry it, and the editor says so.',
    grammar: 'Grammar',
    pipeline: 'How it works',
    steps: [
      'Parsing: parseDiagram reads the text and builds a model with line numbers and a list of problems.',
      'Checking: every notation and the shared strict rules (strict.js) report errors and warnings in Russian and English.',
      'Drawing: the own engine draws SVG in the browser (site/js/notations), and the server returns the same drawing for POST /api/render.',
      'Export: the same model gives Graphviz, Mermaid and PlantUML; text in another language is drawn by an external service through /api/external/<language>.',
    ],
    api: 'API',
    notations: 'Notations',
    header: 'Header',
    nodes: 'Elements',
    edges: 'Links',
    formats: 'Export',
    example: 'Example',
    exampleOther: 'The same example in Russian',
    none: 'written in the code, see the example',
    imports: 'Importing files and pictures',
    importsIntro:
      'The wizard "Automatic build" takes files up to 10 MB. The format is found by the content first, then by the extension. Structured formats are read by the deterministic importer without an AI key (site/js/utils/diagram-file-import.js); pictures and PDF are read only by the AI of the server.',
    importsRows: [
      ['draw.io (.drawio, .dio, compressed or not), SVG (export of draw.io, Graphviz, Mermaid)', 'GOST flowchart, BPMN or graph, positions pos=XxY are kept'],
      ['JSON (nodes and edges, Cytoscape, Excalidraw, Lucid)', 'graph or GOST flowchart'],
      ['BPMN 2.0 XML (.bpmn)', 'BPMN with the positions of BPMNShape'],
      ['XMI (.xmi, .uml)', 'UML class diagram'],
      ['GraphML, GEXF, DOT (.dot, .gv), CSV and TSV with links', 'graph'],
      ['Visio (.vdx, .vsdx)', 'GOST flowchart or graph'],
      ['Mermaid (.mmd, .md), PlantUML (.puml, .plantuml, .pu, .wsd), DSLKit (.dsl), text', 'the existing import of flowcharts, sequence and state diagrams'],
      ['png, jpeg, webp, gif, pdf', 'only the AI with a key on the server; BMP is not accepted'],
    ],
    importsHead: ['Format', 'Result'],
  },
};

const API_ROWS = [
  ['GET', '/api/notations', '{ notations: [{ id, short, name, header, formats, nodes, edges }] }'],
  ['GET', '/api/grammar', '{ grammar, header }'],
  ['GET', '/api/engines', '{ own, external: [{ id, endpoint }] }'],
  ['POST', '/api/validate', '{ source, lang } -> { notation, valid, problems: [{ line, severity, code, message }] }'],
  ['POST', '/api/parse', '{ source, lang } -> { notation, valid, problems, model }'],
  ['POST', '/api/generate', '{ source, format, lang } -> { notation, format, text }'],
  ['POST', '/api/render', '{ source, lang } -> { notation, valid, problems, svg } (Accept: image/svg+xml gives the bare SVG)'],
  ['POST', '/api/external/<language>', '{ source } -> SVG of the external service (Kroki-compatible, KROKI_URL)'],
];

// The reference of the language, built from the notations themselves, so it never differs from the code.
export const buildReference = (lang = 'ru') => {
  const t = TEXT[lang === 'en' ? 'en' : 'ru'];
  const lines = [
    `# ${t.title}`,
    '',
    t.intro,
    '',
    `## ${t.pipeline}`,
    '',
    ...t.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    `## ${t.grammar}`,
    '',
    '```',
    GRAMMAR,
    '```',
    '',
    `## ${t.api}`,
    '',
  ];
  lines.push(
    '| Method | Path | Body and answer |',
    '| --- | --- | --- |',
    ...API_ROWS.map(([method, path, body]) => `| ${method} | \`${path}\` | ${body.replaceAll('|', '\\|')} |`),
    '',
    `## ${t.imports}`,
    '',
    t.importsIntro,
    '',
    `| ${t.importsHead[0]} | ${t.importsHead[1]} |`,
    '| --- | --- |',
    ...t.importsRows.map(([format, result]) => `| ${format} | ${result} |`),
    '',
    `## ${t.notations}`,
    '',
  );
  listNotations(lang).forEach((item) => {
    const words = (map) =>
      map
        ? Object.keys(map)
            .map((word) => `\`${word}\``)
            .join(', ')
        : t.none;
    lines.push(
      `### ${item.name}`,
      '',
      `- ${t.header}: \`${item.header}\``,
      `- ${t.nodes}: ${words(item.nodes)}`,
      `- ${t.edges}: ${words(item.edges)}`,
      `- ${t.formats}: ${item.formats.join(', ')}`,
      '',
    );
    const key = item.id;
    const [own, other] = lang === 'en' ? [TEMPLATES, TEMPLATES_RU] : [TEMPLATES_RU, TEMPLATES];
    if (own[key]) lines.push(`${t.example}:`, '', '```', own[key], '```', '', `${t.exampleOther}:`, '', '```', other[key], '```', '');
  });
  return `${lines.join('\n').trimEnd()}\n`;
};

export const writeReference = (dir) => {
  writeFileSync(`${dir}/DSL-REFERENCE.md`, buildReference('ru'));
  writeFileSync(`${dir}/DSL-REFERENCE.en.md`, buildReference('en'));
};
