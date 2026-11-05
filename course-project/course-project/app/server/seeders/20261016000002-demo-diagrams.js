const { ROWS } = require('../seed-data/diagrams');
const { DEMO_EMAILS } = require('./20261016000001-demo-users');

try {
  process.loadEnvFile();
} catch {
  // .env is optional
}

const adminEmail = () => (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

// Diagrams need an owner: the seeded administrator and the demo users share the rows in turn, so ownership checks have data to work on.
// Idempotent per row (owner and title): a present row is left alone, a deleted one comes back, nothing is duplicated.
module.exports = {
  async up(queryInterface, Sequelize) {
    const emails = [adminEmail(), ...DEMO_EMAILS].filter(Boolean);
    const owners = [];
    for (const email of emails) {
      const id = await queryInterface.rawSelect('Users', { where: { email } }, ['id']);
      if (id) owners.push(id);
    }
    if (!owners.length) {
      console.log('The admin user does not exist, the demo diagram seed is skipped');
      return;
    }
    const now = new Date();
    for (const [i, row] of ROWS.entries()) {
      const ownerId = owners[i % owners.length];
      const exists = await queryInterface.rawSelect('Diagrams', { where: { ownerId, title: row.title } }, ['id']);
      if (!exists) await queryInterface.bulkInsert('Diagrams', [{ ...row, ownerId, createdAt: now, updatedAt: now }]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Diagrams', { title: { [Sequelize.Op.in]: ROWS.map((row) => row.title) } });
  },
};
