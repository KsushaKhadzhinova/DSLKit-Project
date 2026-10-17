const express = require('express');
const { createDiagramStore } = require('./models/diagram.model');
const { createDiagramsController } = require('./controllers/diagrams.controller');
const { createDiagramsRouter } = require('./routes/diagrams.routes');
const { securityHeaders, requireJson } = require('./middleware/http');
const { LIMITS } = require('./models/diagram.model');
const { routeNotFound, errorHandler } = require('./middleware/error-handler');

const createApp = (store = createDiagramStore()) => {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  // The limit is set explicitly (limits.json), so it does not change with the library default.
  app.use(express.json({ limit: LIMITS.bodyBytes }));
  app.use(requireJson);
  app.use('/diagrams', createDiagramsRouter(createDiagramsController(store)));
  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
