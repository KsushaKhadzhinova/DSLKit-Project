# Lab 1. Building a Server Application on Node.js

## 1 Purpose of the Work

To gain practical skills in building a server application on Node.js with the Express framework: routing, handling GET, POST, PUT and DELETE requests, and forming server responses. The work is done for DSLKit, a web editor for diagrams as code that fits the SaaS direction. The server is the base for the database, authentication and the React client in the next labs.

## 2 Brief Theory

**Express.** The framework sits on top of the Node.js `http` module. An application is a chain of handlers: each receives a request, a response and a `next` function, and either answers the client or passes control on. The order in which handlers are registered is the order in which they run.

**Request parameters.** A path part such as `:id` lands in `req.params`, the query string after the question mark in `req.query`, and the request body in `req.body`. A JSON body is parsed by the `express.json()` middleware, and the client announces it with the `Content-Type: application/json` header.

**REST.** A resource has an address, and the HTTP method sets the action: `GET` reads, `POST` creates, `PUT` replaces as a whole, `DELETE` removes. The status code reports the result: 200 for a successful read or replace, 201 for creation, 204 for removal without a body, 400 for a bad request, 404 for a missing resource, 500 for a server failure.

**Error handling.** A handler with four parameters `(err, req, res, next)` is an error handler. It is registered last and receives everything passed to `next(err)` or thrown inside handlers.

## 3 Work Progress

### 3.1 Domain and routes

For DSLKit the collection is `diagrams`. A diagram has the fields `title`, `notation` (UML, BPMN, ERD, DFD, IDEF0 or Petri), `sourceCode` (the diagram text in the DSL), `priority` (`low`, `normal` or `high`) and `owner`. The server assigns the `id`. Routes, status codes and examples are listed in table 1.

Table 1 – Routes of the diagrams API

| Method | Path            | Success                                     | Errors                             | Example request                    |
| ------ | --------------- | ------------------------------------------- | ---------------------------------- | ---------------------------------- |
| GET    | `/diagrams`     | 200, array of diagrams                      | none                               | `GET /diagrams`                    |
| GET    | `/diagrams/:id` | 200, object                                 | 400 bad id, 404 no diagram         | `GET /diagrams/1`                  |
| POST   | `/diagrams`     | 201, created object and a `Location` header | 400 bad data or JSON               | `POST /diagrams` with a JSON body  |
| PUT    | `/diagrams/:id` | 200, updated object                         | 400 bad id or data, 404 no diagram | `PUT /diagrams/1` with a JSON body |
| DELETE | `/diagrams/:id` | 204, empty body                             | 400 bad id, 404 no diagram         | `DELETE /diagrams/2`               |
| any    | any other path  | none                                        | 404 as JSON                        | `GET /projects`                    |

### 3.2 Project setup

The project was created with `npm init`, with `express` as a dependency and `nodemon` as a development dependency. The `package.json` file has the scripts `start` (`node server.js`), `dev` (`nodemon server.js`) and `test`. The port comes from the `PORT` variable in the `.env` file, and only the `.env.example` template is committed. The code layout follows the advice of the assignment and is listed in table 2.

Table 2 – Project structure

| File                                     | Purpose                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `server.js`                              | Reads `.env`, starts the server on `PORT` or 3000                              |
| `src/app.js`                             | The `createApp(store)` function: wires JSON parsing, routes and error handlers |
| `src/routes/diagrams.routes.js`          | Maps methods and paths to handlers                                             |
| `src/controllers/diagrams.controller.js` | Handlers of the five operations                                                |
| `src/models/diagram.model.js`            | Array store, allowed field values, seed data                                   |
| `src/middleware/validate.js`             | Checks the id and the request body                                             |
| `src/middleware/error-handler.js`        | 404 for unknown paths and the global error handler                             |
| `src/errors.js`                          | The `HttpError` class with a status code                                       |

### 3.3 Store and handlers

Data lives in an array inside the `createDiagramStore` function, which returns the methods `findAll`, `findById`, `create`, `replace` and `remove`. The id counter only grows and never reuses the numbers of deleted records. The store is passed to `createApp` as a parameter, so tests get clean data, and when a database arrives only the model changes, not the routes. On start the store holds two sample diagrams.

