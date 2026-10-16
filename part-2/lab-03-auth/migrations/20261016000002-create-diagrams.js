// A migration is a snapshot, so the allowed values are copied here instead of imported.
const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Diagrams', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      title: { allowNull: false, type: Sequelize.STRING(80) },
      notation: { allowNull: false, type: Sequelize.STRING(10) },
      sourceCode: { allowNull: false, type: Sequelize.TEXT },
      // A user cannot be deleted while diagrams point at them.
      ownerId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addConstraint('Diagrams', {
      type: 'check',
      fields: ['notation'],
      name: 'diagrams_notation_check',
      where: { notation: { [Sequelize.Op.in]: NOTATIONS } },
    });
    await queryInterface.addIndex('Diagrams', ['ownerId'], { name: 'diagrams_owner_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Diagrams');
  },
};
