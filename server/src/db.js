'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { Sequelize, DataTypes } = require('sequelize');
const { normalize, fit } = require('./search');

function defineModels(sequelize) {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING(100), allowNull: false },
      displayName: { type: DataTypes.STRING(40), allowNull: false },
      role: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'user' },
      failedAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lockedUntil: { type: DataTypes.DATE, allowNull: true },
      searchText: { type: DataTypes.STRING(300), allowNull: false, defaultValue: '' },
    },
    {
      tableName: 'users',
      hooks: {
        beforeSave: (u) => {
          u.searchText = fit(normalize(`${u.displayName} ${u.email}`), 300);
        },
      },
    },
  );

  const Project = sequelize.define(
    'Project',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      title: { type: DataTypes.STRING(80), allowNull: false },
      description: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
      notation: { type: DataTypes.STRING(40), allowNull: false },
      source: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      visibility: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'private' },
      searchText: { type: DataTypes.STRING(1000), allowNull: false, defaultValue: '' },
    },
    {
      tableName: 'projects',
      hooks: {
        beforeSave: (p) => {
          p.searchText = fit(normalize(`${p.title} ${p.description}`), 1000);
        },
      },
    },
  );

  const ProjectMember = sequelize.define(
    'ProjectMember',
    {
      projectId: { type: DataTypes.UUID, primaryKey: true },
      userId: { type: DataTypes.UUID, primaryKey: true },
      access: { type: DataTypes.STRING(5), allowNull: false },
    },
    { tableName: 'project_members' },
  );

  // Only a hash of the refresh token is stored, so a database leak does not leak sessions.
  const RefreshToken = sequelize.define(
    'RefreshToken',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      revokedAt: { type: DataTypes.DATE, allowNull: true },
      replayedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'refresh_tokens', timestamps: false },
  );

  const RequestLog = sequelize.define(
    'RequestLog',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      method: { type: DataTypes.STRING(10), allowNull: false },
      path: { type: DataTypes.STRING(200), allowNull: false },
      status: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.UUID, allowNull: true },
      ip: { type: DataTypes.STRING(64), allowNull: true },
      durationMs: { type: DataTypes.INTEGER, allowNull: false },
    },
    { tableName: 'request_logs', updatedAt: false },
  );

  User.hasMany(Project, { foreignKey: { name: 'ownerId', allowNull: false }, onDelete: 'CASCADE' });
  Project.belongsTo(User, { as: 'owner', foreignKey: { name: 'ownerId', allowNull: false } });
  Project.hasMany(ProjectMember, { foreignKey: 'projectId', onDelete: 'CASCADE' });
  ProjectMember.belongsTo(Project, { foreignKey: 'projectId' });
  User.hasMany(ProjectMember, { foreignKey: 'userId', onDelete: 'CASCADE' });
  ProjectMember.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });

  return { User, Project, ProjectMember, RefreshToken, RequestLog };
}

async function createDatabase(config) {
  let sequelize;
  if (config.dialect === 'postgres') {
    sequelize = new Sequelize(config.databaseUrl, { dialect: 'postgres', logging: false });
  } else {
    if (config.storage !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(config.storage)), { recursive: true });
    sequelize = new Sequelize({ dialect: 'sqlite', storage: config.storage, logging: false });
  }
  const models = defineModels(sequelize);
  await sequelize.authenticate();
  if (config.dbSync) await sequelize.sync();
  return { sequelize, ...models };
}

module.exports = { createDatabase };
