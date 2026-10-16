const bcrypt = require('bcrypt');

try {
  process.loadEnvFile();
} catch {
  // .env is optional
}

const adminEmail = () => (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

// The first administrator comes from the environment, so no password lives in the repository.
// The seed is idempotent: an account with this email is never touched or duplicated.
module.exports = {
  async up(queryInterface) {
    const email = adminEmail();
    const { ADMIN_PASSWORD } = process.env;
    if (!email || !ADMIN_PASSWORD) {
      console.log('ADMIN_EMAIL or ADMIN_PASSWORD is not set, the admin seed is skipped');
      return;
    }
    if (await queryInterface.rawSelect('Users', { where: { email } }, ['id'])) return;
    const now = new Date();
    await queryInterface.bulkInsert('Users', [{ email, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10), role: 'admin', createdAt: now, updatedAt: now }]);
  },

  // Undo runs after the demo seed was undone, so the admin owns no diagrams any more.
  async down(queryInterface) {
    const email = adminEmail();
    if (email) await queryInterface.bulkDelete('Users', { email });
  },
};
