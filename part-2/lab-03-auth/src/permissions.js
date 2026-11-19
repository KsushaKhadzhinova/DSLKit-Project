const { forbidden } = require('./errors');

// The single source of the built-in roles. The Roles and RolePermissions tables are generated from it (migration 7 and the roles
// seed call syncBuiltinRoles), a test compares the database with it, and at run time a request is checked against the rows of the
// database, so a custom role created by an administrator works the same way as these.
const PERMISSIONS = {
  'diagram:read': 'Read the diagrams',
  'diagram:create': 'Create diagrams',
  'diagram:modify:own': 'Change and delete own diagrams',
  'diagram:modify:any': 'Change and delete any diagram',
  'profile:read': 'Read the own profile',
  'session:manage': 'List and end own sessions, change the password, manage two-factor',
  'user:list': 'List users',
  'user:role': 'Assign roles to users',
  'user:delete': 'Delete users',
  'user:unlock': 'Unlock a locked account',
  'audit:read': 'Read the audit trail',
  'role:read': 'List roles and permissions',
  'role:manage': 'Create and delete custom roles',
};

const USER = ['diagram:read', 'diagram:create', 'diagram:modify:own', 'profile:read', 'session:manage'];
const BUILTIN_ROLES = {
  user: { description: 'Ordinary user: own diagrams, own account', permissions: USER },
  moderator: { description: 'Moderator: may change any diagram, sees users and the audit trail', permissions: [...USER, 'diagram:modify:any', 'user:list', 'audit:read', 'role:read'] },
  admin: { description: 'Administrator: everything', permissions: Object.keys(PERMISSIONS) },
};
const DEFAULT_ROLE = 'user';
const ADMIN_ROLE = 'admin';

const hasPermission = (permissions, permission) => Array.isArray(permissions) && permissions.includes(permission);

// The diagram rule in one place: the owner may change a diagram, and so may anyone who holds the "any" permission.
const mayModifyDiagram = (user, diagram) =>
  (diagram.ownerId === user.id && hasPermission(user.permissions, 'diagram:modify:own')) || hasPermission(user.permissions, 'diagram:modify:any');

// req.user.permissions comes from the database on every request (see middleware/auth.js).
const requirePermission = (permission) => (req, _res, next) => (hasPermission(req.user.permissions, permission) ? next() : next(forbidden(`Requires the ${permission} permission`)));

module.exports = { PERMISSIONS, BUILTIN_ROLES, DEFAULT_ROLE, ADMIN_ROLE, hasPermission, mayModifyDiagram, requirePermission };
