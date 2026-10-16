const { DataTypes } = require('sequelize');

const ROLES = ['user', 'admin'];

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
    role: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'user', validate: { isIn: [ROLES] } },
  });

  // The hash must never leave the server, so the public view is built in one place.
  User.prototype.toPublic = function toPublic() {
    return { id: this.id, email: this.email, role: this.role, createdAt: this.createdAt };
  };
  return User;
};

module.exports = { defineUser, ROLES };