Handlers do not validate data themselves. Parsing the address and the body is moved to `validate.js`: `parseId` accepts only a positive integer, and `validateDiagram` checks that the body is an object, that `title`, `sourceCode` and `owner` are non-empty strings, and that `notation` and `priority` belong to the allowed lists. The `priority` field is optional and defaults to `normal`. Unknown fields are dropped, so a client cannot store arbitrary keys or set the `id`. The `PUT` method replaces a diagram as a whole and requires the same fields as `POST`; partial update with `PATCH` is not implemented because the assignment does not ask for it.

### 3.4 Error handling

Every error is returned in one shape, `{ "error": "message" }`, and invalid data adds a `details` array with the field name and the reason. Handlers report an error by calling `next(error)` with an `HttpError`, and the global handler in `error-handler.js` turns it into a response. The same handler maps a JSON parse failure to 400 with a clear message, and any unexpected failure to 500 with a generic text: the details go to the server log and never reach the client. A request to an unknown path gets a JSON 404 instead of the default page. Deleting an already deleted diagram gives 404, because the resource no longer exists.

### 3.5 Verification

I checked the requests with `curl` and the `requests.http` file for the REST Client extension of VS Code, and then locked them in with automated tests. The tests use the built-in `node:test` module and real HTTP requests to a server on a free port. There are 14 tests: reading the list and one diagram, creation with the `Location` header check, the default priority, dropping unknown fields, data errors, bad and malformed JSON, replacement, deletion with a repeated deletion, an unknown route and a failure with status 500. Results of real requests are in table 3.

Table 3 – Results of requests to the running server

| Request                                                  | Status | Response body                                               |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| `GET /diagrams`                                          | 200    | an array of two diagrams                                    |
| `GET /diagrams/1`                                        | 200    | `{"id":1,"title":"Order processing","notation":"BPMN",...}` |
| `POST /diagrams` with title, notation, sourceCode, owner | 201    | the created diagram with `id` 3 and priority `normal`       |
| `PUT /diagrams/1`                                        | 200    | the diagram with the new field values                       |
| `POST /diagrams` with an empty title and notation XYZ    | 400    | `{"error":"Invalid diagram data","details":[...]}`          |
| `GET /diagrams/99`                                       | 404    | `{"error":"Diagram 99 not found"}`                          |
| `DELETE /diagrams/2`                                     | 204    | empty                                                       |
| `DELETE /diagrams/2` again                               | 404    | `{"error":"Diagram 2 not found"}`                           |
| `GET /diagrams/abc`                                      | 400    | `{"error":"Diagram id must be a positive integer"}`         |

## Conclusion

For DSLKit, a REST API for the `diagrams` resource was built on Express: five routes read the list and a single record, create, replace and delete, and the data temporarily lives in an in-memory array. Errors are unified into one JSON shape with the codes 400, 404 and 500 through a global handler, development mode runs on `nodemon`, and 14 automated tests confirm the behavior of every route. The split into routes, controllers and a model lets the next lab swap the array for a database without rewriting the rest of the code. Screenshots of the requests from Postman or a browser are still to be attached.

## Appendix A – Listing of server.js

{{code:part-2/lab-01-node-server/server.js}}

## Appendix B – Listing of app.js

{{code:part-2/lab-01-node-server/src/app.js}}

## Appendix C – Listing of diagrams.routes.js

{{code:part-2/lab-01-node-server/src/routes/diagrams.routes.js}}

## Appendix D – Listing of diagrams.controller.js

{{code:part-2/lab-01-node-server/src/controllers/diagrams.controller.js}}

## Appendix E – Listing of diagram.model.js

{{code:part-2/lab-01-node-server/src/models/diagram.model.js}}

## Appendix F – Listing of validate.js

{{code:part-2/lab-01-node-server/src/middleware/validate.js}}

## Appendix G – Listing of error-handler.js

{{code:part-2/lab-01-node-server/src/middleware/error-handler.js}}
