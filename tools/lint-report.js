const L = {
  ru: {
    goal: /^## 1 Цель работы$/m,
    conclusion: /^## Заключение$/m,
    conclusionWord: /^#{1,6}\s+(?:\d+(?:\.\d+)*\s+)?Выводы(?![а-яё])/im,
    forbidden: /(?<![а-яё])(также|были)(?![а-яё])/i,
    parens: /\(\s*(см\.?|смотри|рис|табл)/i,
    quotes: /"/,
    figure: 'Рисунок',
    table: 'Таблица',
    ref: 'рисунк\\S*',
    appendix: /^## Приложение [А-Я] – \S/,
    appendixStrict: /^## Приложение [А-Я] \(обязательное\) \S/,
    appendixRef: (letter) => new RegExp(`приложени\\S* ${letter}(?![А-Яа-яЁё])`, 'i'),
    startsWithRef: /(?:^|[.!?]\s+)(?:Рисунок|Таблица|Рисунки|Таблицы) \d+(?!\d| –)/m,
    appendixAny: /^## Приложение/m,
    messages: {
      goal: 'Раздел «1 Цель работы» отсутствует или не пронумерован',
      conclusion: 'Раздел «Заключение» отсутствует',
      conclusionWord: 'Раздел «Выводы» нужно назвать «Заключение»',
      forbidden: 'Слова-паразиты «также», «были»',
      parens: 'Ссылка на рисунок или таблицу в скобках',
      quotes: 'Прямые кавычки вместо «ёлочек»',
      caption: 'Подпись рисунка',
      mention: 'Перед рисунком нет описания со ссылкой словами',
      table: 'Подпись таблицы',
      code: 'Код в основном тексте, его место в приложении',
      image: 'Рисунок в приложении',
      appendix: 'Название приложения',
      appendixStrict: 'Приложение должно называться «Приложение А (обязательное) Название»',
      noAppendix: 'Нужно хотя бы одно приложение',
      appendixRef: 'Нет ссылки в тексте на приложение',
      semicolon: 'Точка с запятой в тексте, сложное предложение разбить',
      startsWithRef: 'Предложение начинается со ссылки на рисунок или таблицу',
    },
  },
  en: {
    goal: /^## 1 Purpose of the Work$/m,
    conclusion: /^## Conclusion$/m,
    conclusionWord: /^#{1,6}\s+(?:\d+(?:\.\d+)*\s+)?Conclusions\b/m,
    forbidden: /(?<![a-z])(also|were)(?![a-z])/i,
    parens: /\(\s*(see|fig|table)/i,
    quotes: null,
    figure: 'Figure',
    table: 'Table',
    ref: 'figure',
    appendix: /^## Appendix [A-Z] – \S/,
    appendixStrict: /^## Appendix [A-Z] \(mandatory\) \S/,
    appendixRef: (letter) => new RegExp(`appendix ${letter}\\b`, 'i'),
    startsWithRef: /(?:^|[.!?]\s+)(?:Figure|Table|Figures|Tables) \d+(?!\d| –)/m,
    appendixAny: /^## Appendix/m,
    messages: {
      goal: 'Section "1 Purpose of the Work" is missing',
      conclusion: 'Section "Conclusion" is missing',
      conclusionWord: 'Rename "Conclusions" to "Conclusion"',
      forbidden: 'Filler words "also", "were"',
      parens: 'Figure or table reference in parentheses',
      caption: 'Figure caption',
      mention: 'No description with a worded reference before the figure',
      table: 'Table caption',
      code: 'Code in the main text, it belongs to an appendix',
      image: 'Figure inside an appendix',
      appendix: 'Appendix title',
      appendixStrict: 'An appendix must be titled "Appendix A (mandatory) Title"',
      noAppendix: 'At least one appendix is required',
      appendixRef: 'No reference to the appendix in the text',
      semicolon: 'Semicolon in the text, split the sentence',
      startsWithRef: 'A sentence starts with a figure or table reference',
    },
  },
};

const strip = (s) =>
  s
    .replace(/^```[\s\S]*?^```/gm, '')
    .replace(/^[!|].*$/gm, '')
    .replace(/`[^`\n]*`/g, '');

// strict adds the rules from the teacher's remarks for Part 2: appendix format, references, no semicolons.
export const lintReport = (text, lang = 'ru', { strict = false } = {}) => {
  const r = L[lang];
  const m = r.messages;
  const errors = [];
  const check = (bad, msg) => bad && errors.push(msg);
  const appendixAt = text.search(r.appendixAny);
  const body = appendixAt < 0 ? text : text.slice(0, appendixAt);
  const prose = strip(text);
  check(!r.goal.test(text), m.goal);
  check(!r.conclusion.test(text), m.conclusion);
  check(r.conclusionWord.test(text), m.conclusionWord);
  check(r.forbidden.test(prose), m.forbidden);
  check(r.parens.test(prose), m.parens);
  check(r.quotes?.test(prose), m.quotes);
  check(/^```/m.test(body), m.code);
  check(appendixAt >= 0 && /^!\[/m.test(text.slice(appendixAt)), m.image);
  check(
    !strict && text.split('\n').some((l) => r.appendixAny.test(l) && !r.appendix.test(l)),
    m.appendix,
  );
  if (strict) {
    const titles = text.split('\n').filter((l) => r.appendixAny.test(l));
    check(titles.length === 0, m.noAppendix);
    check(titles.some((l) => !r.appendixStrict.test(l)), m.appendixStrict);
    titles.forEach((l) => {
      const found = /Приложение ([А-Я])|Appendix ([A-Z])/.exec(l);
      const letter = found[1] ?? found[2];
      check(!r.appendixRef(letter).test(strip(body)), `${m.appendixRef} ${letter}`);
    });
    check(/;/.test(prose), m.semicolon);
    check(r.startsWithRef.test(prose), m.startsWithRef);
  }
  const lines = text.split('\n');
  const at = (i, step) => {
    for (let j = i + step; j >= 0 && j < lines.length; j += step) if (lines[j].trim()) return lines[j];
    return '';
  };
  let fig = 0;
  let tbl = 0;
  lines.forEach((line, i) => {
    if (line.startsWith('![')) {
      fig += 1;
      check(!new RegExp(`^${r.figure} ${fig} – \\S`).test(at(i, 1)) || !/^\p{Lu}/u.test(at(i, 1).split(' – ')[1]), `${m.caption} ${fig}`);
      check(!new RegExp(`${r.ref} ${fig}`, 'i').test(at(i, -1)), `${m.mention} ${fig}`);
    }
    if (line.startsWith('|') && !lines[i - 1]?.startsWith('|')) {
      tbl += 1;
      check(!new RegExp(`^${r.table} ${tbl} – \\p{Lu}`, 'u').test(at(i, -1)), `${m.table} ${tbl}`);
    }
  });
  return errors;
};
