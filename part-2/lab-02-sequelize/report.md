# Лабораторная работа №2. Работа с базами данных и ORM Sequelize

## 1 Цель работы

Освоить подключение реляционной базы данных к Node.js-приложению, использование ORM Sequelize для описания моделей и выполнения CRUD-операций, миграции и сиды. Работа продолжает лабораторную работу 1 для проекта DSLKit, веб-редактора диаграмм как кода, тематика которого соответствует направлению SaaS: коллекция `diagrams` переезжает из массива в памяти в базу данных.

## 2 Краткие теоретические сведения

**ORM.** Object-Relational Mapping связывает таблицы реляционной базы с объектами языка. Модель Sequelize описывает таблицу и её колонки, а методы `findAll`, `findByPk`, `create`, `update` и `destroy` превращаются в запросы SQL. Преимущества: код не зависит от диалекта SQL, значения подставляются безопасно, а проверки лежат рядом с моделью. Недостатки: сложные запросы приходится выражать через API библиотеки, а скрытые запросы можно не заметить.

**Миграции и сиды.** Миграция это файл с двумя функциями: `up` меняет схему, `down` отменяет изменение. Применённые миграции записываются в служебную таблицу, поэтому схема воспроизводится на любом компьютере одной командой и меняется по шагам. Сид заполняет таблицы начальными данными и тоже имеет `up` и `down`.

**Диалекты.** Sequelize работает с PostgreSQL, SQLite, MySQL и другими базами через драйверы. Для PostgreSQL нужны пакеты `pg` и `pg-hstore`, для SQLite пакет `sqlite3`. Строка подключения `DATABASE_URL` позволяет направить приложение на облачный сервис, например Neon или Supabase, не меняя код.

## 3 Ход работы

### 3.1 База данных

PostgreSQL на компьютере разработчика не установлен, а ставить системное программное обеспечение для учебной работы не требуется, поэтому для локального запуска выбран SQLite: файл базы создаётся сам. Выбор делает файл `config/config.js`. Если задана переменная `DATABASE_URL`, используется PostgreSQL (при `DATABASE_SSL=true` включается TLS для Neon и Supabase с проверкой сертификата сервера, отключить проверку можно только переменной `DATABASE_SSL_REJECT_UNAUTHORIZED=false`), иначе SQLite с файлом из `SQLITE_STORAGE`. Миграции, модель и контроллеры от диалекта не зависят. Работа с настоящим PostgreSQL не проверялась: проверены SQLite и сборка настроек для PostgreSQL, а остальное опирается на то, что Sequelize скрывает различия диалектов. Образец переменных лежит в `.env.example`, сам `.env` в репозиторий не попадает.

### 3.2 Установка и настройка

Установлены пакеты `sequelize`, `pg`, `pg-hstore`, `sqlite3` и, как зависимость разработки, `sequelize-cli`. Файл `.sequelizerc` указывает инструменту каталоги `migrations` и `seeders` и файл настроек, поэтому команды `npx sequelize-cli` работают с теми же параметрами подключения, что и приложение. В `package.json` добавлены скрипты `db:migrate`, `db:migrate:undo`, `db:seed`, `db:seed:undo` и `db:reset`.

### 3.3 Модель и миграции

Модель `Diagram` описана в `src/models/diagram.js`: поля `title`, `notation`, `sourceCode`, `priority` и `owner`, а Sequelize сам добавляет `id`, `createdAt` и `updatedAt`. Допустимые значения `notation` и `priority` заданы проверкой `isIn` в модели и ограничениями `CHECK` в миграциях, поэтому база не примет значение вне списка, даже если обойти и запрос, и модель. Длины совпадают с типами колонок: `title` до 80 символов, `owner` до 60, `sourceCode` до 10000, а перед сохранением `title` и `owner` обрезаются по краям. Идентификатор в адресе не может превышать 2147483647, иначе PostgreSQL ответил бы ошибкой 500. Размер тела запроса ограничен значением 100kb. Имя таблицы Sequelize получает из имени модели во множественном числе, то есть `Diagrams`.

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

