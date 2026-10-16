// A migration is a snapshot, so the allowed values are copied here instead of imported.
const ROLES = ['user', 'admin'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      email: { allowNull: false, unique: true, type: Sequelize.STRING(254) },
      // A bcrypt hash is 60 characters; 100 leaves room for a stronger variant.
      passwordHash: { allowNull: false, type: Sequelize.STRING(100) },
      role: { allowNull: false, type: Sequelize.STRING(10), defaultValue: 'user' },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addConstraint('Users', {
      type: 'check',
      fields: ['role'],
      name: 'users_role_check',
      where: { role: { [Sequelize.Op.in]: ROLES } },
    });
    // Emails are stored lowercased, so the unique index cannot be dodged with another letter case.
    await queryInterface.addConstraint('Users', {
      type: 'check',
      fields: ['email'],
      name: 'users_email_lowercase_check',
      where: Sequelize.where(Sequelize.fn('lower', Sequelize.col('email')), Sequelize.col('email')),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Users');
  },
};
