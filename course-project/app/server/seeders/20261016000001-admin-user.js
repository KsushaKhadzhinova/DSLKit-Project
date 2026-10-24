const bcrypt = require('bcrypt');

try {
  process.loadEnvFile();
} catch {
  // .env is optional
}

const MIN_ADMIN_PASSWORD = 10;
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
    // An administrator with a weak password is worse than none, and bcrypt only reads 72 bytes.
    if (ADMIN_PASSWORD.length < MIN_ADMIN_PASSWORD || Buffer.byteLength(ADMIN_PASSWORD) > 72) {
      throw new Error(`ADMIN_PASSWORD must be ${MIN_ADMIN_PASSWORD} characters or more and at most 72 bytes`);
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