Всего 32 автоматических теста. Двадцать три проверяют HTTP-маршруты на временной базе SQLite, к которой применены настоящие миграции. Пять проверяют сами миграции: набор колонок после обеих миграций, откат второй миграции с удалением `priority` и повторное применение, повторный запуск сида и откат только своих строк, отказ модели от значений вне списков, отказ базы от значения вне списка при обходе модели. Четыре проверяют настройки подключения, в том числе проверку сертификата по умолчанию. Тесты запускают настоящий `sequelize-cli`, поэтому ошибка в файле миграции будет обнаружена.

Листинг файла config.js приведён в приложении А. Листинг файла index.js модели приведён в приложении Б. Листинг миграции создания таблицы приведён в приложении Г. Листинг миграции добавления поля priority приведён в приложении Д. Листинг сида demo-diagrams.js приведён в приложении Е. Листинг файла diagrams.controller.js приведён в приложении Ж.

### 3.6 Постраничный вывод и сортировка

Список принимает параметры `limit`, `offset`, `sort` и `order`. Параметр `limit` задаёт размер страницы от 1 до 100, `offset` задаёт смещение от 0 до 1000000, `sort` выбирает поле из белого списка, а `order` принимает значения `asc` и `desc`. Без параметров возвращается весь список по возрастанию `id`, поэтому клиенты прежних работ продолжают работать. Ответ остаётся массивом, а полный размер выборки приходит в заголовке `X-Total-Count`. Числа читаются как строки не длиннее девяти цифр, поэтому значения `-1`, `1e9`, `0x10` и огромные числа получают ответ 400 со списком ошибок по полям. Имя поля сортировки проверяется по белому списку и не попадает в запрос к базе без проверки. Равные значения упорядочены по `id`, поэтому страницы не пересекаются. Разбор параметров вынесен в отдельный модуль, он приведён в приложении И.

## Заключение

Для проекта DSLKit коллекция `diagrams` из лабораторной работы 1 переведена с массива на базу данных через Sequelize: модель `Diagram`, две миграции (создание таблицы и добавление поля `priority`), сид с тремя диаграммами и контроллеры на методах ORM. Локально работа использует SQLite, а переменная `DATABASE_URL` переключает её на PostgreSQL или облачный Neon без изменения кода. 32 автоматических теста подтверждают маршруты, ограничения, миграции с откатом и сид. Запуск на настоящем PostgreSQL не проверялся, скриншоты структуры базы и запросов из Postman остаётся приложить.

## Приложение А (обязательное) Листинг файла config.js

```js
const { readFileSync } = require('node:fs');

try {
  process.loadEnvFile();
} catch {
  // .env is optional, defaults apply
}

// DATABASE_URL selects PostgreSQL, otherwise a local SQLite file is used.
// With DATABASE_SSL=true the server certificate is verified; only DATABASE_SSL_REJECT_UNAUTHORIZED=false turns that off.
// DATABASE_SSL_CA is a path to a PEM file with the certificate authority, the safe way to trust a private or self-signed server.
const fromEnv = () => {
  const { DATABASE_URL, DATABASE_SSL, DATABASE_SSL_REJECT_UNAUTHORIZED, DATABASE_SSL_CA, SQLITE_STORAGE, NODE_ENV } = process.env;
  if (!DATABASE_URL) return { dialect: 'sqlite', storage: SQLITE_STORAGE || './dev.sqlite', logging: false };
  if (NODE_ENV === 'production' && (DATABASE_SSL !== 'true' || DATABASE_SSL_REJECT_UNAUTHORIZED === 'false')) {
    throw new Error('In production DATABASE_SSL=true is required and certificate checks cannot be turned off, use DATABASE_SSL_CA instead');
  }
  return {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    ...(DATABASE_SSL === 'true' && { dialectOptions: { ssl: { require: true, rejectUnauthorized: DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false', ...(DATABASE_SSL_CA && { ca: readFileSync(DATABASE_SSL_CA, 'utf8') }) } } }),
  };
};

// One config for every environment: tests override SQLITE_STORAGE.
module.exports = { development: fromEnv(), test: fromEnv(), production: fromEnv() };
```

