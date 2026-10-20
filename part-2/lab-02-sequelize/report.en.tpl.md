# Lab 2. Databases and the Sequelize ORM

## 1 Purpose of the Work

To learn how to connect a relational database to a Node.js application, use the Sequelize ORM to define models and run CRUD operations, and work with migrations and seeds. The work continues lab 1 for DSLKit, a web editor for diagrams as code that fits the SaaS direction: the `diagrams` collection moves from an in-memory array into a database.

## 2 Brief Theory

**ORM.** Object-Relational Mapping links the tables of a relational database to objects of the language. A Sequelize model describes a table and its columns, and the methods `findAll`, `findByPk`, `create`, `update` and `destroy` turn into SQL queries. Advantages: the code does not depend on the SQL dialect, values are bound safely, and validation sits next to the model. Drawbacks: complex queries have to be expressed through the library API, and hidden queries are easy to miss.

**Migrations and seeds.** A migration is a file with two functions: `up` changes the schema and `down` reverts the change. Applied migrations are recorded in a service table, so the schema is reproduced on any machine with one command and evolves step by step. A seed fills tables with initial data and has `up` and `down` too.

**Dialects.** Sequelize talks to PostgreSQL, SQLite, MySQL and other databases through drivers. PostgreSQL needs the packages `pg` and `pg-hstore`, SQLite needs `sqlite3`. A `DATABASE_URL` connection string points the application at a cloud service such as Neon or Supabase without code changes.

## 3 Work Progress

### 3.1 Database

PostgreSQL is not installed on the developer machine, and installing system software is not required for a study project, so SQLite is used for local runs: the database file creates itself. The choice is made in `config/config.js`. If the `DATABASE_URL` variable is set, PostgreSQL is used (with `DATABASE_SSL=true` TLS is enabled for Neon and Supabase and the server certificate is verified, and verification can only be switched off with `DATABASE_SSL_REJECT_UNAUTHORIZED=false`), otherwise SQLite with the file from `SQLITE_STORAGE`. Migrations, the model and controllers do not depend on the dialect. The work has not been run against a real PostgreSQL: SQLite and the PostgreSQL settings are tested, and the rest relies on Sequelize hiding dialect differences. A template of the variables is in `.env.example`, and the real `.env` is not committed.

### 3.2 Installation and setup

The packages `sequelize`, `pg`, `pg-hstore`, `sqlite3` and, as a development dependency, `sequelize-cli` are installed. The `.sequelizerc` file points the tool at the `migrations` and `seeders` folders and the config file, so `npx sequelize-cli` commands use the same connection settings as the application. The `package.json` file has the scripts `db:migrate`, `db:migrate:undo`, `db:seed`, `db:seed:undo` and `db:reset`.

### 3.3 Model and migrations

The `Diagram` model is defined in `src/models/diagram.js`: the fields `title`, `notation`, `sourceCode`, `priority`, `owner`, the numeric `revision` and the foreign key `projectId`, while Sequelize adds `id`, `createdAt` and `updatedAt` itself. The allowed values of `notation` and `priority` are set with an `isIn` check in the model and `CHECK` constraints in the migrations, so the database refuses a value outside the list even if both request validation and the model are bypassed. Lengths match the column types: `title` up to 80 characters, `owner` up to 60, `sourceCode` up to 10000, and `title` and `owner` are trimmed before saving. An id in the address cannot exceed 2147483647, otherwise PostgreSQL would fail with a 500 response. The request body is limited to 100kb. Sequelize derives the table name from the model name in the plural, which gives `Diagrams`.

The schema is created only by migrations, and `sync()` is not used. The first migration creates the table without the `priority` field, and the second adds it with `addColumn` and the default `normal`. Its `down` function drops the column. This shows a change to the schema of an existing table, as the assignment requires. The third migration creates the request log, the fourth adds the numeric column `revision`, and the fifth creates the `Projects` table and the `projectId` column. The files are listed in table 1.

Table 1 – Database files

| File                                                    | Purpose                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `migrations/20261016000001-create-diagrams.js`          | Creates the Diagrams table with id, title, notation, sourceCode, owner, createdAt, updatedAt |
| `migrations/20261016000002-add-priority-to-diagrams.js` | Adds the priority column, the rollback drops it                                              |
| `migrations/20261016000004-add-revision-to-diagrams.js` | Adds the revision column checked from 0 to 100000, the rollback drops it                     |
| `migrations/20261016000005-create-projects.js`          | Creates the Projects table with a unique name and the projectId column that points to it     |
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

