const { DataTypes, ValidationError } = require('sequelize');
const { DEFAULT_ROLE } = require('../permissions');

// Roles and RolePermissions (migration 7) and the link from Users.roleId (migration 8).
const defineRoleModels = (sequelize, User) => {
  const Role = sequelize.define('Role', {
    name: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    builtIn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  });
  const RolePermission = sequelize.define('RolePermission', {
    roleId: { type: DataTypes.INTEGER, allowNull: false },
    permission: { type: DataTypes.STRING(40), allowNull: false },
  });
  // Deleting a role removes its permission rows (CASCADE in the migration); a role that users hold cannot be deleted (RESTRICT).
  Role.hasMany(RolePermission, { foreignKey: 'roleId', onDelete: 'CASCADE' });
  RolePermission.belongsTo(Role, { foreignKey: 'roleId', onDelete: 'CASCADE' });
  Role.hasMany(User, { foreignKey: 'roleId', onDelete: 'RESTRICT' });
  User.belongsTo(Role, { foreignKey: 'roleId', onDelete: 'RESTRICT' });
  // Every user is loaded together with the role and its permissions, so one query answers who may do what.
  User.addScope('defaultScope', { include: [{ model: Role, include: [RolePermission] }] }, { override: true });

  const byName = (name, options = {}) => Role.findOne({ where: { name: String(name) }, include: [RolePermission], transaction: options.transaction });
  const unknown = (name) => new ValidationError(`Validation error: unknown role ${String(name).slice(0, 30)}`);

  // A name given in the role attribute (or none at all) becomes roleId before the row is checked and saved.
  User.addHook('beforeValidate', async (user, options) => {
    const name = user.getDataValue('role') ?? (user.roleId ? undefined : DEFAULT_ROLE);
    if (name === undefined) return;
    const role = await byName(name, options);
    if (!role) throw unknown(name);
    user.roleId = role.id;
    user.Role = role;
    user.dataValues.role = undefined;
  });
  User.addHook('afterSave', async (user, options) => {
    if (!user.Role || user.Role.id !== user.roleId) user.Role = await Role.findByPk(user.roleId, { include: [RolePermission], transaction: options.transaction });
  });
  // User.update({ role: 'admin' }, { where }) is turned into the same change of roleId. It is done before Sequelize validates the
  // values (a hook is too late: the validation step drops the virtual attribute), so the static method is wrapped.
  const plainUpdate = User.update.bind(User);
  User.update = async (values, options) => {
    if (values?.role === undefined) return plainUpdate(values, options);
    const role = await byName(values.role, options || {});
    if (!role) throw unknown(values.role);
    const { role: _name, ...rest } = values;
    return plainUpdate({ ...rest, roleId: role.id }, options);
  };
  return { Role, RolePermission };
};

module.exports = { defineRoleModels };
