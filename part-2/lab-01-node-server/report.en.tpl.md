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

For DSLKit the collection is `diagrams`. A diagram has the fields `title`, `notation` (UML, BPMN, ERD, DFD, IDEF0 or Petri), `sourceCode` (the diagram text in the DSL), `priority` (`low`, `normal` or `high`) and `owner`. The server assigns the `id` and the creation time `createdAt`. Routes, status codes and examples are listed in table 1.

Table 1 – Routes of the diagrams API

| Method | Path            | Success                                     | Errors                             | Example request                    |
| ------ | --------------- | ------------------------------------------- | ---------------------------------- | ---------------------------------- |
| GET    | `/diagrams`     | 200, array of diagrams                      | none                               | `GET /diagrams`                    |
| GET    | `/diagrams/:id` | 200, object                                 | 400 bad id, 404 no diagram         | `GET /diagrams/1`                  |
| POST   | `/diagrams`     | 201, created object and a `Location` header | 400 bad data or JSON               | `POST /diagrams` with a JSON body  |
| PUT    | `/diagrams/:id` | 200, updated object                         | 400 bad id or data, 404 no diagram | `PUT /diagrams/1` with a JSON body |
| PATCH  | `/diagrams/:id` | 200, object with the changed fields         | 400 bad id, data or empty body, 404 | `PATCH /diagrams/1` with one field |
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

Handlers do not validate data themselves. Parsing the address and the body is moved to `validate.js`: `parseId` accepts only a positive integer, and `validateDiagram` checks that the body is an object, that `title`, `sourceCode` and `owner` are non-empty strings, and that `notation` and `priority` belong to the allowed lists. The `priority` field is optional and defaults to `normal`. Unknown fields are dropped, so a client cannot store arbitrary keys or set the `id`. The `PUT` method replaces a diagram as a whole and requires the same fields as `POST`. The `PATCH` method changes only the fields that are sent and leaves the rest unchanged. Every sent field goes through the same rules, and a body without a single known field gives 400. The creation time `createdAt` is set by the server when the record is created, as an ISO 8601 string. It is unique for every record: if two records are created in the same millisecond, the second one gets a value one millisecond later. A client cannot set it, and `PUT` and `PATCH` do not change it. The list can be sorted by it.

### 3.4 Error handling

Every error is returned in one shape, `{ "error": "message" }`, and invalid data adds a `details` array with the field name and the reason. Handlers report an error by calling `next(error)` with an `HttpError`, and the global handler in `error-handler.js` turns it into a response. The same handler maps a JSON parse failure to 400 with a clear message, and any unexpected failure to 500 with a generic text: the details go to the server log and never reach the client. A request to an unknown path gets a JSON 404 instead of the default page. A method the route does not have, such as `POST` for `/diagrams/:id`, gets 405 with an `Allow` header. The id is accepted only as plain decimal digits without a leading zero, so values such as `0x1`, `1e0` and `01` give 400. Deleting an already deleted diagram gives 404, because the resource no longer exists.

### 3.5 Verification

I checked the requests with `curl` and the `requests.http` file for the REST Client extension of VS Code, and then locked them in with automated tests. The tests use the built-in `node:test` module and real HTTP requests to a server on a free port. There are 35 application tests: reading the list and one diagram, the creation time and its uniqueness, the partial update with `PATCH`, creation with the `Location` header check, the default priority, dropping unknown fields, data errors, bad and malformed JSON, replacement, deletion with a repeated deletion, rejecting odd id values, ignoring an id in the body, an oversized body with status 413, unsupported methods with status 405, an unknown route and a failure with status 500. Results of real requests are in table 3.

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

Listing of server.js is given in appendix A. Listing of app.js is given in appendix B. Listing of diagrams.routes.js is given in appendix C. Listing of diagrams.controller.js is given in appendix D. Listing of diagram.model.js is given in appendix E. Listing of validate.js is given in appendix F. Listing of error-handler.js is given in appendix G.

