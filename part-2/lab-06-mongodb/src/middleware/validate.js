const { badRequest } = require('../errors');
const { NOTATIONS, PRIORITIES, DEFAULT_PRIORITY } = require('../models/diagram.constants');

const isText = (value) => typeof value === 'string' && value.trim() !== '';

const diagramChecks = {
  title: (v) => isText(v) || 'must be a non-empty string',
  notation: (v) => NOTATIONS.includes(v) || `must be one of ${NOTATIONS.join(', ')}`,
  sourceCode: (v) => isText(v) || 'must be a non-empty string',
  priority: (v) => PRIORITIES.includes(v) || `must be one of ${PRIORITIES.join(', ')}`,
  owner: (v) => isText(v) || 'must be a non-empty string',
  tags: (v) => (Array.isArray(v) && v.every(isText)) || 'must be an array of non-empty strings',
};

const commentChecks = {
  author: (v) => isText(v) || 'must be a non-empty string',
  text: (v) => isText(v) || 'must be a non-empty string',
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
const validateDiagram = validator(diagramChecks, 'Invalid diagram data', { priority: DEFAULT_PRIORITY, tags: [] }, 'diagramFields');
const validateComment = validator(commentChecks, 'Invalid comment data', {}, 'commentFields');
const validateCommentText = validator({ text: commentChecks.text }, 'Invalid comment data', {}, 'commentFields');

module.exports = { parseId, parseCommentId, validateDiagram, validateComment, validateCommentText };
