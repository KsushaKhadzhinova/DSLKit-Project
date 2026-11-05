const { Router } = require('express');
const { parseProjectId: parseId, validateProject } = require('../middleware/validate');
const { allowMethods } = require('../middleware/http');

const createProjectsRouter = (controller) => {
  const router = Router();
  router
    .route('/')
    .get(controller.list)
    .post(validateProject, controller.create)
    .all(allowMethods(['GET', 'POST']));
  router
    .route('/:id')
    .get(parseId, controller.get)
    .delete(parseId, controller.remove)
    .all(allowMethods(['GET', 'DELETE']));
  router
    .route('/:id/diagrams')
    .get(parseId, controller.listDiagrams)
    .all(allowMethods(['GET']));
  return router;
};

module.exports = { createProjectsRouter };
