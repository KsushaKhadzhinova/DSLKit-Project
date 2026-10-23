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
const MEANING = { 400: 'Invalid data', 404: 'Not found', 409: 'Conflict', 413: 'Body too large', 415: 'The body is not JSON' };
const response = (description, schema) => ({ description, ...(schema && { content: { 'application/json': { schema } } }) });
const errors = (...codes) => Object.fromEntries(codes.map((code) => [String(code), response(MEANING[code], ERROR)]));

const idParameter = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };
const listParameters = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  { name: 'sort', in: 'query', description: 'A field name, a leading minus sorts in descending order.', schema: { type: 'string' } },
  { name: 'q', in: 'query', description: 'A part of any text field, ignoring case.', schema: { type: 'string' } },
];

const singular = (resource) => resource[0].toUpperCase() + resource.slice(1, -1);

// The two operations of one resource collection and the four of one record.
const resourcePaths = (resource, schema, hidden) => {
  const name = singular(resource);
  const ref = { $ref: `#/components/schemas/${name}` };
  const input = { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}Input` } } } };
  // A hidden field is not offered as a filter, because the list cannot be filtered by it.
  const filters = Object.keys(schema)
    .filter((field) => !hidden.includes(field))
    .map((field) => ({ name: field, in: 'query', schema: propertyOf(schema[field]) }));
  return {
    [`/${resource}`]: {
      get: { summary: `List ${resource}`, parameters: [...listParameters, ...filters], responses: { 200: response('A page of records', { type: 'object', properties: { data: { type: 'array', items: ref }, meta: { type: 'object' } } }), ...errors(400) } },
      post: { summary: `Create a record of ${resource}`, requestBody: input, responses: { 201: response('Created', ref), ...errors(400, 409, 413, 415) } },
    },
    [`/${resource}/{id}`]: {
      get: { summary: `One record of ${resource}`, parameters: [idParameter], responses: { 200: response('The record', ref), ...errors(400, 404) } },
      put: { summary: 'Replace the whole record', parameters: [idParameter], requestBody: input, responses: { 200: response('The record', ref), ...errors(400, 404, 409, 415) } },
      patch: { summary: 'Change only the sent fields', parameters: [idParameter], requestBody: input, responses: { 200: response('The record', ref), ...errors(400, 404, 409, 415) } },
      delete: { summary: 'Delete', parameters: [idParameter], responses: { 204: response('Deleted'), ...errors(400, 404, 409) } },
    },
  };
};

const DIAGRAM = { $ref: '#/components/schemas/Diagram' };
const extraPaths = () => ({
  '/users/{id}/projects': { get: { summary: 'Projects of a user', parameters: [idParameter, ...listParameters], responses: { 200: response('A page of projects'), ...errors(400, 404) } } },
  '/projects/{id}/diagrams': { get: { summary: 'Diagrams of a project', parameters: [idParameter, ...listParameters], responses: { 200: response('A page of diagrams'), ...errors(400, 404) } } },
  '/diagrams/{id}/publish': { post: { summary: 'Set the status to published', parameters: [idParameter], responses: { 200: response('The record', DIAGRAM), ...errors(400, 404) } } },
  '/diagrams/{id}/duplicate': { post: { summary: 'Copy a diagram as a draft', parameters: [idParameter], responses: { 201: response('The copy', DIAGRAM), ...errors(400, 404) } } },
});

// hidden: { users: ['email'] } names the fields that are not offered as list filters.
export const buildOpenApi = (schemas, { hidden = {} } = {}) => {
  const components = { Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, details: { type: 'array', items: { type: 'object' } } } } } } };
  let paths = {};
  for (const [resource, schema] of Object.entries(schemas)) {
    const input = schemaOf(schema);
    components[singular(resource)] = {
      ...input,
      properties: { id: { type: 'integer', readOnly: true }, createdAt: { type: 'string', format: 'date-time', readOnly: true }, ...input.properties },
    };
    components[`${singular(resource)}Input`] = input;
    paths = { ...paths, ...resourcePaths(resource, schema, hidden[resource] ?? []) };
  }
  return { openapi: '3.0.3', info: { title: 'DSLKit REST API', version: '1.0.0' }, servers: [{ url: '/api' }], paths: { ...paths, ...extraPaths() }, components: { schemas: components } };
};