## Приложение Б (обязательное) Листинг файла index.js модели

```js
const { Sequelize } = require('sequelize');
const { defineDiagram } = require('./diagram');
const { defineRequestLog } = require('./request-log');
const allConfigs = require('../../config/config');

// Builds the connection from config/config.js; NODE_ENV picks the block.
const createModels = (config = allConfigs[process.env.NODE_ENV || 'development']) => {
  const { use_env_variable: urlVariable, ...options } = config;
  const sequelize = urlVariable ? new Sequelize(process.env[urlVariable], options) : new Sequelize(options);
  return { sequelize, Diagram: defineDiagram(sequelize), RequestLog: defineRequestLog(sequelize) };
};

module.exports = { createModels };
```

## Приложение В (обязательное) Листинг файла diagram.js

```js
const { DataTypes } = require('sequelize');
const { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY, LIMITS } = require('./diagram.constants');

// The table is created by migrations, never by sequelize.sync().
const defineDiagram = (sequelize) =>
  sequelize.define('Diagram', {
    title: { type: DataTypes.STRING(LIMITS.title), allowNull: false, validate: { len: [1, LIMITS.title] } },
    notation: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [NOTATIONS] } },
    sourceCode: { type: DataTypes.TEXT, allowNull: false, validate: { len: [1, LIMITS.sourceCode] } },
    priority: { type: DataTypes.STRING(10), allowNull: false, defaultValue: DEFAULT_PRIORITY, validate: { isIn: [PRIORITIES] } },
    owner: { type: DataTypes.STRING(LIMITS.owner), allowNull: false, validate: { len: [1, LIMITS.owner] } },
  });

module.exports = { defineDiagram };
```

## Приложение Г (обязательное) Листинг миграции создания таблицы

```js
// A migration is a snapshot, so the allowed values and limits are copied here instead of imported.
const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];
const LIMITS = { title: 80, owner: 60 };

module.exports = {
  async up(queryInterface, Sequelize) {
    const { fn, col, where, Op } = Sequelize;
    await queryInterface.createTable('Diagrams', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      title: { allowNull: false, type: Sequelize.STRING(LIMITS.title) },
      notation: { allowNull: false, type: Sequelize.STRING(10) },
      sourceCode: { allowNull: false, type: Sequelize.TEXT },
      owner: { allowNull: false, type: Sequelize.STRING(LIMITS.owner) },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addConstraint('Diagrams', {
      type: 'check',
      fields: ['notation'],
      name: 'diagrams_notation_check',
      where: { notation: { [Op.in]: NOTATIONS } },
    });
    // The API trims and checks every text, these checks keep the table clean for any other writer (SQLite does not enforce VARCHAR length).
    for (const column of ['title', 'owner', 'sourceCode']) {
      await queryInterface.addConstraint('Diagrams', {
        type: 'check',
        fields: [column],
        name: `diagrams_${column}_not_blank`,
        where: where(fn('length', fn('trim', col(column))), { [Op.gt]: 0 }),
      });
    }
    for (const column of ['title', 'owner']) {
      await queryInterface.addConstraint('Diagrams', {
        type: 'check',
        fields: [column],
        name: `diagrams_${column}_length`,
        where: where(fn('length', col(column)), { [Op.lte]: LIMITS[column] }),
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Diagrams');
  },
};
```

## Приложение Д (обязательное) Листинг миграции добавления поля priority

```js
const PRIORITIES = ['low', 'normal', 'high'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Diagrams', 'priority', {
      allowNull: false,
      type: Sequelize.STRING(10),
      defaultValue: 'normal',
    });
    await queryInterface.addConstraint('Diagrams', {
      type: 'check',
      fields: ['priority'],
      name: 'diagrams_priority_check',
      where: { priority: { [Sequelize.Op.in]: PRIORITIES } },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('Diagrams', 'diagrams_priority_check');
    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      // The generic removeColumn rebuilds a SQLite table from its columns only and loses every CHECK,
      // while the native DROP COLUMN (SQLite 3.35+) leaves the rest of the table as it was.
      await queryInterface.sequelize.query('ALTER TABLE `Diagrams` DROP COLUMN `priority`');
    } else {
      await queryInterface.removeColumn('Diagrams', 'priority');
    }
  },
};
```

