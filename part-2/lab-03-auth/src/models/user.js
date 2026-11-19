const { DataTypes } = require('sequelize');

const defineUser = (sequelize) => {
  const User = sequelize.define('User', {
    // Lowercased on the way in, the database also checks it, so one address is one account.
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('email', typeof value === 'string' ? value.trim().toLowerCase() : value);
      },
    },
    passwordHash: { type: DataTypes.STRING(100), allowNull: false },
    // Encrypted with AES-256-GCM (see crypto-box.js); never leaves the server.
    twoFactorSecret: { type: DataTypes.STRING(255), allowNull: true },
    twoFactorEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    twoFactorLastStep: { type: DataTypes.INTEGER, allowNull: true },
    passwordChangedAt: { type: DataTypes.DATE, allowNull: true },
    // The role lives in the Roles table. roleId is the foreign key; role is the name, read from the loaded Role. Setting it by name
    // (User.create({ role: 'admin' }), User.update({ role }, ...)) is resolved to roleId by the hooks in roles.js.
    roleId: { type: DataTypes.INTEGER, allowNull: false },
    role: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.Role ? this.Role.name : this.getDataValue('role');
      },
      set(value) {
        this.setDataValue('role', value);
      },
    },
  });

  // The permissions of the role, from the rows loaded with the user (see the default scope in roles.js).
  User.prototype.permissionList = function permissionList() {
    return (this.Role?.RolePermissions ?? []).map((row) => row.permission);
  };
  // The hash must never leave the server, so the public view is built in one place.
  User.prototype.toPublic = function toPublic() {
    return { id: this.id, email: this.email, role: this.role, createdAt: this.createdAt };
  };
  // Whatever serializes a User by accident (res.json(user), logs, JSON.stringify) still cannot show the hash.
  User.prototype.toJSON = function toJSON() {
    return this.toPublic();
  };
  return User;
};

module.exports = { defineUser };
