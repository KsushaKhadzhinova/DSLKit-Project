const { Router } = require('express');
const { parseId, validateDiagram } = require('../middleware/validate');
const { allowMethods } = require('../middleware/http');


const createDiagramsRouter = (controller) => {
  const router = Router();
  router.route('/').get(controller.list).post(validateDiagram, controller.create).all(allowMethods(['GET', 'POST']));
  router
    .route('/:id')
    .get(parseId, controller.get)
    .put(parseId, validateDiagram, controller.replace)
    .delete(parseId, controller.remove)
    .all(allowMethods(['GET', 'PUT', 'DELETE']));
  return router;
};

module.exports = { createDiagramsRouter };
