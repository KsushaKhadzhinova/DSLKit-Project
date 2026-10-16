# Lab 2. Databases and the Sequelize ORM

## 1 Purpose of the Work

To learn how to connect a relational database to a Node.js application, use the Sequelize ORM to define models and run CRUD operations, and work with migrations and seeds. The work continues lab 1 for DSLKit, a web editor for diagrams as code that fits the SaaS direction: the `diagrams` collection moves from an in-memory array into a database.

## 2 Brief Theory

**ORM.** Object-Relational Mapping links the tables of a relational database to objects of the language. A Sequelize model describes a table and its columns, and the methods `findAll`, `findByPk`, `create`, `update` and `destroy` turn into SQL queries. Advantages: the code does not depend on the SQL dialect, values are bound safely, and validation sits next to the model. Drawbacks: complex queries have to be expressed through the library API, and hidden queries are easy to miss.

**Migrations and seeds.** A migration is a file with two functions: `up` changes the schema and `down` reverts the change. Applied migrations are recorded in a service table, so the schema is reproduced on any machine with one command and evolves step by step. A seed fills tables with initial data and has `up` and `down` too.

**Dialects.** Sequelize talks to PostgreSQL, SQLite, MySQL and other databases through drivers. PostgreSQL needs the packages `pg` and `pg-hstore`, SQLite needs `sqlite3`. A `DATABASE_URL` connection string points the application at a cloud service such as Neon or Supabase without code changes.

## 3 Work Progress

### 3.1 Database

PostgreSQL is not installed on the developer machine, and installing system software is not required for a study project, so SQLite is used for local runs: the database file creates itself. The choice is made in `config/config.js`. If the `DATABASE_URL` variable is set, PostgreSQL is used (with `DATABASE_SSL=true` TLS is enabled for Neon and Supabase and the server certificate is verified; verification can only be switched off with `DATABASE_SSL_REJECT_UNAUTHORIZED=false`), otherwise SQLite with the file from `SQLITE_STORAGE`. Migrations, the model and controllers do not depend on the dialect. The work has not been run against a real PostgreSQL: SQLite and the PostgreSQL settings are tested, and the rest relies on Sequelize hiding dialect differences. A template of the variables is in `.env.example`, and the real `.env` is not committed.

### 3.2 Installation and setup

The packages `sequelize`, `pg`, `pg-hstore`, `sqlite3` and, as a development dependency, `sequelize-cli` are installed. The `.sequelizerc` file points the tool at the `migrations` and `seeders` folders and the config file, so `npx sequelize-cli` commands use the same connection settings as the application. The `package.json` file has the scripts `db:migrate`, `db:migrate:undo`, `db:seed`, `db:seed:undo` and `db:reset`.

### 3.3 Model and migrations

The `Diagram` model is defined in `src/models/diagram.js`: the fields `title`, `notation`, `sourceCode`, `priority` and `owner`, while Sequelize adds `id`, `createdAt` and `updatedAt` itself. The allowed values of `notation` and `priority` are set with an `isIn` check in the model and `CHECK` constraints in the migrations, so the database refuses a value outside the list even if both request validation and the model are bypassed. Lengths match the column types: `title` up to 80 characters, `owner` up to 60, `sourceCode` up to 10000, and `title` and `owner` are trimmed before saving. An id in the address cannot exceed 2147483647, otherwise PostgreSQL would fail with a 500 response. The request body is limited to 100kb. Sequelize derives the table name from the model name in the plural, which gives `Diagrams`.

The schema is created only by migrations, and `sync()` is not used. The first migration creates the table without the `priority` field, and the second adds it with `addColumn` and the default `normal`; its `down` function drops the column. This shows a change to the schema of an existing table, as the assignment requires. The files are listed in table 1.

Table 1 – Database files

| File                                                    | Purpose                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `migrations/20261016000001-create-diagrams.js`          | Creates the Diagrams table with id, title, notation, sourceCode, owner, createdAt, updatedAt |
| `migrations/20261016000002-add-priority-to-diagrams.js` | Adds the priority column, the rollback drops it                                              |
| `seeders/20261016000001-demo-diagrams.js`               | Inserts three demo diagrams, the rollback deletes them by title                              |
| `src/models/diagram.js`                                 | The Sequelize model                                                                          |
| `src/models/index.js`                                   | Creates the connection and the model from the settings                                       |

