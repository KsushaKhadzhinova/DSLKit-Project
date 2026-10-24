const { HttpError } = require('../errors');

// Security headers set by hand, so no extra package is needed. The API returns only JSON.
const securityHeaders = (_req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  });
  next();
};

// While MongoDB is not connected a request fails at once with 503 instead of waiting for the driver timeout.
const requireDatabase = (isReady) => (_req, _res, next) => (isReady() ? next() : next(new HttpError(503, 'Database is unavailable, try again later')));

// Control characters (line breaks above all) are replaced, so a path cannot forge a log line.
const clean = (text) => String(text).replace(/[\u0000-\u001f\u007f]/g, '?');

// Writes the request into the database before the route runs. If the write fails, the error handler answers 500.
// Only the path is written, never the query string: it can carry tokens or search words of a person.
const logRequests = ({ RequestLog }, pathLimit) => async (req, _res, next) => {
  try {
    await RequestLog.create({ method: clean(req.method), path: clean(req.path).slice(0, pathLimit) });
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { securityHeaders, requireDatabase, logRequests };
