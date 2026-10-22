# Negative tests, lab 6 (MongoDB)

File: `tests/negative.test.js` (28 tests, run on a temporary MongoDB). No defects were found: every wrong request is answered with a clear 4xx or 503 and the server keeps running.

| Scenario | Expected answer | Test |
| --- | --- | --- |
| Empty body | 400 | POST answers 400 for an empty body |
| Truncated JSON | 400, message mentions JSON | POST answers 400 for truncated JSON |
| `null`, array, string, number as body | 400 | POST answers 400 for JSON null, an array, a string and a number |
| Body sent as `text/plain` | 400 | POST answers 400 for a body that is not JSON content |
| Object nested 50 levels deep in a string field | 400 | POST answers 400 for a nested object where a string is expected |
| Number, boolean, array in a text field | 400 | POST answers 400 for numbers and booleans in text fields |
| Empty, tab-only, space-only, newline title | 400 | POST answers 400 for empty, tab-only and space-only titles |
| Title 81 characters long | 400 | POST answers 400 for a title one character over the limit |
| Emoji and right-to-left text | 201, text unchanged | POST accepts emoji and right-to-left text |
| NUL character in a title | 201 or 400, never 500 | POST answers 400 or stores a NUL character without a 500 |
| Priority -1, 1.5, "1", true, 3, 2147483648 | 400 | POST answers 400 for priority -1, 1.5, ... |
| Priority `1e309` in raw JSON | 400 | POST answers 400 for a priority written as 1e309 |
| Unknown notation | 400 | POST answers 400 for a notation outside the list |
| Forged `id`, `_id`, `role`, `createdAt`, `comments` | 201, fields ignored | POST ignores forged id, owner-like and timestamp fields |
| `' OR 1=1 --`, `{"$ne":null}` as values | stored as text, or 400 for an object | POST stores an operator-looking text as plain text |
| Operators, repeated keys, bad limit and skip in the query | 400 | GET list answers 400 for NoSQL operators in the query string |
| Ids `abc`, `-1`, `0`, `1.5`, `1e3`, `0x1`, `%`, `%00`, huge number, space, 5000 characters | 400 | GET by a malformed id answers 400 |
| Unknown route | 404 JSON | an unknown route answers 404 |
| `DELETE /diagrams` | 405 with `Allow` | an unsupported method answers 405 |
| Body 1 MB over the limit | 413 | a body one megabyte over the limit answers 413 |
| Two identical POST requests | two records | two identical POST requests create two records |
| PUT twice | same result, one record | a repeated PUT leaves the same result |
| PUT without required fields | 400 | PUT without required fields answers 400 |
| DELETE twice, then GET and PUT | 204, 404, 404, 404 | DELETE twice answers 204 and then 404 |
| Parallel PATCH to one record | all 200, valid record | parallel PATCH requests to one record |
| Blank comment author, 1001-character comment | 400 | a comment with a blank author or a too long text answers 400 |
| Comment on a missing diagram | 404 | a comment on a missing diagram answers 404 |
| Database not ready | 503 without internal details | with the database closed the API answers 503 |

Not covered here: authorization (the lab has no login), unsupported `Content-Type` answered with 415 (the lab answers 400, which is a clear error too).

## Негативные тесты, часть 2: неправильные действия пользователя

Файл: `tests/negative-misuse.test.js` (39 тестов, временная MongoDB). Имя `tests/negative.test.js` уже занято тестами выше, поэтому новый файл назван иначе. Старые тесты не менялись и не удалялись. Всего в `npm test`: 136 тестов, было 97, все проходят, покрытие 100%.

