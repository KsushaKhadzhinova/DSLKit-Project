const { ConnectionError } = require('sequelize');
const { notFound } = require('../errors');

const routeNotFound = (req, _res, next) => next(notFound(`Route ${req.method} ${req.path} not found`));

// Network-level codes a dead or unreachable database connects with, outside Sequelize's own error classes
// (seen when a pool is closed under a request, or on some direct socket failures).
const UNAVAILABLE_CODES = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'EHOSTDOWN', 'ENOTFOUND', 'ENETUNREACH', 'EPIPE', 'ECONNRESET']);
// The database is down or unreachable, not a bug in the request: connection refused, DNS failure, a timed-out socket,
// wrong credentials, or the connection pool closing under a request. None of these should ever surface as a bare 500.
const isDbUnavailable = (err) =>
  err instanceof ConnectionError ||
  UNAVAILABLE_CODES.has(err.original?.code) ||
  UNAVAILABLE_CODES.has(err.parent?.code) ||
  UNAVAILABLE_CODES.has(err.code) ||
  /connection manager was closed/i.test(err.message ?? '');

const SERVICE_UNAVAILABLE_MESSAGE = 'Service unavailable: the database cannot be reached, please try again later / Сервис временно недоступен: не удаётся подключиться к базе данных, попробуйте позже';

// Express treats a function with four parameters as error-handling middleware.
const errorHandler = (err, _req, res, next) => {
  // Once the response has started, only Express can close the connection properly.
  if (res.headersSent) return next(err);
  const malformedJson = err.type === 'entity.parse.failed';
  // A value that must be unique already exists, for example a project name: the conflict is the client's, not a server failure.
  const duplicate = err.name === 'SequelizeUniqueConstraintError';
  const dbUnavailable = !malformedJson && !duplicate && isDbUnavailable(err);
  const status = malformedJson ? 400 : duplicate ? 409 : dbUnavailable ? 503 : (err.status ?? 500);
  if (status >= 500 || dbUnavailable) console.error(err);
  const body = {
    error: dbUnavailable
      ? SERVICE_UNAVAILABLE_MESSAGE
      : status >= 500
        ? 'Internal server error'
        : malformedJson
          ? 'Malformed JSON in request body'
          : duplicate
            ? 'Value already exists'
            : err.message,
  };
  if (duplicate) body.details = err.errors.map((e) => ({ field: e.path, message: 'must be unique' }));
  if (err.details) body.details = err.details;
  return res.status(status).json(body);
};

module.exports = { routeNotFound, errorHandler, isDbUnavailable };