There are 96 automated tests. Some check the HTTP routes on a temporary SQLite database with the real migrations applied, including `PATCH`, the numeric field, projects and the uniqueness error. Others check the migrations themselves: the set of columns, rolling back every migration in turn while all `CHECK` constraints stay, running the seed twice and undoing only its own rows, the model and the database refusing values outside the lists, a negative or huge number and a repeated project name. The rest check the connection settings, including certificate verification by default. The tests run the real `sequelize-cli`, so a mistake in a migration file is caught.

Listing of config.js is given in appendix A. Listing of the model index.js is given in appendix B. Listing of diagram.js is given in appendix C. Listing of the table creation migration is given in appendix D. Listing of the priority migration is given in appendix E. Listing of the demo-diagrams.js seed is given in appendix F. Listing of diagrams.controller.js is given in appendix G. Listing of the revision migration is given in appendix I. Listing of the Projects table migration is given in appendix J. Listing of projects.controller.js is given in appendix K.

### 3.6 Paging and sorting

The list accepts the `limit`, `offset`, `sort` and `order` parameters. `limit` sets the page size from 1 to 100, `offset` sets the shift from 0 to 1000000, `sort` picks a field from a whitelist and `order` takes `asc` or `desc`. Without parameters the whole list is returned in ascending `id` order, so the clients of the earlier works keep working. The answer stays an array and the full size of the selection comes in the `X-Total-Count` header. Numbers are read as strings of at most nine digits, so `-1`, `1e9`, `0x10` and huge numbers get a 400 answer with a list of errors by field. The sort field name is checked against the whitelist and never reaches the database query unchecked. Equal values are ordered by `id`, so pages do not overlap. Parsing of the parameters is moved to a separate module, it is given in Appendix H.

### 3.7 The numeric field revision

The `revision` field holds the revision number of a diagram and shows how a number travels from the database to the response. In the database the column is an `INTEGER` with the default 0 and a `CHECK` from 0 to 100000, in the model the same rule is set with the `isInt`, `min` and `max` validators, and the limit `revisionMax` lives in `limits.json`. A request is checked before the database: only a whole number from 0 to the limit is accepted. The string `"5"`, a fraction, a negative number, `null`, an array and a number above the limit get a 400 response with the `revision` field in the error list. JSON cannot hold `1e999`, it parses to infinity and the same rule rejects it, while values such as `1e20` and `9007199254740993` exceed the limit. Without the field in the body the value is 0. The list can be sorted by `revision`, and numbers compare as numbers, not as strings.

### 3.8 The PATCH method

The `PATCH /diagrams/:id` route changes only the fields that are sent. The check lives in `validatePartial`: every sent field goes through the same rule as in `POST` and `PUT`, and a body without a single known field gives 400. The controller reads the record with `findByPk`, calls `diagram.update(fields)` and returns the updated record, so the model validators run too. The `PUT` method replaces the record as a whole: omitted optional fields get their defaults, and `projectId` is reset to `null`. The `PATCH` method leaves omitted fields untouched. That is why `PUT` is idempotent, while `PATCH` does not have to be by definition.

### 3.9 One-to-many relation and the uniqueness error

One project holds many diagrams, and a diagram belongs to at most one project. The `Project` model is defined in `src/models/project.js`, and the relation is set in `src/models/index.js` with `Project.hasMany(Diagram)` and `Diagram.belongsTo(Project)` using the foreign key `projectId`. In the migration the `projectId` column references `Projects.id` with the rule `ON DELETE SET NULL`: when a project is deleted, its diagrams stay and their `projectId` is cleared. A diagram can name only an existing project, otherwise the controller answers 400 with the `projectId` field, and the foreign key protects the table from writes that bypass the application. The project routes are shown in table 3.

Table 3 – Routes of the projects resource

| Route                        | Purpose                                                                  | Response         |
| ---------------------------- | ------------------------------------------------------------------------ | ---------------- |
| `GET /projects`              | List of projects with paging and sorting                                 | 200              |
| `POST /projects`             | Create a project with a unique name                                      | 201, 400 or 409  |
| `GET /projects/:id`          | One project                                                              | 200 or 404       |
| `GET /projects/:id/diagrams` | Diagrams of the project with the same `limit`, `offset`, `sort` parameters | 200 or 404       |
| `DELETE /projects/:id`       | Delete a project without deleting its diagrams                           | 204 or 404       |

The project name is unique: the `name` column is created with a `UNIQUE` constraint. A repeated name breaks it, Sequelize throws `SequelizeUniqueConstraintError`, and the global handler turns it into a 409 response with the `name` field in `details`. Checking with a `findOne` query before writing is not enough, because two simultaneous requests would both pass it, so the database constraint has the last word.

### 3.10 How to trigger a 500 response with a real failure

