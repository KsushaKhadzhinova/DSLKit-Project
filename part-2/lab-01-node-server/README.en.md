# Part 2. Lab 1. A server application on Node.js

The DSLKit project (diagrams as code, SaaS). Assignment: `materials/text/part-2/Модуль 01…/36. Лабораторная работа 1…`. Reports: [`report.md`](report.md) in Russian, [`report.en.md`](report.en.md) in English (templates `report.tpl.md` and `report.en.tpl.md`, built with `node tools/build.js part-2/lab-01-node-server` from the repository root). The Russian version of this file is [`README.md`](README.md).

By the assignment the branch of this work is called `lab21`; here the work lives in the working branch of the server part, and the owner picks the branch name for submission.

## 1 What is done

A REST API for the `diagrams` resource on Express 5 with data in an in-memory array. A diagram stores `title`, `notation`, `sourceCode`, `priority`, `owner` and the creation time `createdAt`.

| Method   | Path                         | Success            | Errors                                      |
| -------- | ---------------------------- | ------------------ | ------------------------------------------- |
| `GET`    | `/diagrams`                  | 200, array         |                                             |
| `GET`    | `/diagrams/:id`              | 200, object        | 400 bad id, 404 no such diagram             |
| `POST`   | `/diagrams`                  | 201 and `Location` | 400 bad data or JSON                        |
| `PUT`    | `/diagrams/:id`              | 200, object        | 400 bad id or data, 404                     |
| `PATCH`  | `/diagrams/:id`              | 200, object        | 400 bad id, data or empty body, 404         |
| `DELETE` | `/diagrams/:id`              | 204 no body        | 400 bad id, 404 (also on a repeated delete) |
| any      | unknown path                 |                    | 404 as JSON                                 |
| other    | `/diagrams`, `/diagrams/:id` |                    | 405 and an `Allow` header                   |

Errors always look like `{ "error": "message" }`, and for bad data a `details` list of fields is added. Unexpected failures give 500 without internal details.

Fields: `title`, `sourceCode` and `owner` are non-empty strings; `notation` is one of `UML`, `BPMN`, `ERD`, `DFD`, `IDEF0`, `Petri`; `priority` is one of `low`, `normal`, `high` (optional, `normal` by default). Unknown fields are dropped, and `id` and `createdAt` are set by the server, the client cannot set them.

`createdAt` is the creation time in ISO 8601 format (`2026-10-17T09:30:00.123Z`). It is unique for every record: if two records are created in the same millisecond, the second gets a value one millisecond later. Replacement with `PUT` and an edit with `PATCH` do not change the creation time, and the list can be sorted by it: `GET /diagrams?sort=createdAt&order=desc`.

### PUT and PATCH: what is the difference

`PUT` replaces the record as a whole: all required fields must be sent, and whatever is not sent gets its default value. `PATCH` changes only the fields that were sent, and the rest stay as they were. For example, `PATCH /diagrams/1` with the body `{"priority":"high"}` changes the priority alone. Every sent field is checked as strictly as in `POST` and `PUT`, and an empty body or a body without known fields gives 400. A repeated `PUT` with the same body always leaves the same state (idempotence), while `PATCH` is not guaranteed to be idempotent by definition, for example with relative changes such as "increase by 1". This lab implements both methods.

## 2 Running

Node.js 22 or newer is required.

```bash
cd part-2/lab-01-node-server
npm install
npm run dev     # nodemon, restarts on edits
npm start       # plain start
npm test        # tests and coverage
```

The default port is 3000. To change it, copy `.env.example` to `.env` and edit `PORT`; the `.env` file does not go into the repository.

Request examples for the REST Client extension of VS Code are in [`requests.http`](requests.http). A curl example:

```bash
curl -i -X POST http://localhost:3000/diagrams \
  -H "Content-Type: application/json" \
  -d '{"title":"Login flow","notation":"UML","sourceCode":"user -> server","owner":"carol"}'
```

## 3 Structure

| Path                                     | Purpose                                                         |
| ---------------------------------------- | --------------------------------------------------------------- |
| `server.js`                              | Entry point: reads `.env`, starts the server                    |
| `src/app.js`                             | Builds the application `createApp(store)`: JSON, routes, errors |
| `src/routes/diagrams.routes.js`          | The route table                                                 |
| `src/controllers/diagrams.controller.js` | Request handlers                                                |
| `src/models/diagram.model.js`            | Array store, allowed field values, initial data                 |
| `src/middleware/validate.js`             | Check of the id and the request body                            |
| `src/middleware/error-handler.js`        | The 404 answer for unknown paths and the global error handler   |
| `src/errors.js`                          | The `HttpError` class and helpers                               |
| `tests/diagrams.test.js`                 | Tests of all routes, errors, `createdAt` and `PATCH`            |

The store is passed to `createApp` as a parameter, so tests work with clean data, and in the next lab the array is replaced by a database without touching the routes.

## 4 Checking

`npm test` runs 64 tests on the built-in `node:test` with real HTTP requests to a server on a free port: 35 in `diagrams.test.js`, 5 in `paging.test.js`, 1 in `health.test.js`, 21 in `negative.test.js` and 2 in `report.test.mjs`, which checks that the reports build and follow the formatting rules.

A known remark: `npm audit` shows a vulnerability of the `braces` dependency in the `nodemon` chain. It is a development tool and does not reach the production run.

## 5 Limits and protocol

Length limits (`title` 80, `owner` 60, `sourceCode` 10000) and the body size (`100kb`) are in [`limits.json`](limits.json). Whitespace-only values count as empty, and `title` and `owner` are trimmed. A body that is not JSON gives 415, an oversized one gives 413, `OPTIONS` answers 204 with `Allow`, `HEAD` works like `GET`, and security headers are set on every answer. Details are in [`AUDIT.md`](AUDIT.md).

## 6 The real 500

In this lab the store is an array in memory, so a real failure cannot come from a database. The 500 answer comes from a real failure of the store (a test replaces a store method with one that throws) and from an unexpected exception in a handler. The client then sees `{ "error": "Internal server error" }` and the details stay in the server console. From lab 2 on, the 500 is caused by a real database failure, see the README of lab 2.
