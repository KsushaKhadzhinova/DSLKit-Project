const { Router } = require('express');
const { HttpError } = require('../errors');
const { parseId, validateDiagram } = require('../middleware/validate');

const methodNotAllowed = (allow) => (_req, res, next) => {
  res.set('Allow', allow);
  next(new HttpError(405, `Method not allowed, use ${allow}`));
};

const createDiagramsRouter = (controller, authenticate) => {
  const router = Router();
  router.use(authenticate);
  router.route('/').get(controller.list).post(validateDiagram, controller.create).all(methodNotAllowed('GET, POST'));
  router
    .route('/:id')
    .get(parseId(), controller.get)
    .put(parseId(), validateDiagram, controller.replace)
    .delete(parseId(), controller.remove)
    .all(methodNotAllowed('GET, PUT, DELETE'));
  return router;
};

module.exports = { createDiagramsRouter };
