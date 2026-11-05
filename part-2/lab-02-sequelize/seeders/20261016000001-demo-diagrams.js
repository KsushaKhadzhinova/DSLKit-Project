const { ROWS } = require('../seed-data/diagrams');

// Every seeded row has this owner, so the seed can tell its rows from the ones users created.
const MARKER = 'demo';

// Idempotent per row: a row that is already there is left alone, a deleted one comes back, nothing is duplicated.
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    for (const row of ROWS) {
      const exists = await queryInterface.rawSelect('Diagrams', { where: { owner: MARKER, title: row.title } }, ['id']);
      if (!exists) await queryInterface.bulkInsert('Diagrams', [{ ...row, owner: MARKER, createdAt: now, updatedAt: now }]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Diagrams', { owner: MARKER, title: { [Sequelize.Op.in]: ROWS.map((row) => row.title) } });
  },
};
