try {
  process.loadEnvFile();
} catch {
  // .env is optional
}

const TITLES = ['Order processing', 'Billing schema', 'Login flow'];
const adminEmail = () => (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

// Diagrams need an owner, so the demo rows belong to the seeded administrator.
// They are recognised by owner and title, which keeps the seed idempotent and the undo harmless for user data.
module.exports = {
  async up(queryInterface) {
    const ownerId = await queryInterface.rawSelect('Users', { where: { email: adminEmail() } }, ['id']);
    if (!ownerId) {
      console.log('The admin user does not exist, the demo diagram seed is skipped');
      return;
    }
    if (await queryInterface.rawSelect('Diagrams', { where: { ownerId, title: TITLES[0] } }, ['id'])) return;
    const now = new Date();
    const row = (title, notation, sourceCode, priority) => ({ title, notation, sourceCode, priority, ownerId, createdAt: now, updatedAt: now });
    await queryInterface.bulkInsert('Diagrams', [
      row(TITLES[0], 'BPMN', 'start -> check -> pay -> ship', 'high'),
      row(TITLES[1], 'ERD', 'entity Invoice { id; total }', 'normal'),
      row(TITLES[2], 'UML', 'user -> server: login', 'low'),
    ]);
  },

  async down(queryInterface, Sequelize) {
    const ownerId = await queryInterface.rawSelect('Users', { where: { email: adminEmail() } }, ['id']);
    if (ownerId) await queryInterface.bulkDelete('Diagrams', { ownerId, title: { [Sequelize.Op.in]: TITLES } });
  },
};
