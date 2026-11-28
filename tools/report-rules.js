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
    storage: /(?<![а-яё])(?:массив[а-яё]*|в памяти)(?![а-яё])/i,
    messages: {
      seeRef: 'Слова «см.» или «смотри» рядом со ссылкой на рисунок или таблицу',
      altQuotes: 'Лапки вместо «ёлочек»',
      appendixLetter: 'Запрещённая буква приложения (Ё, З, Й, О, Ч, Ъ, Ы, Ь)',
      appendixOrder: 'Приложения идут не по порядку букв',
      invisible: 'Невидимые символы в тексте (нулевая ширина, мягкий перенос, BOM)',
      spaces: 'Лишние пробелы в тексте (двойные, в конце строки, табуляция)',
      emptyParagraph: 'Пустой абзац: подряд больше одной пустой строки',
      dash: 'Дефис вместо тире «–» (в паузе или диапазоне)',
      noNbsp: 'Неразрывные пробелы не используются, нужен обычный пробел',
      yo: 'Буква «ё» не используется, нужна «е»',
      tocLong: 'Название слишком длинное для одной строки содержания, нужно сократить',
      noIntro: 'После заголовка раздела и до первого подраздела нужен абзац текста',
      longDash: 'Длинное тире «—» не используется, нужно короткое «–»',
      softBreak: 'Ручной перенос строки не используется, нужен новый абзац',
      tableRows: `Таблица длиннее ${MAX_TABLE_ROWS} строк, её нужно сократить или перенести`,
      emptyCell: 'Пустая ячейка таблицы, нужен прочерк «–»',
      tableRef: 'Нет ссылки в тексте на таблицу',
      figureGap: 'Рисунок отделяется пустой строкой до и после',
      captionDot: 'Точка в конце подписи рисунка или таблицы',
      headingDot: 'Точка в конце заголовка',
      sectionOrder: 'Номера разделов идут не по порядку',
      questions: 'Нет раздела «Ответы на контрольные вопросы» с номерами вопросов',
      questionSet: 'Номера контрольных вопросов должны быть n−1, n, n+1 варианта',
      numeral: 'Число от 1 до 9 без единицы измерения пишется словом (СТП 2.3.12)',
      italic: 'Курсив в тексте, его не используют',
      storage: 'Слова «массив» или «в памяти» в отчёте о работе с базой данных (чётный вариант хранит данные в БД)',
      ordinal: 'Порядковое числительное словами, нужна цифра с наращением («2-м», «1-й»)',
      repository: 'Нет ссылки на репозиторий',
      branch: 'Нет названия ветки репозитория',
    },
  },
  en: {
    seeRef: /(?<![a-z])see (?:fig|table)/i,
    altQuotes: null,
    tableRef: (n) => new RegExp(`table ${n}(?!\\d)`, 'i'),
    units: /\d [%‰]|\d (?:ms|kB|KB|MB|GB|mm|cm|pt|px)(?![a-z])/,
    questions: /^#{2,3} (?:\d+ )?(?:\d+\.\d+ )?Answers to (?:the )?Control Questions$/im,
    letter: /^## Appendix ([A-Z])\b/,
    storage: /\barrays?\b|\bin[ -]memory\b/i,
    messages: {
      seeRef: 'The word "see" next to a figure or table reference',
      appendixLetter: 'Forbidden appendix letter',
      appendixOrder: 'Appendices are not in letter order',
      invisible: 'Invisible characters in the text (zero width, soft hyphen, BOM)',
      spaces: 'Extra spaces in the text (double, trailing, tab)',
      emptyParagraph: 'Empty paragraph: more than one blank line in a row',
      dash: 'Hyphen instead of the en dash "–" (pause or range)',
      noNbsp: 'Non-breaking spaces are not used, use a plain space',
      yo: 'The letter ё is not used, write е',
      tocLong: 'A title is too long for one line of the contents, shorten it',
      noIntro: 'A paragraph of text is needed between a section title and its first subsection',
      longDash: 'The long dash is not used, use the short dash',
      softBreak: 'A manual line break is not used, start a new paragraph',
      tableRows: `Table longer than ${MAX_TABLE_ROWS} rows, shorten or move it`,
      emptyCell: 'Empty table cell, use the dash "–"',
      tableRef: 'No reference to the table in the text',
      figureGap: 'A figure is separated by a blank line before and after',
      captionDot: 'Full stop at the end of a figure or table caption',
      headingDot: 'Full stop at the end of a heading',
      sectionOrder: 'Section numbers are not consecutive',
      questions: 'No section "Answers to the Control Questions" with question numbers',
      questionSet: 'Control question numbers must be n−1, n, n+1 of the variant',
      italic: 'Italics in the text are not used',
      storage: 'The words "array" or "in memory" in a report on database work (an even variant keeps its data in the database)',
      repository: 'No link to the repository',
      branch: 'No branch name of the repository',
    },
  },
};

