const { ConnectionError } = require('sequelize');
const { notFound } = require('../errors');

const routeNotFound = (req, _res, next) => next(notFound(`Route ${req.method} ${req.path} not found`));

// A refused or timed-out connection (the database is down, unreachable, or there is no network) is not a bug in the
// request: the client should retry, so it gets 503 with a bilingual message, never a stack trace or a crash.
const DB_UNAVAILABLE_MESSAGE = 'Service unavailable: the database cannot be reached, try again later. / Сервис недоступен: нет связи с базой данных, повторите попытку позже.';

// Express treats a function with four parameters as error-handling middleware.
const errorHandler = (err, _req, res, next) => {
  // Once the response has started, only Express can close the connection properly.
  if (res.headersSent) return next(err);
  const malformedJson = err.type === 'entity.parse.failed';
  const dbUnavailable = err instanceof ConnectionError;
  const status = malformedJson ? 400 : dbUnavailable ? 503 : (err.status ?? 500);
  if (dbUnavailable) console.error('Database unavailable:', err.message);
  else if (status >= 500) console.error(err);
  const body = {
    error: dbUnavailable ? DB_UNAVAILABLE_MESSAGE : status >= 500 ? 'Internal server error' : malformedJson ? 'Malformed JSON in request body' : err.message,
  };
  if (err.details) body.details = err.details;
  if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));
  return res.status(status).json(body);
};

module.exports = { routeNotFound, errorHandler };
