// Refresh tokens (one family per login), 2FA recovery codes, password reset tokens and the audit trail.
// Only hashes of tokens and codes are stored.
module.exports = {
  async up(queryInterface, Sequelize) {
    const id = { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER };
    const dates = { createdAt: { allowNull: false, type: Sequelize.DATE }, updatedAt: { allowNull: false, type: Sequelize.DATE } };
    const userId = { allowNull: false, type: Sequelize.INTEGER, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' };

    await queryInterface.createTable('RefreshTokens', {
      id,
      userId,
      // The login the token belongs to; it is the session id shown to the client.
      familyId: { allowNull: false, type: Sequelize.STRING(36) },
      tokenHash: { allowNull: false, unique: true, type: Sequelize.STRING(64) },
      label: { allowNull: false, type: Sequelize.STRING(120), defaultValue: '' },
      ip: { allowNull: false, type: Sequelize.STRING(64), defaultValue: '' },
      familyStartedAt: { allowNull: false, type: Sequelize.DATE },
      expiresAt: { allowNull: false, type: Sequelize.DATE },
      // Set when the token is exchanged for a new one; presenting a used token again means it was stolen.
      usedAt: { type: Sequelize.DATE },
      revokedAt: { type: Sequelize.DATE },
      ...dates,
    });
    await queryInterface.addIndex('RefreshTokens', ['familyId'], { name: 'refresh_tokens_family' });
    await queryInterface.addIndex('RefreshTokens', ['userId'], { name: 'refresh_tokens_user' });

    await queryInterface.createTable('RecoveryCodes', {
      id,
      userId,
      codeHash: { allowNull: false, type: Sequelize.STRING(64) },
      usedAt: { type: Sequelize.DATE },
      ...dates,
    });
    await queryInterface.addIndex('RecoveryCodes', ['userId'], { name: 'recovery_codes_user' });

    await queryInterface.createTable('PasswordResets', {
      id,
      userId,
      tokenHash: { allowNull: false, unique: true, type: Sequelize.STRING(64) },
      expiresAt: { allowNull: false, type: Sequelize.DATE },
      usedAt: { type: Sequelize.DATE },
      ...dates,
    });

    await queryInterface.createTable('AuditEvents', {
      id,
      type: { allowNull: false, type: Sequelize.STRING(40) },
      // Both are plain numbers without a foreign key, so the trail survives the deletion of an account.
      userId: { type: Sequelize.INTEGER },
      actorId: { type: Sequelize.INTEGER },
      ip: { allowNull: false, type: Sequelize.STRING(64), defaultValue: '' },
      detail: { allowNull: false, type: Sequelize.STRING(500), defaultValue: '' },
      ...dates,
    });
    await queryInterface.addIndex('AuditEvents', ['createdAt'], { name: 'audit_events_created_at' });
    await queryInterface.addIndex('AuditEvents', ['type'], { name: 'audit_events_type' });
    await queryInterface.addIndex('AuditEvents', ['userId'], { name: 'audit_events_user' });
  },

  async down(queryInterface) {
    for (const table of ['AuditEvents', 'PasswordResets', 'RecoveryCodes', 'RefreshTokens']) await queryInterface.dropTable(table);
  },
};
