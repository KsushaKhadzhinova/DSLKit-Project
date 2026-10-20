// A migration is a snapshot, so the limit is copied here instead of imported.
const REVISION_MAX = 100000;

// A numeric column that is never negative: the CHECK keeps it clean for any writer, not only for the API.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Diagrams', 'revision', {
      allowNull: false,
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
    await queryInterface.addConstraint('Diagrams', {
      type: 'check',
      fields: ['revision'],
      name: 'diagrams_revision_range',
      where: { revision: { [Sequelize.Op.gte]: 0, [Sequelize.Op.lte]: REVISION_MAX } },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('Diagrams', 'diagrams_revision_range');
    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      // The generic removeColumn rebuilds a SQLite table from its columns only and loses every CHECK,
      // while the native DROP COLUMN (SQLite 3.35+) leaves the rest of the table as it was.
      await queryInterface.sequelize.query('ALTER TABLE `Diagrams` DROP COLUMN `revision`');
    } else {
      await queryInterface.removeColumn('Diagrams', 'revision');
    }
  },
};
