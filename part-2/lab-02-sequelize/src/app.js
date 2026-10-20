const express = require('express');
const { createDiagramsController } = require('./controllers/diagrams.controller');
const { createDiagramsRouter } = require('./routes/diagrams.routes');
const { createProjectsController } = require('./controllers/projects.controller');
const { createProjectsRouter } = require('./routes/projects.routes');
const { securityHeaders, requireJson } = require('./middleware/http');
const { createRequestLogger } = require('./middleware/request-log');
const { LIMITS } = require('./models/diagram.constants');
const { routeNotFound, errorHandler } = require('./middleware/error-handler');

const createApp = (models) => {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  // Liveness and database check for Docker, placed before the request log so probes do not fill it.
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
  app.use('/diagrams', createDiagramsRouter(createDiagramsController(models)));
  app.use('/projects', createProjectsRouter(createProjectsController(models)));
  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
