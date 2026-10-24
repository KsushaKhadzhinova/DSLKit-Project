# Негативные тесты ЛР2

Файл: `tests/negative.test.js`. Запуск: `npm test` в этой папке (SQLite во временном файле, сеть не нужна).
Всего тестов: было 58, стало 79 (добавлено 21).

## Сценарии

| Сценарий | Ожидаемый ответ | Тест |
| --- | --- | --- |
| Тело, вложенное на 50 уровней (массив и объект в `title`) | 400, список остаётся доступен | a body nested 50 levels deep answers 400 and the server keeps working |
| `__proto__` и `constructor` в теле | 201, прототип не меняется | a body with a __proto__ key does not pollute the object prototype |
| Управляющие символы (NUL, BEL, ESC) в `title` и `owner` | 400, в базе ничего не появляется | a title or owner with a control character such as NUL answers 400 and is not stored |
| Эмодзи и текст справа налево | 201, текст без изменений | emoji and right-to-left text are accepted and returned unchanged |
| Тело 1 МБ | 413 с JSON-ошибкой | a body of one megabyte answers 413 with a JSON error |
| `priority`: `-1`, `0`, `1.5`, `1e309`, `2147483648`, `true`, `[]`, `{}` | 400, строка не меняется | a priority that is a number, a boolean or an out-of-range value answers 400 |
| `NaN`, `Infinity`, одинарные кавычки | 400 с `Malformed JSON` | non-JSON numbers such as NaN and Infinity and single quotes answer 400 with the malformed JSON error |
| SQL-строка в `title`; `{"$ne":null}`, `{"$gt":""}`, `{"$where":...}` в `owner` | `title` сохраняется как текст (201); объекты дают 400 | SQL-like text is stored as plain text, operator objects in text fields are refused |
| `id`: `1%20OR%201=1`, `%`, `%00`, `%E0%A4%A`, путь из 10 000 символов | 400, не 500 | an id such as an injected SQL fragment, %, %00 or a 10000-character path answers 400, never 500 |
| GET и PUT по `id` после DELETE | 404 | a diagram deleted by one request answers 404 to a later GET and PUT |
| PUT с пустым телом | 400, строка и `updatedAt` не меняются | a PUT with an empty body answers 400 and the row stays as it was |
| 20 параллельных POST | 20 строк с разными `id` | twenty parallel POST requests create twenty rows with distinct ids |
| PUT и DELETE одного `id` одновременно | DELETE 204; PUT 200 (если шёл раньше) или 404 (если позже) | a PUT and a DELETE on the same id at the same time: the delete answers 204, the PUT answers 200 or 404 |
| `?sort=id;DROP TABLE Diagrams`, повтор `sort`, `sort=constructor`, повтор `order` | 400, таблица на месте | a sort value with SQL in it, a repeated sort or a prototype name answers 400 and the table survives |
| Квадратные скобки в имени параметра | 200, параметр не разбирается как список | bracket names in the query are not parsed as lists, the default list comes back |
| `offset=1000000` с `limit=100` | 200, пустой массив, `X-Total-Count` = 1 | an offset at the upper limit with a full page answers an empty array and the real total |
| `title` из одних невидимых символов (U+200B) | 400 как для пустого | a title made only of a zero-width space is rejected like an empty one |
| Значения enum в другом регистре (`uml`, `HIGH`), пробел в конце | 400 | enum values in another letter case are refused |
| Ошибка БД при POST | 500 с текстом `Internal server error`, без пути к файлу | a database failure on POST answers 500 without the internal message |
| БД закрыта (отдельное подключение, закрытое до запуска) | `/diagrams` 500, `/health` 503, без деталей | a closed database answers 500 on the API and 503 on the health check, without file paths |
| Завершающий `/` в адресе списка и `id` | 200 | a trailing slash on the list or on an id still reaches the right handler |

## Найденные дефекты и исправления

| Сценарий | Что было | Что стало |
| --- | --- | --- |
| Управляющие символы в `title` и `owner` | 201, символы сохранялись в базе | 400, «must not contain control characters». Исправлено в `src/middleware/validate.js` |
| `title` или `owner` только из невидимых символов (U+200B и др.) | 201, запись выглядела пустой | 400, как для пустой строки. Исправлено в `src/middleware/validate.js` (`INVISIBLE`) |

Проверки в миграциях (`trim(...) > 0`) по-прежнему пропускают невидимые символы; API закрывает это раньше, миграции не менялись.
| Поиск `?q=` с символом NUL или другим управляющим (`%00`, `%07`) | 500: SQLite обрывал запрос с таким символом в тексте | 400 `q must be text of 1 to 80 characters without control characters`. Исправлено в `src/middleware/list-query.js`, найдено нагрузочным прогоном `tests/attack.test.js` и `tests/resilience.test.js` |
