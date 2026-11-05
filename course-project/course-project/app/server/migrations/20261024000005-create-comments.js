// A migration is a snapshot, so the limit is copied here instead of imported.
const TEXT_MAX = 1000;

// Comments belong to a diagram and to the user who wrote them. Both keys cascade:
// a deleted diagram takes its comments along, and a deleted user's comments go with the account.
module.exports = {
  async up(queryInterface, Sequelize) {
    const { fn, col, where, Op } = Sequelize;
    await queryInterface.createTable('Comments', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      diagramId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: 'Diagrams', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      authorId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      text: { allowNull: false, type: Sequelize.TEXT },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    // The API trims and checks the text, these checks keep the table clean for any other writer.
    await queryInterface.addConstraint('Comments', {
      type: 'check',
      fields: ['text'],
      name: 'comments_text_not_blank',
      where: where(fn('length', fn('trim', col('text'))), { [Op.gt]: 0 }),
    });
    await queryInterface.addConstraint('Comments', {
      type: 'check',
      fields: ['text'],
      name: 'comments_text_length',
      where: where(fn('length', col('text')), { [Op.lte]: TEXT_MAX }),
    });
    await queryInterface.addIndex('Comments', ['diagramId'], { name: 'comments_diagram_id' });
    await queryInterface.addIndex('Comments', ['authorId'], { name: 'comments_author_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Comments');
  },
};
