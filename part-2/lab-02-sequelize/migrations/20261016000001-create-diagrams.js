module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Diagrams', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      title: { allowNull: false, type: Sequelize.STRING(80) },
      notation: { allowNull: false, type: Sequelize.STRING },
      sourceCode: { allowNull: false, type: Sequelize.TEXT },
      owner: { allowNull: false, type: Sequelize.STRING(60) },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Diagrams');
  },
};
