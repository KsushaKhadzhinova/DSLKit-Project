# Lab 2. Databases and the Sequelize ORM

## 1 Purpose of the Work

To learn how to connect a relational database to a Node.js application, use the Sequelize ORM to define models and run CRUD operations, and work with migrations and seeds. The work continues lab 1 for DSLKit, a web editor for diagrams as code that fits the SaaS direction: the `diagrams` collection moves from an in-memory array into a database.

## 2 Brief Theory

**ORM.** Object-Relational Mapping links the tables of a relational database to objects of the language. A Sequelize model describes a table and its columns, and the methods `findAll`, `findByPk`, `create`, `update` and `destroy` turn into SQL queries. Advantages: the code does not depend on the SQL dialect, values are bound safely, and validation sits next to the model. Drawbacks: complex queries have to be expressed through the library API, and hidden queries are easy to miss.

**Migrations and seeds.** A migration is a file with two functions: `up` changes the schema and `down` reverts the change. Applied migrations are recorded in a service table, so the schema is reproduced on any machine with one command and evolves step by step. A seed fills tables with initial data and has `up` and `down` too.

**Dialects.** Sequelize talks to PostgreSQL, SQLite, MySQL and other databases through drivers. PostgreSQL needs the packages `pg` and `pg-hstore`, SQLite needs `sqlite3`. A `DATABASE_URL` connection string points the application at a cloud service such as Neon or Supabase without code changes.

## 3 Work Progress

### 3.1 Database

PostgreSQL is not installed on the developer machine, and installing system software is not required for a study project, so SQLite is used for local runs: the database file creates itself. The choice is made in `config/config.js`. If the `DATABASE_URL` variable is set, PostgreSQL is used (with `DATABASE_SSL=true` TLS is added for Neon and Supabase), otherwise SQLite with the file from `SQLITE_STORAGE`. Migrations, the model and controllers do not depend on the dialect. A connection to a real PostgreSQL has not been verified in this work yet, and it remains to be done before submission. A template of the variables is in `.env.example`, and the real `.env` is not committed.

### 3.2 Installation and setup

The packages `sequelize`, `pg`, `pg-hstore`, `sqlite3` and, as a development dependency, `sequelize-cli` are installed. The `.sequelizerc` file points the tool at the `migrations` and `seeders` folders and the config file, so `npx sequelize-cli` commands use the same connection settings as the application. The `package.json` file has the scripts `db:migrate`, `db:migrate:undo`, `db:seed`, `db:seed:undo` and `db:reset`.

### 3.3 Model and migrations

The `Diagram` model is defined in `src/models/diagram.js`: the fields `title`, `notation`, `sourceCode`, `priority` and `owner`, while Sequelize adds `id`, `createdAt` and `updatedAt` itself. The allowed values of `notation` and `priority` are set with an `isIn` check, so the model refuses a value outside the list even if request validation is bypassed. Sequelize derives the table name from the model name in the plural, which gives `Diagrams`.

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

There are 18 automated tests. Fourteen check the HTTP routes on a temporary SQLite database with the real migrations applied. Four check the migrations themselves: the set of columns after both migrations, rolling back the second migration to drop `priority` and applying it again, inserting and reverting the seed, and the model refusing values outside the lists. The tests run the real `sequelize-cli`, so a mistake in a migration file is caught.

## Conclusion

For DSLKit, the `diagrams` collection from lab 1 is moved from an array to a database through Sequelize: the `Diagram` model, two migrations (creating the table and adding the `priority` field), a seed with three diagrams, and controllers built on ORM methods. Locally the work uses SQLite, and the `DATABASE_URL` variable switches it to PostgreSQL or cloud Neon without code changes. 18 automated tests confirm the routes, the migrations with rollback, and the seed. Running on a real PostgreSQL and attaching screenshots of the database structure and of Postman requests are still to be done.

## Appendix A – Listing of config.js

{{code:part-2/lab-02-sequelize/config/config.js}}

## Appendix B – Listing of the model index.js

{{code:part-2/lab-02-sequelize/src/models/index.js}}

## Appendix C – Listing of diagram.js

{{code:part-2/lab-02-sequelize/src/models/diagram.js}}

## Appendix D – Listing of the table creation migration

{{code:part-2/lab-02-sequelize/migrations/20261016000001-create-diagrams.js}}

## Appendix E – Listing of the priority migration

{{code:part-2/lab-02-sequelize/migrations/20261016000002-add-priority-to-diagrams.js}}

## Appendix F – Listing of the demo-diagrams.js seed

{{code:part-2/lab-02-sequelize/seeders/20261016000001-demo-diagrams.js}}

## Appendix G – Listing of diagrams.controller.js

{{code:part-2/lab-02-sequelize/src/controllers/diagrams.controller.js}}
