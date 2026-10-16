# Практическое занятие 1. Middleware и шаблонизаторы

Проект DSLKit (направление SaaS, вариант 26): веб-редактор диаграмм как кода. Здесь сервер на Express 5 с шаблонами EJS показывает каталог диаграмм. Данные хранятся в массиве в памяти, базы данных нет, как требует условие. Отчёты: [`report.tpl.md`](report.tpl.md) на русском, [`report.en.tpl.md`](report.en.tpl.md) на английском.

## Запуск

Нужен Node.js 20 или новее.

```bash
cd part-2/pz-01-middleware-ejs
npm install
npm start
```

Сервер слушает порт 3000 (другой порт задаёт переменная `PORT`). Тесты:

```bash
npm test
```

## Страницы

| Адрес              | Что делает                                                                   |
| ------------------ | ---------------------------------------------------------------------------- |
| `GET /`            | Список диаграмм                                                              |
| `GET /item/:id`    | Детальная страница, неизвестный номер даёт страницу 404                      |
| `GET /add?auth=1`  | Форма добавления, гостя без `?auth=1` перенаправляет на `/login`             |
| `POST /add?auth=1` | Проверка полей, добавление в массив, переход на главную; ошибка даёт код 400 |
| `GET /login`       | Пояснение, как «войти»                                                       |
| `GET /log`         | Таблица последних запросов из журнала                                        |
| любой другой адрес | Страница 404                                                                 |

## Устройство

| Файл                              | Назначение                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `src/app.js`                      | Сборка приложения: порядок middleware, маршруты, обработчики ошибок            |
| `src/server.js`                   | Запуск на порту                                                                |
| `src/middleware/requestLogger.js` | Журнал: метод, адрес, статус и время в консоль и в таблицу в памяти            |
| `src/middleware/fakeAuth.js`      | Имитация авторизации по `?auth=1` и защита маршрута `requireAuth`              |
| `src/middleware/errorHandlers.js` | Обработчики 404 и 500 (четыре параметра, ошибка пишется в журнал ошибок)       |
| `src/data/diagrams.js`            | Хранилище в памяти и проверка полей                                            |
| `views/`                          | Шаблоны EJS: `index`, `item`, `add`, `login`, `log`, `404`, `500`, `partials/` |
| `test/app.test.js`                | Тесты на `node:test`, покрытие 100 процентов                                   |

## Решения

- Журнал запросов ведётся в консоль и в таблицу в памяти (страница `/log`). Условие этого занятия запрещает базу данных, поэтому запись в таблицу БД не делается; хранилище вынесено за функцию `createRequestLog`, и позже его можно заменить на таблицу.
- Каркас страниц собран из частичных шаблонов `partials/header` и `partials/footer`, лишних зависимостей для layout нет.
- Все значения в шаблонах выводятся через `<%= %>` с экранированием.

---

**English.** Express 5 + EJS server for the DSLKit diagram catalogue; catalogue data in memory, the request log in a SQLite table (variant 26 is even). Run `npm install && npm start` (port 3000, override with `PORT`; `DB_FILE` sets the database file), test with `npm test`. Simulated auth: add `?auth=1` to open `/add`; guests are redirected to `/login`. Pages: `/`, `/item/:id`, `/add`, `/login`, `/log`, any other URL gives the 404 page. The 500 page is caused by a real failure, not by a button: start with `DB_FILE=package.json/blocked/log.db npm start` (the database file cannot be created) and every request ends with the styled 500 page. Limits live in `limits.json`.
