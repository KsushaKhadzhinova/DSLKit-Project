# Негативные тесты ЛР3

Файл: `tests/negative.test.js`. Запуск: `npm test` в этой папке (SQLite во временном файле, bcrypt с 4 раундами, сети нет).
Всего тестов: было 86, стало 116 (добавлено 30).

## Авторизация

| Сценарий | Ожидаемый ответ | Тест |
| --- | --- | --- |
| Пустой токен `Bearer `, два пробела или табуляция перед токеном | 401 `Missing Bearer token` | an empty Bearer token or a double space before the token answers 401 Missing Bearer token |
| Подпись верная, но другой `iss` или `nbf` в будущем | 401 `Invalid token` | a token signed with the right secret but with a wrong issuer or a not-before time in the future answers 401 |
| Подписанный токен с `id` строкой, `null`, объектом или без `id` | 401 `Invalid token`, не 500 | a token whose id is a string, null or missing answers 401 and never 500 |
| Токен, где в payload заявлена роль `admin`, а в базе `user` | 403 на `/users` и на смену роли; роль в базе не меняется | a token that claims the admin role is refused on admin routes when the database says user |
| Вход: NUL в почте, пароль из одного символа, `' OR 1=1 --`, `{"$ne":null}`, `{"$gt":""}` | 401 для строк, 400 для объектов, не 500 | login with a NUL in the email, a one-character password, operator objects or SQL text never answers 500 |
| Регистрация: пробел внутри почты, NUL, табуляция в почте | 400, число пользователей не меняется | a registration email with a space inside or a NUL character answers 400 and is not stored |
| Пароль 72 байта (ок) и 73 байта с многобайтовым символом (400) | 201 и 400 с `must be at most 72 bytes` | a password of 72 bytes is accepted, 73 bytes is refused, counting bytes not letters |
| 10 параллельных регистраций одной почты | одна 201, девять 409, одна запись в базе | ten parallel registrations of one email create one account and answer 409 for the rest |
| `Authorization` длиной 20 000 символов | 401 или 431, без падения | a very long Authorization header answers 401 or 431, not a crash |
| Пользователь без токена удаляет пользователя, владеющего диаграммами | 409 `still owns diagrams`; после удаления диаграмм 204, затем 404 | an admin cannot delete a user who still owns diagrams, answers 409, and after the diagrams go the user goes too |
| Смена роли: `superuser`, массив, `null`, пустой объект, пустой массив | 400, роль не меняется | a role change with an unknown value, an array or no role answers 400 and the role stays |

## API: тело, значения, адреса, повторы

| Сценарий | Ожидаемый ответ | Тест |
| --- | --- | --- |
| Тело и `title` с вложенностью 50 уровней | 400, `/health` отвечает | a diagram body nested 50 levels deep, or nested in the title, answers 400 and the server keeps working |
| `__proto__` и `constructor` в теле регистрации | 201, прототип не меняется | a __proto__ key in a registration body does not pollute the object prototype |
| Управляющие символы (NUL, BEL, ESC) в `title` | 400, не сохраняется | a title with a control character such as NUL or ESC answers 400 and is not stored |
| `title` из одних невидимых символов (U+200B) | 400 как для пустого | a title made only of zero-width spaces answers 400 like an empty one |
| Эмодзи и текст справа налево в `title` | 201, текст без изменений | emoji and right-to-left titles are stored unchanged |
| Тело 1 МБ | 413 с JSON-ошибкой | a body of one megabyte answers 413 with a JSON error |
| `priority`: `-1`, `0`, `1.5`, `1e309`, `2147483648`, `true`, `[]`, `{}` | 400 | a priority that is a number, a boolean or an out-of-range value answers 400 |
| `id`: `%`, `%00`, `%E0%A4%A`, `1%20OR%201=1`, путь из 10 000 символов | 400 | an id such as %, %00, an encoded SQL fragment or a 10000-character path answers 400 with a token |
| PUT с пустым телом (JSON по заголовку) | 400, диаграмма не меняется | a PUT with an empty body answers 400 and the diagram stays as it was |
| GET и PUT после DELETE | 404 | a diagram deleted by one request answers 404 to a later GET and PUT |
| 20 параллельных POST | 20 записей с разными `id` | twenty parallel POST requests create twenty diagrams with distinct ids |
| PUT и DELETE одной диаграммы одновременно | DELETE 204; PUT 200 или 404 | a PUT and a DELETE of the same diagram at the same time answer 200 or 204 for one and 404 for the other |
| `?sort=id;DROP TABLE Diagrams`, повтор `sort` или `order`, `sort=constructor` | 400, таблица на месте | a sort with SQL in it, a repeated sort or a prototype name answers 400 and the table survives |
| Квадратные скобки в имени параметра | 200, параметр не разбирается как список | bracket names in the query are not parsed as lists, the default list comes back |
| `offset=1000000` с `limit=100` | 200, пустой массив, `X-Total-Count` = размер списка | an offset at the upper limit with a full page answers an empty array and the real total |
| Значения enum в другом регистре (`uml`, `HIGH`) | 400 | enum values in another letter case are refused |
| Завершающий `/` в адресах | 200 | a trailing slash on the list or on an id still reaches the right handler |
| Ошибка БД при POST | 500 без текста ошибки | a database failure on POST answers 500 without the internal message |
| БД закрыта (отдельное подключение) | `/diagrams` 500, `/health` 503, без путей к файлам | a closed database answers 500 on the API and 503 on the health check, without file paths |

## Найденные дефекты и исправления

| Сценарий | Что было | Что стало |
| --- | --- | --- |
| Вход с NUL в почте (`carol\u0000@example.com`) | 500: SQL-запрос с NUL обрывался, ошибка базы | 401 `Invalid email or password`, как для слишком длинной почты. Исправлено в `src/middleware/validate-auth.js` |
| Регистрация с NUL в почте | 201, почта с NUL сохранялась | 400. Исправлено в `src/middleware/validate-auth.js` (`CONTROL` в `validEmail`) |
| Подписанный токен с `id` не целым (строка, `null`, объект, без `id`) | 500 от `findByPk` | 401 `Invalid token`. Исправлено в `src/middleware/auth.js` (только сервер мог такой подписать, но ответ должен быть понятным) |
| Управляющие символы в `title` | 201, символы сохранялись | 400, «must not contain control characters». Исправлено в `src/middleware/validate.js` |
| `title` из одних невидимых символов | 201 | 400, как для пустой строки. Исправлено в `src/middleware/validate.js` (`INVISIBLE`) |

Отчёты `report.md` и `report.en.md` пересобраны (`node tools/build.js part-2/lab-03-auth` из корня репозитория): в них встроены `auth.js` и `validate-auth.js`.
| Поиск `?q=` с символом NUL или другим управляющим (`%00`, `%07`) | 500: SQLite обрывал запрос с таким символом в тексте | 400 `q must be text of 1 to 80 characters without control characters`. Исправлено в `src/middleware/list-query.js`, найдено нагрузочным прогоном `tests/attack.test.js` и `tests/resilience.test.js` |
