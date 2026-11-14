// The request log lives in the database (even variant), one row per request.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('RequestLogs', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      method: { allowNull: false, type: Sequelize.STRING(10) },
      path: { allowNull: false, type: Sequelize.STRING(200) },
      ip: { allowNull: false, type: Sequelize.STRING(64) },
      status: { type: Sequelize.INTEGER },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('RequestLogs', ['createdAt'], { name: 'request_logs_created_at' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('RequestLogs');
  },
};
