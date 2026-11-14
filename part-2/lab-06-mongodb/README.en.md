# Part 2. Lab 6. MongoDB and Mongoose

Russian version: [`README.md`](README.md). DSLKit project (diagrams as code, SaaS). The work is submitted from branch `26`. It is the server of [lab 2](../lab-02-sequelize) with Sequelize replaced by Mongoose: the same `/diagrams` routes, but a diagram is one MongoDB document and its tags and comments live inside it. Reports: [`report.md`](report.md) in Russian, [`report.en.md`](report.en.md) in English (templates `report.tpl.md`, `report.en.tpl.md`; build with `node tools/build.js part-2/lab-06-mongodb` from the repository root).

## 1 Connecting to MongoDB

The database address is read from the `MONGODB_URI` variable in `.env` (a sample is in `.env.example`, `.env` itself is not committed).

| Option                      | `MONGODB_URI`                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| Local MongoDB Community     | `mongodb://127.0.0.1:27017/dslkit`                                                          |
| MongoDB Atlas (M0 cluster)  | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/dslkit?retryWrites=true&w=majority` |

The Atlas connection was **not checked**: the code is the same for both options, only the string changes.

## 2 Running

Node.js 22 or newer and a running MongoDB are required.

```bash
cd part-2/lab-06-mongodb
npm install
cp .env.example .env     # then set your MONGODB_URI
npm run seed             # 32 demo diagrams with tags and comments (safe to repeat)
npm run seed:undo        # remove only the demo diagrams
npm run dev              # nodemon; npm start for a plain start
npm test                 # tests
```

**Demo data.** `scripts/seed-diagrams.js` holds 32 diagrams over six notations (BPMN, ERD, UML, DFD, IDEF0, Petri), four owners (anna, boris, carol, dave), tags and nested comments (zero to two per diagram), and five awkward rows (Unicode, markup, SQL-like text, maximum length). `scripts/seed.js` inserts a document only when no diagram with that title exists (`bulkWrite` with `upsert` and `$setOnInsert`): running it again duplicates nothing, comments and edits made by users are kept, and a deleted demo diagram comes back. `npm run seed:undo` removes only the demo documents. The seed uses no passwords or secrets, the database address comes from `MONGODB_URI`.

## 3 Routes

`GET /diagrams?tag=&owner=`, `GET /diagrams/:id`, `POST /diagrams`, `PUT`, `PATCH` and `DELETE /diagrams/:id`, `POST /diagrams/:id/comments`, `PUT` and `DELETE /diagrams/:id/comments/:commentId` (`$push`, `$set` with `comments.$`, `$pull`), `GET /diagrams/count`, `GET /diagrams/stats`, `GET /health`. All limits are in `limits.json`; operators such as `{ "$ne": null }` are rejected with 400. Details are in the Russian README and in `report.en.md`.

## 4 Checking

`npm test` runs 152 tests and the report build and formatting check (`report.test.mjs`). The tests start a temporary `mongod` through `mongodb-memory-server` on a random port, so no working database is touched. To avoid the one-time download of the `mongod` binary, set `MONGOMS_SYSTEM_BINARY` to an installed `mongod`.

## 5 Known limitations

These match the scope of the lab. The API has no authentication or authorization: any client that can reach the port can read and change every diagram. There is no rate limit. Every request, including `GET`, writes a row to the `requestlogs` collection (variant 26 requires this), so an unlimited stream of requests grows the collection and the database load quickly, and old rows are never purged. Real use would need sign-in, a rate limit and a retention period for the log.
