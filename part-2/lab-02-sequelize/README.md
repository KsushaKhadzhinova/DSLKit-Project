# Часть 2. Лабораторная работа 2. Базы данных и ORM Sequelize

Проект DSLKit (диаграммы как код, SaaS). Условие: `materials/text/part-2/Модуль 01…/37. Лабораторная работа 2…`. Работа продолжает [лабораторную работу 1](../lab-01-node-server): те же маршруты `/diagrams`, но вместо массива в памяти данные хранит база через Sequelize. Отчёты: [`report.md`](report.md) на русском, [`report.en.md`](report.en.md) на английском (шаблоны `report.tpl.md`, `report.en.tpl.md`; сборка `node tools/build.js part-2/lab-02-sequelize` из корня репозитория).

## 1 База данных: SQLite или PostgreSQL

PostgreSQL на этой машине не установлен, поэтому по умолчанию работа использует **SQLite** (файл `dev.sqlite`, ничего ставить не нужно). Код один и тот же: Sequelize выбирает драйвер по настройкам из `config/config.js`.

| Режим                      | Как включить                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| SQLite (по умолчанию)      | Ничего не делать; файл задаёт `SQLITE_STORAGE` (по умолчанию `./dev.sqlite`)                                               |
| PostgreSQL, Neon, Supabase | В `.env` задать `DATABASE_URL=postgres://user:password@host:5432/dslkit`; для Neon и Supabase добавить `DATABASE_SSL=true` |

Пример для локального PostgreSQL: создайте базу и пользователя (`createdb dslkit`), запишите строку подключения в `.env` (файл не попадает в репозиторий) и выполните те же команды `npm run db:migrate` и `npm run db:seed`. Подключение к настоящему PostgreSQL в этой сессии **не проверялось**, проверены только SQLite и сборка конфигурации; перед сдачей прогоните миграции на PostgreSQL или Neon и сделайте скриншот структуры таблицы для отчёта.

## 2 Запуск

Нужен Node.js 22 или новее.

```bash
cd part-2/lab-02-sequelize
npm install
cp .env.example .env     # по желанию
npm run db:migrate       # создать таблицу и добавить колонку priority
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
| `seeders/…-demo-diagrams.js`                    | Начальные данные                                                                             |
| `src/models/diagram.js`, `diagram.constants.js` | Модель Sequelize и допустимые значения полей                                                 |
| `src/models/index.js`                           | `createModels(config)`: создаёт подключение и модель                                         |
| `src/controllers/diagrams.controller.js`        | Вместо массива вызовы `findAll`, `findByPk`, `create`, `update`, `destroy`                   |
| `tests/`                                        | HTTP-тесты на временной базе SQLite и тесты миграций и сидов через настоящий `sequelize-cli` |

Маршруты, проверка данных, формат ошибок и коды ответов остались как в ЛР 1. Ответы теперь содержат поля `createdAt` и `updatedAt`. Таблица создаётся только миграциями, `sequelize.sync()` не используется.

## 4 Проверка

`npm test` запускает 18 тестов: каждая проверка работает с временным файлом SQLite, на нём выполняются настоящие миграции и сиды. Отчёты проверяются из корня репозитория:

```bash
node --test part-2/lab-02-sequelize/report.test.mjs
```

Известное замечание: `npm audit` показывает уязвимости в цепочках `nodemon` и `sequelize-cli` (инструменты разработки). Рабочий запуск их не использует.
