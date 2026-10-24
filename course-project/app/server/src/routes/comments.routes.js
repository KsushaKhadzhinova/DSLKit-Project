const { Router } = require('express');
const { parseId, validateComment } = require('../middleware/validate');
const { allowMethods } = require('../middleware/http');

// Two paths share one router: the comments of a diagram (/diagrams/:id/comments) and one comment (/comments/:id).
// It is mounted at the root, like the users router, and the token is checked per method.
const createCommentsRouter = (controller, authenticate) => {
  const router = Router();
  router
    .route('/diagrams/:id/comments')
    .get(authenticate, parseId(), controller.list)
    .post(authenticate, parseId(), validateComment, controller.create)
    .all(allowMethods(['GET', 'POST']));
  router
    .route('/comments/:id')
    .patch(authenticate, parseId('commentId', 'Comment'), validateComment, controller.update)
    .delete(authenticate, parseId('commentId', 'Comment'), controller.remove)
    .all(allowMethods(['PATCH', 'DELETE']));
  return router;
};

module.exports = { createCommentsRouter };
