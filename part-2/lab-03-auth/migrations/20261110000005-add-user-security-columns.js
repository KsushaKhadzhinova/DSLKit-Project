// Two-factor state and the time of the last password change. The TOTP secret is stored encrypted (AES-256-GCM), never as text.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'twoFactorSecret', { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.addColumn('Users', 'twoFactorEnabled', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    // The time step of the last accepted code: a code of the same or an earlier step is a replay.
    await queryInterface.addColumn('Users', 'twoFactorLastStep', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('Users', 'passwordChangedAt', { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    for (const column of ['passwordChangedAt', 'twoFactorLastStep', 'twoFactorEnabled', 'twoFactorSecret']) {
      // Plain DROP COLUMN: Sequelize rebuilds a SQLite table for removeColumn and would lose its CHECK constraints.
      await queryInterface.sequelize.query(`ALTER TABLE "Users" DROP COLUMN "${column}"`);
    }
  },
};
