'use strict';
const { HttpError, unauthorized, forbidden, notFound } = require('./errors');
const { can } = require('./permissions');

function securityHeaders(production) {
  return (_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    });
    if (production) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  };
}

// Only origins from the allow-list are echoed; the API uses bearer tokens, not cookies, so CSRF does not apply.
function cors(allowed) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    res.vary('Origin');
    const ok = Boolean(origin) && allowed.includes(origin);
    if (ok) res.set('Access-Control-Allow-Origin', origin);
    if (req.method === 'OPTIONS' && req.headers['access-control-request-method']) {
      if (ok) {
        res.set({
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization,Content-Type',
          'Access-Control-Max-Age': '600',
        });
      }
      return res.status(204).end();
    }
    return next();
  };
}

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);
function requireJson(req, _res, next) {
  const hasBody = Number(req.headers['content-length']) > 0 || req.headers['transfer-encoding'] !== undefined;
  if (BODY_METHODS.has(req.method) && hasBody && !req.is('application/json'))
    return next(new HttpError(415, 'unsupported_media_type', 'Send application/json'));
  return next();
}

function requestLog({ db, now, logger }) {
  return (req, res, next) => {
    const started = now();
    const url = req.originalUrl.split('?')[0].slice(0, 200);
    res.on('finish', () => {
      // Probes of unknown paths would only fill the table; known routes (also their 404s) are logged.
      if (res.statusCode === 404 && !req.route) return;
      db.RequestLog.create({
        method: req.method,
        path: url,
        status: res.statusCode,
        userId: req.user?.id ?? null,
        ip: req.ip ?? null,
        durationMs: Math.max(0, now() - started),
      }).catch((err) => logger.error(`request log failed: ${err.message}`));
    });
    next();
  };
}

function authenticate({ db, tokens }) {
  return async (req, _res, next) => {
    try {
      const [scheme, token, extra] = (req.headers.authorization || '').split(' ');
      if (scheme !== 'Bearer' || !token || extra !== undefined) throw unauthorized();
      const claims = tokens.verifyAccess(token);
      // Role and existence are read per request, so role changes and deletions apply at once.
      const user = await db.User.findByPk(claims.sub);
      if (!user) throw unauthorized();
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

const requireAction = (action) => (req, _res, next) => (can(req.user.role, action) ? next() : next(forbidden()));

function errorHandler(logger) {
  return (err, _req, res, _next) => {
    let status = 500;
    let body = { code: 'internal_error', message: 'Internal server error' };
    if (err instanceof HttpError) {
      status = err.status;
      body = { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) };
      if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));
    } else if (err.type === 'entity.too.large') {
      status = 413;
      body = { code: 'payload_too_large', message: 'Request body is too large' };
    } else if (err.type === 'entity.parse.failed') {
      status = 400;
      body = { code: 'invalid_json', message: 'Body is not valid JSON' };
    } else if (err.type === 'charset.unsupported' || err.type === 'encoding.unsupported') {
      status = 415;
      body = { code: 'unsupported_media_type', message: 'Unsupported charset or encoding' };
    } else if (err.status >= 400 && err.status < 500) {
      status = err.status;
      body = { code: 'bad_request', message: 'Bad request' };
    } else logger.error(err);
    res.status(status).json({ error: body });
  };
}

const notFoundHandler = (_req, _res, next) => next(notFound());

module.exports = { securityHeaders, cors, requireJson, requestLog, authenticate, requireAction, errorHandler, notFoundHandler };
