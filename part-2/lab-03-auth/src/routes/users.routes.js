const { Router } = require('express');
const { requirePermission } = require('../permissions');
const { parseId } = require('../middleware/validate');
const { validateRole, validateNewRole } = require('../middleware/validate-auth');
const { allowMethods } = require('../middleware/http');

// Every route here needs a valid token; the /users routes also need the admin role.
// The 405 and OPTIONS answers come without a token, because they say nothing about the data.
const createUsersRouter = (controller, authenticate, roles) => {
  const router = Router();
  // Each route names the permission it needs (see permissions.js); no role name appears here.
  const guard = (permission) => [authenticate, requirePermission(permission)];
  router
    .route('/profile')
    .get(authenticate, controller.profile)
    .all(allowMethods(['GET']));
  router
    .route('/users')
    .get(...guard('user:list'), controller.list)
    .all(allowMethods(['GET']));
  router
    .route('/users/:id/role')
    .patch(...guard('user:role'), parseId('userId', 'User'), validateRole, controller.setRole)
    .all(allowMethods(['PATCH']));
  router
    .route('/users/:id')
    .delete(...guard('user:delete'), parseId('userId', 'User'), controller.remove)
    .all(allowMethods(['DELETE']));
  router
    .route('/users/:id/unlock')
    .post(...guard('user:unlock'), parseId('userId', 'User'), controller.unlock)
    .all(allowMethods(['POST']));
  router
    .route('/admin/audit')
    .get(...guard('audit:read'), controller.audit)
    .all(allowMethods(['GET']));
  router
    .route('/admin/roles')
    .get(...guard('role:read'), roles.list)
    .post(...guard('role:manage'), validateNewRole, roles.create)
    .all(allowMethods(['GET', 'POST']));
  router
    .route('/admin/roles/:id')
    .delete(...guard('role:manage'), parseId('roleId', 'Role'), roles.remove)
    .all(allowMethods(['DELETE']));
  router
    .route('/admin/permissions')
    .get(...guard('role:read'), roles.permissions)
    .all(allowMethods(['GET']));
  return router;
};

module.exports = { createUsersRouter };
