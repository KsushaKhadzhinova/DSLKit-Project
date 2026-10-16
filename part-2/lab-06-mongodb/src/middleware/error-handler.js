const { notFound } = require('../errors');

const routeNotFound = (req, _res, next) => next(notFound(`Route ${req.method} ${req.path} not found`));

// Express treats a function with four parameters as error-handling middleware.
const errorHandler = (err, _req, res, _next) => {
  const malformedJson = err.type === 'entity.parse.failed';
  // Mongoose rejects bad data with ValidationError or CastError; both are client mistakes.
  const invalidData = err.name === 'ValidationError' || err.name === 'CastError';
  const status = malformedJson || invalidData ? 400 : (err.status ?? 500);
  if (status >= 500) console.error(err);
  const body = {
    error: status >= 500 ? 'Internal server error' : malformedJson ? 'Malformed JSON in request body' : err.message,
  };
  if (err.details) body.details = err.details;
  res.status(status).json(body);
};

module.exports = { routeNotFound, errorHandler };
