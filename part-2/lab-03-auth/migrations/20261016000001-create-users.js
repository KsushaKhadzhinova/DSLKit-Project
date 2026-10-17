// A migration is a snapshot, so the allowed values are copied here instead of imported.
const ROLES = ['user', 'admin'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const { fn, col, where, Op } = Sequelize;
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
      where: { role: { [Op.in]: ROLES } },
    });
    // Emails are stored lowercased, so the unique index cannot be dodged with another letter case.
    await queryInterface.addConstraint('Users', {
      type: 'check',
      fields: ['email'],
      name: 'users_email_lowercase_check',
      where: where(fn('lower', col('email')), col('email')),
    });
    // SQLite does not enforce VARCHAR length, so the length and the empty value are checked explicitly.
    await queryInterface.addConstraint('Users', {
      type: 'check',
      fields: ['email'],
      name: 'users_email_length',
      where: where(fn('length', col('email')), { [Op.between]: [3, 254] }),
    });
    await queryInterface.addConstraint('Users', {
      type: 'check',
      fields: ['passwordHash'],
      name: 'users_password_hash_not_empty',
      where: where(fn('length', col('passwordHash')), { [Op.gt]: 0 }),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Users');
  },
};
