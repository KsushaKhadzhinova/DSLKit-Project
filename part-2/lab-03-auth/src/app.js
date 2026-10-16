const express = require('express');
const { createAuthenticate } = require('./middleware/auth');
const { createAuthController } = require('./controllers/auth.controller');
const { createUsersController } = require('./controllers/users.controller');
const { createDiagramsController } = require('./controllers/diagrams.controller');
const { createAuthRouter } = require('./routes/auth.routes');
const { createUsersRouter } = require('./routes/users.routes');
const { createDiagramsRouter } = require('./routes/diagrams.routes');
const { routeNotFound, errorHandler } = require('./middleware/error-handler');
const { createCors } = require('./middleware/cors');

const DEFAULTS = { jwtExpiresIn: '1h', bcryptRounds: 10, corsOrigin: 'http://localhost:5178' };

// settings: { jwtSecret, jwtExpiresIn?, bcryptRounds?, corsOrigin? }
const createApp = (models, settings) => {
  const config = { ...DEFAULTS, ...settings };
  if (!config.jwtSecret) throw new Error('jwtSecret is required');
  const authenticate = createAuthenticate(models, config);
  const app = express();
  app.use(createCors(config.corsOrigin));
  // The limit is set explicitly so it does not change with the library default.
  app.use(express.json({ limit: '100kb' }));
  app.use('/auth', createAuthRouter(createAuthController(models, config)));
  app.use('/diagrams', createDiagramsRouter(createDiagramsController(models), authenticate));
  app.use(createUsersRouter(createUsersController(models), authenticate));
  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
