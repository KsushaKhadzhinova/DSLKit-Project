'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');
const { createDatabase } = require('../src/db');
const { runMigrations } = require('../src/migrate');
const { randomSecret } = require('./helpers');

const config = (dbSync) =>
  loadConfig({ NODE_ENV: 'test', DB_DIALECT: 'sqlite', DB_STORAGE: ':memory:', JWT_SECRET: randomSecret(), BCRYPT_ROUNDS: '4', DB_SYNC: String(dbSync) });
const TABLES = ['users', 'projects', 'project_members', 'refresh_tokens', 'request_logs'];

async function shape(sequelize) {
  const q = sequelize.getQueryInterface();
  const out = {};
  for (const t of TABLES) {
    const cols = await q.describeTable(t);
    // SQLite reports primary keys as nullable; they are not.
    out[t] = Object.fromEntries(
      Object.entries(cols).map(([name, c]) => [
        name,
        { type: c.type.replace(/s+/g, ' ').toUpperCase(), allowNull: c.primaryKey ? false : c.allowNull, primaryKey: c.primaryKey },
      ]),
    );
  }
  return out;
}

test('the migration builds exactly the schema the models describe', async () => {
  const synced = await createDatabase(config(true));
  const migrated = await createDatabase(config(false));
  assert.deepEqual(await migrated.sequelize.getQueryInterface().showAllTables(), []);
  assert.deepEqual(await runMigrations(migrated.sequelize), ['001-init']);
  assert.deepEqual(await shape(migrated.sequelize), await shape(synced.sequelize));
  await synced.sequelize.close();
  await migrated.sequelize.close();
});

test('migrations run once, and a migrated database is usable by the models', async () => {
  const db = await createDatabase(config(false));
  await runMigrations(db.sequelize);
  assert.deepEqual(await runMigrations(db.sequelize), []);
  const u = await db.User.create({ email: 'a@example.test', passwordHash: 'x', displayName: 'Ж' });
  const p = await db.Project.create({ title: 'T', notation: 'n', ownerId: u.id });
  assert.equal(p.searchText, 't ');
  await u.destroy();
  assert.equal(await db.Project.count(), 0, 'cascade from the migrated foreign key');
  await db.sequelize.close();
});

// Registered only when a PostgreSQL admin URL is given (TEST_PG_URL), so plain runs need no database server.
if (process.env.TEST_PG_URL) {
  const { pgDatabase } = require('./helpers');
  test('PostgreSQL: the migration builds the same schema as the models and runs once', async () => {
    const a = await pgDatabase();
    const b = await pgDatabase();
    const pgConfig = (url, dbSync) =>
      loadConfig({ NODE_ENV: 'test', DB_DIALECT: 'postgres', DATABASE_URL: url, JWT_SECRET: randomSecret(), BCRYPT_ROUNDS: '4', DB_SYNC: String(dbSync) });
    const synced = await createDatabase(pgConfig(a.url, true));
    const migrated = await createDatabase(pgConfig(b.url, false));
    assert.deepEqual(await runMigrations(migrated.sequelize), ['001-init']);
    assert.deepEqual(await runMigrations(migrated.sequelize), []);
    assert.deepEqual(await shape(migrated.sequelize), await shape(synced.sequelize));
    await synced.sequelize.close();
    await migrated.sequelize.close();
    await a.drop();
    await b.drop();
  });
}
