const { ROWS } = require('../seed-data/comments');
const { DEMO_EMAILS } = require('./20261016000001-demo-users');

try {
  process.loadEnvFile();
} catch {
  // .env is optional
}

const adminEmail = () => (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

// Comments need diagrams and authors: they use the demo diagrams and the accounts of the earlier seeders (the administrator first, then the demo users).
// A row whose diagram or author is missing is skipped. Idempotent per row (diagram, author and text): nothing is duplicated, a deleted row comes back.
module.exports = {
  async up(queryInterface) {
    const emails = [adminEmail(), ...DEMO_EMAILS].filter(Boolean);
    const authors = [];
    for (const email of emails) authors.push(await queryInterface.rawSelect('Users', { where: { email } }, ['id']));
    const now = new Date();
    let added = 0;
    for (const row of ROWS) {
      const authorId = authors[row.author];
      const diagramId = await queryInterface.rawSelect('Diagrams', { where: { title: row.diagram } }, ['id']);
      if (!authorId || !diagramId) continue;
      const exists = await queryInterface.rawSelect('Comments', { where: { diagramId, authorId, text: row.text } }, ['id']);
      if (exists) continue;
      await queryInterface.bulkInsert('Comments', [{ diagramId, authorId, text: row.text, createdAt: now, updatedAt: now }]);
      added += 1;
    }
    if (!added) console.log('No demo comments were added (the demo diagrams or users are missing, or the comments exist)');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Comments', { text: { [Sequelize.Op.in]: ROWS.map((row) => row.text) } });
  },
};
