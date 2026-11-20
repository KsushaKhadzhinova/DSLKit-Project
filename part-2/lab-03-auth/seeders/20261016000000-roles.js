const { syncBuiltinRoles } = require('../src/roles-sync');

// Makes the Roles and RolePermissions tables equal to the matrix in src/permissions.js (the single source). Migration 7 does the same
// on a new database, so this seed matters after the matrix changed: run it again and the rows follow. Custom roles are not touched.
module.exports = {
  async up(queryInterface) {
    await syncBuiltinRoles(queryInterface);
  },

  // Roles are not removed on undo: users may still hold them, and migration 7 owns the tables.
  async down() {},
};
