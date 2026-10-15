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

```js
const { createApp } = require('./src/app');

try {
  process.loadEnvFile();
} catch {
  // .env is optional, defaults apply
}

const port = Number(process.env.PORT) || 3000;

createApp().listen(port, () => console.log(`Server running on http://localhost:${port}`));
```

## Appendix B – Listing of app.js

```js
const express = require('express');
const { createDiagramStore } = require('./models/diagram.model');
const { createDiagramsController } = require('./controllers/diagrams.controller');
const { createDiagramsRouter } = require('./routes/diagrams.routes');
const { routeNotFound, errorHandler } = require('./middleware/error-handler');

const createApp = (store = createDiagramStore()) => {
  const app = express();
  app.use(express.json());
  app.use('/diagrams', createDiagramsRouter(createDiagramsController(store)));
  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
```

## Appendix C – Listing of diagrams.routes.js

```js
const { Router } = require('express');
const { parseId, validateDiagram } = require('../middleware/validate');

const createDiagramsRouter = (controller) => {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', validateDiagram, controller.create);
  router.get('/:id', parseId, controller.get);
  router.put('/:id', parseId, validateDiagram, controller.replace);
  router.delete('/:id', parseId, controller.remove);
  return router;
};

module.exports = { createDiagramsRouter };
```

## Appendix D – Listing of diagrams.controller.js

```js
const { notFound } = require('../errors');

const missing = (id) => notFound(`Diagram ${id} not found`);

const createDiagramsController = (store) => ({
  list: (_req, res) => res.json(store.findAll()),

  get: (req, res, next) => {
    const diagram = store.findById(req.diagramId);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  create: (req, res) => {
    const diagram = store.create(req.diagramFields);
    res.status(201).location(`/diagrams/${diagram.id}`).json(diagram);
  },

  replace: (req, res, next) => {
    const diagram = store.replace(req.diagramId, req.diagramFields);
    return diagram ? res.json(diagram) : next(missing(req.diagramId));
  },

  remove: (req, res, next) => (store.remove(req.diagramId) ? res.status(204).end() : next(missing(req.diagramId))),
});

module.exports = { createDiagramsController };
```

## Appendix E – Listing of diagram.model.js

```js
const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];
const PRIORITIES = ['low', 'normal', 'high'];
const DEFAULT_PRIORITY = 'normal';

const SEED = [
  { title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> check -> pay -> ship', priority: 'high', owner: 'anna' },
  { title: 'Billing schema', notation: 'ERD', sourceCode: 'entity Invoice { id; total }', priority: 'normal', owner: 'boris' },
];

const createDiagramStore = (initial = SEED) => {
  let nextId = 1;
  let diagrams = [];

  const create = (fields) => {
    const diagram = { id: nextId, ...fields };
    nextId += 1;
    diagrams.push(diagram);
    return diagram;
  };

  initial.forEach(create);

  return {
    findAll: () => [...diagrams],
    findById: (id) => diagrams.find((d) => d.id === id),
    create,
    replace: (id, fields) => {
      const index = diagrams.findIndex((d) => d.id === id);
      if (index < 0) return undefined;
      diagrams[index] = { id, ...fields };
      return diagrams[index];
    },
    remove: (id) => {
      const before = diagrams.length;
      diagrams = diagrams.filter((d) => d.id !== id);
      return diagrams.length < before;
    },
  };
};

module.exports = { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY, createDiagramStore };
```

## Appendix F – Listing of validate.js

```js
const { badRequest } = require('../errors');
const { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY } = require('../models/diagram.model');

const isText = (value) => typeof value === 'string' && value.trim() !== '';

const checks = {
  title: (v) => isText(v) || 'must be a non-empty string',
  notation: (v) => NOTATIONS.includes(v) || `must be one of ${NOTATIONS.join(', ')}`,
  sourceCode: (v) => isText(v) || 'must be a non-empty string',
  priority: (v) => PRIORITIES.includes(v) || `must be one of ${PRIORITIES.join(', ')}`,
  owner: (v) => isText(v) || 'must be a non-empty string',
};

const parseId = (req, _res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return next(badRequest('Diagram id must be a positive integer'));
  req.diagramId = id;
  return next();
};

// POST and PUT both carry the whole diagram, so one validator serves both.
// Priority is optional and falls back to the default; unknown fields are dropped.
const validateDiagram = (req, _res, next) => {
  const body = req.body;
  if (typeof body !== 'object' || Array.isArray(body)) {
    return next(badRequest('Request body must be a JSON object'));
  }
  const fields = { ...body, priority: body.priority ?? DEFAULT_PRIORITY };
  const details = Object.entries(checks)
    .map(([name, check]) => ({ field: name, result: check(fields[name]) }))
    .filter(({ result }) => result !== true)
    .map(({ field, result }) => ({ field, message: result }));
  if (details.length > 0) return next(badRequest('Invalid diagram data', details));
  req.diagramFields = Object.fromEntries(Object.keys(checks).map((name) => [name, fields[name]]));
  return next();
};

module.exports = { parseId, validateDiagram };
```

## Appendix G – Listing of error-handler.js

```js
const { notFound } = require('../errors');

const routeNotFound = (req, _res, next) => next(notFound(`Route ${req.method} ${req.path} not found`));

// Express treats a function with four parameters as error-handling middleware.
const errorHandler = (err, _req, res, _next) => {
  const malformedJson = err.type === 'entity.parse.failed';
  const status = malformedJson ? 400 : (err.status ?? 500);
  if (status >= 500) console.error(err);
  const body = {
    error: status >= 500 ? 'Internal server error' : malformedJson ? 'Malformed JSON in request body' : err.message,
  };
  if (err.details) body.details = err.details;
  res.status(status).json(body);
};

module.exports = { routeNotFound, errorHandler };
```
