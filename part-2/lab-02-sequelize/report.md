# Лабораторная работа №2. Работа с базами данных и ORM Sequelize

## 1 Цель работы

Освоить подключение реляционной базы данных к Node.js-приложению, использование ORM Sequelize для описания моделей и выполнения CRUD-операций, миграции и сиды. Работа продолжает лабораторную работу 1 для проекта DSLKit, веб-редактора диаграмм как кода, тематика которого соответствует направлению SaaS: коллекция `diagrams` переезжает из массива в памяти в базу данных.

## 2 Краткие теоретические сведения

**ORM.** Object-Relational Mapping связывает таблицы реляционной базы с объектами языка. Модель Sequelize описывает таблицу и её колонки, а методы `findAll`, `findByPk`, `create`, `update` и `destroy` превращаются в запросы SQL. Преимущества: код не зависит от диалекта SQL, значения подставляются безопасно, а проверки лежат рядом с моделью. Недостатки: сложные запросы приходится выражать через API библиотеки, а скрытые запросы можно не заметить.

**Миграции и сиды.** Миграция это файл с двумя функциями: `up` меняет схему, `down` отменяет изменение. Применённые миграции записываются в служебную таблицу, поэтому схема воспроизводится на любом компьютере одной командой и меняется по шагам. Сид заполняет таблицы начальными данными и тоже имеет `up` и `down`.

**Диалекты.** Sequelize работает с PostgreSQL, SQLite, MySQL и другими базами через драйверы. Для PostgreSQL нужны пакеты `pg` и `pg-hstore`, для SQLite пакет `sqlite3`. Строка подключения `DATABASE_URL` позволяет направить приложение на облачный сервис, например Neon или Supabase, не меняя код.

## 3 Ход работы

### 3.1 База данных

PostgreSQL на компьютере разработчика не установлен, а ставить системное программное обеспечение для учебной работы не требуется, поэтому для локального запуска выбран SQLite: файл базы создаётся сам. Выбор делает файл `config/config.js`. Если задана переменная `DATABASE_URL`, используется PostgreSQL (при `DATABASE_SSL=true` добавляется TLS для Neon и Supabase), иначе SQLite с файлом из `SQLITE_STORAGE`. Миграции, модель и контроллеры от диалекта не зависят. Подключение к настоящему PostgreSQL в этой работе пока не проверено, это остаётся сделать перед сдачей. Образец переменных лежит в `.env.example`, сам `.env` в репозиторий не попадает.

### 3.2 Установка и настройка

Установлены пакеты `sequelize`, `pg`, `pg-hstore`, `sqlite3` и, как зависимость разработки, `sequelize-cli`. Файл `.sequelizerc` указывает инструменту каталоги `migrations` и `seeders` и файл настроек, поэтому команды `npx sequelize-cli` работают с теми же параметрами подключения, что и приложение. В `package.json` добавлены скрипты `db:migrate`, `db:migrate:undo`, `db:seed`, `db:seed:undo` и `db:reset`.

### 3.3 Модель и миграции

Модель `Diagram` описана в `src/models/diagram.js`: поля `title`, `notation`, `sourceCode`, `priority` и `owner`, а Sequelize сам добавляет `id`, `createdAt` и `updatedAt`. Допустимые значения `notation` и `priority` заданы проверкой `isIn`, поэтому база не примет значение вне списка, даже если обойти проверку запроса. Имя таблицы Sequelize получает из имени модели во множественном числе, то есть `Diagrams`.

Схема создаётся только миграциями, метод `sync()` не используется. Первая миграция создаёт таблицу без поля `priority`, вторая добавляет его вызовом `addColumn` со значением по умолчанию `normal`, а её функция `down` удаляет колонку. Так показано изменение схемы существующей таблицы, как требует условие. Файлы миграций перечислены в таблице 1.

Таблица 1 – Файлы базы данных

| Файл                                                    | Назначение                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `migrations/20261016000001-create-diagrams.js`          | Создаёт таблицу Diagrams с колонками id, title, notation, sourceCode, owner, createdAt, updatedAt |
| `migrations/20261016000002-add-priority-to-diagrams.js` | Добавляет колонку priority, откат удаляет её                                                      |
| `seeders/20261016000001-demo-diagrams.js`               | Вставляет три демонстрационные диаграммы, откат удаляет их по названию                            |
| `src/models/diagram.js`                                 | Модель Sequelize                                                                                  |
| `src/models/index.js`                                   | Создание подключения и модели по настройкам                                                       |

