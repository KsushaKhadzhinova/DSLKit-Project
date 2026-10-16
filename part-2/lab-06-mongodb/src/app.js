const express = require('express');
const mongoose = require('mongoose');
const { createDiagramsController } = require('./controllers/diagrams.controller');
const { createDiagramsRouter } = require('./routes/diagrams.routes');
const { routeNotFound, errorHandler } = require('./middleware/error-handler');
const { securityHeaders, requireDatabase, logRequests } = require('./middleware/security');
const { LIMITS } = require('./models/diagram.constants');

const connected = () => mongoose.connection.readyState === 1;

const createApp = (models, { isReady = connected } = {}) => {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(requireDatabase(isReady));
  app.use(logRequests(models, LIMITS.pathLog));
  app.use(express.json({ limit: '100kb' }));
  app.use('/diagrams', createDiagramsRouter(createDiagramsController(models)));
  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