| Сценарий | Ожидаемый ответ | Тест |
| --- | --- | --- |
| Пустой объект `{}` вместо диаграммы | 400 с перечнем полей | POST answers 400 for an empty JSON object |
| Тело без заголовка `Content-Type` | 400 | POST answers 400 for a body sent without a Content-Type header |
| Тело в виде `application/x-www-form-urlencoded` | 400 | POST answers 400 for a form-encoded body |
| JSON с `NaN` (в JSON такого значения нет) | 400, сообщение о JSON | POST answers 400 for JSON with NaN, which JSON does not allow |
| Нотация в нижнем регистре `uml` | 400 | POST answers 400 for a notation written in lower case |
| Заголовок из одних неразрывных пробелов | 400 | POST answers 400 for a title made only of non-breaking spaces |
| Заголовок ровно 80 символов | 201 | POST accepts a title of exactly 80 characters |
| Эмодзи: 40 штук в заголовке (80 единиц) и 41 штука | 201, затем 400 | POST counts an emoji as two characters against the title limit |
| NUL внутри тега | 201 или 400, без 500 | POST answers 201 or 400 for a NUL character inside a tag, never 500 |
| Повтор ключа `title` в JSON | 201, последнее значение | POST answers 201 and keeps the last value when a key is repeated in the JSON |
| Вложенность 50 уровней в поле, которого нет в схеме | 201, поле отброшено | POST ignores a 50-level nested field that is not in the schema |
| Priority `9007199254740993` в сыром JSON | 400 | POST answers 400 for a priority of 9007199254740993, beyond the safe integer range |
| 21 тег при лимите 20 | 400, запись не создана | POST answers 400 for 21 tags, one over the limit, and the tags stay unsaved |
| Тело с ключом `__proto__` без полей диаграммы | 400 | POST answers 400 for a body with a __proto__ key that carries no diagram fields |
| PUT с 21 тегом | 400 | PUT answers 400 for 21 tags, one over the limit |
| PUT с подменённым `id` в теле | 200, `id` записи прежний | PUT ignores a forged id in the body and keeps the record id |
| PATCH с пустым объектом | 400 | PATCH answers 400 for an empty JSON object |
| PATCH с нотацией вне списка | 400 | PATCH answers 400 for a notation outside the list |
| PATCH с ключом `__proto__` | 400, запись не изменена | PATCH answers 400 for a __proto__ key instead of a 500 |
| PATCH удалённой записи | 404 | PATCH on a deleted record answers 404 |
| Два параллельных DELETE одной записи | 204 и 404, без 500 | two parallel DELETE requests answer 204 and 404, never 500 |
| PUT на коллекцию `/diagrams` | 405 с `Allow: GET, POST` | PUT on the collection answers 405 with an Allow header |
| GET на `/diagrams/:id/comments` | 405 с `Allow: POST` | GET comments answers 405 because comments are only added with POST |
| Id длиной 23 и 25 символов | 400 | GET by an id of 23 or 25 characters answers 400 |
| 24 символа, не hex, и закодированные `../` | 400 | GET by a 24-character id with non-hex characters or encoded dots answers 400 |
| Id в верхнем регистре, записи нет | 404 | GET by an upper-case id of a missing record answers 404 |
| Неизвестный маршрут с путём из 8000 символов | 404 JSON | an unknown route with an 8000-character path answers 404 with a JSON error |
| Ключи запроса `constructor`, `toString`, `hasOwnProperty`, `__proto__` | 400, не 500 | GET list answers 400 for query keys named like object members, not 500 |
| Неизвестный ключ запроса `colour` | 400 | GET list answers 400 for an unknown query key |
| Сортировка вне списка: `--title`, пусто, `title;drop`, `$title` | 400 | GET list answers 400 for a sort value outside the list |
| `limit=1e309`, `limit=1.5`, `skip=1e309`, `skip` из 20 цифр | 400 | GET list answers 400 for paging values written as 1e309, 1.5 or a 20-digit skip |
| Поиск `q` длиннее 60 символов | 400 | GET list answers 400 for a search text longer than 60 characters |
| Операторы в `/diagrams/count` | 400 | GET /diagrams/count answers 400 for NoSQL operators in the query string |
| Комментарий к записи, где уже 100 комментариев | 400, число комментариев не меняется | a comment on a diagram that already holds 100 comments answers 400 |
| Текст комментария ровно 1000 символов | 201 | a comment with exactly 1000 characters of text is accepted |
| NUL в авторе комментария | 201 или 400, без 500 | a comment with a NUL character in the author answers 201 or 400, never 500 |
| PUT комментария с id `abc` | 400 | PUT with a malformed comment id answers 400 |
| Повторное DELETE того же комментария | 200, затем 404 | DELETE of the same comment twice answers 200 and then 404 |
| База закрыта: POST, GET по id и DELETE | 503, в ответе только поле `error`, без деталей БД | with the database closed POST, GET by id and DELETE answer 503 with only an error field |

### Найденные дефекты и исправления

Крупных дефектов не найдено. Найдены три мелких, все исправлены минимально.

| Сценарий | Что было | Что стало |
| --- | --- | --- |
| PATCH с ключом `__proto__` | 500: `TypeError: diagramChecks[name] is not a function`, потому что проверка `name in diagramChecks` видит унаследованные свойства объекта | 400 с сообщением о запросе. Исправлено в `src/middleware/validate.js`: `Object.hasOwn(diagramChecks, name)` вместо `in` |
| GET списка с ключом `constructor`, `toString`, `hasOwnProperty` или `__proto__` | 500: `TypeError` при разборе диапазона `PAGING`, та же причина | 400 с сообщением о параметрах. Исправлено в `src/middleware/validate.js`: `Object.hasOwn(PAGING, name)` вместо `in` |
| 101-й комментарий к записи | 201, в записи 101 комментарий: лимит 100 не проверялся, потому что валидаторы Mongoose не проверяют длину массива при `$push` | 400 `A diagram holds at most 100 comments`, запись не меняется. Исправлено в `src/controllers/diagrams.controller.js`: `$push` выполняется только при свободном месте в массиве; оператор помечен `mongoose.trusted`, так как `sanitizeFilter` включён |

Замечания, которые дефектами не считаются:
- Неподдерживаемый `Content-Type` (например, `charset=utf-16`) отвечает 400, а не 415, как и раньше. Понятная ошибка, не падение.
- NUL-символ в теге и в авторе комментария сохраняется (201). Сервер не падает, запрет на такой символ в ТЗ не описан.
- Повтор ключа в JSON: побеждает последнее значение (201).

Файлы `report.md` и `report.en.md` пересобраны скриптом `tools/build-report.js` по шаблонам: в них встроен исходный код контроллера, и тест сверки отчёта с шаблоном иначе падал.
