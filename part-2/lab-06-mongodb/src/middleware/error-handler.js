const { notFound } = require('../errors');

const routeNotFound = (req, _res, next) => next(notFound(`Route ${req.method} ${req.path} not found`));

// Express treats a function with four parameters as error-handling middleware.
const errorHandler = (err, _req, res, _next) => {
  const malformedJson = err.type === 'entity.parse.failed';
  // Mongoose rejects bad data with ValidationError or CastError; both are client mistakes.
  const invalidData = err.name === 'ValidationError' || err.name === 'CastError';
  const status = malformedJson || invalidData ? 400 : Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500 && status !== 503) console.error(err);
  // Only messages written by this application or by the body parser reach the client; Mongoose texts name schemas and fields.
  const hidden = status >= 500 && status !== 503;
  const message = hidden ? 'Internal server error' : malformedJson ? 'Malformed JSON in request body' : invalidData ? 'Invalid data' : err.message;
  const body = { error: message };
  if (err.details) body.details = err.details;
  else if (err.name === 'ValidationError') body.details = Object.keys(err.errors ?? {}).map((field) => ({ field, message: 'invalid value' }));
  res.status(status).json(body);
};

module.exports = { routeNotFound, errorHandler };
