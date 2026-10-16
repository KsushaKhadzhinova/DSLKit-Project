const { Router } = require('express');
const { requireRole } = require('../middleware/auth');
const { parseId } = require('../middleware/validate');
const { validateRole } = require('../middleware/validate-auth');

// Every route here needs a valid token; the /users routes also need the admin role.
const createUsersRouter = (controller, authenticate) => {
  const router = Router();
  const admin = [authenticate, requireRole('admin')];
  router.get('/profile', authenticate, controller.profile);
  router.get('/users', ...admin, controller.list);
  router.patch('/users/:id/role', ...admin, parseId('userId', 'User'), validateRole, controller.setRole);
  router.delete('/users/:id', ...admin, parseId('userId', 'User'), controller.remove);
  return router;
};

module.exports = { createUsersRouter };