### 3.4 CRUD через ORM

Маршруты, проверка данных и формат ошибок остались как в лабораторной работе 1, изменился только слой контроллеров. Контроллеры получают модель параметром и вызывают методы Sequelize, как показано в таблице 2. Метод `update` возвращает число изменённых строк, поэтому ноль означает ответ 404, после успешной замены запись читается заново и возвращается клиенту. Express 5 передаёт отклонённый Promise в глобальный обработчик ошибок, поэтому конструкции `try/catch` в контроллерах не нужны, а сбой базы даёт ответ 500 без внутренних подробностей.

Таблица 2 – Соответствие маршрутов и методов Sequelize

| Маршрут                | Вызов Sequelize                                               | Ответ       |
| ---------------------- | ------------------------------------------------------------- | ----------- |
| `GET /diagrams`        | `Diagram.findAll({ order: [['id', 'ASC']] })`                 | 200         |
| `GET /diagrams/:id`    | `Diagram.findByPk(id)`                                        | 200 или 404 |
| `POST /diagrams`       | `Diagram.create(fields)`                                      | 201         |
| `PUT /diagrams/:id`    | `Diagram.update(fields, { where: { id } })`, затем `findByPk` | 200 или 404 |
| `DELETE /diagrams/:id` | `Diagram.destroy({ where: { id } })`                          | 204 или 404 |

### 3.5 Запуск и проверка

Порядок запуска: `npm run db:migrate` создаёт таблицу и добавляет колонку `priority`, `npm run db:seed` наполняет базу, `npm run dev` запускает сервер. Проверка на SQLite показала, что список возвращает три записи с полями `createdAt` и `updatedAt`, замена меняет `updatedAt`, первое удаление даёт 204, а повторное 404.

Всего 22 автоматических теста. Восемнадцать проверяют HTTP-маршруты на временной базе SQLite, к которой применены настоящие миграции. Четыре проверяют сами миграции: набор колонок после обеих миграций, откат второй миграции с удалением `priority` и повторное применение, вставку и откат сида, отказ модели от значений вне списков. Тесты запускают настоящий `sequelize-cli`, поэтому ошибка в файле миграции будет обнаружена.

## Заключение

Для проекта DSLKit коллекция `diagrams` из лабораторной работы 1 переведена с массива на базу данных через Sequelize: модель `Diagram`, две миграции (создание таблицы и добавление поля `priority`), сид с тремя диаграммами и контроллеры на методах ORM. Локально работа использует SQLite, а переменная `DATABASE_URL` переключает её на PostgreSQL или облачный Neon без изменения кода. 22 автоматических теста подтверждают маршруты, миграции с откатом и сид. Остаётся проверить запуск на настоящем PostgreSQL и приложить скриншоты структуры базы и запросов из Postman.

## Приложение А – Листинг файла config.js

```js
try {
  process.loadEnvFile();
} catch {
  // .env is optional, defaults apply
}

// DATABASE_URL selects PostgreSQL, otherwise a local SQLite file is used.
const fromEnv = () => {
  const { DATABASE_URL, DATABASE_SSL, SQLITE_STORAGE } = process.env;
  if (!DATABASE_URL) return { dialect: 'sqlite', storage: SQLITE_STORAGE || './dev.sqlite', logging: false };
  return {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    ...(DATABASE_SSL === 'true' && { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }),
  };
};

// One config for every environment: tests override SQLITE_STORAGE.
module.exports = { development: fromEnv(), test: fromEnv(), production: fromEnv() };
```

## Приложение Б – Листинг файла index.js модели

```js
const { Sequelize } = require('sequelize');
const { defineDiagram } = require('./diagram');
const allConfigs = require('../../config/config');

// Builds the connection from config/config.js; NODE_ENV picks the block.
const createModels = (config = allConfigs[process.env.NODE_ENV || 'development']) => {
  const { use_env_variable: urlVariable, ...options } = config;
  const sequelize = urlVariable ? new Sequelize(process.env[urlVariable], options) : new Sequelize(options);
  return { sequelize, Diagram: defineDiagram(sequelize) };
};

module.exports = { createModels };
```

## Приложение В – Листинг файла diagram.js

