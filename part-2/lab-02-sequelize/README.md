# Часть 2. Лабораторная работа 2. Базы данных и ORM Sequelize

Проект DSLKit (диаграммы как код, SaaS). Условие: `materials/text/part-2/Модуль 01…/37. Лабораторная работа 2…`. Работа продолжает [лабораторную работу 1](../lab-01-node-server): те же маршруты `/diagrams`, но вместо массива в памяти данные хранит база через Sequelize. Отчёты: [`report.md`](report.md) на русском, [`report.en.md`](report.en.md) на английском (шаблоны `report.tpl.md`, `report.en.tpl.md`; сборка `node tools/build.js part-2/lab-02-sequelize` из корня репозитория).

## 1 База данных: SQLite или PostgreSQL

PostgreSQL на этой машине не установлен, поэтому по умолчанию работа использует **SQLite** (файл `dev.sqlite`, ничего ставить не нужно). Код один и тот же: Sequelize выбирает драйвер по настройкам из `config/config.js`.

| Режим                      | Как включить                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQLite (по умолчанию)      | Ничего не делать; файл задаёт `SQLITE_STORAGE` (по умолчанию `./dev.sqlite`)                                                                                                                                                          |
| PostgreSQL, Neon, Supabase | В `.env` задать `DATABASE_URL=postgres://user:password@host:5432/dslkit`; для Neon и Supabase добавить `DATABASE_SSL=true` (сертификат сервера проверяется; отключить проверку можно только `DATABASE_SSL_REJECT_UNAUTHORIZED=false`) |

Пример для локального PostgreSQL: создайте базу и пользователя (`createdb dslkit`), запишите строку подключения в `.env` (файл не попадает в репозиторий) и выполните те же команды `npm run db:migrate` и `npm run db:seed`. Работа с настоящим PostgreSQL **не проверялась**: проверены SQLite и сборка настроек для PostgreSQL. Чтобы перейти на PostgreSQL или Neon, достаточно задать `DATABASE_URL` и выполнить `npm run db:migrate`; код менять не нужно.

## 2 Запуск

Нужен Node.js 22 или новее.

```bash
cd part-2/lab-02-sequelize
npm install
cp .env.example .env     # по желанию
npm run db:migrate       # создать таблицы, добавить priority, revision, projectId
npm run db:seed          # три демонстрационные диаграммы
npm run dev              # nodemon; npm start для обычного запуска
npm test                 # тесты
```

Команды базы данных: `db:migrate:undo` откатывает последнюю миграцию, `db:seed:undo` удаляет демонстрационные данные, `db:reset` пересоздаёт всё с нуля.

## 3 Что изменилось по сравнению с ЛР 1

| Путь                                            | Назначение                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `config/config.js`, `.sequelizerc`              | Настройки подключения для приложения и для `sequelize-cli`                                   |
| `migrations/…-create-diagrams.js`               | Создаёт таблицу `Diagrams` (без поля `priority`)                                             |
| `migrations/…-add-priority-to-diagrams.js`      | Добавляет колонку `priority` через `addColumn`, откат удаляет её                             |
| `migrations/…-add-revision-to-diagrams.js`      | Числовая колонка `revision` с проверкой `CHECK` от 0 до 100000                               |
| `migrations/…-create-projects.js`               | Таблица `Projects` с уникальным именем и внешний ключ `Diagrams.projectId`                   |
| `src/models/project.js`                         | Модель проекта, связь один-ко-многим задана в `src/models/index.js`                          |
| `seeders/…-demo-diagrams.js`                    | Начальные данные                                                                             |
| `src/models/diagram.js`, `diagram.constants.js` | Модель Sequelize и допустимые значения полей                                                 |
| `src/models/index.js`                           | `createModels(config)`: создаёт подключение и модель                                         |
| `src/controllers/diagrams.controller.js`        | Вместо массива вызовы `findAll`, `findByPk`, `create`, `update`, `destroy`                   |
| `tests/`                                        | HTTP-тесты на временной базе SQLite и тесты миграций и сидов через настоящий `sequelize-cli` |

Маршруты, проверка данных, формат ошибок и коды ответов остались как в ЛР 1. Ответы теперь содержат поля `createdAt` и `updatedAt`. Таблица создаётся только миграциями, `sequelize.sync()` не используется.

## 4 Проверка

`npm test` запускает 98 тестов: каждая проверка работает с временным файлом SQLite, на нём выполняются настоящие миграции и сиды. В тот же запуск входит проверка сборки и оформления отчётов (`report.test.mjs`).

Известное замечание: `npm audit` показывает уязвимости в цепочках `nodemon` и `sequelize-cli` (инструменты разработки). Рабочий запуск их не использует.

## 5 Новое в этой версии: PATCH, число revision, проекты

**PUT и PATCH.** `PUT /diagrams/:id` заменяет запись целиком (пропущенное необязательное поле получает значение по умолчанию, `projectId` сбрасывается в `null`). `PATCH /diagrams/:id` меняет только присланные поля, каждое проверяется как в `POST`, пустое тело или тело без известных полей даёт 400. `PUT` идемпотентен, `PATCH` по определению не обязан быть таким.

**Число `revision`.** Целое от 0 до 100000 (предел `revisionMax` в `limits.json`). Строки, дроби, отрицательные числа, `null`, `1e999` и числа выше предела дают 400. Тот же диапазон стоит в модели и в `CHECK` миграции. По полю можно сортировать: `GET /diagrams?sort=revision&order=desc`.

**Проекты (один-ко-многим).** `Project.hasMany(Diagram)`, `Diagram.belongsTo(Project)`, внешний ключ `projectId` с `ON DELETE SET NULL`. Маршруты: `GET /projects`, `POST /projects`, `GET /projects/:id`, `GET /projects/:id/diagrams`, `DELETE /projects/:id`. Имя проекта уникально: повтор даёт **409** (ошибка `SequelizeUniqueConstraintError` превращается в ответ в `error-handler.js`). Диаграмма с несуществующим `projectId` получает 400.

## 6 Ограничения, журнал и безопасность

Пределы длины и размер тела лежат в [`limits.json`](limits.json), в миграциях стоят CHECK на пустые значения и длину. Каждый запрос пишется в таблицу `RequestLogs` (чётный вариант), при сбое записи клиент получает 500. Тело не в JSON даёт 415, `OPTIONS` отвечает 204, на ответах стоят заголовки безопасности. Для TLS с собственным центром сертификации задайте `DATABASE_SSL_CA`, в production проверку сертификата отключить нельзя. Подробности в [`AUDIT.md`](AUDIT.md).

## 7 Как вызвать ответ 500 настоящим сбоем

Страница или ответ 500 вызывается сбоем базы, а не кнопкой.

- SQLite: запустите `npm start`, во втором окне выполните `npx sequelize-cli db:migrate:undo:all`. Таблицы исчезают под работающим сервером, первый же запрос (`GET /diagrams`) не может записать строку в `RequestLogs` и получает 500 с телом `{ "error": "Internal server error" }`, подробности только в консоли сервера (`GET /health` при SQLite остаётся 200). Вернуть работу: `npm run db:migrate`.
- PostgreSQL (Neon, Supabase или локальный): остановите службу или контейнер базы, запросы дают 500, а `GET /health` отвечает 503.
- Запуск при недоступной базе (`SQLITE_STORAGE=/нет/такого/каталога/db.sqlite npm start`) завершается с кодом 1 и сообщением, сервер не поднимается.
