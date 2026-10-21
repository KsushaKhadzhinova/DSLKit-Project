# Practical Session 2. Design and Implementation of a REST API

## 1 Purpose of the Work

To learn the principles of designing a RESTful API, to implement endpoints for CRUD operations and extra operations, to add input validation and to document the API, using the DSLKit project, a diagram-as-code web editor whose theme matches the SaaS direction and the future course project.

## 2 Brief Theory

**Resources and methods.** REST describes the subject area as a set of resources with plural addresses such as `/api/diagrams`. Operations map to HTTP methods: `GET` reads, `POST` creates, `PUT` replaces a record entirely, `PATCH` changes part of the fields, `DELETE` removes. The methods `GET`, `PUT` and `DELETE` are idempotent: repeating a request does not change the result.

**Status codes.** Code 200 means success, 201 creation with a `Location` header, 204 success without a body, 400 a client error in the request, 404 a missing record, 409 a conflict with the current state of the data, 413 a body that is too large, 500 a server failure.

**Data validation.** The server does not trust the client: required fields, types, length and allowed values are checked before writing, and an error response has a single format.

## 3 Course of the Work

### 3.1 API design

Three related resources are chosen: users `users`, projects `projects` and diagrams `diagrams`. A user owns projects and a project holds diagrams. The fields are listed in table 1.

Table 1 – API resources and fields

| Resource   | Fields                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| `users`    | `name`, `email`, `role` (`owner`, `editor`, `viewer`)                     |
| `projects` | `name`, `description`, `ownerId`                                          |
| `diagrams` | `title`, `notation`, `code`, `projectId`, `status` (`draft`, `published`) |

Every record has the service fields `id` and `createdAt`, which the client cannot change. The data lives in arrays in memory, as the task requires, so the initial records return after a server restart.

### 3.2 Endpoints

Each resource has six standard operations, and diagrams and projects have three extra ones. All addresses are listed in table 2. The application assembly is shown in appendix A, the shared resource logic in appendix B and the field checks in appendix C.

Table 2 – API endpoints

| Method and address                 | Purpose                                   | Success |
| ---------------------------------- | ----------------------------------------- | ------- |
| `GET /api/{resource}`              | List with filter, search, sort and paging | 200     |
| `GET /api/{resource}/:id`          | One record                                | 200     |
| `POST /api/{resource}`             | Create                                    | 201     |
| `PUT /api/{resource}/:id`          | Full replacement                          | 200     |
| `PATCH /api/{resource}/:id`        | Partial change                            | 200     |
| `DELETE /api/{resource}/:id`       | Delete                                    | 204     |
| `GET /api/users/:id/projects`      | Projects of one user                      | 200     |
| `GET /api/projects/:id/diagrams`   | Diagrams of one project                   | 200     |
| `POST /api/diagrams/:id/publish`   | Publish, repeating changes nothing        | 200     |
| `POST /api/diagrams/:id/duplicate` | Copy of a diagram as a draft              | 201     |

Lists accept `page` and `limit` for paging, `sort` for sorting (a minus sign means descending), `q` for search in text fields and any field name for an exact filter. A list response holds the array `data` and the object `meta` with the total count. The route `GET /api/users/:id/projects` returns the projects of one user with the same list parameters and answers 404 for an unknown user. The file `API.md` collects detailed request and response examples.

### 3.3 Validation and errors

The schema of every resource sets the type, whether the field is required, the maximum length, the list of allowed values and the default. Validation returns all problems at once, rejects unknown fields and checks that `ownerId` and `projectId` point to existing records. The `PATCH` method checks only the sent fields. Deleting a user who owns projects or a project that has diagrams is rejected with code 409. All errors, including broken JSON, an unknown address and an unexpected failure, come back in one format with the fields `code` and `message`. Appendices A and B hold the listings.

### 3.4 Verification

Automatic tests start the server on a free port and check every method, the status codes, filters, sorting, paging, validation errors, the links between resources, the extra operations and the 500 response. Line and function coverage is 100 percent and branch coverage is above 98 percent. The command is `npm test` in the project folder. Manual checks in Postman or Insomnia can use the requests from `API.md`.

The server is started with `npm start`, and the console message is shown in figure 1.

![Server console](figures/01-server-start.png)

Figure 1 – Console message after the server starts on port 3000 (process output captured as text)

