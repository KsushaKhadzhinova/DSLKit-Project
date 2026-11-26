'use strict';
const { DataTypes: T } = require('sequelize');

const stamps = { createdAt: { type: T.DATE, allowNull: false }, updatedAt: { type: T.DATE, allowNull: false } };
const ref = (table) => ({ type: T.UUID, allowNull: false, references: { model: table, key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// Mirrors the models in src/db.js; tests/migrations.test.js proves the two produce the same schema.
async function up(q) {
  await q.createTable('users', {
    id: { type: T.UUID, primaryKey: true, allowNull: false },
    email: { type: T.STRING(254), allowNull: false, unique: true },
    passwordHash: { type: T.STRING(100), allowNull: false },
    displayName: { type: T.STRING(40), allowNull: false },
    role: { type: T.STRING(10), allowNull: false, defaultValue: 'user' },
    failedAttempts: { type: T.INTEGER, allowNull: false, defaultValue: 0 },
    lockedUntil: { type: T.DATE, allowNull: true },
    searchText: { type: T.STRING(300), allowNull: false, defaultValue: '' },
    ...stamps,
  });
  await q.createTable('projects', {
    id: { type: T.UUID, primaryKey: true, allowNull: false },
    title: { type: T.STRING(80), allowNull: false },
    description: { type: T.STRING(500), allowNull: false, defaultValue: '' },
    notation: { type: T.STRING(40), allowNull: false },
    source: { type: T.TEXT, allowNull: false, defaultValue: '' },
    visibility: { type: T.STRING(10), allowNull: false, defaultValue: 'private' },
    searchText: { type: T.STRING(1000), allowNull: false, defaultValue: '' },
    ownerId: ref('users'),
    ...stamps,
  });
  await q.createTable('project_members', {
    projectId: { ...ref('projects'), primaryKey: true },
    userId: { ...ref('users'), primaryKey: true },
    access: { type: T.STRING(5), allowNull: false },
    ...stamps,
  });
  await q.createTable('refresh_tokens', {
    id: { type: T.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    userId: ref('users'),
    tokenHash: { type: T.STRING(64), allowNull: false, unique: true },
    expiresAt: { type: T.DATE, allowNull: false },
    revokedAt: { type: T.DATE, allowNull: true },
  });
  await q.createTable('request_logs', {
    id: { type: T.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    method: { type: T.STRING(10), allowNull: false },
    path: { type: T.STRING(200), allowNull: false },
    status: { type: T.INTEGER, allowNull: false },
    userId: { type: T.UUID, allowNull: true },
    ip: { type: T.STRING(64), allowNull: true },
    durationMs: { type: T.INTEGER, allowNull: false },
    createdAt: { type: T.DATE, allowNull: false },
  });
  await q.addIndex('projects', ['ownerId']);
  await q.addIndex('request_logs', ['createdAt']);
}

module.exports = { name: '001-init', up };
