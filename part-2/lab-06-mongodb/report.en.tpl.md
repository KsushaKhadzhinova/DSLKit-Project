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

The routes gained partial update `PATCH /diagrams/:id`, sorting with `?sort=title` or `?sort=-priority`, a record counter (the `/diagrams/count` route and the `X-Total-Count` header of the list) and `?q=` search over a text index of the title and the source code. There are 92 automated tests. Nineteen cover the main routes: valid and invalid identifiers, creation, replacement that keeps comments, deletion, the 400, 404, 405 and 413 errors, and a 500 answer that leaks no error text. Eleven cover nested structures: the tag and owner filter, adding, editing and removing a comment, the unreachable foreign comment, schema checks at the model level, indexes and the translation of a Mongoose error into 400. Ten cover `PATCH`, sorting, the counter and the text search. Twenty-eight cover wrong user behavior: empty, truncated and non-JSON bodies, wrong types, whitespace-only values, out-of-range values, forged fields, operator injection, malformed identifiers, repeated and parallel requests and a stopped database. Another eleven cover data protection: operators such as `$ne` in the body and in query parameters, whitespace-only values, the limits from `limits.json` at the border and beyond it, the integer priority, the body size cap and the creation time of every record. The tests run on a temporary MongoDB instance through `mongodb-memory-server`, so no working database is touched. The same `npm test` command checks the build and formatting of this report. Screenshots of the Atlas cluster, Postman requests and MongoDB Compass data are not included in this version of the report.

### 3.6 Demonstration

All shots are made by the script `shots/shots.mjs`: it starts a temporary MongoDB and the server, performs real requests and saves the result. The request and response pages are drawn by this script from the recorded exchange data, they are not a Postman window. Shots 21–25 are taken in the Chrome browser, which opens the address of the running server itself.


The list of three diagrams with tags and nested comments is shown in figure 1.

![Diagram list](figures/01-get-list.png)

Figure 1 – Request GET /diagrams and the 200 response, recorded by a script

A request by the ObjectId returns one diagram, as in figure 2.

![One diagram](figures/02-get-one.png)

Figure 2 – Request GET /diagrams/:id and the 200 response, recorded by a script

Creating a diagram returns the code 201 and the Location header, as figure 3 shows.

![Diagram creation](figures/03-post-create.png)

Figure 3 – Request POST /diagrams and the 201 response, recorded by a script

The PUT method replaces the fields and the comment of the diagram is kept, as in figure 4.

![Diagram replacement](figures/04-put-replace.png)

Figure 4 – Request PUT /diagrams/:id and the 200 response, recorded by a script

The PATCH method changes one field and leaves the others untouched, and the result is shown in figure 5.

![Partial update](figures/16-patch.png)

Figure 5 – Request PATCH /diagrams/:id with one field and the 200 response, recorded by a script

The first delete returns 204 and the repeated delete of the same document returns 404, as figure 6 shows.

![Diagram deletion](figures/05-delete.png)

Figure 6 – Two requests DELETE /diagrams/:id and the responses 204 and 404, recorded by a script

The `$push` operator adds a comment to the array, as in figure 7.

![Comment addition](figures/06-comment-add.png)

Figure 7 – Request POST /diagrams/:id/comments and the 201 response, recorded by a script

The positional operator `$` changes the text of one array element, as figure 8 shows.

![Comment edit](figures/07-comment-edit.png)

Figure 8 – Request PUT /diagrams/:id/comments/:commentId and the 200 response, recorded by a script

The `$pull` operator removes the element and the array in the response is empty, as in figure 9.

![Comment deletion](figures/08-comment-delete.png)

Figure 9 – Request DELETE /diagrams/:id/comments/:commentId and the 200 response, recorded by a script

The filter by the tag array and the owner returns only matching diagrams, as in figure 10.

![Filter by tag and owner](figures/09-filter-by-tag.png)