A browser does not send `POST`, `PUT`, `PATCH` and `DELETE` from the address bar, so the script `shots/shots.mjs` sent such requests, and the real requests and server answers are drawn on a page. Creating a user, a project and a diagram is shown in figure 2.

![Creating resources](figures/08-post-create.png)

Figure 2 – POST requests and the answers 201 for a user, a project and a diagram, recorded by a script (not a Postman window)

The `GET /api/users` request is opened in the browser at `http://localhost:3000/api/users`, and the answer is shown in figure 3.

![List of users](figures/02-users-list.png)

Figure 3 – Answer to GET /api/users in a browser window: an array of users

A single record at `http://localhost:3000/api/users/1` is shown in figure 4.

![One user](figures/03-user-one.png)

Figure 4 – Answer to GET /api/users/1 in a browser window: the object of one user

A request for a missing record at `http://localhost:3000/api/users/999` gives the error shown in figure 5.

![Answer 404](figures/04-user-404.png)

Figure 5 – Answer to GET /api/users/999 in a browser window: JSON with the code not_found (code 404)

A wrong id in the address `http://localhost:3000/api/users/abc` is refused, as in figure 6.

![Answer 400](figures/05-user-400.png)

Figure 6 – Answer to GET /api/users/abc in a browser window: JSON with a message about a wrong id (code 400)

Search, sorting and paging work through the address parameters `?q=billing&sort=-title&page=1&limit=10`, and the result is shown in figure 7.

![Search and sorting](figures/06-diagrams-search.png)

Figure 7 – Answer to GET /api/diagrams with the q, sort, page and limit parameters in a browser window

The additional route `GET /api/users/1/projects` returns the projects of one user, as in figure 8.

![Projects of a user](figures/07-user-projects.png)

Figure 8 – Answer to GET /api/users/1/projects in a browser window: the projects of the user

The data validation errors, including an unknown field and a project that does not exist, are shown in figure 9.

![Wrong data](figures/09-validation-400.png)

Figure 9 – Answers 400 with the list of field problems, recorded by a script (not a Postman window)

A partial change and a full replacement of a record are shown in figure 10.

![PATCH and PUT requests](figures/10-patch-put.png)

Figure 10 – PATCH and PUT requests and the server answers, recorded by a script (not a Postman window)

The additional operations of a diagram are shown in figure 11: publishing again changes nothing, and the copy is created as a draft.

![Publish and duplicate](figures/11-publish-duplicate.png)

Figure 11 – Publish and duplicate requests and the server answers, recorded by a script (not a Postman window)

Deleting a user with projects is refused, and deleting a diagram passes, as in figure 12.

![Deleting](figures/12-delete-409-204.png)

Figure 12 – DELETE requests: the answer 409 for a user with projects and the answer 204 for a diagram, recorded by a script (not a Postman window)

The result of the `npm test` command with the number of tests and the code coverage is shown in figure 13.

![Test result](figures/13-tests.png)

Figure 13 – End of the npm test output: the number of passed tests and the coverage table (process output captured as text)

### 3.5 Answers to the control questions

25. What are "cross-resource links" and how are they implemented in a REST API (for example, getting the orders of a user)?

    These are links between records of different resources, for example a project belongs to a user and a diagram belongs to a project. An API expresses a link in three ways. The first is a reference field in the record, in the work this is `ownerId` of a project and `projectId` of a diagram, and the server checks that such a record exists. The second is a nested route for reading, for example `GET /api/users/:id/projects` returns the projects of a user and `GET /api/projects/:id/diagrams` the diagrams of a project. The third is a list filter, and `GET /api/projects?ownerId=1` gives the same result. Nesting is kept at most two levels deep, and resource names are plural. The link guards deletion as well: a user with projects and a project with diagrams are not deleted, the answer is 409.

26. Which status codes are used for redirects (3xx)? Are they needed in a REST API?

    Code 301 means a permanent move of the address, 302 a temporary one, 307 and 308 do the same but keep the request method, 303 sends the client to another address with `GET`, and 304 says the cached response is still current. In Express a redirect is made by `res.redirect(status, url)`. A REST API needs redirects rarely: after `POST` it returns 201 with a `Location` header and the record itself instead of redirecting the client. Redirects are used when an address or an API version moves, and 304 for conditional requests with `ETag`. This work has no redirects.

