const { badRequest } = require('../errors');
const { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY, LIMITS, MAX_ID } = require('../models/diagram.constants');

// Spaces of every kind plus zero-width characters (joiners, word joiner, BOM) look empty, so they count as empty.
const INVISIBLE = /[\s\u200B-\u200D\u2060\uFEFF]/g;
// Control characters (NUL, bell, escape) are not text; a single-line field must not carry them.
const CONTROL = /[\u0000-\u001F\u007F]/;

// Text is checked after trimming, so the stored value is what was measured.
const text =
  (name, singleLine = false) =>
  (v) => {
    if (typeof v !== 'string' || v.replace(INVISIBLE, '') === '') return 'must be a non-empty string';
    if (singleLine && CONTROL.test(v)) return 'must not contain control characters';
    return v.trim().length <= LIMITS[name] || `must be at most ${LIMITS[name]} characters`;
  };
const TRIMMED = ['title', 'owner'];

const checks = {
  title: text('title', true),
  notation: (v) => NOTATIONS.includes(v) || `must be one of ${NOTATIONS.join(', ')}`,
  sourceCode: text('sourceCode'),
  priority: (v) => PRIORITIES.includes(v) || `must be one of ${PRIORITIES.join(', ')}`,
  owner: text('owner', true),
  // A counter that is never negative. Strings, fractions, NaN and numbers beyond the limit are refused, so a huge value never reaches the database.
  revision: (v) => (Number.isInteger(v) && v >= 0 && v <= LIMITS.revisionMax) || `must be a whole number from 0 to ${LIMITS.revisionMax}`,
  // The project of the diagram (one project has many diagrams), null means no project. Whether it exists is checked by the controller.
  projectId: (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= MAX_ID) || `must be null or a positive whole number up to ${MAX_ID}`,
};
const OPTIONAL = { priority: DEFAULT_PRIORITY, revision: 0, projectId: null };

// Builds the :id parser of a resource, the number lands in req[target].
const idParser = (label, target) => (req, _res, next) => {
  // Number() would accept '0x1', '1e0' and ' 1', so the raw text is checked first.
  const id = Number(req.params.id);
  // Ids above the INTEGER column range would make PostgreSQL fail with a 500, so they are rejected here.
  if (!/^[1-9]\d*$/.test(req.params.id) || id > MAX_ID) return next(badRequest(`${label} id must be a positive integer up to ${MAX_ID}`));
  req[target] = id;
  return next();
};
const parseId = idParser('Diagram', 'diagramId');
const parseProjectId = idParser('Project', 'projectId');

// POST and PUT both carry the whole diagram, so one validator serves both.
// Title and owner are trimmed before saving. Priority is optional and falls back to the default; unknown fields are dropped.
const isObject = (body) => body !== null && typeof body === 'object' && !Array.isArray(body);

const validateDiagram = (req, _res, next) => {
  const body = req.body;
  if (!isObject(body)) {
    return next(badRequest('Request body must be a JSON object'));
  }
  // Priority keeps its old rule (null means the default). Revision and project fall back only when missing, so a null revision is an error.
  const fields = {
    ...body,
    priority: body.priority ?? DEFAULT_PRIORITY,
    revision: body.revision === undefined ? OPTIONAL.revision : body.revision,
    projectId: body.projectId === undefined ? OPTIONAL.projectId : body.projectId,
  };
  const details = Object.entries(checks)
    .map(([name, check]) => ({ field: name, result: check(fields[name]) }))
    .filter(({ result }) => result !== true)
    .map(({ field, result }) => ({ field, message: result }));
  if (details.length > 0) return next(badRequest('Invalid diagram data', details));
  req.diagramFields = Object.fromEntries(Object.keys(checks).map((name) => [name, TRIMMED.includes(name) ? fields[name].trim() : fields[name]]));
  return next();
};

// PATCH carries only the fields to change. Each sent field gets the same check as in POST and PUT,
// missing fields are left alone, and a body without a single known field is refused.
const validatePartial = (req, _res, next) => {
  const body = req.body;
  if (!isObject(body)) return next(badRequest('Request body must be a JSON object'));
  const names = Object.keys(checks).filter((name) => Object.hasOwn(body, name));
  if (names.length === 0) return next(badRequest(`Send at least one of: ${Object.keys(checks).join(', ')}`));
  const details = names
    .map((name) => ({ field: name, result: checks[name](body[name]) }))
    .filter(({ result }) => result !== true)
    .map(({ field, result }) => ({ field, message: result }));
  if (details.length > 0) return next(badRequest('Invalid diagram data', details));
  req.diagramFields = Object.fromEntries(names.map((name) => [name, TRIMMED.includes(name) ? body[name].trim() : body[name]]));
  return next();
};

// A project has one field, its unique name. The uniqueness itself is guarded by the database and answered with 409.
const validateProject = (req, _res, next) => {
  const body = req.body;
  if (!isObject(body)) return next(badRequest('Request body must be a JSON object'));
  const problem = text('projectName', true)(body.name);
  if (problem !== true) return next(badRequest('Invalid project data', [{ field: 'name', message: problem }]));
  req.projectFields = { name: body.name.trim() };
  return next();
};

module.exports = { parseId, parseProjectId, validateDiagram, validatePartial, validateProject };
