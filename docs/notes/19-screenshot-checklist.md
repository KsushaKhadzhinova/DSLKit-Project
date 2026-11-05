# Чек-лист скриншотов для лабораторных и практических

Создан автоматически из коллекций Postman (`postman_collection.json` в каждой работе). Здесь всё, что нужно снять сама, по работам. Для каждого запроса указан ожидаемый код ответа: в кадре должны быть видны **метод, адрес, тело запроса, код ответа и тело ответа**.

## Общий порядок

1. Открой Postman → Import → выбери `postman_collection.json` работы (или `requests.http`, если у тебя расширение REST Client в VS Code).
2. Запусти сервер командами из блока «Запуск» работы. Переменная `base` в коллекции уже равна адресу сервера.
3. Выполняй запросы сверху вниз и снимай каждый (Win+Shift+S, область окна Postman вместе с панелью ответа).
4. Сохраняй как `shots/postman-<номер>-<кратко>.png` в папке работы и вставляй в отчёт вместо старого рисунка. Подпись «Рисунок N – …» не меняется.
5. После замены кадров и правки шаблона выполни из корня ветки `node tools/build.js <папка работы>`, затем `npm test` в папке работы.
6. Преподавателю хватает пяти кадров на работу, но ты решила снимать каждый эндпоинт: ниже полный список, обязательные помечены ★ (по одному на каждый метод и каждый код ответа).

Ветки и рабочие папки: `git worktree add ../dslkit-lr1 lab21` и так далее; ветка работы указана ниже.

## ЛР1 – REST API на Express (данные в массиве)

Ветка: `lab21`, папка: `part-2/lab-01-node-server`. Данные в массиве, базы нет. Каждый перезапуск возвращает две начальные записи.

**Запуск**

```bash
cd part-2/lab-01-node-server
npm install
npm start
```

Адрес сервера: `http://localhost:3000`.

**Postman**

| №   | ★   | Метод  | Адрес                                              | Ожидаемо                                         | Файл кадра                                                      |
| --- | --- | ------ | -------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| 1   | ★   | GET    | `/health`                                          | 200 Health check                                 | `shots/postman-01-health-check.png`                             |
| 2   |     | GET    | `/diagrams`                                        | 200 List all diagrams                            | `shots/postman-02-list-all-diagrams.png`                        |
| 3   |     | GET    | `/diagrams/1`                                      | 200 One diagram                                  | `shots/postman-03-one-diagram.png`                              |
| 4   | ★   | GET    | `/diagrams/999`                                    | 404 Missing diagram                              | `shots/postman-04-missing-diagram.png`                          |
| 5   | ★   | GET    | `/diagrams/abc`                                    | 400 Bad id                                       | `shots/postman-05-bad-id.png`                                   |
| 6   | ★   | POST   | `/diagrams`                                        | 201 Create                                       | `shots/postman-06-create.png`                                   |
| 7   | ★   | POST   | `/diagrams`                                        | 400 Invalid data                                 | `shots/postman-07-invalid-data.png`                             |
| 8   |     | POST   | `/diagrams`                                        | 400 Malformed JSON                               | `shots/postman-08-malformed-json.png`                           |
| 9   | ★   | PUT    | `/diagrams/1`                                      | 200 Replace                                      | `shots/postman-09-replace.png`                                  |
| 10  | ★   | PATCH  | `/diagrams/1`                                      | 200 Partial update                               | `shots/postman-10-partial-update.png`                           |
| 11  | ★   | PATCH  | `/diagrams/1`                                      | 400 Empty PATCH body                             | `shots/postman-11-empty-patch-body.png`                         |
| 12  | ★   | DELETE | `/diagrams/2`                                      | 204 Delete                                       | `shots/postman-12-delete.png`                                   |
| 13  |     | GET    | `/projects`                                        | 404 Unknown route                                | `shots/postman-13-unknown-route.png`                            |
| 14  |     | GET    | `/diagrams?limit=5&offset=5&sort=title&order=desc` | 200 Page 2 of size 5, sorted by title descending | `shots/postman-14-page-2-of-size-5-sorted-by-title-descend.png` |
| 15  |     | GET    | `/diagrams?limit=1000`                             | 400 Page size over 100                           | `shots/postman-15-page-size-over-100.png`                       |
| 16  |     | GET    | `/diagrams?sort=password`                          | 400 Unknown sort field                           | `shots/postman-16-unknown-sort-field.png`                       |

## ЛР2 – Sequelize и PostgreSQL