## Приложение Е (обязательное) Листинг сида demo-diagrams.js

```js
// Every seeded row has this owner, so the seed can tell its rows from the ones users created.
const MARKER = 'demo';

const ROWS = [
  { title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> check -> pay -> ship', priority: 'high' },
  { title: 'Billing schema', notation: 'ERD', sourceCode: 'entity Invoice { id; total }', priority: 'normal' },
  { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server: login', priority: 'low' },
];

// Idempotent per row: a row that is already there is left alone, a deleted one comes back, nothing is duplicated.
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    for (const row of ROWS) {
      const exists = await queryInterface.rawSelect('Diagrams', { where: { owner: MARKER, title: row.title } }, ['id']);
      if (!exists) await queryInterface.bulkInsert('Diagrams', [{ ...row, owner: MARKER, createdAt: now, updatedAt: now }]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Diagrams', { owner: MARKER, title: { [Sequelize.Op.in]: ROWS.map((row) => row.title) } });
  },
};
```

## Приложение Ж (обязательное) Листинг файла diagrams.controller.js

```js
const { notFound } = require('../errors');
const { parseListQuery } = require('../middleware/list-query');

const missing = (id) => notFound(`Diagram ${id} not found`);

const SORTABLE = ['id', 'title', 'notation', 'priority', 'owner', 'createdAt'];

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram }) => ({
  // ?limit=&offset=&sort=&order= (see list-query.js). The answer stays an array, the full size comes in X-Total-Count.
  list: async (req, res) => {
    const { limit, offset, sort, order } = parseListQuery(req.query, SORTABLE);
    const { count, rows } = await Diagram.findAndCountAll({ order: [[sort, order.toUpperCase()], ['id', 'ASC']], limit, offset });
    res.set('X-Total-Count', String(count));
    res.json(rows);
  },

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

## Приложение И (обязательное) Листинг файла list-query.js

```js
const { badRequest } = require('../errors');

// Limits of the list query. The page size is capped so one request cannot ask for the whole table,
// and the numbers are read as short digit strings, so 1e9, -1, 0x10 or a huge value are refused with 400.
const MAX_LIMIT = 100;
const MAX_OFFSET = 1000000;
const ORDERS = ['asc', 'desc'];

// Reads ?limit=, ?offset=, ?sort= and ?order= from req.query.
// sortable: the field names a client may sort by (a whitelist, so a field name never reaches the database unchecked).
// Without limit the whole list is returned (the clients of the earlier labs expect that), without sort the order is by id.
// A bad value throws the 400 error with the list of problems, Express 5 passes it to the error handler.
const parseListQuery = (query, sortable) => {
  const problems = [];
  const integer = (name, min, max) => {
    const value = query[name];
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !/^\d{1,9}$/.test(value) || Number(value) < min || Number(value) > max) {
      problems.push({ field: name, message: `${name} must be an integer from ${min} to ${max}` });
      return undefined;
    }
    return Number(value);
  };
  const limit = integer('limit', 1, MAX_LIMIT);
  const offset = integer('offset', 0, MAX_OFFSET) ?? 0;

  const sort = query.sort ?? 'id';
  if (typeof sort !== 'string' || !sortable.includes(sort)) {
    problems.push({ field: 'sort', message: `sort must be one of: ${sortable.join(', ')}` });
  }
  const order = typeof query.order === 'string' ? query.order.toLowerCase() : (query.order ?? 'asc');
  if (!ORDERS.includes(order)) problems.push({ field: 'order', message: 'order must be asc or desc' });

  if (problems.length) throw badRequest('Invalid list query', problems);
  return { limit, offset, sort, order };
};

module.exports = { parseListQuery, MAX_LIMIT, MAX_OFFSET };
```
