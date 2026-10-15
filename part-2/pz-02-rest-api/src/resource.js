import { Router } from 'express';
import { ApiError, notFound, validationFailed } from './errors.js';
import { applyDefaults, validate } from './validation.js';

export const parseId = (raw) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, 'invalid_id', 'id must be a positive integer');
  return id;
};

const parsePositive = (raw, name, fallback, max = Infinity) => {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > max) throw new ApiError(400, 'invalid_query', `${name} must be an integer from 1 to ${max}`);
  return value;
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
    if (field !== 'id' && field !== 'createdAt' && !schema[field]) throw new ApiError(400, 'invalid_query', `cannot sort by ${field}`);
    result = [...result].sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * (desc ? -1 : 1));
  }
  const total = result.length;
  return { data: result.slice((page - 1) * limit, page * limit), meta: { page, limit, total } };
};

// Builds the six standard routes for one resource.
// hooks.check(data) returns extra validation details for the fields present (references),
// hooks.beforeRemove(item) may throw.
export const createResourceRouter = ({ label, collection, schema, hooks = {} }) => {
  const router = Router();
  const body = (req, partial) => {
    const errors = validate(schema, req.body, { partial });
    const data = partial ? req.body : applyDefaults(schema, req.body);
    const details = errors.length ? errors : (hooks.check?.(data) ?? []);
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
    res.json(collection.replace(item, body(req, false)));
  });
  router.patch('/:id', (req, res) => {
    const item = load(req);
    res.json(collection.update(item, body(req, true)));
  });
  router.delete('/:id', (req, res) => {
    const item = load(req);
    hooks.beforeRemove?.(item);
    collection.remove(item);
    res.status(204).end();
  });
  return router;
};
