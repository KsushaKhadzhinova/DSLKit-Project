const { badRequest } = require('../errors');
const { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY, LIMITS, MAX_ID } = require('../models/diagram.constants');

// Spaces of every kind plus zero-width characters (joiners, word joiner, BOM) look empty, so they count as empty.
const INVISIBLE = /[\s​-‍⁠﻿]/g;
// Control characters (NUL, bell, escape) are not text; a single-line field must not carry them.
const CONTROL = /[\u0000-\u001F\u007F]/;

// Text is checked after trimming, so the stored value is what was measured.
const text = (name, singleLine = false) => (v) => {
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
};

const parseId = (req, _res, next) => {
  // Number() would accept '0x1', '1e0' and ' 1', so the raw text is checked first.
  const id = Number(req.params.id);
  // Ids above the INTEGER column range would make PostgreSQL fail with a 500, so they are rejected here.
  if (!/^[1-9]\d*$/.test(req.params.id) || id > MAX_ID) return next(badRequest(`Diagram id must be a positive integer up to ${MAX_ID}`));
  req.diagramId = id;
  return next();
};

// POST and PUT both carry the whole diagram, so one validator serves both.
// Title and owner are trimmed before saving. Priority is optional and falls back to the default; unknown fields are dropped.
const validateDiagram = (req, _res, next) => {
  const body = req.body;
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return next(badRequest('Request body must be a JSON object'));
  }
  const fields = { ...body, priority: body.priority ?? DEFAULT_PRIORITY };
  const details = Object.entries(checks)
    .map(([name, check]) => ({ field: name, result: check(fields[name]) }))
    .filter(({ result }) => result !== true)
    .map(({ field, result }) => ({ field, message: result }));
  if (details.length > 0) return next(badRequest('Invalid diagram data', details));
  req.diagramFields = Object.fromEntries(Object.keys(checks).map((name) => [name, TRIMMED.includes(name) ? fields[name].trim() : fields[name]]));
  return next();
};

module.exports = { parseId, validateDiagram };
