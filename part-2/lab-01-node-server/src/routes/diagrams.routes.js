const { Router } = require('express');
const { parseId, validateDiagram, validatePartial } = require('../middleware/validate');
const { allowMethods } = require('../middleware/http');

const createDiagramsRouter = (controller) => {
  const router = Router();
  router
    .route('/')
    .get(controller.list)
    .post(validateDiagram, controller.create)
    .all(allowMethods(['GET', 'POST']));
  router
    .route('/:id')
    .get(parseId, controller.get)
    .put(parseId, validateDiagram, controller.replace)
    .patch(parseId, validatePartial, controller.update)
    .delete(parseId, controller.remove)
    .all(allowMethods(['GET', 'PUT', 'PATCH', 'DELETE']));
  return router;
};

module.exports = { createDiagramsRouter };
