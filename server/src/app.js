'use strict';
const express = require('express');
const { createTokens } = require('./tokens');
const { createRateLimiter } = require('./rate-limit');
const { securityHeaders, cors, requireJson, requestLog, authenticate, errorHandler, notFoundHandler } = require('./middleware');
const { authRoutes } = require('./routes-auth');
const { projectRoutes } = require('./routes-projects');
const { adminRoutes } = require('./routes-admin');

function createApp({ config, db, now = Date.now, logger = console }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  const tokens = createTokens({ config, db, now });
  const limit = createRateLimiter(now);
  const auth = authenticate({ db, tokens });
  const { limits } = config;

  app.use(securityHeaders(config.production));
  app.use(cors(config.corsOrigins));
  app.use(requestLog({ db, now, logger }));
  app.use(limit({ name: 'general', max: limits.generalRateMax, windowMinutes: limits.generalRateWindowMinutes }));
  app.use(requireJson);
  app.use(express.json({ limit: limits.bodyBytes, strict: true }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', authRoutes({ config, db, tokens, now, limit, authenticate: auth }));
  app.use('/api', projectRoutes({ db, authenticate: auth }));
  app.use('/api', adminRoutes({ db, authenticate: auth, now }));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return { app };
}

module.exports = { createApp };
