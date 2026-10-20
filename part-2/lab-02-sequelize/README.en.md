# Part 2. Lab 2. Databases and the Sequelize ORM

The DSLKit project (diagrams as code, SaaS). Assignment: `materials/text/part-2/Модуль 01…/37. Лабораторная работа 2…`. The work continues [lab 1](../lab-01-node-server): the same `/diagrams` routes, but the data is kept by a database through Sequelize instead of an in-memory array. Reports: [`report.md`](report.md) in Russian, [`report.en.md`](report.en.md) in English (templates `report.tpl.md`, `report.en.tpl.md`; built with `node tools/build.js part-2/lab-02-sequelize` from the repository root). The Russian version of this file is [`README.md`](README.md).

## 1 Database: SQLite or PostgreSQL

PostgreSQL is not installed on this machine, so by default the work uses **SQLite** (the file `dev.sqlite`, nothing to install). The code is the same: Sequelize picks the driver from the settings in `config/config.js`.

| Mode                       | How to switch it on                                                                                                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQLite (default)           | Do nothing; the file is set by `SQLITE_STORAGE` (`./dev.sqlite` by default)                                                                                                                                                                  |
| PostgreSQL, Neon, Supabase | Set `DATABASE_URL=postgres://user:password@host:5432/dslkit` in `.env`; for Neon and Supabase add `DATABASE_SSL=true` (the server certificate is verified; the check can be switched off only with `DATABASE_SSL_REJECT_UNAUTHORIZED=false`) |

An example for a local PostgreSQL: create a database and a user (`createdb dslkit`), put the connection string into `.env` (the file does not go into the repository) and run the same `npm run db:migrate` and `npm run db:seed`. Work with a real PostgreSQL **was not checked**: SQLite and the building of the PostgreSQL settings were checked. To move to PostgreSQL or Neon it is enough to set `DATABASE_URL` and run `npm run db:migrate`; the code does not change.

## 2 Running

Node.js 22 or newer is required.

```bash
cd part-2/lab-02-sequelize
npm install
cp .env.example .env     # optional
npm run db:migrate       # create the tables, add priority, revision, projectId
npm run db:seed          # three demo diagrams
npm run dev              # nodemon; npm start for a plain start
npm test                 # tests
```

Database commands: `db:migrate:undo` rolls back the last migration, `db:seed:undo` removes the demo data, `db:reset` recreates everything from scratch.

## 3 What changed compared with lab 1

| Path                                            | Purpose                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `config/config.js`, `.sequelizerc`              | Connection settings for the application and for `sequelize-cli`                                              |
| `migrations/…-create-diagrams.js`               | Creates the `Diagrams` table (without the `priority` field)                                                  |
| `migrations/…-add-priority-to-diagrams.js`      | Adds the `priority` column with `addColumn`, the rollback drops it                                           |
| `migrations/…-add-revision-to-diagrams.js`      | A numeric `revision` column with a `CHECK` from 0 to 100000                                                  |
| `migrations/…-create-projects.js`               | The `Projects` table with a unique name and the foreign key `Diagrams.projectId`                             |
| `src/models/project.js`                         | The project model, the one-to-many link is set in `src/models/index.js`                                      |
| `seeders/…-demo-diagrams.js`                    | Initial data                                                                                                 |
| `src/models/diagram.js`, `diagram.constants.js` | The Sequelize model and the allowed field values                                                             |
| `src/models/index.js`                           | `createModels(config)`: creates the connection and the models                                                |
| `src/controllers/diagrams.controller.js`        | Calls of `findAll`, `findByPk`, `create`, `update`, `destroy` instead of the array                           |
| `tests/`                                        | HTTP tests on a temporary SQLite database and tests of migrations and seeds through the real `sequelize-cli` |

Routes, data validation, the error format and the response codes stay as in lab 1. Responses now contain the fields `createdAt` and `updatedAt`. The table is created only by migrations, `sequelize.sync()` is not used.

## 4 Checking

`npm test` runs 98 tests: each check works with a temporary SQLite file on which the real migrations and seeds run. The same run includes the check of the report build and formatting (`report.test.mjs`).

A known remark: `npm audit` shows vulnerabilities in the `nodemon` and `sequelize-cli` chains (development tools). The production run does not use them.

## 5 New in this version: PATCH, the number revision, projects

**PUT and PATCH.** `PUT /diagrams/:id` replaces the record as a whole (a skipped optional field gets its default value, and `projectId` is reset to `null`). `PATCH /diagrams/:id` changes only the sent fields, each one is checked as in `POST`, and an empty body or a body without known fields gives 400. `PUT` is idempotent, while `PATCH` by definition does not have to be.

**The number `revision`.** An integer from 0 to 100000 (the limit `revisionMax` in `limits.json`). Strings, fractions, negative numbers, `null`, `1e999` and numbers above the limit give 400. The same range stands in the model and in the migration `CHECK`. The list can be sorted by this field: `GET /diagrams?sort=revision&order=desc`.

**Projects (one-to-many).** `Project.hasMany(Diagram)`, `Diagram.belongsTo(Project)`, the foreign key `projectId` with `ON DELETE SET NULL`. Routes: `GET /projects`, `POST /projects`, `GET /projects/:id`, `GET /projects/:id/diagrams`, `DELETE /projects/:id`. A project name is unique: a repeat gives **409** (the `SequelizeUniqueConstraintError` error is turned into a response in `error-handler.js`). A diagram with a non-existent `projectId` gets 400.

## 6 Limits, the log and security

Length limits and the body size are in [`limits.json`](limits.json), and the migrations carry CHECK constraints on empty values and length. Every request is written to the `RequestLogs` table (the even variant), and when the write fails the client gets 500. A body that is not JSON gives 415, `OPTIONS` answers 204, and security headers are set on every answer. For TLS with your own certificate authority set `DATABASE_SSL_CA`; in production the certificate check cannot be switched off. Details are in [`AUDIT.md`](AUDIT.md).

## 7 How to cause a 500 with a real failure

The 500 answer is caused by a database failure, not by a button.

- SQLite: run `npm start`, and in a second window run `npx sequelize-cli db:migrate:undo:all`. The tables vanish under the running server, the very first request (`GET /diagrams`) cannot write a row to `RequestLogs` and gets 500 with the body `{ "error": "Internal server error" }`, the details appear only in the server console (`GET /health` stays 200 with SQLite). To restore work: `npm run db:migrate`.
- PostgreSQL (Neon, Supabase or local): stop the database service or container, requests give 500, and `GET /health` answers 503.
- A start with an unreachable database (`SQLITE_STORAGE=/no/such/dir/db.sqlite npm start`) ends with exit code 1 and a message, and the server does not come up.
