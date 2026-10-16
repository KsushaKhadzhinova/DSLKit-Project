const express = require('express');
const { createDiagramsController } = require('./controllers/diagrams.controller');
const { createDiagramsRouter } = require('./routes/diagrams.routes');
const { routeNotFound, errorHandler } = require('./middleware/error-handler');

const createApp = (models) => {
  const app = express();
  // The limit is set explicitly so it does not change with the library default.
  app.use(express.json({ limit: '100kb' }));
  app.use('/diagrams', createDiagramsRouter(createDiagramsController(models)));
  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
