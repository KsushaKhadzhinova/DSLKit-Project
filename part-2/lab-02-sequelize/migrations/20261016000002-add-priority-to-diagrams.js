module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Diagrams', 'priority', {
      allowNull: false,
      type: Sequelize.STRING,
      defaultValue: 'normal',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Diagrams', 'priority');
  },
};
