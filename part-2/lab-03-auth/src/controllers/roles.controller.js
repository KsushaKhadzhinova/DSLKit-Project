const { notFound, conflict, forbidden } = require('../errors');
const { PERMISSIONS } = require('../permissions');

const createRolesController = ({ sequelize, Role, RolePermission, User }, audit) => {
  const view = (role, users = 0) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    builtIn: role.builtIn,
    permissions: role.RolePermissions.map((row) => row.permission).sort(),
    users,
  });

  return {
    list: async (_req, res) => {
      const roles = await Role.findAll({ include: [RolePermission], order: [['id', 'ASC']] });
      const counts = await sequelize.query('SELECT "roleId" AS id, COUNT(*) AS n FROM "Users" GROUP BY "roleId"', { type: 'SELECT' });
      const held = new Map(counts.map((row) => [Number(row.id), Number(row.n)]));
      res.json(roles.map((role) => view(role, held.get(role.id) ?? 0)));
    },

    permissions: (_req, res) => res.json(Object.entries(PERMISSIONS).map(([name, description]) => ({ name, description }))),

    // A caller can only put permissions into a role that the caller holds, so creating a role never raises anyone's rights.
    create: async (req, res, next) => {
      const { name, description, permissions } = req.newRoleData;
      const missing = permissions.filter((permission) => !req.user.permissions.includes(permission));
      if (missing.length > 0) return next(forbidden(`You cannot grant permissions you do not hold: ${missing.join(', ')}`));
      try {
        const role = await sequelize.transaction(async (transaction) => {
          const created = await Role.create({ name, description, builtIn: false }, { transaction });
          await RolePermission.bulkCreate(permissions.map((permission) => ({ roleId: created.id, permission })), { transaction });
          return Role.findByPk(created.id, { include: [RolePermission], transaction });
        });
        await audit.record('role_created', { actorId: req.user.id, ip: req.ip, detail: `${name}: ${permissions.length} permissions` });
        return res.status(201).location(`/admin/roles/${role.id}`).json(view(role));
      } catch (error) {
        if (error.name !== 'SequelizeUniqueConstraintError') throw error;
        return next(conflict('A role with this name already exists'));
      }
    },

    remove: async (req, res, next) => {
      const role = await Role.findByPk(req.roleId);
      if (!role) return next(notFound(`Role ${req.roleId} not found`));
      if (role.builtIn) return next(conflict('A built-in role cannot be deleted'));
      if ((await User.count({ where: { roleId: role.id } })) > 0) return next(conflict('The role is in use, assign another role to its users first'));
      await role.destroy();
      await audit.record('role_deleted', { actorId: req.user.id, ip: req.ip, detail: role.name });
      return res.status(204).end();
    },
  };
};

module.exports = { createRolesController };
