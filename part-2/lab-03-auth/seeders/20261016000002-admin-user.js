const bcrypt = require('bcrypt');

try {
  process.loadEnvFile();
} catch {
  // .env is optional
}

// The first administrator comes from the environment, so no password lives in the repository.
module.exports = {
  async up(queryInterface) {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.log('ADMIN_EMAIL or ADMIN_PASSWORD is not set, the admin seed is skipped');
      return;
    }
    const now = new Date();
    await queryInterface.bulkInsert('Users', [
      { email: ADMIN_EMAIL.trim().toLowerCase(), passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10), role: 'admin', createdAt: now, updatedAt: now },
    ]);
  },

  async down(queryInterface, Sequelize) {
    const { ADMIN_EMAIL } = process.env;
    if (!ADMIN_EMAIL) return;
    await queryInterface.bulkDelete('Users', { email: { [Sequelize.Op.eq]: ADMIN_EMAIL.trim().toLowerCase() } });
  },
};