Figure 10 – Request GET /diagrams?tag=shop&owner=anna and the 200 response, recorded by a script

The parameter `sort=title` orders the list by title, and the result is visible in figure 11.

![Sort by title](figures/17-sort-title.png)

Figure 11 – Request GET /diagrams?sort=title and the 200 response, recorded by a script

The parameter `q` searches the text index of the title and the source code, as in figure 12.

![Text search](figures/18-search.png)

Figure 12 – Request GET /diagrams?q=login and the 200 response, recorded by a script

The parameters `limit` and `skip` return one page of the list, as figure 13 shows.

![List page](figures/20-pagination.png)

Figure 13 – Request GET /diagrams?limit=1&skip=1 and the 200 response, recorded by a script

The route `/diagrams/count` returns the number of records and `/diagrams/stats` counts diagrams by notation with an aggregation, as figure 14 shows.

![Counter and statistics](figures/19-count-stats.png)

Figure 14 – Requests GET /diagrams/count and GET /diagrams/stats with the 200 responses, recorded by a script

The raw collection document with nested tags and comments is shown in figure 15.

![MongoDB document](figures/10-mongo-document.png)

Figure 15 – Document of the diagrams collection read from MongoDB by a script

Empty and blank strings, an unknown notation and a priority out of range give the code 400 with the list of fields, as in figure 16.

![Validation errors](figures/11-validation-error.png)

Figure 16 – Request POST /diagrams with invalid data and the 400 response, recorded by a script

A title longer than 80 characters and 21 tags exceed the limits from `limits.json`, and the response is shown in figure 17.

![Limits exceeded](figures/12-limits.png)

Figure 17 – Request POST /diagrams exceeding the limits and the 400 response, recorded by a script

The operators `$ne` and `$gt` in place of strings in the request body are rejected, as in figure 18.

![Operators in the body](figures/13-injection-body.png)

Figure 18 – Request POST /diagrams with operators in the body and the 400 response, recorded by a script

The parameter `owner[$ne]` and the repeated parameter `tag` are rejected with the code 400, as in figure 19.

![Operators in the parameters](figures/14-injection-query.png)

Figure 19 – Two requests GET /diagrams with invalid parameters and the 400 responses, recorded by a script

A valid but unknown ObjectId gives 404 and the string `abc` gives 400, as figure 20 shows.

![Unknown identifier](figures/15-not-found-and-bad-id.png)

Figure 20 – Two requests GET /diagrams/:id and the responses 404 and 400, recorded by a script

The Chrome browser opens the address `/diagrams?sort=title` of the running server and shows the response, as in figure 21.

![List in the browser](figures/21-browser-list.png)

Figure 21 – Response of GET /diagrams?sort=title in a Chrome browser window

An unknown identifier in the browser address gives the response 404, as in figure 22.

![Response 404 in the browser](figures/22-browser-not-found.png)

Figure 22 – Response of GET /diagrams/64b7f0c2a1b2c3d4e5f60718 in a Chrome browser window

An invalid identifier `abc` gives the response 400, as figure 23 shows.

![Response 400 in the browser](figures/23-browser-bad-request.png)

Figure 23 – Response of GET /diagrams/abc in a Chrome browser window

After the database connection is closed the server does not crash and answers JSON with the code 503, as in figure 24.

![Response 503 without the database](figures/24-browser-503.png)

Figure 24 – Response of GET /diagrams with MongoDB disconnected in a Chrome browser window

The check `/health` with the stopped database returns 503 too, as in figure 25.

![Health check without the database](figures/25-browser-health-503.png)

Figure 25 – Response of GET /health with MongoDB disconnected in a Chrome browser window

## Answers to Control Questions

