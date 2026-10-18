# Негативные тесты ЛР1

Файл: `tests/negative.test.js`. Запуск: `npm test` в этой папке.
Всего тестов: было 37, стало 58 (добавлено 21).

## Сценарии

| Сценарий | Ожидаемый ответ | Тест |
| --- | --- | --- |
| Тело, вложенное на 50 уровней (массив и объект в поле `title`) | 400, сервер отвечает на `/health` | a body nested 50 levels deep answers 400 and the server keeps working |
| Повтор ключа в теле | 201, берётся последнее значение | a key repeated in the body keeps its last value |
| Ключи `__proto__` и `constructor` в теле | 201, прототип `Object` не меняется | a body with a __proto__ key does not pollute the object prototype |
| Управляющие символы (NUL, BEL, ESC) в `title` и `owner` | 400 | a title or owner with a control character such as NUL answers 400 |
| Эмодзи и текст справа налево | 201, текст без изменений | emoji and right-to-left text are accepted and returned unchanged |
| Тело 1 МБ | 413 с JSON-ошибкой | a body of one megabyte answers 413 with a JSON error |
| `priority`: `-1`, `0`, `1.5`, `1e309`, `2147483648`, `true`, `[]`, `{}` | 400 | a priority that is a number, a boolean or an out-of-range value answers 400 |
| `NaN`, `Infinity`, одинарные кавычки, неверный JSON | 400 с `Malformed JSON` | non-JSON numbers such as NaN and Infinity, single quotes and a BOM answer 400 |
| SQL-строка в `title`; `{"$ne":null}`, `{"$gt":""}`, `{"$where":...}` в `owner` | `title` сохраняется как текст (201); объекты с `$` дают 400 | SQL and NoSQL-style values in text fields are stored as plain text, operator objects are refused |
| `id`: `%`, `%00`, `%20`, `%E0%A4%A`, путь из 10 000 символов | 400, не 500 | ids such as %, %00, an encoded space or a 10000-character path answer 400, never 500 |
| GET и PUT по `id` после DELETE | 404 | a diagram deleted by one request answers 404 to a later GET and PUT |
| PUT с пустым телом | 400, данные не меняются | a PUT with an empty body answers 400 and changes nothing |
| 20 параллельных POST | 20 записей с разными `id` | twenty parallel POST requests create twenty diagrams with distinct ids |
| PUT и DELETE одного `id` одновременно | DELETE 204; PUT 200 (если шёл раньше) или 404 (если позже) | a PUT and a DELETE on the same id at the same time: the delete answers 204, the PUT answers 200 or 404 |
| Повтор `sort` или `order`; `sort=constructor`, `__proto__`, `toString` | 400 | a repeated sort or order parameter, or a prototype name as sort, answers 400 |
| Квадратные скобки в имени параметра (`?sort[]=title`) | 200, параметр не разбирается как список | bracket names in the query are not parsed as lists, the default list comes back |
| `offset=1000000` с `limit=100` | 200, пустой массив, `X-Total-Count` = размер списка | an offset at the upper limit with a full page answers an empty array |
| `title` из одних невидимых символов (U+200B) | 400 как для пустого | a title made only of a zero-width space is rejected like an empty one |
| Значения enum в другом регистре (`uml`, `HIGH`), пробел в конце | 400 | enum values in another letter case are refused |
| Сбой хранилища при POST | 500 с текстом `Internal server error`, без деталей | a store failure on POST answers 500 without the internal message |
| Завершающий `/` в адресе списка и `id` | 200 | a trailing slash on the list or on an id still reaches the right handler |

## Найденные дефекты и исправления

| Сценарий | Что было | Что стало |
| --- | --- | --- |
| Управляющие символы в `title` и `owner` (NUL, BEL, ESC) | 201, символы сохранялись в записи | 400, «must not contain control characters». Исправлено в `src/middleware/validate.js` (проверка только для однострочных полей) |
| `title` или `owner` только из невидимых символов (U+200B, U+200C, U+200D, U+2060, U+FEFF) | 201, запись выглядела пустой | 400, как для пустой строки. Исправлено в `src/middleware/validate.js` (`INVISIBLE`) |

Отчёты `report.md` и `report.en.md` пересобраны (`node tools/build.js part-2/lab-01-node-server` из корня репозитория), потому что в них встроен исходный код `validate.js`.
