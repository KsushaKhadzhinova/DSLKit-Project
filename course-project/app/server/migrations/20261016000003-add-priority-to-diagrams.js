const PRIORITIES = ['low', 'normal', 'high'];
const OWNER_INDEX = 'diagrams_owner_id';

// SQLite changes a constraint by rebuilding the table, and the rebuild drops its indexes, so the index is checked and restored.
const ensureOwnerIndex = async (queryInterface) => {
  const indexes = await queryInterface.showIndex('Diagrams');
  if (!indexes.some((index) => index.name === OWNER_INDEX)) await queryInterface.addIndex('Diagrams', ['ownerId'], { name: OWNER_INDEX });
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Diagrams', 'priority', {
      allowNull: false,
      type: Sequelize.STRING(10),
      defaultValue: 'normal',
    });
    await queryInterface.addConstraint('Diagrams', {
      type: 'check',
      fields: ['priority'],
      name: 'diagrams_priority_check',
      where: { priority: { [Sequelize.Op.in]: PRIORITIES } },
    });
    await ensureOwnerIndex(queryInterface);
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('Diagrams', 'diagrams_priority_check');
    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      // The generic removeColumn rebuilds a SQLite table from its columns only and loses every CHECK and the ON DELETE rule,
      // while the native DROP COLUMN (SQLite 3.35+) leaves the rest of the table as it was.
      await queryInterface.sequelize.query('ALTER TABLE `Diagrams` DROP COLUMN `priority`');
    } else {
      await queryInterface.removeColumn('Diagrams', 'priority');
    }
    await ensureOwnerIndex(queryInterface);
  },
};
