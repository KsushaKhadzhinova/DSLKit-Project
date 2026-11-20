const express = require('express');
const { createAuthenticate } = require('./middleware/auth');
const { createTokenService, refreshSettings } = require('./services/tokens');
const { createSecondFactor } = require('./services/second-factor');
const { createTwoFactorController } = require('./controllers/twofactor.controller');
const { createAudit } = require('./audit');
const { createMailer } = require('./mailer');
const { createRolesController } = require('./controllers/roles.controller');
const { createAuthController } = require('./controllers/auth.controller');
const { createUsersController } = require('./controllers/users.controller');
const { createDiagramsController } = require('./controllers/diagrams.controller');
const { createAuthRouter } = require('./routes/auth.routes');
const { createUsersRouter } = require('./routes/users.routes');
const { createDiagramsRouter } = require('./routes/diagrams.routes');
const { securityHeaders, requireJson } = require('./middleware/http');
const { createRequestLogger } = require('./middleware/request-log');
const { createRateLimiter, createLoginGuard } = require('./middleware/rate-limit');
const { routeNotFound, errorHandler } = require('./middleware/error-handler');
const { createCors } = require('./middleware/cors');
const { checkJwtSettings, checkTwoFactorKey } = require('./settings');
const LIMITS = require('../limits.json');

const MINUTE = 60 * 1000;
const DEFAULTS = {
  // Short on purpose: the refresh token (7 days, see limits.json) renews it, and a revoked session ends it at once.
  jwtExpiresIn: '15m',
  bcryptRounds: 10,
  // Origin of the React client of lab 5 that may call the API.
  corsOrigin: 'http://localhost:5178',
  // Failed logins per email before it is locked, and for how long.
  loginMaxAttempts: LIMITS.loginMaxAttempts,
  loginLockMs: LIMITS.loginLockMinutes * MINUTE,
  // Requests per client address in a window, for every route except /health. It runs before the request log.
  generalRateMax: LIMITS.generalRateMax,
  generalRateWindowMs: LIMITS.generalRateWindowMinutes * MINUTE,
  // Requests per client address in a window: login and registration are limited separately.
  loginRateMax: LIMITS.loginRateMax,
  loginRateWindowMs: LIMITS.loginRateWindowMinutes * MINUTE,
  registerRateMax: LIMITS.registerRateMax,
  registerRateWindowMs: LIMITS.registerRateWindowMinutes * MINUTE,
  refreshRateMax: LIMITS.refreshRateMax,
  refreshRateWindowMs: LIMITS.refreshRateWindowMinutes * MINUTE,
  resetRateMax: LIMITS.resetRateMax,
  resetRateWindowMs: LIMITS.resetRateWindowMinutes * MINUTE,
  twoFactorChallengeMs: LIMITS.twoFactorChallengeMinutes * MINUTE,
};

// settings: { jwtSecret, jwtExpiresIn?, bcryptRounds?, login*/register* limits?, trustProxy?, twoFactorKey?, mailer? }
const createApp = (models, settings) => {
  const config = { ...DEFAULTS, ...settings };
  checkJwtSettings(config);
  checkTwoFactorKey(config.twoFactorKey);
  const tokens = createTokenService(models, { ...config, ...refreshSettings() });
  const secondFactor = createSecondFactor(models, config);
  const audit = createAudit(models);
  const mailer = config.mailer || createMailer({ outboxFile: config.mailOutboxFile, production: process.env.NODE_ENV === 'production' });
  const authenticate = createAuthenticate(models, tokens);
  const loginGuard = createLoginGuard({ maxAttempts: config.loginMaxAttempts, lockMs: config.loginLockMs });
  const limiters = {
    loginLimiter: createRateLimiter({ windowMs: config.loginRateWindowMs, max: config.loginRateMax }),
    registerLimiter: createRateLimiter({ windowMs: config.registerRateWindowMs, max: config.registerRateMax }),
    refreshLimiter: createRateLimiter({ windowMs: config.refreshRateWindowMs, max: config.refreshRateMax }),
    resetLimiter: createRateLimiter({ windowMs: config.resetRateWindowMs, max: config.resetRateMax }),
  };
  const generalLimiter = createRateLimiter({
    windowMs: config.generalRateWindowMs,
    max: config.generalRateMax,
    // One console line per address and window, nothing is written to the database.
    onLimited: (req, key) => console.warn(`Rate limit reached by ${String(key).replace(/[^ -~]/g, '?').slice(0, 64)}: further requests in this window are refused and not logged`),
  });
  const app = express();
  app.disable('x-powered-by');
  app.use(createCors(config.corsOrigin));
  // Behind a reverse proxy req.ip is the proxy unless this is set (TRUST_PROXY), and the limits would count everyone as one client.
  if (config.trustProxy !== undefined) app.set('trust proxy', config.trustProxy);
  app.use(securityHeaders);
  // Liveness and database check for the Docker healthcheck, placed before the request log so probes do not fill it.
  app.get('/health', async (req, res) => {
    try {
      await models.sequelize.authenticate();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  // Refused requests never reach the request log, so a flood from one address cannot grow the RequestLogs table.
  app.use(generalLimiter);
  app.use(createRequestLogger(models));
  // The limit is set explicitly (limits.json), so it does not change with the library default.
  app.use(express.json({ limit: LIMITS.bodyBytes }));
  app.use(requireJson);
  const services = { tokens, secondFactor, audit, mailer };
  app.use('/auth', createAuthRouter(createAuthController(models, config, loginGuard, services), createTwoFactorController(models, loginGuard, services), limiters, authenticate));
  app.use('/diagrams', createDiagramsRouter(createDiagramsController(models), authenticate));
  app.use(createUsersRouter(createUsersController(models, loginGuard, audit), authenticate, createRolesController(models, audit)));
  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
