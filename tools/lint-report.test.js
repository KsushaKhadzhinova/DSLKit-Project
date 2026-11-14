import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lintReport } from './lint-report.js';

const ru = `## 1 Цель работы

Изучить сетевой обмен.

## 2 Ход работы

Результаты показаны на рисунке 1.

![Диаграмма](a.svg)

Рисунок 1 – Количество запросов

Таблица 1 – Сводные данные

| a | b |
|---|---|
| "x" | 1 |

## Заключение

Работа выполнена.

## Приложение А – Листинг программы

\`\`\`js
const a = "b";
\`\`\`
`;

const en = `## 1 Purpose of the Work

Study network traffic.

## 2 Progress

The results are shown in Figure 1.

![Chart](a.svg)

Figure 1 – Request count

Table 1 – Summary

| a | b |
|---|---|
| 1 | 2 |

## Conclusion

Done.

## Appendix A – Program listing

\`\`\`js
const a = "b";
\`\`\`
`;

const has = (errors, part) =>
  assert.ok(
    errors.some((e) => e.includes(part)),
    `${part} in ${JSON.stringify(errors)}`,
  );

test('valid reports pass', () => {
  assert.deepEqual(lintReport(ru, 'ru'), []);
  assert.deepEqual(lintReport(en, 'en'), []);
  assert.deepEqual(lintReport(ru), []);
});

test('russian rules', () => {
  has(lintReport('## Выводы\n', 'ru'), 'Цель работы');
  has(lintReport('## Выводы\n', 'ru'), 'Заключение');
  has(lintReport('## Выводы\n', 'ru'), 'нужно назвать');
  has(lintReport(`${ru}Мы также проверили.\n`, 'ru'), 'также');
  has(lintReport(`${ru}Пакеты были загружены.\n`, 'ru'), 'также');
  has(lintReport(`${ru}Это видно (см. рис. 1).\n`, 'ru'), 'скобках');
  has(lintReport(`${ru}Он сказал "да".\n`, 'ru'), 'кавычки');
  assert.deepEqual(lintReport(`${ru}Слово табличка и забыли.\n`, 'ru'), []);
});

test('code, images and appendices placement', () => {
  has(lintReport(ru.replace('## Заключение', '```\nx\n```\n## Заключение'), 'ru'), 'Код в основном');
  has(lintReport(`${ru}\n![Ещё](b.svg)\n\nРисунок 2 – Ещё\n`, 'ru'), 'Рисунок в приложении');
  has(lintReport(`${ru}\n## Приложение Б Название\n`, 'ru'), 'Название приложения');
});

test('figure and table captions', () => {
  has(lintReport(ru.replace('Рисунок 1 – Количество запросов', 'Рис. 1'), 'ru'), 'Подпись рисунка 1');
  has(lintReport(ru.replace('Рисунок 1 – Количество запросов', 'Рисунок 1 – количество'), 'ru'), 'Подпись рисунка 1');
  has(lintReport(ru.replace('Результаты показаны на рисунке 1.', 'Результаты.'), 'ru'), 'Перед рисунком');
  has(lintReport(ru.replace('Таблица 1 – Сводные данные', 'Данные'), 'ru'), 'Подпись таблицы 1');
});

test('english rules', () => {
  has(lintReport('## Conclusions\n', 'en'), 'Purpose of the Work');
  has(lintReport('## Conclusions\n', 'en'), 'Conclusion');
  has(lintReport('## Conclusions\n', 'en'), 'Rename');
  has(lintReport(`${en}We also checked.\n`, 'en'), 'Filler');
  has(lintReport(`${en}Shown (see Figure 1).\n`, 'en'), 'parentheses');
  has(lintReport(en.replace('Figure 1 – Request count', 'Figure 1 – request count'), 'en'), 'Figure caption 1');
  has(lintReport(en.replace('Table 1 – Summary', 'Summary'), 'en'), 'Table caption 1');
  has(lintReport(`${en}\n## Appendix B Name\n`, 'en'), 'Appendix title');
  assert.deepEqual(lintReport(`${en}He said "yes", also fine.\n`.replace(' also', ''), 'en'), []);
});

test('captions are required even at the edges of the text', () => {
  has(lintReport('![Схема](a.svg)', 'ru'), 'Подпись рисунка 1');
  has(lintReport('![Схема](a.svg)', 'ru'), 'Перед рисунком');
  has(lintReport(['| a |', '|---|'].join('\n'), 'ru'), 'Подпись таблицы 1');
});

const strictRu = ['## 1 Цель работы', '', 'Текст.', '', '## Заключение', '', 'Готово, листинг в приложении А.', '', '## Приложение А (обязательное) Листинг файла server.js', '', 'Текст приложения.', ''].join('\n');
const strictEn = ['## 1 Purpose of the Work', '', 'Text.', '', '## Conclusion', '', 'Done, the listing is in appendix A.', '', '## Appendix A (mandatory) Listing of server.js', '', 'Appendix text.', ''].join('\n');

test('strict mode accepts the appendix format from the teacher in both languages', () => {
  assert.deepEqual(lintReport(strictRu, 'ru', { strict: true }), []);
  assert.deepEqual(lintReport(strictEn, 'en', { strict: true }), []);
});

test('strict mode rejects the old appendix title, a missing appendix and a missing reference', () => {
  has(lintReport(strictRu.replace(' (обязательное)', ' –'), 'ru', { strict: true }), 'обязательное');
  has(lintReport(strictEn.replace(' (mandatory)', ' –'), 'en', { strict: true }), 'mandatory');
  has(lintReport(['## 1 Цель работы', '', '## Заключение', ''].join('\n'), 'ru', { strict: true }), 'хотя бы одно приложение');
  has(lintReport(['## 1 Purpose of the Work', '', '## Conclusion', ''].join('\n'), 'en', { strict: true }), 'At least one appendix');
  has(lintReport(strictRu.replace('в приложении А', 'ниже'), 'ru', { strict: true }), 'Нет ссылки в тексте на приложение А');
  has(lintReport(strictEn.replace('in appendix A', 'below'), 'en', { strict: true }), 'No reference to the appendix in the text A');
});

test('strict mode rejects semicolons and sentences that start with a figure or table reference', () => {
  has(lintReport(strictRu.replace('Текст.', 'Первое; второе.'), 'ru', { strict: true }), 'Точка с запятой');
  has(lintReport(strictEn.replace('Text.', 'First; second.'), 'en', { strict: true }), 'Semicolon');
  has(lintReport(strictRu.replace('Текст.', 'Рисунок 2 показывает всё.'), 'ru', { strict: true }), 'начинается со ссылки');
  has(lintReport(strictEn.replace('Text.', 'Works. Table 3 shows all.'), 'en', { strict: true }), 'starts with a figure or table reference');
  // A reference with a two-digit number is found too, and a caption with a two-digit number is not taken for a sentence start.
  has(lintReport(strictRu.replace('Текст.', 'Рисунок 12 показывает всё.'), 'ru', { strict: true }), 'начинается со ссылки');
  const caption = strictRu.replace('Текст.', ['Текст.', '', 'Рисунок 10 – Подпись'].join(String.fromCharCode(10)));
  assert.ok(!lintReport(caption, 'ru', { strict: true }).some((e) => e.includes('начинается со ссылки')));
});

test('the default mode keeps the old appendix format and ignores the strict rules', () => {
  assert.deepEqual(lintReport(strictRu.replace(' (обязательное)', ' –').replace('Текст.', 'Первое; второе.'), 'ru'), []);
});
