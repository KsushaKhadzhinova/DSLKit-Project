import { pickQuestions } from './variant.js';

// Mechanically checkable rules of levels A (any report) and B (practicals and labs), see docs/notes/20-report-rules-stp-2024.md.
// Level C (coursework only) is deliberately absent.
const FORBIDDEN_LETTERS = 'ЁЗЙОЧЪЫЬ';
const ALPHABET = [...'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'].filter((c) => !FORBIDDEN_LETTERS.includes(c));
const MAX_TABLE_ROWS = 30;

const R = {
  ru: {
    seeRef: /(?<![а-яё])смотри(?![а-яё])|(?<![а-яё])см\.\s*(?:рис|табл)/i,
    altQuotes: /[„“”‟]/,
    tableRef: (n) => new RegExp(`таблиц\\S* ${n}(?!\\d)`, 'i'),
    units: /\d [%‰]|\d (?:мс|кБ|КБ|МБ|ГБ|мм|см|пт|px)(?![а-яёa-z])/,
    questions: /^#{2,3} (?:\d+ )?(?:\d+\.\d+ )?Ответы на контрольные вопросы$/m,
    letter: /^## Приложение ([А-Я])(?![А-Яа-яё])/,
    messages: {
      seeRef: 'Слова «см.» или «смотри» рядом со ссылкой на рисунок или таблицу',
      altQuotes: 'Лапки вместо «ёлочек»',
      appendixLetter: 'Запрещённая буква приложения (Ё, З, Й, О, Ч, Ъ, Ы, Ь)',
      appendixOrder: 'Приложения идут не по порядку букв',
      invisible: 'Невидимые символы в тексте (нулевая ширина, мягкий перенос, BOM)',
      spaces: 'Лишние пробелы в тексте (двойные, в конце строки, табуляция)',
      emptyParagraph: 'Пустой абзац: подряд больше одной пустой строки',
      dash: 'Дефис вместо тире «–» (в паузе или диапазоне)',
      nbsp: 'Перед единицей измерения или знаком % нужен неразрывный пробел',
      tableRows: `Таблица длиннее ${MAX_TABLE_ROWS} строк, её нужно сократить или перенести`,
      emptyCell: 'Пустая ячейка таблицы, нужен прочерк «—»',
      tableRef: 'Нет ссылки в тексте на таблицу',
      figureGap: 'Рисунок отделяется пустой строкой до и после',
      captionDot: 'Точка в конце подписи рисунка или таблицы',
      headingDot: 'Точка в конце заголовка',
      sectionOrder: 'Номера разделов идут не по порядку',
      questions: 'Нет раздела «Ответы на контрольные вопросы» с номерами вопросов',
      questionSet: 'Номера контрольных вопросов должны быть n−1, n, n+1 варианта',
    },
  },
  en: {
    seeRef: /(?<![a-z])see (?:fig|table)/i,
    altQuotes: null,
    tableRef: (n) => new RegExp(`table ${n}(?!\\d)`, 'i'),
    units: /\d [%‰]|\d (?:ms|kB|KB|MB|GB|mm|cm|pt|px)(?![a-z])/,
    questions: /^#{2,3} (?:\d+ )?(?:\d+\.\d+ )?Answers to (?:the )?Control Questions$/mi,
    letter: /^## Appendix ([A-Z])\b/,
    messages: {
      seeRef: 'The word "see" next to a figure or table reference',
      appendixLetter: 'Forbidden appendix letter',
      appendixOrder: 'Appendices are not in letter order',
      invisible: 'Invisible characters in the text (zero width, soft hyphen, BOM)',
      spaces: 'Extra spaces in the text (double, trailing, tab)',
      emptyParagraph: 'Empty paragraph: more than one blank line in a row',
      dash: 'Hyphen instead of the en dash "–" (pause or range)',
      nbsp: 'A non-breaking space is required before a unit or the % sign',
      tableRows: `Table longer than ${MAX_TABLE_ROWS} rows, shorten or move it`,
      emptyCell: 'Empty table cell, use the dash "—"',
      tableRef: 'No reference to the table in the text',
      figureGap: 'A figure is separated by a blank line before and after',
      captionDot: 'Full stop at the end of a figure or table caption',
      headingDot: 'Full stop at the end of a heading',
      sectionOrder: 'Section numbers are not consecutive',
      questions: 'No section "Answers to the Control Questions" with question numbers',
      questionSet: 'Control question numbers must be n−1, n, n+1 of the variant',
    },
  },
};

