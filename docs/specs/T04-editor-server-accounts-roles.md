# T04 Сервер редактора: аккаунты и роли в БД / Editor server with accounts and roles

Агент: opus или ведущий агент (сложное, безопасность). Ветка: `feat/editor-server`.

## RU

**Цель.** Серверное хранение проектов с аккаунтами и ролями Гость / Пользователь / Редактор / Администратор (роли в `00-PROJECT-SPEC.md`).

**Основа.** Опыт ЛР2 (Sequelize, миграции), ЛР3 (bcrypt, JWT, блокировка входа, `limits.json`), ПЗ2 (схема как единственный источник правил, единый формат ошибок). Уточнить у владельца: PostgreSQL или SQLite (открытый вопрос преподавателю), где размещать.

**Требования.**

- Таблицы: `users`, `roles`/поле роли, `projects`, `project_members`, журнал запросов в таблице.
- API: регистрация, вход, обновление токена, CRUD проектов, управление ролями (только администратор), страницы и поиск.
- Безопасность: bcrypt, короткоживущий JWT, лимиты и блокировка, проверка ввода на границе, CORS по списку, CSRF где нужен, email скрыт в общих списках, ответ 403/404 без утечки существования.
- Клиент сайта: вход/регистрация, переключение «локально / на сервере», при отсутствии сервера редактор работает как раньше.
- Секреты только в `.env`, в репозитории `.env.example`.

**Тесты.** Модульные и интеграционные на каждую роль и границу прав, негативные случаи (чужой проект, просроченный токен, блокировка). Порог покрытия для новой папки задать явно.

**Критерии готовности.** `npm test` сервера и `verify` сайта зелёные; матрица «роль × действие» в документе RU/EN совпадает с тестами; CodeQL и gitleaks зелёные; PR влит.

**Вне задачи.** Совместное редактирование в реальном времени, облачный деплой.

## EN

**Goal.** Server-side project storage with accounts and roles Guest / User / Editor / Admin (see `00-PROJECT-SPEC.md`).

**Basis.** Lab 2 (Sequelize, migrations), Lab 3 (bcrypt, JWT, login lockout, `limits.json`), PZ2 (schema as the single source of rules, uniform error format). Confirm with the owner: PostgreSQL vs SQLite, hosting.

**Requirements.** Tables for users, roles, projects, members, request log. API for register/login/refresh, project CRUD, role management (admin only), paging and search. bcrypt, short-lived JWT, limits and lockout, boundary validation, allow-list CORS, hidden emails, 403/404 without existence leaks. Site client: sign-in, local/server switch, works as before without a server. Secrets only in `.env`.

**Tests.** Per-role and permission-boundary tests, negative cases, explicit coverage threshold for the new folder.

**Done.** Server `npm test` and site `verify` green; role × action matrix in the doc equals the tests; CodeQL and gitleaks green; PR merged.

**Out of scope.** Real-time co-editing, cloud deployment.
