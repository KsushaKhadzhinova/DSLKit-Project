const { notFound } = require('../errors');

const routeNotFound = (req, _res, next) => next(notFound(`Route ${req.method} ${req.path} not found`));

// Express treats a function with four parameters as error-handling middleware.
const errorHandler = (err, _req, res, next) => {
  // Once the response has started, only Express can close the connection properly.
  if (res.headersSent) return next(err);
  const malformedJson = err.type === 'entity.parse.failed';
  // A value that must be unique already exists, for example a project name: the conflict is the client's, not a server failure.
  const duplicate = err.name === 'SequelizeUniqueConstraintError';
  const status = malformedJson ? 400 : duplicate ? 409 : (err.status ?? 500);
  if (status >= 500) console.error(err);
  const body = {
    error: status >= 500 ? 'Internal server error' : malformedJson ? 'Malformed JSON in request body' : duplicate ? 'Value already exists' : err.message,
  };
  if (duplicate) body.details = err.errors.map((e) => ({ field: e.path, message: 'must be unique' }));
  if (err.details) body.details = err.details;
  return res.status(status).json(body);
};

module.exports = { routeNotFound, errorHandler };
