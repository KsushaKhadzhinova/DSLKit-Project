# Lab 6. Integration with the MongoDB NoSQL Database

## 1 Purpose of the Work

Learn to work with the MongoDB document database: connecting, describing schemas and models with the Mongoose ODM, running CRUD operations in Express routes and using nested structures inside a document. The work is done for the DSLKit project, a web editor for diagrams as code in the SaaS direction. It is an alternative implementation of the `diagrams` collection from lab 2: the same REST API, but a MongoDB collection replaces the relational table. The code lives in repository branch `26`.

## 2 Brief Theory

**Document model.** MongoDB stores data in collections, and a collection consists of documents in BSON, the binary extension of JSON. Every document has a unique `_id` field, by default a 12-byte `ObjectId` made of a creation time, a random value and a counter. A document can hold nested objects and arrays, so data that a relational database spreads over several tables is stored together and read with one query.

**Mongoose.** The Mongoose ODM adds a schema and a model on top of MongoDB. The schema describes fields, their types, required flags, allowed values and indexes, and the model provides `find`, `findById`, `create`, `findByIdAndUpdate` and `findByIdAndDelete`. The schema is enforced in the application, MongoDB itself does not impose a structure on documents.

Table 1 – Relational and document databases compared

| Aspect             | Relational (PostgreSQL)                  | Document (MongoDB)                                  |
| ------------------ | ---------------------------------------- | --------------------------------------------------- |
| Unit of storage    | Table row                                | BSON document in a collection                       |
| Schema             | Strict, changed by migrations            | Flexible, rules are set by application code         |
| Related data       | Separate tables and `JOIN` queries       | Nested documents and arrays, or references and `populate` |
| Identifier         | Integer or UUID                          | `ObjectId`                                          |
| Transactions, links | Foreign keys, strict transactions       | Atomicity within a single document                  |
| Scaling            | Usually vertical                         | Horizontal through sharding                         |

The drawback of the document model is data duplication and weak links between collections: there are no foreign keys or cascading deletes, so code has to provide them. The benefit is fast reading of a whole object and an easy change of structure.

## 3 Work Progress

### 3.1 Database connection

The database address comes from the `MONGODB_URI` environment variable. The `dotenv` package reads it from the `.env` file, and a sample `.env.example` is committed, so the cluster password never reaches version control. The same code works with a local MongoDB Community installation and with a MongoDB Atlas cluster, only the connection string differs. The `connect` function in `src/db.js` calls `mongoose.connect`, and `server.js` starts listening only after the connection succeeds, otherwise it prints the reason and exits with code 1. The connection to Atlas was not verified in this work. The server start was checked against a local `mongod` 8.2, and the tests run on a temporary database.

### 3.2 Schema and model

The `Diagram` schema is defined in `src/models/diagram.js`. The main fields match labs 1 and 2: `title`, `notation`, `sourceCode`, `priority` and `owner`. The allowed values of `notation` are set with `enum`, while `priority` is an integer from 0 to 2 that defaults to 1. Required strings reject empty and whitespace-only values, and string lengths, the number of tags and the number of comments are capped. All limits live in a separate `limits.json` file read by both the schema and the request checks, so a limit can change without editing code. Two fields use the document model: the string array `tags` and the array of nested documents `comments` with the fields `author`, `text` and `createdAt`. A comment is stored inside its diagram, with no separate collection and no join. Mongoose adds `_id` to the diagram and to every comment, and the `timestamps` option maintains `createdAt` and `updatedAt`. Indexes on `owner` and `tags` speed up searches, and the JSON output is configured so that `_id` becomes `id` and the internal `__v` is hidden.

Table 2 – Relational tables of lab 2 and the MongoDB document

| Relational version (lab 2)                     | Document version (lab 6)                    |
| ---------------------------------------------- | ------------------------------------------- |
| Table `Diagrams`, one row per diagram          | Collection `diagrams`, one document per diagram |
| Tags would need a `Tags` table and a link table | Array `tags` inside the document            |
| Comments in a `Comments` table with a foreign key | Array `comments` inside the document        |
| Reading a diagram with comments needs a `JOIN` | A single `findById` query                   |
| Comments removed by a cascading foreign key    | Removed together with the document          |

### 3.3 CRUD through Mongoose