27. How do you state the possible error codes and their descriptions in the API documentation?

    In OpenAPI each operation lists the codes in its `responses` section, for example `400`, `404` and `409`, and gives a description and a body schema for each. The common error schema is described once in `components` and attached by reference. In the work the documentation lives in `API.md`: the table of each route has a column with the possible error codes, and the "Errors" section shows the single response shape `{ "error": { "code", "message", "details" } }` and lists the `code` values with their status codes. That way a client knows which errors to expect and how to parse them.

## Conclusion

For the DSLKit project a REST API with three related resources was designed and implemented. It supports CRUD operations, filtering, search, sorting, paging, publishing and copying of diagrams, validates input and the links between records, and answers with errors in one format. `API.md` holds the API description and request examples, and automatic tests cover all the code. Postman screenshots and documentation excerpts remain to be attached.

## Appendix A (mandatory) Listing of the file app.js

```js
import express from 'express';
import { ApiError, errorBody, notFound } from './errors.js';
import { createResourceRouter, listItems, methodsOnly, parseId } from './resource.js';
import { logSafe, rateLimit, securityHeaders } from './security.js';
import { createStores } from './store.js';

export const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

const ID = { type: 'integer', required: true, min: 1, max: 2147483647 };

export const schemas = {
  users: {
    name: { type: 'string', required: true, max: 60 },
    email: { type: 'string', required: true, max: 120, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    role: { type: 'string', enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
  },
  projects: {
    name: { type: 'string', required: true, max: 80 },
    description: { type: 'string', max: 500, default: '' },
    ownerId: ID,
  },
  diagrams: {
    title: { type: 'string', required: true, max: 80 },
    notation: { type: 'string', enum: NOTATIONS, required: true },
    code: { type: 'string', max: 10000, default: '' },
    projectId: ID,
    status: { type: 'string', enum: ['draft', 'published'], default: 'draft' },
  },
};

const CLIENT_ERRORS = {
  400: ['bad_request', 'The request URL or headers are malformed'],
  415: ['unsupported_media_type', 'The request encoding or charset is not supported'],
};

const missingReference = (field, collection, value) =>
  value !== undefined && !collection.find(value) ? [{ field, message: `${field} refers to a record that does not exist` }] : [];

const conflict = (message) => new ApiError(409, 'conflict', message);

export const createApp = ({ stores = createStores(), writeError = console.error, limit = { windowMs: 60000, max: 300 }, now = Date.now } = {}) => {
  const { users, projects, diagrams } = stores;
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  // Liveness probe, before the rate limit so monitoring never uses up the quota.
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  // Refused before the body is read, so a flood costs little.
  app.use(rateLimit({ ...limit, now }));
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  // Link between resources: the projects that belong to one user. It is mounted before the standard router so it wins over /:id.
  api.get('/users/:id/projects', (req, res) => {
    const user = users.find(parseId(req.params.id));
    if (!user) throw notFound('User');
    res.json(
      listItems(
        projects.all().filter((p) => p.ownerId === user.id),
        schemas.projects,
        req.query,
      ),
    );
  });
  api.all('/users/:id/projects', methodsOnly('GET'));
  api.use(
    '/users',
    createResourceRouter({
      label: 'User',
      collection: users,
      schema: schemas.users,
      hooks: {
        check: (data, current) => {
          const taken = data.email !== undefined && users.all().some((user) => user !== current && user.email.toLowerCase() === data.email.toLowerCase());
          if (taken) throw conflict('A user with this email already exists');
          return [];
        },
        beforeRemove: (user) => {
          if (projects.all().some((project) => project.ownerId === user.id)) throw conflict('User still owns projects');
        },
      },
    }),
  );

  // Extra operations are mounted before the standard routers so they win over /:id.
  api.get('/projects/:id/diagrams', (req, res) => {
    const project = projects.find(parseId(req.params.id));
    if (!project) throw notFound('Project');
    res.json(
      listItems(
        diagrams.all().filter((d) => d.projectId === project.id),
        schemas.diagrams,
        req.query,
      ),
    );
  });
  api.all('/projects/:id/diagrams', methodsOnly('GET'));
  api.use(
    '/projects',
    createResourceRouter({
      label: 'Project',
      collection: projects,
      schema: schemas.projects,
      hooks: {
        check: (data) => missingReference('ownerId', users, data.ownerId),
        beforeRemove: (project) => {
          if (diagrams.all().some((diagram) => diagram.projectId === project.id)) throw conflict('Project still has diagrams');
        },
      },
    }),
  );

  const diagram = (req) => {
    const found = diagrams.find(parseId(req.params.id));
    if (!found) throw notFound('Diagram');
    return found;
  };
  api.post('/diagrams/:id/publish', (req, res) => res.json(diagrams.update(diagram(req), { status: 'published' })));
  api.post('/diagrams/:id/duplicate', (req, res) => {
    const { id, createdAt, ...rest } = diagram(req);
    res.status(201).json(diagrams.create({ ...rest, title: `${rest.title} (copy)`.slice(0, 80), status: 'draft' }));
  });
  api.all('/diagrams/:id/publish', methodsOnly('POST'));
  api.all('/diagrams/:id/duplicate', methodsOnly('POST'));
  api.use(
    '/diagrams',
    createResourceRouter({
      label: 'Diagram',
      collection: diagrams,
      schema: schemas.diagrams,
      hooks: { check: (data) => missingReference('projectId', projects, data.projectId) },
    }),
  );

  app.use('/api', api);
  app.use((req, res, next) => next(notFound('Route')));

  // Four parameters: the single place where every error becomes JSON.
  app.use((err, req, res, _next) => {
    if (err instanceof ApiError) return res.status(err.status).json(errorBody(err));
    if (err.type === 'entity.parse.failed') return res.status(400).json(errorBody(new ApiError(400, 'invalid_json', 'Request body is not valid JSON')));
    if (err.type === 'entity.too.large') return res.status(413).json(errorBody(new ApiError(413, 'payload_too_large', 'Request body is too large')));
    // Errors of the framework and of the body parser that blame the client keep their 4xx status: a broken
    // percent escape in the URL is 400 and an unsupported Content-Encoding is 415, neither is a server failure.
    const status = err.status ?? err.statusCode;
    if (status >= 400 && status < 500) {
      const known = CLIENT_ERRORS[status] ?? ['bad_request', 'The request cannot be processed'];
      return res.status(status).json(errorBody(new ApiError(status, known[0], known[1])));
    }
    writeError(`[error] ${logSafe(req.method)} ${logSafe(req.originalUrl)}`, err);
    return res.status(500).json(errorBody(new ApiError(500, 'internal_error', 'Internal server error')));
  });
  return app;
};
```

