const express = require('express');
const { createAuthenticate } = require('./middleware/auth');
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
const { checkJwtSettings } = require('./settings');
const LIMITS = require('../limits.json');

const MINUTE = 60 * 1000;
const DEFAULTS = {
  jwtExpiresIn: '1h',
  bcryptRounds: 10,
  // Failed logins per email before it is locked, and for how long.
  loginMaxAttempts: LIMITS.loginMaxAttempts,
  loginLockMs: LIMITS.loginLockMinutes * MINUTE,
  // Requests per client address in a window: login and registration are limited separately.
  loginRateMax: LIMITS.loginRateMax,
  loginRateWindowMs: LIMITS.loginRateWindowMinutes * MINUTE,
  registerRateMax: LIMITS.registerRateMax,
  registerRateWindowMs: LIMITS.registerRateWindowMinutes * MINUTE,
};

// settings: { jwtSecret, jwtExpiresIn?, bcryptRounds?, login*/register* limits?, trustProxy? }
const createApp = (models, settings) => {
  const config = { ...DEFAULTS, ...settings };
  checkJwtSettings(config);
  const authenticate = createAuthenticate(models, config);
  const loginGuard = createLoginGuard({ maxAttempts: config.loginMaxAttempts, lockMs: config.loginLockMs });
  const limiters = {
    loginLimiter: createRateLimiter({ windowMs: config.loginRateWindowMs, max: config.loginRateMax }),
    registerLimiter: createRateLimiter({ windowMs: config.registerRateWindowMs, max: config.registerRateMax }),
  };
  const app = express();
  app.disable('x-powered-by');
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
  app.use(createRequestLogger(models));
  // The limit is set explicitly (limits.json), so it does not change with the library default.
  app.use(express.json({ limit: LIMITS.bodyBytes }));
  app.use(requireJson);
  app.use('/auth', createAuthRouter(createAuthController(models, config, loginGuard), limiters));
  app.use('/diagrams', createDiagramsRouter(createDiagramsController(models), authenticate));
  app.use(createUsersRouter(createUsersController(models), authenticate));
  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
