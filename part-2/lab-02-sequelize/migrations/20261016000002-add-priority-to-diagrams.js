const PRIORITIES = ['low', 'normal', 'high'];
const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Diagrams', 'priority', {
      allowNull: false,
      type: Sequelize.STRING,
      defaultValue: 'normal',
    });
    await queryInterface.addConstraint('Diagrams', {
      type: 'check',
      fields: ['priority'],
      name: 'diagrams_priority_check',
      where: { priority: { [Sequelize.Op.in]: PRIORITIES } },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('Diagrams', 'diagrams_priority_check');
    await queryInterface.removeColumn('Diagrams', 'priority');
    // SQLite drops a column by rebuilding the table from its columns only, which loses the CHECK from the first migration.
    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      await queryInterface.addConstraint('Diagrams', {
        type: 'check',
        fields: ['notation'],
        name: 'diagrams_notation_check',
        where: { notation: { [Sequelize.Op.in]: NOTATIONS } },
      });
    }
  },
};
