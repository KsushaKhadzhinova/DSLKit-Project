const { Router } = require('express');
const { requireRole } = require('../middleware/auth');
const { parseId, validateTag } = require('../middleware/validate');
const { allowMethods } = require('../middleware/http');

// Three paths share one router: all tags (/tags), one tag (/tags/:id, admin) and the tags of a diagram (/diagrams/:id/tags).
// It is mounted at the root, like the comments router, and the token is checked per method.
const createTagsRouter = (controller, authenticate) => {
  const router = Router();
  router.route('/tags').get(authenticate, controller.list).all(allowMethods(['GET']));
  router
    .route('/tags/:id')
    .delete(authenticate, requireRole('admin'), parseId('tagId', 'Tag'), controller.remove)
    .all(allowMethods(['DELETE']));
  router
    .route('/diagrams/:id/tags')
    .get(authenticate, parseId(), controller.listForDiagram)
    .post(authenticate, parseId(), validateTag, controller.attach)
    .all(allowMethods(['GET', 'POST']));
  router
    .route('/diagrams/:id/tags/:tagId')
    .delete(authenticate, parseId(), parseId('tagId', 'Tag', 'tagId'), controller.detach)
    .all(allowMethods(['DELETE']));
  return router;
};

module.exports = { createTagsRouter };