// A digit 1-9 followed by a lower case word is a counted noun ("3 ресурса") and must be a word; a digit after a capitalised
// word ("Express 5", "Части 1") or after a reference word ("рисунке 1", "вариант 26") is a name or a number.
const REFERENCE = /(?:рисун|таблиц|приложени|раздел|пункт|вопрос|номер|код|версии|порт|вариант|шаг|строк|страниц|ответ|пз|лр)\p{L}*$/iu;
const numerals = (prose) =>
  [...prose.matchAll(/(?<![\p{L}\d.,№§/–:-])[1-9](?![\d.,:/%-]) (?!%|мс|кБ|КБ|МБ|ГБ|мм|см|пт|px)\p{Ll}+/gu)].some((x) => {
    const before = /(\p{L}+) $/u.exec(prose.slice(0, x.index));
    return !before || (!/^\p{Lu}/u.test(before[1]) && !REFERENCE.test(before[1]));
  });

// An ordinal number is written as a digit with an ending (2-м, 1-й), not as a word. Quoted text is left alone.
const ORDINAL =
  /(?<![а-яё])(?:перв|втор|трет|четв[её]рт|пят|шест|седьм|восьм|девят)(?:ый|ий|ой|ого|ому|ым|им|ом|ая|яя|ую|юю|ей|ое|ее|ые|ие|ых|их|ыми|ими|ья|ье|ьи|ью|ьего|ьему|ьим|ьем|ьей|ьих|ьими)(?![а-яё])/i;

const mask = (s) => s.replace(/^```[\s\S]*?^```/gm, 'CODE');

// opts.variant and opts.questions (the number of questions in the task) enable the question-set check;
// opts.ordinals (default true) turns the ordinal numeral rule off for old reports; opts.database forbids the words of an in-memory store, opts.repository and opts.branch must appear in the report.
export const extraErrors = (text, lang, { variant, questions, database, repository, branch, ordinals = true } = {}) => {
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
  check(/[\u200b-\u200d\u2060\u00ad\ufeff]/.test(flat), m.invisible);
  check(/\t|[^\S\n]$|(?<=\S)  +(?=\S)/m.test(flat.replace(/^(?:\||\s{4}).*$/gm, '')), m.spaces);
  check(/\n{3,}/.test(flat), m.emptyParagraph);
  check(/\s-\s|\d-\d/.test(prose.replace(/\d{4}-\d{2}-\d{2}/g, '')), m.dash);
  check(/[\u00a0\u202f]/.test(text), m.noNbsp);
  check(/[ёЁ]/.test(text), m.yo);
  // a line of the contents has to fit one line: the title, and for an appendix also the place «(к подразделу N.N)»
  check(
    text.split('\n').some((l) => /^##+ /.test(l) && l.replace(/^#+ /, '').length + (/^## (?:Приложение|Appendix) /.test(l) ? 19 : 0) > 62),
    m.tocLong,
  );
  check(/^## [^\n]*\n\n### /m.test(text.replace(/^```[^]*?^```/gm, '')), m.noIntro);
  check(/[\u2014\u2015\u2012]/.test(text), m.longDash);
  check(/[\u2028]|<br ?\/?>/.test(text), m.softBreak);
  check(/(?<![*\w])\*[^*\s][^*\n]*\*(?!\*)|(?<!\w)_[^_\s]+_(?!\w)/.test(prose), m.italic);
  check(lang === 'ru' && numerals(prose), m.numeral);
  // The text of a control question is quoted from the task and left alone, like the quoted text.
  check(ordinals && lang === 'ru' && ORDINAL.test(prose.replace(/«[^»]*»/g, '').replace(/^\d+\. .*\?$/gm, '')), m.ordinal);
  check(database && r.storage.test(prose), m.storage);
  check(repository && !raw.includes(repository), m.repository);
  check(branch && !new RegExp(`(?<![\\w-])${branch}(?![\\w-])`).test(raw), m.branch);
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
      check(
        line
          .split('|')
          .slice(1, -1)
          .some((c) => !c.trim()),
        m.emptyCell,
      );
    }
    if (line.startsWith('![')) check(lines[i - 1]?.trim() !== '' || lines[i + 1]?.trim() !== '', m.figureGap);
    if (/^(?:Рисунок|Figure|Таблица|Table) \d+ – /.test(line)) check(/\.$/.test(line.trim()), m.captionDot);
    if (/^#{1,6} /.test(line)) check(/\.$/.test(line.trim()), m.headingDot);
  });
  if (rows) endTable();

  const sections = lines
    .map((l) => /^## (\d+) \S/.exec(l))
    .filter(Boolean)
    .map((x) => Number(x[1]));
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
