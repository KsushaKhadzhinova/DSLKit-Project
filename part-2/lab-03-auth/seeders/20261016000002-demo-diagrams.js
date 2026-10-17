try {
  process.loadEnvFile();
} catch {
  // .env is optional
}

const ROWS = [
  { title: 'Order processing', notation: 'BPMN', sourceCode: 'start -> check -> pay -> ship', priority: 'high' },
  { title: 'Billing schema', notation: 'ERD', sourceCode: 'entity Invoice { id; total }', priority: 'normal' },
  { title: 'Login flow', notation: 'UML', sourceCode: 'user -> server: login', priority: 'low' },
];
const adminEmail = () => (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

// Diagrams need an owner, so the demo rows belong to the seeded administrator.
// Idempotent per row (owner and title): a present row is left alone, a deleted one comes back, nothing is duplicated.
module.exports = {
  async up(queryInterface) {
    const ownerId = await queryInterface.rawSelect('Users', { where: { email: adminEmail() } }, ['id']);
    if (!ownerId) {
      console.log('The admin user does not exist, the demo diagram seed is skipped');
      return;
    }
    const now = new Date();
    for (const row of ROWS) {
      const exists = await queryInterface.rawSelect('Diagrams', { where: { ownerId, title: row.title } }, ['id']);
      if (!exists) await queryInterface.bulkInsert('Diagrams', [{ ...row, ownerId, createdAt: now, updatedAt: now }]);
    }
  },

  async down(queryInterface, Sequelize) {
    const ownerId = await queryInterface.rawSelect('Users', { where: { email: adminEmail() } }, ['id']);
    if (ownerId) await queryInterface.bulkDelete('Diagrams', { ownerId, title: { [Sequelize.Op.in]: ROWS.map((row) => row.title) } });
  },
};