### 3.4 CRUD through the ORM

Routes, data validation and the error format stay as in lab 1, and only the controller layer changed. Controllers receive the model as a parameter and call Sequelize methods, as table 2 shows. The `update` method returns the number of changed rows, so zero means a 404 response, and after a successful replacement the record is read again and returned to the client. Express 5 hands a rejected promise to the global error handler, so controllers need no `try/catch`, and a database failure gives a 500 response without internal details.

Table 2 – Routes and the matching Sequelize calls

| Route                  | Sequelize call                                               | Response   |
| ---------------------- | ------------------------------------------------------------ | ---------- |
| `GET /diagrams`        | `Diagram.findAll({ order: [['id', 'ASC']] })`                | 200        |
| `GET /diagrams/:id`    | `Diagram.findByPk(id)`                                       | 200 or 404 |
| `POST /diagrams`       | `Diagram.create(fields)`                                     | 201        |
| `PUT /diagrams/:id`    | `Diagram.update(fields, { where: { id } })`, then `findByPk` | 200 or 404 |
| `DELETE /diagrams/:id` | `Diagram.destroy({ where: { id } })`                         | 204 or 404 |

### 3.5 Running and verification

The run order is: `npm run db:migrate` creates the table and adds the `priority` column, `npm run db:seed` fills the database, and `npm run dev` starts the server. The check on SQLite showed that the list returns three records with `createdAt` and `updatedAt`, a replacement changes `updatedAt`, the first deletion gives 204, and the repeated one gives 404.

There are 32 automated tests. Twenty-three check the HTTP routes on a temporary SQLite database with the real migrations applied. Five check the migrations themselves: the set of columns after both migrations, rolling back the second migration to drop `priority` and applying it again, running the seed twice and undoing only its own rows, the model refusing values outside the lists, and the database refusing such a value when the model is bypassed. Four check the connection settings, including certificate verification by default. The tests run the real `sequelize-cli`, so a mistake in a migration file is caught.

## Conclusion

For DSLKit, the `diagrams` collection from lab 1 is moved from an array to a database through Sequelize: the `Diagram` model, two migrations (creating the table and adding the `priority` field), a seed with three diagrams, and controllers built on ORM methods. Locally the work uses SQLite, and the `DATABASE_URL` variable switches it to PostgreSQL or cloud Neon without code changes. 32 automated tests confirm the routes, the constraints, the migrations with rollback, and the seed. The work has not been run on a real PostgreSQL, and screenshots of the database structure and of Postman requests are still to be attached.

## Appendix A – Listing of config.js

```js
try {
  process.loadEnvFile();
} catch {
  // .env is optional, defaults apply
}

// DATABASE_URL selects PostgreSQL, otherwise a local SQLite file is used.
// With DATABASE_SSL=true the server certificate is verified; only DATABASE_SSL_REJECT_UNAUTHORIZED=false turns that off.
const fromEnv = () => {
  const { DATABASE_URL, DATABASE_SSL, DATABASE_SSL_REJECT_UNAUTHORIZED, SQLITE_STORAGE } = process.env;
  if (!DATABASE_URL) return { dialect: 'sqlite', storage: SQLITE_STORAGE || './dev.sqlite', logging: false };
  return {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    ...(DATABASE_SSL === 'true' && { dialectOptions: { ssl: { require: true, rejectUnauthorized: DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } } }),
  };
};

// One config for every environment: tests override SQLITE_STORAGE.
module.exports = { development: fromEnv(), test: fromEnv(), production: fromEnv() };
```

## Appendix B – Listing of the model index.js

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

## Appendix C – Listing of diagram.js

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

## Appendix D – Listing of the table creation migration

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

## Appendix E – Listing of the priority migration

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

## Appendix F – Listing of the demo-diagrams.js seed

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

## Appendix G – Listing of diagrams.controller.js

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
