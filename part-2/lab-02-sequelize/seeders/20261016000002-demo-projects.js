const { ROWS } = require('../seed-data/diagrams');
const { PROJECTS, projectFor } = require('../seed-data/projects');

const MARKER = 'demo';

// Runs after the diagram seeder. Idempotent: a project that exists is reused, a diagram is linked only when it has no project yet,
// so a diagram the user moved to another project stays there.
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    for (const project of PROJECTS) {
      const exists = await queryInterface.rawSelect('Projects', { where: { name: project.name } }, ['id']);
      if (!exists) await queryInterface.bulkInsert('Projects', [{ name: project.name, createdAt: now, updatedAt: now }]);
    }
    const sequelize = queryInterface.sequelize;
    for (const row of ROWS) {
      const name = projectFor(row);
      if (!name) continue;
      await sequelize.query(
        'UPDATE Diagrams SET projectId = (SELECT id FROM Projects WHERE name = :name) WHERE owner = :owner AND title = :title AND projectId IS NULL',
        { replacements: { name, owner: MARKER, title: row.title } },
      );
    }
  },

  // Deleting a project clears projectId of its diagrams (ON DELETE SET NULL), only the demo projects are removed.
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Projects', { name: { [Sequelize.Op.in]: PROJECTS.map((project) => project.name) } });
  },
};
