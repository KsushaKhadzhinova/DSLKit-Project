// Users.role (text with a CHECK of two values) becomes Users.roleId, a foreign key to Roles. The existing data is carried over by name.
// PostgreSQL changes the table in place. SQLite cannot drop a column that a CHECK uses, so the table is rebuilt (the procedure
// of the SQLite documentation: new table, copy, drop, rename, with foreign keys switched off meanwhile).
const COLUMNS = ['id', 'email', 'passwordHash', 'createdAt', 'updatedAt', 'twoFactorSecret', 'twoFactorEnabled', 'twoFactorLastStep', 'passwordChangedAt'];
const list = (alias) => COLUMNS.map((column) => `${alias}.\`${column}\``).join(', ');
const plain = COLUMNS.map((column) => `\`${column}\``).join(', ');

const BASE = `\`id\` INTEGER PRIMARY KEY AUTOINCREMENT, \`email\` VARCHAR(254) NOT NULL UNIQUE, \`passwordHash\` VARCHAR(100) NOT NULL, \`createdAt\` DATETIME NOT NULL, \`updatedAt\` DATETIME NOT NULL,
  \`twoFactorSecret\` VARCHAR(255), \`twoFactorEnabled\` TINYINT(1) NOT NULL DEFAULT 0, \`twoFactorLastStep\` INTEGER, \`passwordChangedAt\` DATETIME`;
const CHECKS = `CONSTRAINT \`users_email_lowercase_check\` CHECK (lower(\`email\`) = \`email\`),
  CONSTRAINT \`users_email_length\` CHECK (length(\`email\`) BETWEEN 3 AND 254),
  CONSTRAINT \`users_password_hash_not_empty\` CHECK (length(\`passwordHash\`) > 0)`;

const rebuild = async (sequelize, createSql, copySql) => {
  await sequelize.query('PRAGMA foreign_keys = OFF');
  try {
    await sequelize.query('DROP TABLE IF EXISTS `Users_new`');
    await sequelize.query(createSql);
    await sequelize.query(copySql);
    await sequelize.query('DROP TABLE `Users`');
    await sequelize.query('ALTER TABLE `Users_new` RENAME TO `Users`');
  } finally {
    await sequelize.query('PRAGMA foreign_keys = ON');
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() === 'sqlite') {
      await rebuild(
        sequelize,
        `CREATE TABLE \`Users_new\` (${BASE}, \`roleId\` INTEGER NOT NULL REFERENCES \`Roles\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE, ${CHECKS})`,
        `INSERT INTO \`Users_new\` (${plain}, \`roleId\`) SELECT ${list('u')}, COALESCE((SELECT r.id FROM \`Roles\` r WHERE r.name = u.role), (SELECT r.id FROM \`Roles\` r WHERE r.name = 'user')) FROM \`Users\` u`,
      );
      return;
    }
    await queryInterface.addColumn('Users', 'roleId', { type: Sequelize.INTEGER, allowNull: true });
    await sequelize.query(`UPDATE "Users" SET "roleId" = COALESCE((SELECT r.id FROM "Roles" r WHERE r.name = "Users".role), (SELECT r.id FROM "Roles" r WHERE r.name = 'user'))`);
    await queryInterface.changeColumn('Users', 'roleId', { type: Sequelize.INTEGER, allowNull: false });
    await queryInterface.addConstraint('Users', { type: 'foreign key', fields: ['roleId'], name: 'users_role_id_fk', references: { table: 'Roles', field: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
    await queryInterface.removeColumn('Users', 'role');
  },

  // Roles other than user and admin do not exist in the old schema: their holders become ordinary users.
  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() === 'sqlite') {
      await rebuild(
        sequelize,
        `CREATE TABLE \`Users_new\` (${BASE}, \`role\` VARCHAR(10) NOT NULL DEFAULT 'user', CONSTRAINT \`users_role_check\` CHECK (\`role\` IN ('user', 'admin')), ${CHECKS})`,
        `INSERT INTO \`Users_new\` (${plain}, \`role\`) SELECT ${list('u')}, CASE WHEN r.name = 'admin' THEN 'admin' ELSE 'user' END FROM \`Users\` u LEFT JOIN \`Roles\` r ON r.id = u.roleId`,
      );
      return;
    }
    await queryInterface.addColumn('Users', 'role', { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'user' });
    await sequelize.query(`UPDATE "Users" SET "role" = 'admin' WHERE "roleId" IN (SELECT id FROM "Roles" WHERE name = 'admin')`);
    await queryInterface.addConstraint('Users', { type: 'check', fields: ['role'], name: 'users_role_check', where: { role: ['user', 'admin'] } });
    await queryInterface.removeConstraint('Users', 'users_role_id_fk');
    await queryInterface.removeColumn('Users', 'roleId');
  },
};