Ветка: `lab12`, папка: `part-2/lab-02-sequelize`. Порт PostgreSQL 5432 может быть занят: задай `POSTGRES_PORT=55432` в `.env` и в `DATABASE_URL`.

**Запуск**

```bash
cd part-2/lab-02-sequelize
cp .env.example .env   # впиши POSTGRES_PASSWORD и такой же пароль в DATABASE_URL
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed
npm start
```

Адрес сервера: `http://localhost:3000`.

**Postman**

| №   | ★   | Метод  | Адрес                                              | Ожидаемо                                         | Файл кадра                                                      |
| --- | --- | ------ | -------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| 1   | ★   | GET    | `/health`                                          | 200 Health check                                 | `shots/postman-01-health-check.png`                             |
| 2   |     | GET    | `/diagrams`                                        | 200 List all diagrams                            | `shots/postman-02-list-all-diagrams.png`                        |
| 3   |     | GET    | `/diagrams/1`                                      | 200 One diagram                                  | `shots/postman-03-one-diagram.png`                              |
| 4   | ★   | GET    | `/diagrams/999`                                    | 404 Missing diagram                              | `shots/postman-04-missing-diagram.png`                          |
| 5   | ★   | GET    | `/diagrams/abc`                                    | 400 Bad id                                       | `shots/postman-05-bad-id.png`                                   |
| 6   | ★   | POST   | `/diagrams`                                        | 201 Create                                       | `shots/postman-06-create.png`                                   |
| 7   | ★   | POST   | `/diagrams`                                        | 400 Invalid data                                 | `shots/postman-07-invalid-data.png`                             |
| 8   |     | POST   | `/diagrams`                                        | 400 Malformed JSON                               | `shots/postman-08-malformed-json.png`                           |
| 9   | ★   | PUT    | `/diagrams/1`                                      | 200 Replace                                      | `shots/postman-09-replace.png`                                  |
| 10  | ★   | DELETE | `/diagrams/2`                                      | 204 Delete                                       | `shots/postman-10-delete.png`                                   |
| 11  |     | GET    | `/tickets`                                         | 404 Unknown route                                | `shots/postman-11-unknown-route.png`                            |
| 12  |     | GET    | `/diagrams?limit=5&offset=5&sort=title&order=desc` | 200 Page 2 of size 5, sorted by title descending | `shots/postman-12-page-2-of-size-5-sorted-by-title-descend.png` |
| 13  |     | GET    | `/diagrams?limit=1000`                             | 400 Page size over 100                           | `shots/postman-13-page-size-over-100.png`                       |
| 14  |     | GET    | `/diagrams?sort=password`                          | 400 Unknown sort field                           | `shots/postman-14-unknown-sort-field.png`                       |
| 15  | ★   | PATCH  | `/diagrams/1`                                      | 200 Partial update                               | `shots/postman-15-partial-update.png`                           |
| 16  | ★   | PATCH  | `/diagrams/1`                                      | 400 Empty PATCH body                             | `shots/postman-16-empty-patch-body.png`                         |
| 17  |     | PATCH  | `/diagrams/1`                                      | 400 Negative revision                            | `shots/postman-17-negative-revision.png`                        |
| 18  |     | POST   | `/projects`                                        | 201 Create a project                             | `shots/postman-18-create-a-project.png`                         |
| 19  | ★   | POST   | `/projects`                                        | 409 The same name again                          | `shots/postman-19-the-same-name-again.png`                      |
| 20  |     | PATCH  | `/diagrams/1`                                      | 200 Put a diagram into the project               | `shots/postman-20-put-a-diagram-into-the-project.png`           |
| 21  |     | GET    | `/projects/1/diagrams`                             | 200 Diagrams of the project                      | `shots/postman-21-diagrams-of-the-project.png`                  |
| 22  |     | DELETE | `/projects/1`                                      | 204 Delete the project, its diagrams stay        | `shots/postman-22-delete-the-project-its-diagrams-stay.png`     |

**Структура базы данных**

- В pgAdmin или DBeaver: Servers → dslkit → Schemas → public → Tables. Развернуть таблицы `Diagrams`, `Projects`, `SequelizeMeta`.
- Открыть `Diagrams` → Columns (видны `projectId`, `revision`) и Constraints (внешний ключ на `Projects`).
- Либо в терминале: `docker compose exec db psql -U dslkit -d dslkit -c "\d \"Diagrams\""`.
- Снять вид данных: правый клик на `Diagrams` → View/Edit Data → All Rows.

## ЛР3 – аутентификация (bcrypt, JWT, роли)

