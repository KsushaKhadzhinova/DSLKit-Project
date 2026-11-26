'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DataTypes } = require('sequelize');

const DIR = path.join(__dirname, '..', 'migrations');

// Minimal forward-only runner: applied names are kept in schema_migrations, each file runs once, in name order.
async function runMigrations(sequelize, dir = DIR) {
  const q = sequelize.getQueryInterface();
  await q.createTable('schema_migrations', { name: { type: DataTypes.STRING(100), primaryKey: true, allowNull: false } });
  const done = new Set((await sequelize.query('SELECT name FROM schema_migrations', { type: 'SELECT' })).map((r) => r.name));
  const applied = [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .sort();
  for (const file of files) {
    const migration = require(path.join(dir, file));
    if (done.has(migration.name)) continue;
    await sequelize.transaction(async (transaction) => {
      await migration.up(q, transaction);
      await q.bulkInsert('schema_migrations', [{ name: migration.name }], { transaction });
    });
    applied.push(migration.name);
  }
  return applied;
}

module.exports = { runMigrations };
