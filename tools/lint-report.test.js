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
