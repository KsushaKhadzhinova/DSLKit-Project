import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extraErrors } from './report-rules.js';

const ru = `## 1 Цель работы

Изучить сеть. Данные собраны в таблице 1.

Таблица 1 – Данные

| a | b |
|---|---|
| 1 | 2 |

## 2 Ход работы

Результат показан на рисунке 1.

![Схема](a.png)

Рисунок 1 – Схема

## 3 Ответы на контрольные вопросы

25. Первый?

    Ответ.

26. Второй?

    Ответ.

27. Третий?

    Ответ.

## Заключение

Работа выполнена за 10 %.

## Приложение А (обязательное) Листинг

\`\`\`js
const a = 1;


const b = 2;
\`\`\`
`;

const en = `## 1 Purpose of the Work

Study the network. The data are in table 1.

Table 1 – Data

| a | b |
|---|---|
| 1 | 2 |

## 2 Progress

The result is shown in figure 1.

![Chart](a.png)

Figure 1 – Chart

### 2.1 Answers to the Control Questions

25. First?

    Answer.

26. Second?

    Answer.

27. Third?

    Answer.

## Conclusion

Done in 10 ms.

## Appendix A (mandatory) Listing

## Appendix B (mandatory) Second listing
`;

const opts = { variant: 26, questions: 30 };
const has = (errors, part) =>
  assert.ok(
    errors.some((e) => e.includes(part)),
    `${part} in ${JSON.stringify(errors)}`,
  );
const only = (text, lang, part, options = opts) => {
  const errors = extraErrors(text, lang, options);
  has(errors, part);
  assert.equal(errors.length, 1, JSON.stringify(errors));
};

test('valid reports pass in both languages', () => {
  assert.deepEqual(extraErrors(ru, 'ru', opts), []);
  assert.deepEqual(extraErrors(en, 'en', opts), []);
  assert.deepEqual(extraErrors(ru.replace(/\n/g, '\r\n'), 'ru'), []);
});

test('references with "see" and typographic quotes', () => {
  only(ru.replace('Изучить сеть.', 'Изучить сеть, см. рис. 1.'), 'ru', 'см.');
  only(ru.replace('Изучить сеть.', 'Изучить сеть, смотри таблицу.'), 'ru', 'см.');
  only(ru.replace('Изучить сеть.', 'Изучить “сеть”.'), 'ru', 'Лапки');
  only(en.replace('Study the network.', 'Study the network, see Figure 1.'), 'en', 'see');
});

test('appendix letters and their order', () => {
  only(ru.replace('Приложение А', 'Приложение З'), 'ru', 'Запрещённая');
  only(`${ru}\n## Приложение В (обязательное) Лишнее\n`, 'ru', 'не по порядку');
  only(`${en}\n## Appendix D (mandatory) Third\n`, 'en', 'not in letter order');
  assert.deepEqual(extraErrors(`${ru}\n## Приложение Б (обязательное) Второе\n`, 'ru'), []);
});

test('invisible characters, extra spaces and empty paragraphs', () => {
  only(ru.replace('Изучить', 'Изу​чить'), 'ru', 'Невидимые');
  only(ru.replace('Изучить сеть.', 'Изучить  сеть.'), 'ru', 'Лишние пробелы');
  only(ru.replace('Изучить сеть.', 'Изучить сеть. '), 'ru', 'Лишние пробелы');
  only(ru.replace('Изучить сеть.', 'Изучить\tсеть.'), 'ru', 'Лишние пробелы');
  only(ru.replace('## 2 Ход работы\n\n', '## 2 Ход работы\n\n\n'), 'ru', 'Пустой абзац');
  assert.deepEqual(extraErrors(ru.replace('| 1 | 2 |', '|  1  |    2 |'), 'ru'), []);
});