```js
const { DataTypes } = require('sequelize');
const { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY, LIMITS } = require('./diagram.constants');

// The table is created by migrations, never by sequelize.sync().
const defineDiagram = (sequelize) =>
  sequelize.define('Diagram', {
    title: { type: DataTypes.STRING(LIMITS.title), allowNull: false, validate: { len: [1, LIMITS.title] } },
    notation: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [NOTATIONS] } },
    sourceCode: { type: DataTypes.TEXT, allowNull: false, validate: { len: [1, LIMITS.sourceCode] } },
    priority: { type: DataTypes.STRING, allowNull: false, defaultValue: DEFAULT_PRIORITY, validate: { isIn: [PRIORITIES] } },
    owner: { type: DataTypes.STRING(LIMITS.owner), allowNull: false, validate: { len: [1, LIMITS.owner] } },
  });

module.exports = { defineDiagram };
```

## Приложение Г – Листинг миграции создания таблицы

```js
// A migration is a snapshot, so the allowed values are copied here instead of imported.
const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Diagrams', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      title: { allowNull: false, type: Sequelize.STRING(80) },
      notation: { allowNull: false, type: Sequelize.STRING },
      sourceCode: { allowNull: false, type: Sequelize.TEXT },
      owner: { allowNull: false, type: Sequelize.STRING(60) },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addConstraint('Diagrams', {
      type: 'check',
      fields: ['notation'],
      name: 'diagrams_notation_check',
      where: { notation: { [Sequelize.Op.in]: NOTATIONS } },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Diagrams');
  },
};
```

## Приложение Д – Листинг миграции добавления поля priority

```js
const PRIORITIES = ['low', 'normal', 'high'];
const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Diagrams', 'priority', {
      allowNull: false,
      type: Sequelize.STRING,
      defaultValue: 'normal',
    });
    await queryInterface.addConstraint('Diagrams', {
      type: 'check',
      fields: ['priority'],
      name: 'diagrams_priority_check',
      where: { priority: { [Sequelize.Op.in]: PRIORITIES } },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('Diagrams', 'diagrams_priority_check');
    await queryInterface.removeColumn('Diagrams', 'priority');
    // SQLite drops a column by rebuilding the table from its columns only, which loses the CHECK from the first migration.
    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      await queryInterface.addConstraint('Diagrams', {
        type: 'check',
        fields: ['notation'],
        name: 'diagrams_notation_check',
        where: { notation: { [Sequelize.Op.in]: NOTATIONS } },
      });
    }
  },
};
```

## Приложение Е – Листинг сида demo-diagrams.js

```js
// Every seeded row has this owner, so the seed can tell its rows from the ones users created.
const MARKER = 'demo';

module.exports = {
  async up(queryInterface) {
    const existing = await queryInterface.rawSelect('Diagrams', { where: { owner: MARKER } }, ['id']);
    if (existing) return;
    const now = new Date();
    await queryInterface.bulkInsert('Diagrams', [
      {
        title: 'Order processing',
        notation: 'BPMN',
        sourceCode: 'start -> check -> pay -> ship',
        priority: 'high',
        owner: MARKER,
        createdAt: now,
        updatedAt: now,
      },
      {
        title: 'Billing schema',
        notation: 'ERD',
        sourceCode: 'entity Invoice { id; total }',
        priority: 'normal',
        owner: MARKER,
        createdAt: now,
        updatedAt: now,
      },
      { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server: login', priority: 'low', owner: MARKER, createdAt: now, updatedAt: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Diagrams', { owner: MARKER });
  },
};
```

## Приложение Ж – Листинг файла diagrams.controller.js

```js
const { notFound } = require('../errors');

const missing = (id) => notFound(`Diagram ${id} not found`);

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram }) => ({
  list: async (_req, res) => res.json(await Diagram.findAll({ order: [['id', 'ASC']] })),

  get: async (req, res, next) => {
    const diagram = await Diagram.findByPk(req.diagramId);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  create: async (req, res) => {
    const diagram = await Diagram.create(req.diagramFields);
    res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
  },

  replace: async (req, res, next) => {
    const [updated] = await Diagram.update(req.diagramFields, { where: { id: req.diagramId } });
    return updated ? res.json(await Diagram.findByPk(req.diagramId)) : next(missing(req.diagramId));
  },

  remove: async (req, res, next) => {
    const removed = await Diagram.destroy({ where: { id: req.diagramId } });
    return removed ? res.status(204).end() : next(missing(req.diagramId));
  },
});

module.exports = { createDiagramsController };
```
