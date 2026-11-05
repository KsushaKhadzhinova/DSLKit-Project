import { writeFileSync } from 'node:fs';
import { GRAMMAR, listNotations } from './render-api.js';
import { TEMPLATES } from '../site/js/notations/index.js';

const TEXT = {
  ru: {
    title: 'Справочник языка DSLKit',
    intro:
      'DSLKit описывает диаграмму текстом: первая строка называет нотацию, остальные строки объявляют элементы и связи. Одна строка, один элемент или одна связь. Строки с «//» это комментарии, пустые строки игнорируются. Подписи пишутся в двойных кавычках, внутри кавычек «\\"» и «\n» работают как обычно. Положение блока на доске задаётся необязательным атрибутом pos=XxY.',
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
    none: 'пишутся в коде, см. пример',
  },
  en: {
    title: 'DSLKit language reference',
    intro:
      'DSLKit describes a diagram as text: the first line names the notation, the other lines declare elements and links. One line is one element or one link. Lines starting with "//" are comments, blank lines are ignored. Labels go in double quotes; inside quotes backslash-quote and backslash-n work as usual. The place of a block on the board is the optional attribute pos=XxY.',
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
    none: 'written in the code, see the example',
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
    ...API_ROWS.map(([method, path, body]) => `| ${method} | \`${path}\` | ${body.replaceAll('|', '\|')} |`),
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
    if (TEMPLATES[key]) lines.push(`${t.example}:`, '', '```', TEMPLATES[key], '```', '');
  });
  return `${lines.join('\n').trimEnd()}\n`;
};

export const writeReference = (dir) => {
  writeFileSync(`${dir}/DSL-REFERENCE.md`, buildReference('ru'));
  writeFileSync(`${dir}/DSL-REFERENCE.en.md`, buildReference('en'));
};