const mask = (s) => s.replace(/^```[\s\S]*?^```/gm, 'CODE');

// opts.variant and opts.questions (the number of questions in the task) enable the question-set check.
export const extraErrors = (text, lang, { variant, questions } = {}) => {
  const r = R[lang];
  const m = r.messages;
  const errors = [];
  const check = (bad, msg) => bad && errors.push(msg);
  const raw = text.replace(/\r\n/g, '\n');
  const flat = mask(raw);
  const lines = flat.split('\n');
  const prose = flat.replace(/^[!|].*$/gm, '').replace(/`[^`\n]*`/g, '');
  const letters = [...raw.matchAll(new RegExp(r.letter.source, 'gm'))].map((x) => x[1]);

  check(r.seeRef.test(prose), m.seeRef);
  check(r.altQuotes?.test(prose), m.altQuotes);
  check(lang === 'ru' && letters.some((c) => FORBIDDEN_LETTERS.includes(c)), m.appendixLetter);
  const order = lang === 'ru' ? ALPHABET : [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  check(
    letters.some((c, i) => order.includes(c) && c !== order[i]),
    m.appendixOrder,
  );
  check(/[​-‍⁠­﻿]/.test(flat), m.invisible);
  check(/\t|[^\S\n]$|(?<=\S)  +(?=\S)/m.test(flat.replace(/^(?:\||\s{4}).*$/gm, '')), m.spaces);
  check(/\n{3,}/.test(flat), m.emptyParagraph);
  check(/\s-\s|\d-\d/.test(prose.replace(/\d{4}-\d{2}-\d{2}/g, '')), m.dash);
  check(r.units.test(prose), m.nbsp);
  let rows = 0;
  let tbl = 0;
  const endTable = () => {
    check(rows > MAX_TABLE_ROWS, m.tableRows);
    rows = 0;
  };
  lines.forEach((line, i) => {
    if (line.startsWith('|')) {
      if (rows === 0) {
        tbl += 1;
        const before = lines.slice(0, i).join('\n');
        check(!r.tableRef(tbl).test(before.replace(/^Таблица \d+ – .*$|^Table \d+ – .*$/gm, '')), `${m.tableRef} ${tbl}`);
      }
      rows += 1;
    } else if (rows) endTable();
    if (line.startsWith('|') && !/^\|[-|\s:]+\|$/.test(line)) {
      check(line.split('|').slice(1, -1).some((c) => !c.trim()), m.emptyCell);
    }
    if (line.startsWith('![')) check(lines[i - 1]?.trim() !== '' || lines[i + 1]?.trim() !== '', m.figureGap);
    if (/^(?:Рисунок|Figure|Таблица|Table) \d+ – /.test(line)) check(/\.$/.test(line.trim()), m.captionDot);
    if (/^#{1,6} /.test(line)) check(/\.$/.test(line.trim()), m.headingDot);
  });
  if (rows) endTable();

  const sections = lines.map((l) => /^## (\d+) \S/.exec(l)).filter(Boolean).map((x) => Number(x[1]));
  check(
    sections.some((n, i) => n !== i + 1),
    m.sectionOrder,
  );

  if (variant !== undefined) {
    const at = flat.search(r.questions);
    if (at < 0) errors.push(m.questions);
    else {
      const rest = flat.slice(at + 1);
      const end = rest.search(/\n#{1,2} (?!\d+\.\d)/);
      const block = end < 0 ? rest : rest.slice(0, end);
      const numbers = [...block.matchAll(/^(\d+)\. /gm)].map((x) => Number(x[1]));
      check(JSON.stringify(numbers) !== JSON.stringify(pickQuestions(variant, questions)), m.questionSet);
    }
  }
  return errors.filter(Boolean);
};
