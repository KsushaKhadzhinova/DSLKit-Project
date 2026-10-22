// A migration is a snapshot, so the limit is copied here instead of imported.
const NAME_MAX = 80;

// One project has many diagrams (one-to-many). The name is unique, a second project with the same name is a database error
// that the API turns into 409. Deleting a project keeps its diagrams and clears their projectId.
module.exports = {
  async up(queryInterface, Sequelize) {
    const { fn, col, where, Op } = Sequelize;
    await queryInterface.createTable('Projects', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      name: { allowNull: false, unique: true, type: Sequelize.STRING(NAME_MAX) },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addConstraint('Projects', {
      type: 'check',
      fields: ['name'],
      name: 'projects_name_not_blank',
      where: where(fn('length', fn('trim', col('name'))), { [Op.gt]: 0 }),
    });
    await queryInterface.addColumn('Diagrams', 'projectId', {
      allowNull: true,
      type: Sequelize.INTEGER,
      references: { model: 'Projects', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('Diagrams', ['projectId'], { name: 'diagrams_project_id' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Diagrams', 'diagrams_project_id');
    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      // The generic removeColumn would rebuild the table and lose every CHECK, see the priority migration.
      await queryInterface.sequelize.query('ALTER TABLE `Diagrams` DROP COLUMN `projectId`');
    } else {
      await queryInterface.removeColumn('Diagrams', 'projectId');
    }
    await queryInterface.dropTable('Projects');
  },
};