{{answers}}
1. **How does MongoDB differ from relational databases?** Data is stored as BSON documents, the schema is flexible, related data can be nested in a document, the identifier is an `ObjectId`, and scaling is horizontal through sharding.
2. **What is an ObjectId?** A 12-byte document identifier made of a creation time, a random value and a counter. The driver creates it, it is unique and serves as the default `_id`.
3. **How to search by a nested field?** Use a dotted path: `Model.find({ 'profile.city': 'Minsk' })`.
4. **Which types does BSON support?** String, Int32, Int64, Double, Decimal128, Boolean, Date, ObjectId, Array, Object, Null, Binary.
5. **What is an aggregation pipeline?** A chain of stages that process a collection, for example `$match` selects the diagrams of an owner and `$group` counts them by notation.
6. **How to define a subdocument in Mongoose?** A nested schema in an array field, in the project it is `comments: [commentSchema]`.
7. **How to update an element inside an array?** The positional operator: `$set: { 'comments.$.text': text }` with the filter `'comments._id': commentId`.
8. **Pros and cons of nested documents?** The pros are one-query reads and atomic updates, the cons are document growth and duplicated data.
9. **How to create an index in Mongoose?** The `index: true` option on a field or `schema.index({ owner: 1 })`, and `unique: true` for uniqueness. The project has indexes on `owner` and `tags`.
10. **What is populate?** A method that replaces an `ObjectId` reference in a document with data from another collection. The project does not need it, because comments are nested instead of stored in a separate collection.
11. **How to search when an array contains a value?** A condition on an array field compares the value with its elements: `Diagram.find({ tags: 'shop' })`, and `$in` and `$all` handle several values.
12. **How to delete a document and return it?** `Model.findByIdAndDelete(id)` returns the removed document or `null`.
13. **Which methods return a Query?** `find`, `findOne`, `findById`, `where`, `sort`, `limit` and `select`, which can be chained and finished with `await` or `exec`.
14. **How to add custom methods?** `schema.methods.name = function () {}` for an instance method and `schema.statics.name = function () {}` for a static model method.
15. **How to cascade a delete?** MongoDB has no cascade: nested documents go with their parent, and for references a `post('findOneAndDelete')` hook or manual removal of child documents is used.
16. **Which applications suit MongoDB better?** Data with a flexible structure that is read as a whole object, like a diagram with tags and comments. It is worse for complex relations and multi-table transactions.
{{/answers}}

Listing of db.js is given in appendix A. Listing of server.js is given in appendix B. Listing of diagram.js is given in appendix C. Listing of diagrams.controller.js is given in appendix D. Listing of diagrams.routes.js is given in appendix E. Listing of seed.js is given in appendix F. Listing of limits.json is given in appendix G.

## Conclusion

In this lab the DSLKit server from lab 2 moved from Sequelize to Mongoose. The `diagrams` collection lives in MongoDB, the CRUD routes kept their addresses and response format, and identifiers became `ObjectId` strings. Tags and comments sit inside the diagram document, which replaces several tables and joins with a single query. For the comments array the work adds appending, changing an element with the positional operator and removal. The connection string is an environment variable, the schema validates data, and 92 tests confirm the API behavior on a temporary database. The connection to MongoDB Atlas is not done and no screenshots are attached.

## Appendix A (mandatory) Listing of db.js

{{code:part-2/lab-06-mongodb/src/db.js}}

## Appendix B (mandatory) Listing of server.js

{{code:part-2/lab-06-mongodb/server.js}}

## Appendix C (mandatory) Listing of diagram.js

{{code:part-2/lab-06-mongodb/src/models/diagram.js}}

## Appendix D (mandatory) Listing of diagrams.controller.js

{{code:part-2/lab-06-mongodb/src/controllers/diagrams.controller.js}}

## Appendix E (mandatory) Listing of diagrams.routes.js

{{code:part-2/lab-06-mongodb/src/routes/diagrams.routes.js}}

## Appendix F (mandatory) Listing of seed.js

{{code:part-2/lab-06-mongodb/scripts/seed.js}}

## Appendix G (mandatory) Listing of limits.json

{{code:part-2/lab-06-mongodb/limits.json}}
