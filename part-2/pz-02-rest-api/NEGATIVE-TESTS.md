# Негативные тесты: неправильные действия пользователя

Файл с тестами: `test/negative-misuse.test.js` (30 сценариев, все проходят).

## Найденные дефекты и исправления

| Сценарий | Что было | Что стало |
|---|---|---|
| POST с NUL-символом (`\u0000`) в имени | 201: запись создана, в имени сохранён NUL | 400 `validation_failed`, «name must not contain NUL characters», запись не создана (`src/validation.js`) |
| Имя из 80 эмодзи (лимит 80 символов) | 400 «at most 80 characters»: эмодзи считались как 2 единицы UTF-16 | 201: длина считается в символах (кодовых точках), 81 эмодзи даёт 400 (`src/validation.js`) |
| POST с `Content-Type: text/plain` и JSON-телом | 400 `validation_failed` «body must be a JSON object»: тело молча не читалось | 415 `unsupported_media_type`, «Content-Type must be application/json» (`src/app.js`) |

Отчёт `report.md` и файлы `report*.md` пересобраны командой `node tools/build.js part-2/pz-02-rest-api` из корня worktree, потому что отчёт встраивает исходники.

## Сценарии

| Сценарий | Ожидаемый ответ | Тест |
|---|---|---|
| Усечённый JSON в теле POST | 400 `invalid_json`, запись не создана | POST with a truncated JSON body answers 400 invalid_json and creates nothing |
| PATCH с массивом вместо объекта | 400, ошибка в поле `body` | PATCH with an array body answers 400 body must be a JSON object |
| Тело `null` | 400 `invalid_json` | POST with a JSON null body answers 400 invalid_json |
| Тело-строка в JSON | 400, запись не создана | POST with a bare JSON string body answers 400 and creates nothing |
| Вложенность 50 уровней в неизвестном поле | 400 `validation_failed`, поле `meta` не известно | POST with 50 levels of nesting in an unknown field answers 400 validation_failed |
| Повторяющийся ключ в теле | 201, сохраняется последнее значение | POST with a duplicate key keeps the last value |
| Число вместо строки в `name` | 400 «name must be a string» | POST with a number for name answers 400 must be a string |
| Объект вместо строки в `title` | 400 «title must be a string» | POST with an object for title answers 400 must be a string |
| Строка `"1"` вместо целого в `ownerId` | 400 «ownerId must be an integer» | POST with a string for ownerId answers 400 must be an integer |
| Логическое `true` вместо целого в `ownerId` | 400 для поля `ownerId` | POST with true for ownerId answers 400 must be an integer |
| Лишние поля `id` и `createdAt` в POST | 400 для обоих полей, запись не создана | POST with id and createdAt answers 400 and creates nothing |
| PATCH с недопустимой ролью `admin` | 400 для поля `role`, роль пользователя не меняется | PATCH with an unknown role answers 400 and does not change the user |
| PATCH с названием из пробелов, табуляций и переводов строк | 400 «title must not be empty» | PATCH with a whitespace-only title answers 400 must not be empty |
| NUL-символ в имени | 400 `validation_failed`, запись не создана | POST with a NUL character in name answers 400 and creates nothing |
| Эмодзи и текст справа налево | 201, значения сохраняются без изменений | POST with emoji and right-to-left text stores them unchanged |
| Имя из 80 эмодзи и из 81 эмодзи | 201 для 80, 400 «at most 80 characters» для 81 | name length counts characters, 80 emoji are accepted and 81 answer 400 |
| Код диаграммы 10000 и 10001 символов | 201 для 10000, 400 для 10001 | diagram code of 10000 characters is accepted and 10001 answers 400 |
| Некорректные id: `abc`, `1e3`, `0`, `1.5`, `%`, `%00` | 400 `invalid_id` (для битой escape-последовательности `bad_request`) | GET one item with odd ids answers 400 invalid_id |
| Неизвестный вложенный маршрут `/users/1/nothing` | 404 `not_found` в формате JSON | an unknown nested route answers 404 with a JSON error |
| POST с `Content-Type: text/plain` | 415 `unsupported_media_type`, запись не создана | a POST with text/plain content answers 415 and creates nothing |
| Два одинаковых POST подряд | Две записи с разными id, общее число +2 | two identical POSTs create two records with different ids |
| Два одинаковых PUT подряд | Оба ответа 200 и совпадают | PUT sent twice gives the same record both times |
| PUT и PATCH после DELETE | 404, запись не восстанавливается | PUT and PATCH after DELETE answer 404 and do not recreate the record |
| `limit=-1` и `limit=1e309` | 400 `invalid_query` | limit of -1 or 1e309 answers 400 invalid_query |
| Огромный номер страницы `page=999999999999999` | 200, пустая страница, верный `total` | a huge page number answers 200 with an empty page and the real total |
| Номер страницы из 16 цифр | 400 `invalid_query` | a page number of 16 digits answers 400 invalid_query |
| Поиск `q` с символами регулярных выражений | 200, совпадений нет, без зависания | search treats regexp characters as plain text and finds nothing |
| Поиск `q` из 10000 символов | 200, `total` 0 | search with a 10000-character q answers 200 with no matches |
| Ключи `__proto__`, `constructor`, `prototype` в строке запроса | 200, ключи игнорируются | list query keys __proto__ and constructor are ignored |
| PATCH с одним неверным полем и одним верным | 400, ни одно поле не записано | PATCH with one invalid field writes nothing, not even the valid ones |