## Appendix B (mandatory) Listing of the file resource.js

```js
import { Router } from 'express';
import { ApiError, notFound, validationFailed } from './errors.js';
import { applyDefaults, trimStrings, validate } from './validation.js';

// Answers 405 with an Allow header for methods a known path does not support; OPTIONS lists them.
export const methodsOnly = (...methods) => {
  const allow = [...methods, ...(methods.includes('GET') ? ['HEAD'] : []), 'OPTIONS'].join(', ');
  return (req, res, next) => {
    res.set('Allow', allow);
    if (req.method === 'OPTIONS') return res.status(204).end();
    return next(new ApiError(405, 'method_not_allowed', `${req.method} is not allowed here, use: ${allow}`));
  };
};

const DIGITS = /^[1-9]\d{0,14}$/;

export const parseId = (raw) => {
  if (!DIGITS.test(String(raw))) throw new ApiError(400, 'invalid_id', 'id must be a positive integer');
  return Number(raw);
};

const parsePositive = (raw, name, fallback, max = Number.MAX_SAFE_INTEGER) => {
  if (raw === undefined) return fallback;
  if (!DIGITS.test(String(raw)) || Number(raw) > max) throw new ApiError(400, 'invalid_query', `${name} must be an integer from 1 to ${max}`);
  return Number(raw);
};

// Filtering by any schema field (?status=draft), search (?q=text), sorting (?sort=-title), pagination (?page=2&limit=10).
export const listItems = (items, schema, query) => {
  const page = parsePositive(query.page, 'page', 1);
  const limit = parsePositive(query.limit, 'limit', 20, 100);
  let result = items.filter((item) => Object.keys(schema).every((field) => query[field] === undefined || String(item[field]) === String(query[field])));
  if (query.q !== undefined) {
    const needle = String(query.q).toLowerCase();
    const textFields = Object.keys(schema).filter((field) => schema[field].type === 'string');
    result = result.filter((item) =>
      textFields.some((field) =>
        String(item[field] ?? '')
          .toLowerCase()
          .includes(needle),
      ),
    );
  }
  if (query.sort !== undefined) {
    const desc = String(query.sort).startsWith('-');
    const field = String(query.sort).replace(/^-/, '');
    if (field !== 'id' && field !== 'createdAt' && !Object.hasOwn(schema, field)) throw new ApiError(400, 'invalid_query', `cannot sort by ${field}`);
    result = [...result].sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * (desc ? -1 : 1));
  }
  const total = result.length;
  return { data: result.slice((page - 1) * limit, page * limit), meta: { page, limit, total } };
};

// Builds the six standard routes for one resource.
// hooks.check(data, current) returns extra validation details for the fields present (references)
// and may throw a conflict; current is the record being changed, undefined on create.
//
// hooks.beforeRemove(item) may throw.
export const createResourceRouter = ({ label, collection, schema, hooks = {} }) => {
  const router = Router();
  const body = (req, partial, current) => {
    const input = trimStrings(schema, req.body);
    const errors = validate(schema, input, { partial });
    const data = partial ? input : applyDefaults(schema, input);
    const details = errors.length ? errors : (hooks.check?.(data, current) ?? []);
    if (details.length) throw validationFailed(details);
    return data;
  };
  const load = (req) => {
    const item = collection.find(parseId(req.params.id));
    if (!item) throw notFound(label);
    return item;
  };

  router.get('/', (req, res) => res.json(listItems(collection.all(), schema, req.query)));
  router.get('/:id', (req, res) => res.json(load(req)));
  router.post('/', (req, res) => {
    const item = collection.create(body(req, false));
    res.status(201).location(`${req.baseUrl}/${item.id}`).json(item);
  });
  router.put('/:id', (req, res) => {
    const item = load(req);
    res.json(collection.replace(item, body(req, false, item)));
  });
  router.patch('/:id', (req, res) => {
    const item = load(req);
    res.json(collection.update(item, body(req, true, item)));
  });
  router.delete('/:id', (req, res) => {
    const item = load(req);
    hooks.beforeRemove?.(item);
    collection.remove(item);
    res.status(204).end();
  });
  router.all('/', methodsOnly('GET', 'POST'));
  router.all('/:id', methodsOnly('GET', 'PUT', 'PATCH', 'DELETE'));
  return router;
};
```