test('dashes and non-breaking spaces', () => {
  only(ru.replace('Изучить сеть.', 'Изучить сеть - быстро.'), 'ru', 'Дефис');
  only(ru.replace('Изучить сеть.', 'Изучить 20-30 пакетов.'), 'ru', 'Дефис');
  assert.deepEqual(extraErrors(ru.replace('Изучить сеть.', 'Изучить 2026-10-01 пакеты.'), 'ru'), []);
  only(ru.replace('Изучить сеть.', 'Изучить 10 % пакетов.'), 'ru', 'неразрывный');
  only(ru.replace('Изучить сеть.', 'Изучить 12 пт шрифт.'), 'ru', 'неразрывный');
  only(en.replace('Study the network.', 'Study 10 ms of traffic.'), 'en', 'non-breaking');
  assert.deepEqual(extraErrors(ru.replace('Изучить сеть.', 'Изучить 12 пунктов.'), 'ru'), []);
});

test('tables: length, empty cells, reference and caption', () => {
  const rows = Array.from({ length: 31 }, (_, i) => `| ${i} | x |`).join('\n');
  only(ru.replace('| 1 | 2 |', rows), 'ru', 'длиннее');
  only(ru.replace('| 1 | 2 |', '| 1 |  |'), 'ru', 'Пустая ячейка');
  only(en.replace('| 1 | 2 |', '| | 2 |'), 'en', 'Empty table cell');
  only(ru.replace('в таблице 1', 'ниже'), 'ru', 'Нет ссылки в тексте на таблицу 1');
  only(en.replace('in table 1', 'below'), 'en', 'No reference to the table in the text 1');
  assert.deepEqual(extraErrors(`${ru.trimEnd()}\n\n| a |\n|---|\n| b |`, 'ru').slice(0, 1), ['Нет ссылки в тексте на таблицу 2']);
  assert.deepEqual(extraErrors('Данные в таблице 1.\n\n| a |\n|---|\n| 1 |', 'ru'), []);
});

test('figures and headings', () => {
  only(ru.replace('Результат показан на рисунке 1.\n\n![', 'Результат показан на рисунке 1.\n!['), 'ru', 'пустой строкой');
  only(ru.replace('![Схема](a.png)\n\nРисунок', '![Схема](a.png)\nРисунок'), 'ru', 'пустой строкой');
  only(ru.replace('Рисунок 1 – Схема', 'Рисунок 1 – Схема.'), 'ru', 'Точка в конце подписи');
  only(ru.replace('Таблица 1 – Данные', 'Таблица 1 – Данные.'), 'ru', 'Точка в конце подписи');
  only(ru.replace('## Заключение', '## Заключение.'), 'ru', 'Точка в конце заголовка');
  assert.ok(extraErrors('![x](a.png)', 'ru').some((e) => e.includes('пустой строкой')));
  assert.ok(extraErrors('\n![x](a.png)\n', 'ru').length === 0);
  only(ru.replace('## 2 Ход работы', '## 3 Ход работы').replace('## 3 Ответы', '## 4 Ответы'), 'ru', 'не по порядку');
});

test('control questions must be n-1, n, n+1', () => {
  only(ru.replace('## 3 Ответы на контрольные вопросы', '## 3 Вопросы'), 'ru', 'Нет раздела');
  only(en.replace('Answers to the Control Questions', 'Questions'), 'en', 'No section');
  only(ru.replace('27. Третий?', '28. Третий?'), 'ru', 'n−1, n, n+1');
  only(ru.replace('25. Первый?', '24. Первый?'), 'ru', 'n−1, n, n+1');
  only(en.replace('26. Second?', '27. Second?'), 'en', 'n−1, n, n+1');
  assert.deepEqual(extraErrors(ru.replace('27. Третий?', '28. Третий?'), 'ru'), []);
  const tail = ru.slice(0, ru.indexOf('## Заключение'));
  assert.deepEqual(extraErrors(tail, 'ru', opts), []);
  assert.deepEqual(extraErrors(tail, 'ru', { variant: 1, questions: 30 }), ['Номера контрольных вопросов должны быть n−1, n, n+1 варианта']);
});
