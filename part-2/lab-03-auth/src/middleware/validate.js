const { badRequest } = require('../errors');
const { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY, LIMITS, MAX_ID } = require('../models/diagram.constants');

// Text is checked after trimming, so the stored value is what was measured.
const text = (name) => (v) => {
  if (typeof v !== 'string' || v.trim() === '') return 'must be a non-empty string';
  return v.trim().length <= LIMITS[name] || `must be at most ${LIMITS[name]} characters`;
};

const checks = {
  title: text('title'),
  notation: (v) => NOTATIONS.includes(v) || `must be one of ${NOTATIONS.join(', ')}`,
  sourceCode: text('sourceCode'),
  priority: (v) => PRIORITIES.includes(v) || `must be one of ${PRIORITIES.join(', ')}`,
};

// Builds the id check for a route param. The raw text is checked first because Number() would accept '0x1', '1e0' and ' 1'.
const parseId =
  (key = 'diagramId', label = 'Diagram') =>
  (req, _res, next) => {
    const id = Number(req.params.id);
    // Ids above the INTEGER column range would make PostgreSQL fail with a 500, so they are rejected here.
  if (!/^[1-9]\d*$/.test(req.params.id) || id > MAX_ID) return next(badRequest(`${label} id must be a positive integer up to ${MAX_ID}`));
    req[key] = id;
    return next();
  };

// POST and PUT both carry the whole diagram, so one validator serves both.
// The owner is never taken from the body: the controller sets it from the token. The title is trimmed before saving.
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
  req.diagramFields = Object.fromEntries(Object.keys(checks).map((name) => [name, name === 'title' ? fields[name].trim() : fields[name]]));
  return next();
};

module.exports = { parseId, validateDiagram };