Ветка: `25`, папка: `part-2/lab-03-auth`. Запросы с токеном идут после «Login»: токен сохраняется в переменную коллекции. Для «чужая диаграмма → 403» создай второго пользователя и поменяй `1` на его id. Для «/users → 403» войди обычным пользователем, для 200 войди администратором из `ADMIN_EMAIL`.

**Запуск**

```bash
cd part-2/lab-03-auth
cp .env.example .env   # POSTGRES_PASSWORD, DATABASE_URL, JWT_SECRET (32+ символов), ADMIN_EMAIL, ADMIN_PASSWORD, DEMO_USER_PASSWORD
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed
npm start
```

Адрес сервера: `http://localhost:3000`.

**Postman**

| №   | ★   | Метод  | Адрес                                              | Ожидаемо                                         | Файл кадра                                                      |
| --- | --- | ------ | -------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| 1   | ★   | GET    | `/health`                                          | 200 Health check                                 | `shots/postman-01-health-check.png`                             |
| 2   | ★   | POST   | `/auth/register`                                   | 201 Register                                     | `shots/postman-02-register.png`                                 |
| 3   | ★   | POST   | `/auth/register`                                   | 409 Duplicate email                              | `shots/postman-03-duplicate-email.png`                          |
| 4   | ★   | POST   | `/auth/register`                                   | 400 Weak password                                | `shots/postman-04-weak-password.png`                            |
| 5   | ★   | POST   | `/auth/login`                                      | 200 Login                                        | `shots/postman-05-login.png`                                    |
| 6   | ★   | POST   | `/auth/login`                                      | 401 Wrong password                               | `shots/postman-06-wrong-password.png`                           |
| 7   |     | GET    | `/profile`                                         | 200 Current user                                 | `shots/postman-07-current-user.png`                             |
| 8   | ★   | GET    | `/profile`                                         | 401 No token                                     | `shots/postman-08-no-token.png`                                 |
| 9   |     | POST   | `/diagrams`                                        | 201 Create a diagram, the owner is the caller    | `shots/postman-09-create-a-diagram-the-owner-is-the-caller.png` |
| 10  | ★   | PATCH  | `/diagrams/1`                                      | 200 Partial update of my diagram                 | `shots/postman-10-partial-update-of-my-diagram.png`             |
| 11  | ★   | PATCH  | `/diagrams/1`                                      | 400 Empty PATCH body                             | `shots/postman-11-empty-patch-body.png`                         |
| 12  |     | GET    | `/diagrams`                                        | 200 List diagrams                                | `shots/postman-12-list-diagrams.png`                            |
| 13  | ★   | DELETE | `/diagrams/1`                                      | 403 Somebody else's diagram                      | `shots/postman-13-somebody-else-s-diagram.png`                  |
| 14  | ★   | GET    | `/users`                                           | 403 Admin only: regular user                     | `shots/postman-14-admin-only-regular-user.png`                  |
| 15  |     | GET    | `/diagrams?limit=5&offset=5&sort=title&order=desc` | 200 Page 2 of size 5, sorted by title descending | `shots/postman-15-page-2-of-size-5-sorted-by-title-descend.png` |
| 16  | ★   | GET    | `/diagrams?limit=1000`                             | 400 Page size over 100                           | `shots/postman-16-page-size-over-100.png`                       |
| 17  |     | GET    | `/diagrams?sort=password`                          | 400 Unknown sort field                           | `shots/postman-17-unknown-sort-field.png`                       |

**Структура базы данных**

- В pgAdmin: таблицы `Users`, `Diagrams`, `RequestLogs`, `SequelizeMeta`.
- Открыть `Users` → View/Edit Data: в колонке `passwordHash` видны хеши `$2b$10$…`, а не пароли. Это главный кадр для отчёта.
- Открыть `RequestLogs`: строки без токенов и без строки запроса.
- Открыть `Diagrams` → Constraints: внешний ключ `ownerId` на `Users`.

## ПЗ2 – REST API с тремя ресурсами (данные в массиве)

Ветка: `pz22`, папка: `part-2/pz-02-rest-api`. Начальные данные в памяти; описание API по адресу `/api/openapi.json` тоже стоит снять.

**Запуск**

```bash
cd part-2/pz-02-rest-api
npm install
npm start
```

Адрес сервера: `http://localhost:3000`.

**Postman**

