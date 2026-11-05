# Практическое занятие 2. Проектирование и реализация REST API

Ветка репозитория: `pz22`.

Проект DSLKit (направление SaaS, вариант 26). REST API на Express 5 с тремя ресурсами: пользователи (`users`), проекты (`projects`), диаграммы (`diagrams`). Данные хранятся в массивах в памяти. Полное описание эндпоинтов, ошибок и примеры curl: [`API.md`](API.md). Отчёты: [`report.tpl.md`](report.tpl.md) на русском, [`report.en.tpl.md`](report.en.tpl.md) на английском.

## Запуск

Нужен Node.js 20 или новее.

```bash
cd part-2/pz-02-rest-api
npm install
npm start
```

Адрес API: `http://localhost:3000/api` (порт задаёт переменная `PORT`). Режим разработки с перезапуском: `npm run dev`. Тесты: `npm test`. Настройки окружения: образец [`.env.example`](.env.example) (`PORT`, `RATE_LIMIT_MAX`), загрузка командой `node --env-file=.env src/server.js`, файл `.env` в репозиторий не входит. Замечания аудита: [`AUDIT.md`](AUDIT.md).

## Что реализовано

- CRUD для каждого ресурса: список, одна запись, создание, полная замена (`PUT`), частичное изменение (`PATCH`), удаление.
- Дополнительные операции: диаграммы проекта `GET /api/projects/:id/diagrams`, публикация `POST /api/diagrams/:id/publish`, копирование `POST /api/diagrams/:id/duplicate`.
- Списки: фильтр по полю, поиск `q`, сортировка `sort`, страницы `page` и `limit`.
- Проверка входных данных: обязательные поля, типы, длина, перечисления, формат почты, неизвестные поля, существование связанных записей.
- Целостность: нельзя удалить пользователя с проектами и проект с диаграммами (409).
- Единый формат ошибок JSON и коды 200, 201, 204, 400, 404, 405, 409, 413, 415, 429, 500.
- Заголовки безопасности (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`), ограничение частоты запросов (429), запись ошибок в журнал без переводов строк.

## Устройство

| Файл                | Назначение                                                      |
| ------------------- | --------------------------------------------------------------- |
| `src/app.js`        | Схемы ресурсов, подключение маршрутов, единый обработчик ошибок |
| `src/resource.js`   | Общие маршруты ресурса и обработка параметров списка            |
| `src/validation.js` | Проверка тела запроса по схеме                                  |
| `src/store.js`      | Хранилище в памяти и начальные данные                           |
| `src/errors.js`     | Класс ошибки API и формат ответа                                |
| `src/security.js`   | Заголовки безопасности, ограничение частоты, безопасная запись в журнал |
| `test/api.test.js`  | Тесты на `node:test`, покрытие строк и функций 100 процентов    |

Проверка вручную в Postman или Insomnia: запросы из `API.md` переносятся в коллекцию с переменной `baseUrl`.

---

**English.** Express 5 REST API with three resources (users, projects, diagrams), CRUD plus filter/search/sort/paging, publish and duplicate operations, schema validation, referential checks (409), one JSON error format. In-memory data. Branch `pz22`. Run `npm install && npm start` (port 3000, `PORT` overrides, `npm run dev` watches), test with `npm test`. Docs and curl examples: [`API.md`](API.md).

## Проверка стиля

`npm run lint` запускает ESLint. Конфигурация лежит в `eslint.config.js`.