## Appendix C (mandatory) Listing of the file validation.js

```js
// A schema maps a field name to { type, required, max, enum, pattern, default }.
// Types: 'string', 'integer'. Returns a list of { field, message }.
const checkField = (name, rule, value) => {
  if (rule.type === 'integer') {
    if (!Number.isInteger(value)) return `${name} must be an integer`;
    if (value < rule.min || value > rule.max) return `${name} must be between ${rule.min} and ${rule.max}`;
  }
  if (rule.type === 'string') {
    if (typeof value !== 'string') return `${name} must be a string`;
    if (rule.required && value.trim() === '') return `${name} must not be empty`;
    if (rule.max && value.length > rule.max) return `${name} must be at most ${rule.max} characters`;
    if (rule.pattern && !rule.pattern.test(value)) return `${name} has an invalid format`;
  }
  if (rule.enum && !rule.enum.includes(value)) return `${name} must be one of: ${rule.enum.join(', ')}`;
  return null;
};

// partial=true is used by PATCH: required fields may be missing, present ones are still checked.
export const validate = (schema, body, { partial = false } = {}) => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return [{ field: 'body', message: 'body must be a JSON object' }];
  if (partial && Object.keys(body).length === 0) return [{ field: 'body', message: 'send at least one field to change' }];
  const errors = [];
  for (const field of Object.keys(body)) {
    if (!Object.hasOwn(schema, field)) errors.push({ field, message: `${field} is not a known field` });
  }
  for (const [field, rule] of Object.entries(schema)) {
    const value = body[field];
    if (value === undefined) {
      if (rule.required && !partial && rule.default === undefined) errors.push({ field, message: `${field} is required` });
      continue;
    }
    const message = checkField(field, rule, value);
    if (message) errors.push({ field, message });
  }
  return errors;
};

export const applyDefaults = (schema, body) => {
  const result = { ...body };
  for (const [field, rule] of Object.entries(schema)) {
    if (result[field] === undefined && rule.default !== undefined) result[field] = rule.default;
  }
  return result;
};

// Trims surrounding whitespace of known string fields, so " Ada " is stored as "Ada".
export const trimStrings = (schema, body) => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return body;
  const result = { ...body };
  for (const field of Object.keys(result)) {
    if (Object.hasOwn(schema, field) && typeof result[field] === 'string') result[field] = result[field].trim();
  }
  return result;
};
```
