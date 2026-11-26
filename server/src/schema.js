'use strict';
const { badRequest } = require('./errors');
const limits = require('../limits.json');

// The field rules live here and nowhere else; routes only name the schema they use.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTATION_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const CONTROL_RE = /[\p{C}]/u;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bytes = (s) => Buffer.byteLength(s, 'utf8');

const email = (v) => {
  const value = v.trim().toLowerCase();
  if (value.length > limits.emailMax) return { error: `at most ${limits.emailMax} characters` };
  if (!EMAIL_RE.test(value) || value.split('@')[0].length > 64) return { error: 'must be a valid email' };
  return { value };
};

const password = (v) => {
  if (v.length < limits.passwordMin) return { error: `at least ${limits.passwordMin} characters` };
  if (bytes(v) > limits.passwordMaxBytes) return { error: `at most ${limits.passwordMaxBytes} bytes` };
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return { error: 'must contain a letter and a digit' };
  return { value: v };
};

const displayName = (v) => {
  const value = v.trim();
  if (value.length < 1 || value.length > limits.displayNameMax) return { error: `1 to ${limits.displayNameMax} characters` };
  if (/[<>]/.test(value) || CONTROL_RE.test(value)) return { error: 'contains forbidden characters' };
  return { value };
};

const text = (min, max) => (v) => {
  const value = v.trim();
  if (value.length < min || value.length > max) return { error: `${min} to ${max} characters` };
  return { value };
};

const free = (max) => (v) => (v.length > max ? { error: `at most ${max} characters` } : { value: v });
const oneOf =
  (...allowed) =>
  (v) =>
    allowed.includes(v) ? { value: v } : { error: `must be one of ${allowed.join(', ')}` };
const notation = (v) => (v.length < 1 || v.length > limits.notationMax || !NOTATION_RE.test(v) ? { error: 'invalid notation id' } : { value: v });
const plain = (max) => (v) => (v.length < 1 || v.length > max ? { error: `1 to ${max} characters` } : { value: v });

const SCHEMAS = {
  register: { email: { rule: email, required: true }, password: { rule: password, required: true }, displayName: { rule: displayName, required: true } },
  login: { email: { rule: plain(limits.emailMax), required: true }, password: { rule: plain(200), required: true } },
  token: { refreshToken: { rule: plain(200), required: true } },
  projectCreate: {
    title: { rule: text(1, limits.titleMax), required: true },
    notation: { rule: notation, required: true },
    description: { rule: free(limits.descriptionMax), default: '' },
    source: { rule: free(limits.sourceMax), default: '' },
    visibility: { rule: oneOf('private', 'shared'), default: 'private' },
  },
  projectUpdate: {
    title: { rule: text(1, limits.titleMax) },
    notation: { rule: notation },
    description: { rule: free(limits.descriptionMax) },
    source: { rule: free(limits.sourceMax) },
    visibility: { rule: oneOf('private', 'shared') },
  },
  member: { access: { rule: oneOf('read', 'write'), required: true } },
  role: { role: { rule: oneOf('user', 'editor', 'admin'), required: true } },
};

// Strict: wrong types, missing required fields and unknown keys are all errors.
function validateBody(body, schemaName, { requireAny = false } = {}) {
  const schema = SCHEMAS[schemaName];
  if (body === null || typeof body !== 'object' || Array.isArray(body))
    throw badRequest('validation_failed', 'Body must be a JSON object', [{ field: '', message: 'must be an object' }]);
  const details = [];
  const value = {};
  for (const key of Object.keys(body)) if (!Object.hasOwn(schema, key)) details.push({ field: key, message: 'unknown field' });
  for (const [field, def] of Object.entries(schema)) {
    const raw = body[field];
    if (raw === undefined) {
      if (def.required) details.push({ field, message: 'is required' });
      else if (def.default !== undefined) value[field] = def.default;
    } else if (typeof raw !== 'string') details.push({ field, message: 'must be a string' });
    else {
      const res = def.rule(raw);
      if (res.error) details.push({ field, message: res.error });
      else value[field] = res.value;
    }
  }
  if (requireAny && Object.keys(body).length === 0) details.push({ field: '', message: 'at least one field is required' });
  if (details.length) throw badRequest('validation_failed', 'Invalid input', details);
  return value;
}

const intParam = (v, name, min, max, fallback) => {
  if (v === undefined) return fallback;
  if (typeof v !== 'string' || !/^\d{1,9}$/.test(v) || Number(v) < min || Number(v) > max)
    throw badRequest('validation_failed', 'Invalid query', [{ field: name, message: `integer ${min}..${max}` }]);
  return Number(v);
};

// Paging, search and sorting for list endpoints. Unknown query keys are rejected.
function parseListQuery(query, { sorts = [], extra = [], pageSizeMax = limits.pageSizeMax } = {}) {
  const allowed = ['page', 'pageSize', 'q', 'sort', 'order', ...extra];
  for (const key of Object.keys(query)) {
    if (!allowed.includes(key)) throw badRequest('validation_failed', 'Invalid query', [{ field: key, message: 'unknown parameter' }]);
  }
  const bad = (field, message) => badRequest('validation_failed', 'Invalid query', [{ field, message }]);
  const single = (name) => {
    if (query[name] !== undefined && typeof query[name] !== 'string') throw bad(name, 'must be a single value');
    return query[name];
  };
  const page = intParam(query.page, 'page', 1, 1_000_000, 1);
  const pageSize = intParam(query.pageSize, 'pageSize', 1, pageSizeMax, Math.min(limits.pageSizeDefault, pageSizeMax));
  const q = single('q') ?? '';
  if (q.length > limits.searchMax) throw bad('q', `at most ${limits.searchMax} characters`);
  const sort = single('sort') ?? sorts[0];
  if (sorts.length && !sorts.includes(sort)) throw bad('sort', `one of ${sorts.join(', ')}`);
  const order = single('order') ?? 'desc';
  if (!['asc', 'desc'].includes(order)) throw bad('order', 'asc or desc');
  return { page, pageSize, q: q.trim(), sort, order, offset: (page - 1) * pageSize };
}

const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

module.exports = { validateBody, parseListQuery, isUuid, rules: { email, password } };
