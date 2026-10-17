const { HttpError } = require('../errors');

// Headers for a JSON API: nothing it returns is meant to be framed, sniffed, cached or executed.
const securityHeaders = (req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-store',
  });
  // HSTS only makes sense (and is only honoured) on an HTTPS connection.
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
};

const BODY_METHODS = ['POST', 'PUT', 'PATCH'];

// express.json() silently skips a body with another Content-Type, which would end as a confusing 400.
// A request that sends a body but is not JSON gets 415. A request without any body is left to the validators.
const requireJson = (req, _res, next) => {
  const type = (req.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (BODY_METHODS.includes(req.method) && type && type !== 'application/json' && !type.endsWith('+json')) {
    return next(new HttpError(415, 'Content-Type must be application/json'));
  }
  return next();
};

// Handler for route.all() placed after the supported methods:
// OPTIONS lists the methods (204), anything else is 405 with an Allow header. HEAD is answered by the GET handler.
const allowMethods = (methods) => {
  const allow = [...new Set([...methods, ...(methods.includes('GET') ? ['HEAD'] : []), 'OPTIONS'])].join(', ');
  return (req, res, next) => {
    res.set('Allow', allow);
    if (req.method === 'OPTIONS') return res.status(204).end();
    return next(new HttpError(405, `Method not allowed, use ${allow}`));
  };
};

module.exports = { securityHeaders, requireJson, allowMethods };
