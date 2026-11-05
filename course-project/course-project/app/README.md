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
