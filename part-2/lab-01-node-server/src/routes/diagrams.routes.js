const { Router } = require('express');
const { parseId, validateDiagram } = require('../middleware/validate');

const createDiagramsRouter = (controller) => {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', validateDiagram, controller.create);
  router.get('/:id', parseId, controller.get);
  router.put('/:id', parseId, validateDiagram, controller.replace);
  router.delete('/:id', parseId, controller.remove);
  return router;
};

module.exports = { createDiagramsRouter };