Controllers receive the model as a parameter and call Mongoose methods, as table 3 shows. `findByIdAndUpdate` is called with `new: true` and `runValidators: true`: the client gets the updated document, and the schema checks run on updates as well. The identifier in the URL is checked before the database is touched: a string of 24 hexadecimal characters is accepted, anything else gives 400. A well-formed but unknown identifier gives 404. The error handler turns Mongoose `ValidationError` and `CastError` into 400, and any other failure into 500 without internal details. Protection against operator injection has three layers. The request check accepts only strings of the right length in the fields, so a body such as `{ "$ne": null }` gets 400, and the list accepts only `owner` and `tag` with a string value. The `sanitizeFilter` and `strictQuery` settings stop an operator inside a value from reaching a query, and the schema drops extra body fields. The request body is limited to 100 KB. The error format, the 405 answer with an `Allow` header and the body size limit stay as in the previous labs.

Table 3 – Routes and Mongoose methods

| Route                  | Mongoose call                                          | Response  |
| ---------------------- | ------------------------------------------------------ | --------- |
| `GET /diagrams`        | `Diagram.find(filter).sort({ _id: 1 })`                | 200       |
| `GET /diagrams/:id`    | `Diagram.findById(id)`                                 | 200 or 404 |
| `POST /diagrams`       | `Diagram.create(fields)`                               | 201       |
| `PUT /diagrams/:id`    | `Diagram.findByIdAndUpdate(id, fields, { new: true })` | 200 or 404 |
| `DELETE /diagrams/:id` | `Diagram.findByIdAndDelete(id)`                        | 204 or 404 |

The list accepts the `tag` and `owner` parameters. The filter `{ tags: 'shop' }` means that the tags array contains the value, and MongoDB needs no extra operator for it.

### 3.4 Working with nested structures

Three extra routes work with the comments array and change it with separate atomic MongoDB operators, without loading the document into the application.

Table 4 – Routes for the comments array

| Route                                      | MongoDB operator                                               | Response  |
| ------------------------------------------ | -------------------------------------------------------------- | --------- |
| `POST /diagrams/:id/comments`              | `$push: { comments: comment }`                                 | 201 or 404 |
| `PUT /diagrams/:id/comments/:commentId`    | `$set: { 'comments.$.text': text }` filtered by `comments._id` | 200 or 404 |
| `DELETE /diagrams/:id/comments/:commentId` | `$pull: { comments: { _id: commentId } }`                      | 200 or 404 |

Changing one array element shows the difference from the relational model: the positional operator `$` stands for the index of the matched element, so only the text of the chosen comment changes while the other elements and the diagram fields stay untouched. The filter holds both the diagram id and the comment id, so a comment of another diagram cannot be reached through this URL. `PUT /diagrams/:id` replaces the diagram fields and tags but leaves the comments alone.

### 3.5 Running and verification

To run the project, copy `.env.example` to `.env` and set `MONGODB_URI`, run `npm run seed`, then `npm run dev`. The seed removes the demo documents by title and inserts three diagrams, so it can be repeated. A check against a local `mongod` showed that the list returns diagrams with nested comments and tags, and a request with `tag=shop` returns two of the three diagrams.

There are 41 automated tests. Nineteen cover the main routes: valid and invalid identifiers, creation, replacement that keeps comments, deletion, the 400, 404, 405 and 413 errors, and a 500 answer that leaks no error text. Eleven cover nested structures: the tag and owner filter, adding, editing and removing a comment, the unreachable foreign comment, schema checks at the model level, indexes and the translation of a Mongoose error into 400. Another eleven cover data protection: operators such as `$ne` in the body and in query parameters, whitespace-only values, the limits from `limits.json` at the border and beyond it, the integer priority, the body size cap and the creation time of every record. The tests run on a temporary MongoDB instance through `mongodb-memory-server`, so no working database is touched. The same `npm test` command checks the build and formatting of this report. Screenshots of the Atlas cluster, Postman requests and MongoDB Compass data are not included in this version of the report.

## Answers to Control Questions

9. **How to create an index in Mongoose?** The `index: true` option on a field or `schema.index({ owner: 1 })`, and `unique: true` for uniqueness. The project has indexes on `owner` and `tags`.
10. **What is populate?** A method that replaces an `ObjectId` reference in a document with data from another collection. The project does not need it, because comments are nested instead of stored in a separate collection.
11. **How to search when an array contains a value?** A condition on an array field compares the value with its elements: `Diagram.find({ tags: 'shop' })`, and `$in` and `$all` handle several values.

