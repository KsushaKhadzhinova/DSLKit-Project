const { syncBuiltinRoles } = require('../src/roles-sync');

// Roles and their permissions live in the database. The built-in roles (user, moderator, admin) are generated from
// src/permissions.js, the single source, so the table and the module cannot differ after a migration.
module.exports = {
  async up(queryInterface, Sequelize) {
    const dates = { createdAt: { allowNull: false, type: Sequelize.DATE }, updatedAt: { allowNull: false, type: Sequelize.DATE } };
    await queryInterface.createTable('Roles', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      name: { allowNull: false, unique: true, type: Sequelize.STRING(30) },
      description: { allowNull: false, type: Sequelize.STRING(200), defaultValue: '' },
      // A built-in role cannot be deleted.
      builtIn: { allowNull: false, type: Sequelize.BOOLEAN, defaultValue: false },
      ...dates,
    });
    await queryInterface.createTable('RolePermissions', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      roleId: { allowNull: false, type: Sequelize.INTEGER, references: { model: 'Roles', key: 'id' }, onDelete: 'CASCADE' },
      permission: { allowNull: false, type: Sequelize.STRING(40) },
      ...dates,
    });
    await queryInterface.addIndex('RolePermissions', ['roleId', 'permission'], { unique: true, name: 'role_permissions_unique' });
    await syncBuiltinRoles(queryInterface);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('RolePermissions');
    await queryInterface.dropTable('Roles');
  },
};
