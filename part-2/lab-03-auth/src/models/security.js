const { DataTypes } = require('sequelize');

// Tables of the extended authentication, created by migrations 5 and 6. Only hashes of tokens and codes are stored.
const defineSecurityModels = (sequelize, User) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    familyId: { type: DataTypes.STRING(36), allowNull: false },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    label: { type: DataTypes.STRING(120), allowNull: false, defaultValue: '' },
    ip: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    familyStartedAt: { type: DataTypes.DATE, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
  });
  const RecoveryCode = sequelize.define('RecoveryCode', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    codeHash: { type: DataTypes.STRING(64), allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
  });
  const PasswordReset = sequelize.define('PasswordReset', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
  });
  const AuditEvent = sequelize.define('AuditEvent', {
    type: { type: DataTypes.STRING(40), allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    actorId: { type: DataTypes.INTEGER, allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    detail: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
  });
  for (const model of [RefreshToken, RecoveryCode, PasswordReset]) {
    User.hasMany(model, { foreignKey: 'userId', onDelete: 'CASCADE' });
    model.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
  }
  return { RefreshToken, RecoveryCode, PasswordReset, AuditEvent };
};

module.exports = { defineSecurityModels };
