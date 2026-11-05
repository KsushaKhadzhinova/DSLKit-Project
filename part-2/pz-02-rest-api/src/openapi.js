// An OpenAPI 3.0 description built from the same schemas that validate the requests, so the document cannot drift from the code.
const typeOf = (rule) => (rule.type === 'integer' ? 'integer' : 'string');

const propertyOf = (rule) => ({
  type: typeOf(rule),
  ...(rule.max !== undefined && rule.type === 'string' && { maxLength: rule.max }),
  ...(rule.min !== undefined && { minimum: rule.min }),
  ...(rule.type === 'integer' && rule.max !== undefined && { maximum: rule.max }),
  ...(rule.enum && { enum: rule.enum }),
  ...(rule.default !== undefined && { default: rule.default }),
});

const schemaOf = (schema) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.entries(schema)
    .filter(([, rule]) => rule.required && rule.default === undefined)
    .map(([name]) => name),
  properties: Object.fromEntries(Object.entries(schema).map(([name, rule]) => [name, propertyOf(rule)])),
});

const ERROR = { $ref: '#/components/schemas/Error' };
const MEANING = { 400: 'Invalid data', 404: 'Not found', 406: 'The client does not accept application/json', 409: 'Conflict', 413: 'Body too large', 415: 'The body is not JSON', 429: 'Too many requests' };
const response = (description, schema) => ({ description, ...(schema && { content: { 'application/json': { schema } } }) });
const errors = (...codes) => Object.fromEntries(codes.map((code) => [String(code), response(MEANING[code], ERROR)]));
// Every operation can also fail in a way not tied to its own business rules (406, 429, or an unexpected 500);
// "default" covers any status not listed explicitly, instead of leaving those undocumented.
const COMMON = { ...errors(406, 429), default: response('An unexpected error', ERROR) };

// The real ceiling DIGITS (src/resource.js) enforces for an id, page or limit: 15 digits, below
// Number.MAX_SAFE_INTEGER. Kept as a literal here so the document does not import application code.
const MAX_QUERY_INT = 999999999999999;

const idParameter = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: MAX_QUERY_INT } };
const listParameters = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: MAX_QUERY_INT, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  { name: 'sort', in: 'query', description: 'A field name, a leading minus sorts in descending order.', schema: { type: 'string' } },
  { name: 'q', in: 'query', description: 'A part of any text field, ignoring case.', schema: { type: 'string' } },
];

const singular = (resource) => resource[0].toUpperCase() + resource.slice(1, -1);

// Whether a write (POST/PUT/PATCH) or a DELETE of this resource can really answer 409, so the document offers
// exactly the conflicts the code can produce instead of a 409 declared on every resource out of habit.
const CONFLICTS = {
  users: { write: true, remove: true }, // an email already used by another user; deleting a user who owns projects
  projects: { write: false, remove: true }, // deleting a project that still has diagrams
  diagrams: { write: false, remove: false },
};

const list = (itemsRef) => ({ type: 'object', properties: { data: { type: 'array', items: itemsRef }, meta: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } } } } });

// The two operations of one resource collection and the four of one record.
const resourcePaths = (resource, schema, hidden) => {
  const name = singular(resource);
  const ref = { $ref: `#/components/schemas/${name}` };
  // A hidden field never appears in a list response, so the list uses a schema without it and without
  // requiring it, instead of the full record schema the list can never actually satisfy.
  const listRef = hidden.length ? { $ref: `#/components/schemas/${name}ListItem` } : ref;
  const input = { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}Input` } } } };
  const conflicts = CONFLICTS[resource] ?? { write: false, remove: false };
  // A hidden field is not offered as a filter, because the list cannot be filtered by it.
  const filters = Object.keys(schema)
    .filter((field) => !hidden.includes(field))
    .map((field) => ({ name: field, in: 'query', schema: propertyOf(schema[field]) }));
  return {
    [`/${resource}`]: {
      get: { summary: `List ${resource}`, parameters: [...listParameters, ...filters], responses: { 200: response('A page of records', list(listRef)), ...errors(400), ...COMMON } },
      post: { summary: `Create a record of ${resource}`, requestBody: input, responses: { 201: response('Created', ref), ...errors(400, 413, 415, ...(conflicts.write ? [409] : [])), ...COMMON } },
    },
    [`/${resource}/{id}`]: {
      get: { summary: `One record of ${resource}`, parameters: [idParameter], responses: { 200: response('The record', ref), ...errors(400, 404), ...COMMON } },
      put: { summary: 'Replace the whole record; a field left out of the body keeps its current value instead of resetting to the default', parameters: [idParameter], requestBody: input, responses: { 200: response('The record', ref), ...errors(400, 404, 415, ...(conflicts.write ? [409] : [])), ...COMMON } },
      patch: { summary: 'Change only the sent fields', parameters: [idParameter], requestBody: input, responses: { 200: response('The record', ref), ...errors(400, 404, 415, ...(conflicts.write ? [409] : [])), ...COMMON } },
      delete: { summary: 'Delete', parameters: [idParameter], responses: { 204: response('Deleted'), ...errors(400, 404, ...(conflicts.remove ? [409] : [])), ...COMMON } },
    },
  };
};

const DIAGRAM = { $ref: '#/components/schemas/Diagram' };
const extraPaths = () => ({
  '/users/{id}/projects': { get: { summary: 'Projects of a user', parameters: [idParameter, ...listParameters], responses: { 200: response('A page of projects', list({ $ref: '#/components/schemas/Project' })), ...errors(400, 404), ...COMMON } } },
  '/projects/{id}/diagrams': { get: { summary: 'Diagrams of a project', parameters: [idParameter, ...listParameters], responses: { 200: response('A page of diagrams', list(DIAGRAM)), ...errors(400, 404), ...COMMON } } },
  '/diagrams/{id}/publish': { post: { summary: 'Set the status to published', parameters: [idParameter], responses: { 200: response('The record', DIAGRAM), ...errors(400, 404), ...COMMON } } },
  '/diagrams/{id}/duplicate': { post: { summary: 'Copy a diagram as a draft', parameters: [idParameter], responses: { 201: response('The copy', DIAGRAM), ...errors(400, 404, 409), ...COMMON } } },
});

// hidden: { users: ['email'] } names the fields that are not offered as list filters and that a list response
// cannot contain, so its schema (nameListItem) is generated without them.
export const buildOpenApi = (schemas, { hidden = {} } = {}) => {
  const components = { Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, details: { type: 'array', items: { type: 'object' } } } } } } };
  let paths = {};
  for (const [resource, schema] of Object.entries(schemas)) {
    const input = schemaOf(schema);
    const name = singular(resource);
    const full = { ...input, properties: { id: { type: 'integer', readOnly: true }, createdAt: { type: 'string', format: 'date-time', readOnly: true }, ...input.properties } };
    components[name] = full;
    components[`${name}Input`] = input;
    const hiddenFields = hidden[resource] ?? [];
    if (hiddenFields.length) {
      components[`${name}ListItem`] = {
        ...full,
        properties: Object.fromEntries(Object.entries(full.properties).filter(([field]) => !hiddenFields.includes(field))),
        required: full.required.filter((field) => !hiddenFields.includes(field)),
      };
    }
    paths = { ...paths, ...resourcePaths(resource, schema, hiddenFields) };
  }
  return { openapi: '3.0.3', info: { title: 'DSLKit REST API', version: '1.0.0' }, servers: [{ url: '/api' }], paths: { ...paths, ...extraPaths() }, components: { schemas: components } };
};