### 3.6 Paging and sorting

The list accepts the `limit`, `offset`, `sort` and `order` parameters. `limit` sets the page size from 1 to 100, `offset` sets the shift from 0 to 1000000, `sort` picks a field from a whitelist and `order` takes `asc` or `desc`. Without parameters the whole list is returned in ascending `id` order, so the clients of the earlier works keep working. The answer stays an array and the full size of the selection comes in the `X-Total-Count` header. Numbers are read as strings of at most nine digits, so `-1`, `1e9`, `0x10` and huge numbers get a 400 answer with a list of errors by field. The sort field name is checked against the whitelist and never reaches the database query unchecked. Equal values are ordered by `id`, so pages do not overlap. Parsing of the parameters is moved to a separate module, it is given in Appendix H.

### 3.8 Answers to the control questions

9. What advantages does nodemon give during development?

   Nodemon watches the project files and restarts the server by itself after every save, so the process does not need to be stopped and started by hand. A change is visible in the very next request, and the loop of editing and checking gets shorter. The package is a development dependency and runs with `npm run dev`. It is not used in production, where `npm start` runs and a process manager restarts the server after a crash.

10. What is the difference between PUT and PATCH? Which one did you implement and why?

    `PUT` replaces the resource as a whole: the client sends all required fields, and omitted optional ones get their defaults. `PATCH` changes only the fields that are sent, the others keep their values. `PUT` is idempotent, repeating the same request leaves the same state. `PATCH` does not have to be idempotent, for example the command "increase by 1" changes the result when repeated. Both methods are implemented: `PUT` is required by the assignment, and `PATCH` is added for small edits such as changing the priority, when there is no need to resend the whole diagram text. Neither method changes `id` or `createdAt`.

11. How can CORS support be added to your application? (In theory)

    Under the same-origin policy a browser does not hand a page the response of a server on another origin, that is another scheme, domain or port, unless the server allows it explicitly. The permission comes from the `Access-Control-Allow-Origin` header with the client address. For methods such as `PUT` or for the header `Content-Type: application/json`, the browser first sends a preflight `OPTIONS` request, and the server answers 204 with the headers `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers`. In Express the `cors` package does this, or a handler of ten lines mounted before the routes. A wildcard cannot be combined with cookies, and the list of allowed origins is better read from an environment variable. In this lab the client and the server share one address for now, so CORS is not enabled.

## Conclusion

For DSLKit, a REST API for the `diagrams` resource was built on Express: six routes read the list and a single record, create, replace, partially update and delete, every record has a unique creation time, and the data temporarily lives in an in-memory array. Errors are unified into one JSON shape with the codes 400, 404 and 500 through a global handler, development mode runs on `nodemon`, and automated tests confirm the behavior of every route. The split into routes, controllers and a model lets the next lab swap the array for a database without rewriting the rest of the code. Screenshots of the requests from Postman or a browser are still to be attached.

## Appendix A (mandatory) Listing of server.js

{{code:part-2/lab-01-node-server/server.js}}

## Appendix B (mandatory) Listing of app.js

{{code:part-2/lab-01-node-server/src/app.js}}

## Appendix C (mandatory) Listing of diagrams.routes.js

{{code:part-2/lab-01-node-server/src/routes/diagrams.routes.js}}

## Appendix D (mandatory) Listing of diagrams.controller.js

{{code:part-2/lab-01-node-server/src/controllers/diagrams.controller.js}}

## Appendix E (mandatory) Listing of diagram.model.js

{{code:part-2/lab-01-node-server/src/models/diagram.model.js}}

## Appendix F (mandatory) Listing of validate.js

{{code:part-2/lab-01-node-server/src/middleware/validate.js}}

## Appendix G (mandatory) Listing of error-handler.js

{{code:part-2/lab-01-node-server/src/middleware/error-handler.js}}

## Appendix H (mandatory) Listing of list-query.js

{{code:part-2/lab-01-node-server/src/middleware/list-query.js}}