| №   | ★   | Метод  | Адрес                                             | Ожидаемо                            | Файл кадра                                             |
| --- | --- | ------ | ------------------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| 1   | ★   | GET    | `http://localhost:3000/health`                    | 200 Health check                    | `shots/postman-01-health-check.png`                    |
| 2   |     | GET    | `/users`                                          | 200 List users                      | `shots/postman-02-list-users.png`                      |
| 3   | ★   | POST   | `/users`                                          | 201 Create a user                   | `shots/postman-03-create-a-user.png`                   |
| 4   | ★   | POST   | `/users`                                          | 400 Invalid user                    | `shots/postman-04-invalid-user.png`                    |
| 5   |     | GET    | `/users/1`                                        | 200 One user                        | `shots/postman-05-one-user.png`                        |
| 6   | ★   | GET    | `/users/999`                                      | 404 Missing user                    | `shots/postman-06-missing-user.png`                    |
| 7   | ★   | GET    | `/users/abc`                                      | 400 Bad id                          | `shots/postman-07-bad-id.png`                          |
| 8   | ★   | PATCH  | `/users/1`                                        | 200 Partial update with PATCH       | `shots/postman-08-partial-update-with-patch.png`       |
| 9   | ★   | PUT    | `/users/1`                                        | 200 Replace with PUT                | `shots/postman-09-replace-with-put.png`                |
| 10  |     | POST   | `/projects`                                       | 201 Create a project                | `shots/postman-10-create-a-project.png`                |
| 11  |     | POST   | `/diagrams`                                       | 201 Create a diagram                | `shots/postman-11-create-a-diagram.png`                |
| 12  |     | GET    | `/diagrams?q=billing&sort=-title&page=1&limit=10` | 200 Search, sort and page           | `shots/postman-12-search-sort-and-page.png`            |
| 13  |     | GET    | `/projects/1/diagrams`                            | 200 Diagrams of one project         | `shots/postman-13-diagrams-of-one-project.png`         |
| 14  | ★   | POST   | `/diagrams/1/publish`                             | 200 Publish a diagram               | `shots/postman-14-publish-a-diagram.png`               |
| 15  |     | POST   | `/diagrams/1/duplicate`                           | 201 Duplicate a diagram             | `shots/postman-15-duplicate-a-diagram.png`             |
| 16  | ★   | DELETE | `/users/1`                                        | 409 Delete a user who owns projects | `shots/postman-16-delete-a-user-who-owns-projects.png` |
| 17  | ★   | DELETE | `/diagrams/1`                                     | 204 Delete a diagram                | `shots/postman-17-delete-a-diagram.png`                |
| 18  |     | GET    | `/nothing`                                        | 404 Unknown route                   | `shots/postman-18-unknown-route.png`                   |

## ЛР6 – MongoDB и Mongoose

Ветка: `26`, папка: `part-2/lab-06-mongodb`. Переменные `{{id}}` и `{{commentId}}` коллекция заполняет сама после «Create» и «Add a comment».

**Запуск**

```bash
cd part-2/lab-06-mongodb
cp .env.example .env   # MONGODB_URI из Atlas (кнопка Connect → Drivers) или mongodb://localhost:27017/dslkit
npm install
npm start
```

Адрес сервера: `http://localhost:3000`.

**Postman**

