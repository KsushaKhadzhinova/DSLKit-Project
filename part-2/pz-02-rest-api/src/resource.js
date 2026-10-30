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
// hidden: fields that never appear in a list and cannot be used to filter, search or sort it (otherwise ?email= or ?sort=email would reveal them).
export const listItems = (items, schema, query, hidden = []) => {
  const page = parsePositive(query.page, 'page', 1);
  const limit = parsePositive(query.limit, 'limit', 20, 100);
  let result = items.filter((item) => Object.keys(schema).every((field) => hidden.includes(field) || query[field] === undefined || String(item[field]) === String(query[field])));
  if (query.q !== undefined) {
    const needle = String(query.q).toLowerCase();
    const textFields = Object.keys(schema).filter((field) => schema[field].type === 'string' && !hidden.includes(field));
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
    if (hidden.includes(field) || (field !== 'id' && field !== 'createdAt' && !Object.hasOwn(schema, field))) throw new ApiError(400, 'invalid_query', `cannot sort by ${field}`);
    result = [...result].sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * (desc ? -1 : 1));
  }
  const total = result.length;
  const data = result.slice((page - 1) * limit, page * limit).map((item) => Object.fromEntries(Object.entries(item).filter(([field]) => !hidden.includes(field))));
  return { data, meta: { page, limit, total } };
};

// Builds the six standard routes for one resource.
// hooks.check(data, current) returns extra validation details for the fields present (references)
// and may throw a conflict; current is the record being changed, undefined on create.
//
// hooks.beforeRemove(item) may throw.
export const createResourceRouter = ({ label, collection, schema, hooks = {}, hiddenInList = [] }) => {
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

  router.get('/', (req, res) => res.json(listItems(collection.all(), schema, req.query, hiddenInList)));
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
