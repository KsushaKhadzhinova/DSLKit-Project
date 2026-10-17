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

The `Diagram` model is defined in `src/models/diagram.js`: the fields `title`, `notation`, `sourceCode`, `priority` and `owner`, while Sequelize adds `id`, `createdAt` and `updatedAt` itself. The allowed values of `notation` and `priority` are set with an `isIn` check in the model and `CHECK` constraints in the migrations, so the database refuses a value outside the list even if both request validation and the model are bypassed. Lengths match the column types: `title` up to 80 characters, `owner` up to 60, `sourceCode` up to 10000, and `title` and `owner` are trimmed before saving. An id in the address cannot exceed 2147483647, otherwise PostgreSQL would fail with a 500 response. The request body is limited to 100kb. Sequelize derives the table name from the model name in the plural, which gives `Diagrams`.

The schema is created only by migrations, and `sync()` is not used. The first migration creates the table without the `priority` field, and the second adds it with `addColumn` and the default `normal`. Its `down` function drops the column. This shows a change to the schema of an existing table, as the assignment requires. The files are listed in table 1.

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

Listing of config.js is given in appendix A. Listing of the model index.js is given in appendix B. Listing of diagram.js is given in appendix C. Listing of the table creation migration is given in appendix D. Listing of the priority migration is given in appendix E. Listing of the demo-diagrams.js seed is given in appendix F. Listing of diagrams.controller.js is given in appendix G.

### 3.6 Paging and sorting

The list accepts the `limit`, `offset`, `sort` and `order` parameters. `limit` sets the page size from 1 to 100, `offset` sets the shift from 0 to 1000000, `sort` picks a field from a whitelist and `order` takes `asc` or `desc`. Without parameters the whole list is returned in ascending `id` order, so the clients of the earlier works keep working. The answer stays an array and the full size of the selection comes in the `X-Total-Count` header. Numbers are read as strings of at most nine digits, so `-1`, `1e9`, `0x10` and huge numbers get a 400 answer with a list of errors by field. The sort field name is checked against the whitelist and never reaches the database query unchecked. Equal values are ordered by `id`, so pages do not overlap. Parsing of the parameters is moved to a separate module, it is given in Appendix H.

## Conclusion

For DSLKit, the `diagrams` collection from lab 1 is moved from an array to a database through Sequelize: the `Diagram` model, two migrations (creating the table and adding the `priority` field), a seed with three diagrams, and controllers built on ORM methods. Locally the work uses SQLite, and the `DATABASE_URL` variable switches it to PostgreSQL or cloud Neon without code changes. 32 automated tests confirm the routes, the constraints, the migrations with rollback, and the seed. The work has not been run on a real PostgreSQL, and screenshots of the database structure and of Postman requests are still to be attached.

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