| №   | ★   | Метод  | Адрес                                     | Ожидаемо                                                         | Файл кадра                                                      |
| --- | --- | ------ | ----------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | ★   | GET    | `/health`                                 | 200 Health check                                                 | `shots/postman-01-health-check.png`                             |
| 2   |     | GET    | `/diagrams`                               | 200 List all diagrams                                            | `shots/postman-02-list-all-diagrams.png`                        |
| 3   |     | GET    | `/diagrams?tag=shop&owner=anna`           | 200 Filter by tag (array contains) and owner                     | `shots/postman-03-filter-by-tag-array-contains-and-owner.png`   |
| 4   |     | GET    | `/diagrams/{{id}}`                        | 200 One diagram                                                  | `shots/postman-04-one-diagram.png`                              |
| 5   | ★   | GET    | `/diagrams/64b7f0c2a1b2c3d4e5f60718`      | 404 Well-formed but unknown ObjectId                             | `shots/postman-05-well-formed-but-unknown-objectid.png`         |
| 6   | ★   | GET    | `/diagrams/abc`                           | 400 Not an ObjectId                                              | `shots/postman-06-not-an-objectid.png`                          |
| 7   | ★   | POST   | `/diagrams`                               | 201 Create with tags                                             | `shots/postman-07-create-with-tags.png`                         |
| 8   | ★   | POST   | `/diagrams`                               | 400 Invalid data                                                 | `shots/postman-08-invalid-data.png`                             |
| 9   |     | POST   | `/diagrams`                               | 400 Malformed JSON                                               | `shots/postman-09-malformed-json.png`                           |
| 10  | ★   | PUT    | `/diagrams/{{id}}`                        | 200 Replace (comments are kept)                                  | `shots/postman-10-replace-comments-are-kept.png`                |
| 11  |     | POST   | `/diagrams/{{id}}/comments`               | 201 Add a comment: $push into the nested array                   | `shots/postman-11-add-a-comment-push-into-the-nested-array.png` |
| 12  |     | PUT    | `/diagrams/{{id}}/comments/{{commentId}}` | 200 Edit one comment inside the array: positional $              | `shots/postman-12-edit-one-comment-inside-the-array-positi.png` |
| 13  | ★   | DELETE | `/diagrams/{{id}}/comments/{{commentId}}` | 200 Remove one comment: $pull                                    | `shots/postman-13-remove-one-comment-pull.png`                  |
| 14  | ★   | DELETE | `/diagrams/{{id}}`                        | 204 Delete the diagram with its comments                         | `shots/postman-14-delete-the-diagram-with-its-comments.png`     |
| 15  |     | GET    | `/projects`                               | 404 Unknown route                                                | `shots/postman-15-unknown-route.png`                            |
| 16  |     | GET    | `/diagrams/stats`                         | 200 Aggregation: count, average priority and comments per notati | `shots/postman-16-aggregation-count-average-priority-and-c.png` |
| 17  |     | GET    | `/diagrams?commentAuthor=boris`           | 200 Search inside the nested comments array                      | `shots/postman-17-search-inside-the-nested-comments-array.png`  |
| 18  |     | GET    | `/diagrams?limit=2&skip=1`                | 200 Paging                                                       | `shots/postman-18-paging.png`                                   |

**Структура базы данных**

- В Atlas: Database → Browse Collections → dslkit → `diagrams`. Снять документ с вложенным массивом `comments`.
- Снять вкладку Indexes: индексы `tags`, текстовый, TTL по `createdAt` у `requestlogs` (30 дней).
- Снять коллекцию `requestlogs`: в поле `path` нет строки запроса.
- Снять вкладку Atlas Network Access с твоим адресом и Database Access с пользователем (без пароля на кадре).

## ЛР5 – клиент на React и серверный API

Ветка: `25`, папка: `part-2/lab-05-react-api`. Нужен запущенный сервер ЛР3 (раздел выше) и в `.env` клиента `VITE_API_URL=http://localhost:3000`.

```bash
cd part-2/lab-05-react-api
npm install
npm run dev   # http://localhost:5178
```

Кадры браузера (F12 → Network, чтобы видеть запросы): вход и регистрация; список с загрузкой; список с ошибкой при остановленном сервере (виден блок «Нет связи с сервером» с разбором); добавление записи (запись появляется сразу); удаление; поиск; «Загрузить ещё»; вкладка Network с запросом `GET /diagrams?limit=20` и заголовком `X-Total-Count`.

## ПЗ1 – Express и EJS

Ветка: `pz21`, папка: `part-2/pz-01-middleware-ejs`. `npm install`, `npm start`, браузер на `http://localhost:3000`.

Кадры: главная со списком; форма добавления с ошибками проверки (`/add?auth=1`); страница записи; страница 404; страница 500 (покажи реальный сбой: останови или сделай нечитаемым файл `data/requests.db`); журнал запросов (`/log?auth=1`); консоль сервера с журналом; вкладка Network с заголовками безопасности.

## ЛР7 – WebSocket

Ветка: `27`, папка: `part-2/lab-07-websocket`. `npm install`, `npm start`, две вкладки браузера на `http://localhost:3000` с разными именами.

Кадры: вход двух пользователей; список «онлайн»; общая комната и обмен сообщениями; личное сообщение; индикатор «печатает»; вкладка Network → WS с кадрами сообщений; закрытие вкладки (второй видит, что пользователь вышел).

## ЛР8 – Docker

Ветка: `28`, папка: `part-2/lab-08-docker`. Запусти Docker Desktop, затем:

```bash
cd part-2/lab-08-docker
cp .env.example .env   # POSTGRES_PASSWORD, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up --build -d
docker compose ps
```

Кадры: `docker compose ps` (три контейнера `healthy`); `docker images` (размеры образов); открытый клиент `http://localhost:8080`; `http://localhost:8080/api/health`; `docker compose logs backend`; после `docker compose down` и `up` данные на месте; Docker Hub → твой репозиторий с загруженными образами (`docker tag` и `docker push`).
