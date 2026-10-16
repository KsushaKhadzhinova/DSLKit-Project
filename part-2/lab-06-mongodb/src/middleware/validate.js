const { badRequest } = require('../errors');
const { NOTATIONS, PRIORITY, LIMITS } = require('../models/diagram.constants');

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isTextUpTo = (max) => (v) => (isText(v) && v.trim().length <= max) || `must be a non-empty string of at most ${max} characters`;

const diagramChecks = {
  title: isTextUpTo(LIMITS.title),
  notation: (v) => NOTATIONS.includes(v) || `must be one of ${NOTATIONS.join(', ')}`,
  sourceCode: isTextUpTo(LIMITS.sourceCode),
  priority: (v) => (Number.isInteger(v) && v >= PRIORITY.min && v <= PRIORITY.max) || `must be an integer from ${PRIORITY.min} to ${PRIORITY.max}`,
  owner: isTextUpTo(LIMITS.owner),
  tags: (v) =>
    (Array.isArray(v) && v.length <= LIMITS.tags && v.every((tag) => isTextUpTo(LIMITS.tag)(tag) === true)) ||
    `must be an array of at most ${LIMITS.tags} non-empty strings, each up to ${LIMITS.tag} characters`,
};

const commentChecks = {
  author: isTextUpTo(LIMITS.author),
  text: isTextUpTo(LIMITS.commentText),
};

// An ObjectId is 24 hexadecimal characters; anything else is rejected before it reaches MongoDB.
const parseObjectId = (param, key) => (req, _res, next) => {
  if (!/^[0-9a-f]{24}$/i.test(req.params[param])) return next(badRequest(`${key} must be a 24-character hex ObjectId`));
  req[key] = req.params[param];
  return next();
};

const parseId = parseObjectId('id', 'diagramId');
const parseCommentId = parseObjectId('commentId', 'commentId');

const isPlainObject = (body) => typeof body === 'object' && body !== null && !Array.isArray(body);

// Runs the checks on the given fields and keeps only the known ones.
const validator = (checks, message, defaults, target) => (req, _res, next) => {
  if (!isPlainObject(req.body)) return next(badRequest('Request body must be a JSON object'));
  const fields = { ...defaults, ...Object.fromEntries(Object.entries(req.body).filter(([, v]) => v !== undefined && v !== null)) };
  const details = Object.entries(checks)
    .map(([name, check]) => ({ field: name, result: check(fields[name]) }))
    .filter(({ result }) => result !== true)
    .map(({ field, result }) => ({ field, message: result }));
  if (details.length > 0) return next(badRequest(message, details));
  req[target] = Object.fromEntries(Object.keys(checks).map((name) => [name, fields[name]]));
  return next();
};

// POST and PUT both carry the whole diagram, so one validator serves both.
// Priority and tags are optional; unknown fields (including comments) are dropped.
const validateDiagram = validator(diagramChecks, 'Invalid diagram data', { priority: PRIORITY.default, tags: [] }, 'diagramFields');
const validateComment = validator(commentChecks, 'Invalid comment data', {}, 'commentFields');
const validateCommentText = validator({ text: commentChecks.text }, 'Invalid comment data', {}, 'commentFields');

// Only ?owner= and ?tag= with plain strings are accepted: ?owner[]=x arrives as an unknown key,
// and a repeated parameter arrives as an array, so both are rejected before reaching MongoDB.
// commentAuthor searches inside the nested comments array; limit and skip page the list.
const FILTERS = ['owner', 'tag', 'commentAuthor'];
const PAGING = { limit: [1, LIMITS.listLimitMax], skip: [0, LIMITS.listSkipMax] };
const inRange = (value, [min, max]) => /^\d{1,9}$/.test(value) && Number(value) >= min && Number(value) <= max;
const validateListQuery = (req, _res, next) => {
  const details = Object.entries(req.query)
    .filter(([name, value]) => {
      if (typeof value !== 'string') return true;
      if (name in PAGING) return !inRange(value, PAGING[name]);
      return !FILTERS.includes(name) || value.trim() === '' || value.length > LIMITS.owner;
    })
    .map(([field]) => ({ field, message: field in PAGING ? `must be an integer from ${PAGING[field][0]} to ${PAGING[field][1]}` : 'must be one of owner, tag, commentAuthor, limit, skip with a plain value' }));
  return details.length ? next(badRequest('Invalid query parameters', details)) : next();
};

module.exports = { validateListQuery, parseId, parseCommentId, validateDiagram, validateComment, validateCommentText };
