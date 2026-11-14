# DSLKit: приложение курсового проекта

Сервер, клиент и Docker вынесены из лабораторных работ 3, 5 и 8 в отдельные папки. Сами лабораторные работы не менялись.

| Папка     | Что внутри                                                                                          |
| --------- | --------------------------------------------------------------------------------------------------- |
| `server/` | Express 5, Sequelize 6, PostgreSQL, JWT, роли. Сущности: `User`, `Diagram`, `Comment`, `Tag`, `RequestLog` (связь тегов с диаграммами через `DiagramTag`) |
| `client/` | React 19, React Router 7, Vite, axios. Вход, список и страница диаграммы, комментарии, теги, `/admin` |
| `docker/` | `docker-compose.yml`, Dockerfile сервера и клиента, Nginx                                           |

Что добавлено по сравнению с лабораторными: сущность `Comment` (миграция, модель, `GET` и `POST /diagrams/:id/comments`, `PATCH` и `DELETE /comments/:id`, сид), сущность `Tag` (миграция, модели `Tag` и `DiagramTag`, `GET /tags`, `GET` и `POST /diagrams/:id/tags`, `DELETE /diagrams/:id/tags/:tagId`, `DELETE /tags/:id`, фильтр `GET /diagrams?tag=`, сид, раздел «Теги» на странице диаграммы), маршрутизация клиента, страницы ошибок 401, 403, 404, 500, экран администратора.

## Запуск в Docker

```bash
cd course-project/app/docker
cp .env.example .env
docker compose up --build
```

В `.env` нужно вписать `POSTGRES_PASSWORD` (буквы и цифры) и `JWT_SECRET` (не короче 32 случайных символов). Приложение откроется на `http://localhost:8080`, проверка сервера на `http://localhost:8080/api/health`. Первого администратора создаёт сид из `ADMIN_EMAIL` и `ADMIN_PASSWORD`, демонстрационных пользователей и комментарии из `DEMO_USER_PASSWORD` (см. `server/.env.example`).

## Облачное развёртывание на Render / Deployment on Render

Файл `render.yaml` лежит в корне репозитория (ветка `main`) и описывает три ресурса: базу PostgreSQL `dslkit-db`, сервер `dslkit-api` (Node.js) и клиент `dslkit-web` (статический сайт). Секретов в файле нет: `JWT_SECRET` создаёт сам Render, его можно прочитать во вкладке Environment.

1. В панели Render выберите New, Blueprint, подключите репозиторий и ветку с `render.yaml`.
2. Render создаст три ресурса без вопросов о значениях: `JWT_SECRET` будет сгенерирован, адреса `CORS_ORIGIN` и `VITE_API_URL` уже вписаны. Первого администратора и демо-пользователей файл не создаёт: добавьте во вкладке Environment сервера `ADMIN_EMAIL`, `ADMIN_PASSWORD` (10 символов и больше) и при желании `DEMO_USER_PASSWORD`, затем перезапустите сервер.
3. Если Render дал сервисам другие имена (имя занято), поправьте адреса. Затем перезапустите сервер и пересоберите клиент (Manual Deploy), потому что `VITE_API_URL` вшивается при сборке.
4. Сервер запускается командой `npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all && node server.js` (как в Dockerfile), состояние проверяется по `/health`, сборка: `npm ci --omit=dev`.
5. Бесплатные план базы и сервера Render ограничены по сроку и засыпают без запросов: первый ответ после простоя медленный. Проверьте актуальные условия плана перед защитой.

Не проверено: развёртывание на самом Render не выполнялось. В `render.yaml` не задан `NODE_ENV=production`, потому что в этом режиме сервер требует `DATABASE_SSL=true` и проверяемый сертификат (`DATABASE_SSL_CA`); подходит ли внутреннее соединение Render с этой проверкой, нужно выяснить при первом запуске.

The `render.yaml` file in the repository root (branch `main`) describes three resources: the PostgreSQL database `dslkit-db`, the Node.js server `dslkit-api` and the static client `dslkit-web`. It holds no secrets: they are typed in the Render dashboard.

1. In the Render dashboard choose New, Blueprint, connect the repository and the branch that has `render.yaml`.
2. Render creates the three resources without asking for values: `JWT_SECRET` is generated, the addresses `CORS_ORIGIN` and `VITE_API_URL` are already filled in. The file does not create the first administrator and demo users: add `ADMIN_EMAIL`, `ADMIN_PASSWORD` (10 characters or more) and optionally `DEMO_USER_PASSWORD` in the Environment tab of the server, then restart it.
3. If Render gave the services other names (a name is taken), fix the addresses. Then restart the server and rebuild the client (Manual Deploy), because `VITE_API_URL` is baked into the build.
4. The server starts with `npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all && node server.js` (as in the Dockerfile), health is checked at `/health`, the build is `npm ci --omit=dev`.
5. The free Render plans of the database and the server are time-limited and sleep without traffic: the first answer after idle is slow. Check the current plan terms before the defense.

Not verified: no deployment to Render was performed. `render.yaml` does not set `NODE_ENV=production` because in that mode the server requires `DATABASE_SSL=true` with a verifiable certificate (`DATABASE_SSL_CA`); whether the internal Render connection fits that check has to be found out at the first start.

## Запуск без Docker

```bash
cd course-project/app/server
npm install
npm run db:migrate
npm run dev
```

```bash
cd course-project/app/client
npm install
npm run dev
```

Клиент работает на `http://localhost:5178`, сервер на порту 3000. Для сервера нужна база: `DATABASE_URL` (PostgreSQL) или `SQLITE_STORAGE` (файл SQLite для проверки).

## Тесты

Запускать по одному.

```bash
cd course-project/app/server && npm test
```

```bash
cd course-project/app/client && npm test
```

```bash
cd course-project/app/docker && node --test docker.test.mjs hardening.test.mjs
```

Результат на 24.10.2026: сервер 226 тестов (в полном прогоне на занятой машине нагрузочный тест `load: 600 authenticated reads` мог превысить порог 3 с, отдельно он проходит), клиент 237, Docker 21.
