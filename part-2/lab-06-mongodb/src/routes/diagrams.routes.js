const { Router } = require('express');
const { HttpError } = require('../errors');
const { validateListQuery, parseId, parseCommentId, validateDiagram, validateComment, validateCommentText } = require('../middleware/validate');

const methodNotAllowed = (allow) => (_req, res, next) => {
  res.set('Allow', allow);
  next(new HttpError(405, `Method not allowed, use ${allow}`));
};

const createDiagramsRouter = (controller) => {
  const router = Router();
  router.route('/').get(validateListQuery, controller.list).post(validateDiagram, controller.create).all(methodNotAllowed('GET, POST'));
  router.route('/stats').get(controller.stats).all(methodNotAllowed('GET'));
  router
    .route('/:id')
    .get(parseId, controller.get)
    .put(parseId, validateDiagram, controller.replace)
    .delete(parseId, controller.remove)
    .all(methodNotAllowed('GET, PUT, DELETE'));
  router.route('/:id/comments').post(parseId, validateComment, controller.addComment).all(methodNotAllowed('POST'));
  router
    .route('/:id/comments/:commentId')
    .put(parseId, parseCommentId, validateCommentText, controller.updateComment)
    .delete(parseId, parseCommentId, controller.removeComment)
    .all(methodNotAllowed('PUT, DELETE'));
  return router;
};

module.exports = { createDiagramsRouter };
