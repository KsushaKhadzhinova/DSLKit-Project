const { Router } = require('express');
const { parseId, validateDiagram } = require('../middleware/validate');
const { allowMethods } = require('../middleware/http');

// The token is checked per method, so 405 and OPTIONS answers do not need one.
const createDiagramsRouter = (controller, authenticate) => {
  const router = Router();
  router.route('/').get(authenticate, controller.list).post(authenticate, validateDiagram, controller.create).all(allowMethods(['GET', 'POST']));
  router
    .route('/:id')
    .get(authenticate, parseId(), controller.get)
    .put(authenticate, parseId(), validateDiagram, controller.replace)
    .delete(authenticate, parseId(), controller.remove)
    .all(allowMethods(['GET', 'PUT', 'DELETE']));
  return router;
};

module.exports = { createDiagramsRouter };