Listing of db.js is given in appendix A. Listing of server.js is given in appendix B. Listing of diagram.js is given in appendix C. Listing of diagrams.controller.js is given in appendix D. Listing of diagrams.routes.js is given in appendix E. Listing of seed.js is given in appendix F. Listing of limits.json is given in appendix G.

## Conclusion

In this lab the DSLKit server from lab 2 moved from Sequelize to Mongoose. The `diagrams` collection lives in MongoDB, the CRUD routes kept their addresses and response format, and identifiers became `ObjectId` strings. Tags and comments sit inside the diagram document, which replaces several tables and joins with a single query. For the comments array the work adds appending, changing an element with the positional operator and removal. The connection string is an environment variable, the schema validates data, and 41 tests confirm the API behavior on a temporary database. The connection to MongoDB Atlas is not done and no screenshots are attached.

## Appendix A (mandatory) Listing of db.js

```js
const mongoose = require('mongoose');

// The connection string comes from MONGODB_URI (see .env.example).
const connect = async (uri = process.env.MONGODB_URI) => {
  if (!uri) throw new Error('MONGODB_URI is not set, copy .env.example to .env');
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
};

module.exports = { connect, disconnect: () => mongoose.disconnect() };
```

## Appendix B (mandatory) Listing of server.js

```js
require('dotenv').config({ quiet: true });
const { createApp } = require('./src/app');
const models = require('./src/models');
const { connect } = require('./src/db');

const port = Number(process.env.PORT) || 3000;

connect()
  .then(() => {
    console.log('MongoDB connected');
    createApp(models).listen(port, () => console.log(`Server running on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error('Cannot connect to MongoDB:', error.message);
    process.exit(1);
  });
```

## Appendix C (mandatory) Listing of diagram.js

```js
const mongoose = require('mongoose');
const { NOTATIONS, PRIORITY, LIMITS } = require('./diagram.constants');

// Query filters are never trusted: operators sent as values are stripped, unknown fields are ignored.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

// Responses expose "id" instead of Mongo's "_id" and "__v".
const toJSON = {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
  },
};

// A comment lives inside the diagram document: no separate collection, no join.
const commentSchema = new mongoose.Schema(
  {
    author: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.author },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.commentText },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON, strict: true },
);

const diagramSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.title },
    notation: { type: String, required: true, enum: NOTATIONS },
    sourceCode: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.sourceCode },
    priority: {
      type: Number,
      required: true,
      min: PRIORITY.min,
      max: PRIORITY.max,
      default: PRIORITY.default,
      validate: { validator: Number.isInteger, message: 'priority must be an integer' },
    },
    owner: { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.owner, index: true },
    tags: {
      type: [{ type: String, trim: true, minlength: 1, maxlength: LIMITS.tag }],
      index: true,
      validate: { validator: (v) => v.length <= LIMITS.tags, message: 'too many tags' },
    },
    comments: { type: [commentSchema], validate: { validator: (v) => v.length <= LIMITS.comments, message: 'too many comments' } },
  },
  { timestamps: true, toJSON, strict: true },
);

const Diagram = mongoose.models.Diagram || mongoose.model('Diagram', diagramSchema);

module.exports = { Diagram };
```

## Appendix D (mandatory) Listing of diagrams.controller.js

```js
const { notFound } = require('../errors');

const missing = (id) => notFound(`Diagram ${id} not found`);
const missingComment = (id) => notFound(`Comment ${id} not found`);

// ?owner=anna&tag=shop narrows the list; tag matches when the tags array contains the value.
const listFilter = ({ owner, tag }) => ({
  ...(typeof owner === 'string' && { owner }),
  ...(typeof tag === 'string' && { tags: tag }),
});

const options = { new: true, runValidators: true };

