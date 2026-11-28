import { extraErrors } from '../report-rules.js';

const L = {
  ru: {
    goal: /^## 1 Цель работы$/m,
    conclusion: /^## Заключение$/m,
    conclusionWord: /^#{1,6}\s+(?:\d+(?:\.\d+)*\s+)?Выводы(?![а-яё])/im,
    forbidden: /(?<![а-яё])(также|был[аои]?)(?![а-яё])/i,
    // The owner's language rules: no «я», «мы», «вы», no imperative, little Latin outside code (the text is a passive, past-tense account).
    person: /(?<![а-яё])(я|мы|вы|мне|нам|нас|вас|меня|мной|нами|вами|наш[а-яё]*|ваш[а-яё]*|мой|моя|моё|мои)(?![а-яё])/gi,
    verb1: /(?<![а-яё])(реализуем|добавим|создадим|рассмотрим|проверим|покажем|опишем|получим|используем|применяем|выберем|зададим|запустим|откроем|отправим|сделаем|возьмём|видим|имеем|можем|будем|реализовал[аи]?|добавил[аи]?|создал[аи]?|проверил[аи]?|сделал[аи]?)(?![а-яё])/gi,
    imperative: /(?<![а-яё])([а-яё]{2,}(?:йте|ьте|йтесь|ьтесь)|запустите|установите|выполните|введите|перейдите|нажмите|удалите|скопируйте|отправьте|убедитесь|посмотрите|проверьте|задайте|верните)(?![а-яё])/gi,
    latin: /(?<![A-Za-z])[A-Za-z][A-Za-z-]+(?![A-Za-z])/g,
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
      forbidden: 'Слова «также», «был», «была», «было», «были»: писать краткими страдательными причастиями без связки',
      person: 'Местоимения первого и второго лица (я, мы, вы), нужен безличный оборот',
      verb1: 'Глагол первого лица или действительного залога от лица автора, нужен страдательный залог',
      imperative: 'Повелительное наклонение, текст описывает уже сделанную работу',
      latin: 'Слишком много латиницы вне кода и идентификаторов, замените английские слова русскими',
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
      placeholder: 'В итоговом отчёте остались рисунки-заглушки вместо снимков',
    },
  },
  en: {
    goal: /^## 1 Purpose of the Work$/m,
    conclusion: /^## Conclusion$/m,
    conclusionWord: /^#{1,6}\s+(?:\d+(?:\.\d+)*\s+)?Conclusions\b/m,
    forbidden: /(?<![a-z])(also|was|were)(?![a-z])/i,
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
      forbidden: 'Filler words "also", "was", "were"',
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
      placeholder: 'Placeholder figures are left in the final report',
    },
  },
};

// Latin words that cannot be written in Russian: names of products, formats and methods. The rest counts against the text.
export const LATIN_OK = new Set(['api', 'rest', 'restful', 'sql', 'sqlite', 'http', 'https', 'json', 'url', 'crud', 'id', 'dslkit', 'openapi', 'swagger', 'ui', 'postman', 'chrome', 'powershell', 'express', 'node', 'js', 'javascript', 'ejs', 'get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'saas', 'cors', 'npm', 'etag', 'html', 'css', 'xml', 'uuid', 'md', 'docx', 'pdf', 'git', 'github']);

const strip = (s) =>
  s
    .replace(/^```[\s\S]*?^```/gm, '')
    .replace(/^[!|].*$/gm, '')
    .replace(/`[^`\n]*`/g, '');

// strict adds the rules from the teacher's remarks for Part 2: appendix format, references, no semicolons.
// strict: 'final' also refuses placeholder figures (the list of them comes in `placeholders`).
// database, repository and branch are passed on to the extra rules of report-rules.js.
export const lintReport = (text, lang = 'ru', { strict = false, variant, questions = 30, database, repository, branch, ordinals, placeholders = [] } = {}) => {
  const r = L[lang];
  const m = r.messages;
  const errors = [];
  const check = (bad, msg) => bad && errors.push(msg);
  const appendixAt = text.search(r.appendixAny);
  const body = appendixAt < 0 ? text : text.slice(0, appendixAt);
  const prose = strip(text);
  // The whole text for the language rules: tables, captions, headings and answers count, listings, inline code, image lines and the questions of the task (they are quotations) do not.
  const whole = text.replace(/^\d+\. .+\?$/gm, '').replace(/^```[\s\S]*?^```/gm, '').replace(/^!\[.*$/gm, '').replace(/`[^`\n]*`/g, '');
  check(!r.goal.test(text), m.goal);
  check(!r.conclusion.test(text), m.conclusion);
  check(r.conclusionWord.test(text), m.conclusionWord);
  check(r.forbidden.test(prose), m.forbidden);
  check(r.parens.test(prose), m.parens);
  check(r.quotes?.test(prose), m.quotes);
  check(/^```/m.test(body), m.code);
  check(appendixAt >= 0 && /^!\[/m.test(text.slice(appendixAt)), m.image);
  check(!strict && text.split('\n').some((l) => r.appendixAny.test(l) && !r.appendix.test(l)), m.appendix);
  if (strict) {
    const titles = text.split('\n').filter((l) => r.appendixAny.test(l));
    check(titles.length === 0, m.noAppendix);
    check(
      titles.some((l) => !r.appendixStrict.test(l)),
      m.appendixStrict,
    );
    titles.forEach((l) => {
      const found = /Приложение ([А-Я])|Appendix ([A-Z])/.exec(l);
      const letter = found[1] ?? found[2];
      check(!r.appendixRef(letter).test(strip(body)), `${m.appendixRef} ${letter}`);
    });
    check(/;/.test(prose), m.semicolon);
    check(r.forbidden.test(whole), m.forbidden);
    if (lang === 'en') {
      const said = whole.replace(/"[^"\n]*"/g, '');
      check(/(?<![A-Za-z])(I|we|you|our|your|my)(?![A-Za-z])/i.test(said), 'First or second person (I, we, you), use the passive voice');
      check(/(?:^|[.!?]\s+)(Run|Add|Open|Start|Check|Set|Use|Press|Install|Create|Enter|Send|Click|Go|See|Note|Make|Take|Replace|Remove)\s/m.test(said), 'Imperative, the text describes work that is done');
    }
    if (lang === 'ru') {
      // addresses and names with digits (branches, versions) are identifiers, not words
      const spoken = whole.replace(/https?:\S+/g, '').replace(/[A-Za-z][A-Za-z-]*\d\w*/g, '').replace(/^#.*$/gm, '').replace(/«[^»\n]*»/g, '');
      const found = (re) => [...new Set([...spoken.matchAll(re)].map((x) => x[0].toLowerCase()))];
      for (const key of ['person', 'verb1', 'imperative']) {
        const words = found(r[key]);
        check(words.length > 0, `${m[key]}: ${words.slice(0, 8).join(', ')}`);
      }
      const all = spoken.match(/[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё-]+/g) ?? [];
      const latin = (spoken.match(r.latin) ?? []).filter((w) => !LATIN_OK.has(w.toLowerCase()));
      check(latin.length > 0.02 * all.length, `${m.latin}: ${[...new Set(latin.map((w) => w.toLowerCase()))].slice(0, 12).join(', ')}`);
    }
    check(r.startsWithRef.test(prose), m.startsWithRef);
    errors.push(...extraErrors(text, lang, { variant, questions, database, repository, branch, ordinals }));
    check(strict === 'final' && placeholders.length > 0, `${m.placeholder}: ${placeholders.join(', ')}`);
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
