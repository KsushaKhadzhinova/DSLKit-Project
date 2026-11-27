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
| `src/store.js`      | Хранилище в памяти, начальные данные, строго возрастающие часы  |
| `src/limits.js`     | Чтение `limits.json` (единственный источник ограничений)        |
| `src/openapi.js`    | Описание OpenAPI 3.0, строится из тех же схем                   |
| `src/errors.js`     | Класс ошибки API и формат ответа                                |
| `src/security.js`   | Заголовки безопасности, ограничение частоты, безопасная запись в журнал |
| `test/api.test.js`  | Тесты на `node:test`, покрытие строк и функций 100 процентов    |

Справочник по операциям собирается из `GET /api/openapi.json` командой `node tools/gen-api-md.mjs` в `API.generated.ru.md` и `API.generated.en.md` (проверка: `--check`). Снимки Swagger UI (рисунки 15 и 16): `node shots/swagger-shot.mjs` (нужны сеть для CDN, puppeteer-core и Chrome).

Проверка вручную в Postman или Insomnia: импортируйте `postman_collection.json` (переменные `root` = `http://localhost:3000` и `base` = `http://localhost:3000/api`, в каждом запросе есть проверки) или откройте `requests.http` в VS Code (расширение REST Client). Документация в Swagger UI: импортируйте `http://localhost:3000/api/openapi.json`.

Все ограничения (длины полей, размер страницы, размер тела, частота запросов, максимум записей) лежат в [`limits.json`](limits.json). У каждой записи своё время создания `createdAt`: часы строго возрастают, две записи не совпадают даже в одну миллисекунду.

## Что не входит в работу и ждёт решения владельца

Журнал запросов в таблицу БД (чётный вариант) требование ПЗ1; условие ПЗ2 требует массив в памяти, поэтому здесь журнала в БД нет. Оба варианта описаны в `docs/audit/part2/PZ2-AUDIT.md`.

---

**English.** Express 5 REST API with three resources (users, projects, diagrams), CRUD plus filter/search/sort/paging, publish and duplicate operations, schema validation, referential checks (409), one JSON error format. In-memory data. Branch `pz22`. Run `npm install && npm start` (port 3000, `PORT` overrides, `npm run dev` watches), test with `npm test`. Docs and curl examples: [`API.md`](API.md); OpenAPI at `GET /api/openapi.json`; import `postman_collection.json` (variables `root`, `base`) or open `requests.http`. All limits are in `limits.json`; every record has its own strictly increasing `createdAt`. The request log in a DB table (even variant) belongs to practical 1 and is not part of this practical (in-memory data by the condition); it waits for the owner's decision.

## Проверка стиля

`npm run lint` запускает ESLint. Конфигурация лежит в `eslint.config.js`.
