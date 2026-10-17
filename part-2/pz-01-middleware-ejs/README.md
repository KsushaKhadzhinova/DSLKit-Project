# Практическое занятие 1. Middleware и шаблонизаторы

Ветка репозитория: `pz21`.

Проект DSLKit (направление SaaS, вариант 26): веб-редактор диаграмм как кода. Сервер на Express 5 с шаблонами EJS показывает каталог диаграмм. Записи каталога лежат в массиве в памяти, как требует условие. Вариант 26 чётный, поэтому журнал запросов пишется в таблицу `request_log` базы SQLite (встроенный модуль `node:sqlite`), а не в файл. Внешний вид взят из Части 1 проекта (сайт и приложение в `site/`): те же шапка, подвал, кнопки, карточки, поля форм и переключатель темы. Отчёты: [`report.tpl.md`](report.tpl.md) на русском, [`report.en.tpl.md`](report.en.tpl.md) на английском. Замечания аудита: [`AUDIT.md`](AUDIT.md).

## Запуск

Нужен Node.js 22.13 или новее (модуль `node:sqlite`).

```bash
cd part-2/pz-01-middleware-ejs
npm install
npm start
```

Сервер слушает порт 3000. Настройки лежат в окружении, образец в [`.env.example`](.env.example): `PORT` (порт) и `DB_FILE` (файл базы журнала, по умолчанию `data/requests.db`, папка создаётся сама). Файл `.env` в репозиторий не входит. Чтобы загрузить его, запустите `node --env-file=.env src/server.js`. Тесты:

```bash
npm test
```

## Как вызвать страницу 500

Страницу 500 вызывает настоящий сбой, а не кнопка. Запустите сервер с файлом базы, который нельзя создать:

```bash
DB_FILE=package.json/blocked/log.db npm start
```

Запись в журнал не удаётся, и любой запрос заканчивается оформленной страницей 500 с пояснением. Второй способ: остановить базу во время работы сервера (тест `a database that stops while the server runs` делает именно это).

## Страницы

| Адрес              | Что делает                                                                              |
| ------------------ | --------------------------------------------------------------------------------------- |
| `GET /`            | Список диаграмм с временем создания каждой записи                                       |
| `GET /item/:id`    | Детальная страница, неизвестный или некорректный номер даёт страницу 404                |
| `GET /add?auth=1`  | Форма добавления, гостя без `?auth=1` перенаправляет на `/login`                        |
| `POST /add?auth=1` | Проверка полей, добавление в массив, переход на главную, ошибка полей даёт код 400      |
| `GET /login`       | Пояснение, как «войти»                                                                  |
| `GET /log?auth=1`  | Таблица последних запросов из журнала (только с `?auth=1`)                              |
| любой другой адрес | Страница 404                                                                            |

Коды ошибок со страницей в стиле сайта: 400 (поле или адрес), 403 (нет токена CSRF), 404, 413 (слишком большое тело формы), 429 (слишком много запросов), 500.

## Проверка ввода и пределы

Все пределы лежат в [`limits.json`](limits.json): длина названия, описания и кода, границы ревизии, размер тела формы, число полей, число строк журнала, длина адреса в журнале, частота запросов. Значения обрезаются по краям, поэтому поле из одних пробелов считается пустым. Числа не меньше 0. Те же пределы передаются в форму атрибутами `maxlength`, `min`, `max`, а сервер проверяет их заново.

## Защита

- Токен CSRF (двойная отправка): cookie `dslkit_csrf` (`HttpOnly`, `SameSite=Strict`) и скрытое поле `_csrf`, плюс проверка `Origin`.
- Заголовки `Content-Security-Policy` (без встроенных скриптов и стилей), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; заголовок `X-Powered-By` отключён.
- Ограничение частоты запросов: общее и более строгое для `POST`, код 429 и `Retry-After`.
- Экранирование всех значений в шаблонах (`<%= %>`), запись в журнал без переводов строк и управляющих символов.

## Устройство

| Файл                              | Назначение                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `src/app.js`                      | Сборка приложения: порядок middleware, маршруты, обработчики ошибок             |
| `src/server.js`                   | Запуск на порту                                                                 |
| `src/middleware/requestLogger.js` | Запись запроса в таблицу журнала до маршрута и в консоль                        |
| `src/middleware/fakeAuth.js`      | Имитация авторизации по `?auth=1` и защита маршрута `requireAuth`               |
| `src/middleware/security.js`      | Заголовки безопасности, токен CSRF, ограничение частоты, экранирование журнала  |
| `src/middleware/errorHandlers.js` | Обработчики 404 и 500 (четыре параметра, ошибка пишется в журнал ошибок)        |
| `src/data/diagrams.js`            | Хранилище в памяти и проверка полей                                             |
| `src/data/requestLog.js`          | Таблица `request_log` в SQLite                                                  |
| `views/`                          | Шаблоны EJS: `index`, `item`, `add`, `login`, `log`, `404`, `500`, `partials/`  |
| `public/`                         | `dslkit.css` (собран из стилей Части 1), `pz.css` (несколько правил), логотип, тема |
| `test/`                           | Тесты на `node:test`, покрытие 100 процентов                                    |

---

**English.** Branch: `pz21`. Express 5 + EJS server for the DSLKit diagram catalogue. Catalogue data is in memory (as the task requires), the request log is a SQLite table (variant 26 is even). The look comes from Part 1 of the project (same header, footer, buttons, cards, form fields and theme switch). Run `npm install && npm start` (Node.js 22.13 or newer, port 3000; `PORT` and `DB_FILE` are in `.env.example`, load them with `node --env-file=.env src/server.js`), test with `npm test`. Simulated auth: add `?auth=1` to open `/add` and `/log`, guests are redirected to `/login`. The 500 page is caused by a real failure, not by a button: start with `DB_FILE=package.json/blocked/log.db npm start` and every request ends with the styled 500 page. Limits live in `limits.json`. Protection: CSRF token, security headers with a strict Content-Security-Policy, rate limit, escaped log lines. Audit notes: `AUDIT.md`.