A 500 response is caused by a database failure, not by a button. For SQLite, start the server with `npm start`, then run `npx sequelize-cli db:migrate:undo:all` in a second window. The tables vanish under the running server, and the very first request, for example `GET /diagrams`, cannot write a row to the `RequestLogs` log. The client gets 500 with the body `{ "error": "Internal server error" }`, and the details stay only in the server console. For PostgreSQL it is enough to stop the database service or container: requests give 500, and `GET /health` answers 503. The command `npm run db:migrate` or starting the database restores the work. The same failure is reproduced in an automated test by dropping the `RequestLogs` table while the server runs.

### 3.11 Answers to the control questions

5. How do you implement a one-to-many relation between models? Give an example from your project.

   The parent model calls `hasMany`, the child model calls `belongsTo`, and both name the same foreign key. In the project one `Project` has many `Diagram` records: `Project.hasMany(Diagram, { foreignKey: 'projectId', onDelete: 'SET NULL' })` and `Diagram.belongsTo(Project, { foreignKey: 'projectId' })`. The migration creates the `projectId` column that references `Projects.id`, and the association only tells Sequelize about it. After that the methods `project.getDiagrams()` and `diagram.getProject()` are available, as well as loading in one query with `include`. In the API this is the route `GET /projects/:id/diagrams`.

6. How do you paginate (limit, offset) in Sequelize?

   The method `findAndCountAll({ limit, offset, order })` returns the page in `rows` and the total number of records in `count`. In the work `count` goes to the client in the `X-Total-Count` header. An order is required, otherwise pages may overlap, so equal values are sorted by `id`. Page number `n` starts at the offset `(n - 1) * limit`. The page size is capped at 100, and `limit` and `offset` are read as short digit strings, so `-1` and huge numbers give 400. On very large tables a big offset is slow, and then paging by the last seen `id` is used.

7. How do you handle a uniqueness error (duplicate entry) when creating a record?

   Uniqueness is set with a `UNIQUE` constraint in the migration and `unique: true` in the model. A violation raises `SequelizeUniqueConstraintError`, whose `errors[0].path` holds the field name. It is caught in the error handler and answered with 409 Conflict rather than 500, because the fault is a repeated value, not the database. In the work `POST /projects` answers this way for a name that is already taken. A preliminary `findOne` does not replace the constraint: another request can slip in between the check and the write.

## Conclusion

For DSLKit, the `diagrams` collection from lab 1 is moved from an array to a database through Sequelize: the `Diagram` model, a seed with three diagrams, and controllers built on ORM methods. The `Diagram` and `Project` models have a one-to-many relation, and five migrations build the schema. The `PATCH` method, the 409 response for a repeated project name and the check of a number from 0 to the limit are added. Locally the work uses SQLite, and the `DATABASE_URL` variable switches it to PostgreSQL or cloud Neon without code changes. 96 automated tests confirm the routes, the constraints, the migrations with rollback, and the seed. The work has not been run on a real PostgreSQL, and screenshots of the database structure and of Postman requests are still to be attached.

## Appendix A (mandatory) Listing of config.js

{{code:part-2/lab-02-sequelize/config/config.js}}

## Appendix B (mandatory) Listing of the model index.js

{{code:part-2/lab-02-sequelize/src/models/index.js}}

## Appendix C (mandatory) Listing of diagram.js

{{code:part-2/lab-02-sequelize/src/models/diagram.js}}

## Appendix D (mandatory) Listing of the table creation migration

{{code:part-2/lab-02-sequelize/migrations/20261016000001-create-diagrams.js}}

## Appendix E (mandatory) Listing of the priority migration

{{code:part-2/lab-02-sequelize/migrations/20261016000002-add-priority-to-diagrams.js}}

## Appendix F (mandatory) Listing of the demo-diagrams.js seed

{{code:part-2/lab-02-sequelize/seeders/20261016000001-demo-diagrams.js}}

## Appendix G (mandatory) Listing of diagrams.controller.js

{{code:part-2/lab-02-sequelize/src/controllers/diagrams.controller.js}}

## Appendix H (mandatory) Listing of list-query.js

{{code:part-2/lab-02-sequelize/src/middleware/list-query.js}}

## Appendix I (mandatory) Listing of the revision migration

{{code:part-2/lab-02-sequelize/migrations/20261016000004-add-revision-to-diagrams.js}}

## Appendix J (mandatory) Listing of the Projects table migration

{{code:part-2/lab-02-sequelize/migrations/20261016000005-create-projects.js}}

## Appendix K (mandatory) Listing of projects.controller.js

{{code:part-2/lab-02-sequelize/src/controllers/projects.controller.js}}