// Express 5 forwards a rejected promise to the error handler, so no try/catch is needed here.
const createDiagramsController = ({ Diagram }) => ({
  list: async (req, res) => res.json(await Diagram.find(listFilter(req.query)).sort({ _id: 1 })),

  get: async (req, res, next) => {
    const diagram = await Diagram.findById(req.diagramId);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  create: async (req, res) => {
    const diagram = await Diagram.create(req.diagramFields);
    res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
  },

  replace: async (req, res, next) => {
    const diagram = await Diagram.findByIdAndUpdate(req.diagramId, req.diagramFields, options);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  remove: async (req, res, next) => {
    const diagram = await Diagram.findByIdAndDelete(req.diagramId);
    return diagram ? res.status(204).end() : next(missing(req.diagramId));
  },

  // $push appends to the nested array in one atomic update.
  addComment: async (req, res, next) => {
    const diagram = await Diagram.findByIdAndUpdate(req.diagramId, { $push: { comments: req.commentFields } }, options);
    return diagram ? res.status(201).json(diagram) : next(missing(req.diagramId));
  },

  // The positional operator $ updates only the array element matched by the filter.
  updateComment: async (req, res, next) => {
    const diagram = await Diagram.findOneAndUpdate(
      { _id: req.diagramId, 'comments._id': req.commentId },
      { $set: { 'comments.$.text': req.commentFields.text } },
      options,
    );
    return diagram ? res.json(diagram) : next(missingComment(req.commentId));
  },

  removeComment: async (req, res, next) => {
    const diagram = await Diagram.findOneAndUpdate(
      { _id: req.diagramId, 'comments._id': req.commentId },
      { $pull: { comments: { _id: req.commentId } } },
      options,
    );
    return diagram ? res.json(diagram) : next(missingComment(req.commentId));
  },
});

module.exports = { createDiagramsController };
```

## Appendix E (mandatory) Listing of diagrams.routes.js

```js
const { Router } = require('express');
const { HttpError } = require('../errors');
const { validateListQuery, parseId, parseCommentId, validateDiagram, validateComment, validateCommentText } = require('../middleware/validate');

const methodNotAllowed = (allow) => (_req, res, next) => {
  res.set('Allow', allow);
  next(new HttpError(405, `Method not allowed, use ${allow}`));
};

const createDiagramsRouter = (controller) => {
  const router = Router();
  router.route('/').get(validateListQuery, controller.list).post(validateDiagram, controller.create).all(methodNotAllowed('GET, POST'));
  router
    .route('/:id')
    .get(parseId, controller.get)
    .put(parseId, validateDiagram, controller.replace)
    .delete(parseId, controller.remove)
    .all(methodNotAllowed('GET, PUT, DELETE'));
  router.route('/:id/comments').post(parseId, validateComment, controller.addComment).all(methodNotAllowed('POST'));
  router
    .route('/:id/comments/:commentId')
    .put(parseId, parseCommentId, validateCommentText, controller.updateComment)
    .delete(parseId, parseCommentId, controller.removeComment)
    .all(methodNotAllowed('PUT, DELETE'));
  return router;
};

module.exports = { createDiagramsRouter };
```

## Appendix F (mandatory) Listing of seed.js

```js
require('dotenv').config({ quiet: true });
const { Diagram } = require('../src/models');
const { connect, disconnect } = require('../src/db');

const demo = [
  {
    title: 'Order processing',
    notation: 'BPMN',
    sourceCode: 'start -> check stock -> pay -> ship -> end',
    priority: 2,
    owner: 'anna',
    tags: ['shop', 'process'],
    comments: [{ author: 'boris', text: 'Add a refund branch' }],
  },
  { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server: login', owner: 'carol', tags: ['auth'] },
  { title: 'Customers and orders', notation: 'ERD', sourceCode: 'Customer ||--o{ Order', priority: 0, owner: 'anna', tags: ['shop', 'database'] },
];

// Replaces the demo documents by title, so the script can be run many times.
const seed = async () => {
  await connect();
  await Diagram.deleteMany({ title: { $in: demo.map((d) => d.title) } });
  const created = await Diagram.create(demo);
  console.log(`Seeded ${created.length} diagrams`);
  await disconnect();
};

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
```

## Appendix G (mandatory) Listing of limits.json

```json
{
  "title": 80,
  "owner": 60,
  "sourceCode": 10000,
  "tags": 20,
  "tag": 30,
  "comments": 100,
  "author": 60,
  "commentText": 1000,
  "priorityMin": 0,
  "priorityMax": 2,
  "priorityDefault": 1
}
```
