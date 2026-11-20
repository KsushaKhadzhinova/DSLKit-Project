const { notFound, badRequest, conflict, forbidden } = require('../errors');
const { ADMIN_ROLE } = require('../permissions');
const LIMITS = require('../../limits.json');

// A role may be given or taken away only by someone who holds every permission of it, so nobody can climb above their own rights.
const missingPermissions = (callerPermissions, role) => (role?.RolePermissions ?? []).map((row) => row.permission).filter((permission) => !callerPermissions.includes(permission));

const createUsersController = ({ User, Role, RolePermission, AuditEvent }, loginGuard, audit) => {
  const withPermissions = (name) => Role.findOne({ where: { name }, include: [RolePermission] });

  // The last administrator can be neither demoted nor deleted, or nobody could manage the users any more.
  const protectLastAdmin = async (user, action) => {
    if (user.role !== ADMIN_ROLE) return undefined;
    return (await User.count({ where: { roleId: user.roleId } })) <= 1 ? conflict(`The last administrator cannot be ${action}`) : undefined;
  };

  return {
    protectLastAdmin,

    profile: async (req, res) => {
      const user = await User.findByPk(req.user.id);
      res.json({ ...user.toPublic(), permissions: user.permissionList() });
    },

    list: async (_req, res) => {
      const users = await User.findAll({ order: [['id', 'ASC']] });
      res.json(users.map((user) => user.toPublic()));
    },

    setRole: async (req, res, next) => {
      const user = await User.findByPk(req.userId);
      if (!user) return next(notFound(`User ${req.userId} not found`));
      if (user.id === req.user.id) return next(badRequest('Admins cannot change their own role'));
      const role = await withPermissions(req.newRole);
      if (!role) return next(badRequest('Invalid role data', [{ field: 'role', message: 'must be the name of an existing role' }]));
      // Neither the new role nor the current one may hold a permission the caller does not have.
      const missing = [...new Set([...missingPermissions(req.user.permissions, role), ...missingPermissions(req.user.permissions, user.Role)])];
      if (missing.length > 0) return next(forbidden(`You cannot grant or change a role with permissions you do not hold: ${missing.join(', ')}`));
      if (role.id !== user.roleId) {
        const blocked = await protectLastAdmin(user, 'demoted');
        if (blocked) return next(blocked);
      }
      const before = user.role;
      await user.update({ roleId: role.id });
      await audit.record('role_changed', { userId: user.id, actorId: req.user.id, ip: req.ip, detail: `${before} -> ${role.name}` });
      return res.json(user.toPublic());
    },

    // Lifts the login lock and the failure counters of one account (every address that was counted).
    unlock: async (req, res, next) => {
      const user = await User.findByPk(req.userId);
      if (!user) return next(notFound(`User ${req.userId} not found`));
      const cleared = loginGuard.clearWhere((key) => key.endsWith(`|${user.email}`) || key.endsWith(`|u:${user.id}`));
      await audit.record('account_unlocked', { userId: user.id, actorId: req.user.id, ip: req.ip, detail: `${cleared} counters cleared` });
      return res.json({ id: user.id, unlocked: true, cleared });
    },

    remove: async (req, res, next) => {
      if (req.userId === req.user.id) return next(badRequest('Admins cannot delete themselves'));
      const target = await User.findByPk(req.userId);
      if (!target) return next(notFound(`User ${req.userId} not found`));
      const blocked = await protectLastAdmin(target, 'deleted');
      if (blocked) return next(blocked);
      try {
        const removed = await User.destroy({ where: { id: req.userId } });
        if (!removed) return next(notFound(`User ${req.userId} not found`));
        await audit.record('user_deleted', { userId: req.userId, actorId: req.user.id, ip: req.ip });
        return res.status(204).end();
      } catch (error) {
        // The foreign key from Diagrams.ownerId is RESTRICT, so a user who still owns diagrams stays.
        if (error.name !== 'SequelizeForeignKeyConstraintError') throw error;
        return next(conflict('The user still owns diagrams, delete or reassign them first'));
      }
    },

    // GET /admin/audit?limit=&offset=&type=&userId= : newest first, X-Total-Count holds the full number.
    audit: async (req, res, next) => {
      const { type, userId } = req.query;
      const number = (value, fallback, max) => (value === undefined ? fallback : /^\d{1,9}$/.test(String(value)) ? Math.min(Number(value), max) : NaN);
      const limit = number(req.query.limit, 50, LIMITS.auditPageMax);
      const offset = number(req.query.offset, 0, 1e9);
      if (Number.isNaN(limit) || Number.isNaN(offset) || limit < 1) return next(badRequest('limit and offset must be whole numbers, limit from 1'));
      const where = {};
      if (type !== undefined) {
        if (typeof type !== 'string' || !/^[a-z0-9_]{1,40}$/.test(type)) return next(badRequest('type must be an event name'));
        where.type = type;
      }
      if (userId !== undefined) {
        if (!/^\d{1,9}$/.test(String(userId))) return next(badRequest('userId must be a whole number'));
        where.userId = Number(userId);
      }
      const { count, rows } = await AuditEvent.findAndCountAll({ where, order: [['id', 'DESC']], limit, offset });
      res.set('X-Total-Count', String(count));
      return res.json(rows);
    },
  };
};

module.exports = { createUsersController };
