// A migration is a snapshot, so the limit is copied here instead of imported.
const NAME_MAX = 30;

// Tags are shared labels. DiagramTags is the join table of the many-to-many link between diagrams and tags:
// a deleted diagram or a deleted tag removes only the link rows, never the other side.
module.exports = {
  async up(queryInterface, Sequelize) {
    const { fn, col, where, Op } = Sequelize;
    await queryInterface.createTable('Tags', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      name: { allowNull: false, unique: true, type: Sequelize.STRING(NAME_MAX) },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    // The API trims and lowercases the name, these checks keep the table clean for any other writer.
    await queryInterface.addConstraint('Tags', {
      type: 'check',
      fields: ['name'],
      name: 'tags_name_not_blank',
      where: where(fn('length', fn('trim', col('name'))), { [Op.gt]: 0 }),
    });
    await queryInterface.addConstraint('Tags', {
      type: 'check',
      fields: ['name'],
      name: 'tags_name_lowercase',
      where: where(col('name'), fn('lower', col('name'))),
    });
    await queryInterface.createTable('DiagramTags', {
      diagramId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
        references: { model: 'Diagrams', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      tagId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
        references: { model: 'Tags', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('DiagramTags', ['tagId'], { name: 'diagram_tags_tag_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DiagramTags');
    await queryInterface.dropTable('Tags');
  },
};
