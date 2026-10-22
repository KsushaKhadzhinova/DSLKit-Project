const bcrypt = require('bcrypt');

try {
  process.loadEnvFile();
} catch {
  // .env is optional
}

const MIN_PASSWORD = 10;
const DEMO_EMAILS = ['alice@example.test', 'bob@example.test', 'carol@example.test', 'dave@example.test'];

// Ordinary users for trying roles and ownership. They share one password from DEMO_USER_PASSWORD, so none lives in the repository.
// Skipped without the variable. Idempotent: an existing account is never touched or duplicated.
module.exports = {
  DEMO_EMAILS,
  async up(queryInterface) {
    const { DEMO_USER_PASSWORD } = process.env;
    if (!DEMO_USER_PASSWORD) {
      console.log('DEMO_USER_PASSWORD is not set, the demo user seed is skipped');
      return;
    }
    if (DEMO_USER_PASSWORD.length < MIN_PASSWORD || Buffer.byteLength(DEMO_USER_PASSWORD) > 72) {
      throw new Error(`DEMO_USER_PASSWORD must be ${MIN_PASSWORD} characters or more and at most 72 bytes`);
    }
    const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
    const now = new Date();
    for (const email of DEMO_EMAILS) {
      if (await queryInterface.rawSelect('Users', { where: { email } }, ['id'])) continue;
      await queryInterface.bulkInsert('Users', [{ email, passwordHash, role: 'user', createdAt: now, updatedAt: now }]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', { email: { [Sequelize.Op.in]: DEMO_EMAILS } });
  },
};
