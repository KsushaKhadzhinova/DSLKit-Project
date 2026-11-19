const { BUILTIN_ROLES } = require('./permissions');

// Makes the Roles and RolePermissions tables match BUILTIN_ROLES: missing roles and permissions are inserted, permissions that the
// matrix no longer lists are removed. Custom roles are not touched. It is idempotent, so the migration and the seed both call it.
const syncBuiltinRoles = async (queryInterface) => {
  const { sequelize } = queryInterface;
  const now = new Date();
  for (const [name, { description, permissions }] of Object.entries(BUILTIN_ROLES)) {
    let id = await queryInterface.rawSelect('Roles', { where: { name } }, ['id']);
    if (id) {
      await queryInterface.bulkUpdate('Roles', { description, builtIn: true, updatedAt: now }, { id });
    } else {
      await queryInterface.bulkInsert('Roles', [{ name, description, builtIn: true, createdAt: now, updatedAt: now }]);
      id = await queryInterface.rawSelect('Roles', { where: { name } }, ['id']);
    }
    const rows = await sequelize.query('SELECT permission FROM RolePermissions WHERE roleId = ?', { replacements: [id], type: 'SELECT' });
    const have = new Set(rows.map((row) => row.permission));
    const missing = permissions.filter((permission) => !have.has(permission));
    if (missing.length > 0) await queryInterface.bulkInsert('RolePermissions', missing.map((permission) => ({ roleId: id, permission, createdAt: now, updatedAt: now })));
    for (const permission of have) {
      if (!permissions.includes(permission)) await queryInterface.bulkDelete('RolePermissions', { roleId: id, permission });
    }
  }
};

module.exports = { syncBuiltinRoles };
