const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTempDatabase } = require('./helpers');
const bcrypt = require('bcrypt');
const { createModels } = require('../src/models');
const { ROWS } = require('../seed-data/diagrams');

const db = createTempDatabase();
const open = () => createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
const columns = async (sequelize) => Object.keys(await sequelize.getQueryInterface().describeTable('Diagrams'));

before(() => db.cli('db:migrate'));
after(() => db.cleanup());

test('migrations create the table with the priority column added by the third migration', async () => {
  const { sequelize } = open();
  assert.deepEqual((await columns(sequelize)).sort(), ['createdAt', 'id', 'notation', 'ownerId', 'priority', 'sourceCode', 'title', 'updatedAt']);
  await sequelize.close();
});

test('the first migration creates Users with a unique email and a checked role', async () => {
  const { sequelize, User } = open();
  const table = await sequelize.getQueryInterface().describeTable('Users');
  assert.deepEqual(Object.keys(table).sort(), ['createdAt', 'email', 'id', 'passwordHash', 'role', 'updatedAt']);
  await User.create({ email: 'a@b.co', passwordHash: 'x' });
  await assert.rejects(User.create({ email: 'a@b.co', passwordHash: 'x' }), /Validation error/);
  await assert.rejects(User.create({ email: 'c@b.co', passwordHash: 'x', role: 'root' }), /Validation error/);
  await User.destroy({ where: {} });
  await sequelize.close();
});

const tableSql = async (sequelize, table) => (await sequelize.query(`SELECT sql FROM sqlite_master WHERE name = '${table}'`, { type: 'SELECT' }))[0]?.sql;
// Sequelize wraps the SQLite error, the original message still names the CHECK or the foreign key.
const isCheckViolation = (error) => /CHECK constraint/i.test(error.original?.message ?? '');

test('undoing migrations one by one drops the comments, then the log table, then the priority column, and keeps every CHECK and the foreign key rule', async () => {
  db.cli('db:migrate:undo');
  let { sequelize } = open();
  assert.equal(await tableSql(sequelize, 'Comments'), undefined);
  assert.notEqual(await tableSql(sequelize, 'RequestLogs'), undefined);
  await sequelize.close();

  db.cli('db:migrate:undo');
  ({ sequelize } = open());
  assert.equal(await tableSql(sequelize, 'RequestLogs'), undefined);
  assert.equal((await columns(sequelize)).includes('priority'), true);
  await sequelize.close();

  db.cli('db:migrate:undo');
  ({ sequelize } = open());
  assert.equal((await columns(sequelize)).includes('priority'), false);
  const sql = await tableSql(sequelize, 'Diagrams');
  for (const name of ['diagrams_notation_check', 'diagrams_title_not_blank', 'diagrams_title_length', 'diagrams_sourceCode_not_blank']) {
    assert.match(sql, new RegExp(name), name);
  }
  assert.doesNotMatch(sql, /diagrams_priority_check/);
  assert.match(sql, /REFERENCES `Users` \(`id`\) ON DELETE RESTRICT/);
  assert.notEqual(await tableSql(sequelize, 'diagrams_owner_id'), undefined);
  await sequelize.close();

  db.cli('db:migrate');
  ({ sequelize } = open());
  assert.equal((await columns(sequelize)).includes('priority'), true);
  assert.notEqual(await tableSql(sequelize, 'RequestLogs'), undefined);
  assert.notEqual(await tableSql(sequelize, 'Comments'), undefined);
  await sequelize.close();
});

test('undoing all migrations leaves an empty database and migrating again works (db:reset)', async () => {
  db.cli('db:migrate:undo:all');
  let { sequelize } = open();
  assert.deepEqual(await sequelize.getQueryInterface().showAllTables(), ['SequelizeMeta']);
  await sequelize.close();
  db.cli('db:migrate');
  ({ sequelize } = open());
  assert.deepEqual((await sequelize.getQueryInterface().showAllTables()).sort(), ['Comments', 'Diagrams', 'RequestLogs', 'SequelizeMeta', 'Users']);
  await sequelize.close();
});

test('CHECK constraints reject bad rows even when the model is bypassed', async () => {
  const { sequelize } = open();
  const q = (sql, replacements) => sequelize.query(sql, { replacements });
  const now = "datetime('now')";
  const user = (email, hash, role) =>
    q(`INSERT INTO Users (email, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ${now}, ${now})`, [email, hash, role]);
  await assert.rejects(user('Upper@Example.com', 'h', 'user'), isCheckViolation);
  await assert.rejects(user('a@b.co', 'h', 'root'), isCheckViolation);
  await assert.rejects(user('a@b.co', '', 'user'), isCheckViolation);
  await assert.rejects(user(`${'x'.repeat(250)}@b.co`, 'h', 'user'), isCheckViolation);
  await user('owner@example.com', 'h', 'user');
  const [{ id }] = await sequelize.query("SELECT id FROM Users WHERE email = 'owner@example.com'", { type: 'SELECT' });
  const diagram = (title, source, owner = id) =>
    q(`INSERT INTO Diagrams (title, notation, sourceCode, priority, ownerId, createdAt, updatedAt) VALUES (?, 'UML', ?, 'low', ?, ${now}, ${now})`, [
      title,
      source,
      owner,
    ]);
  await assert.rejects(diagram('   ', 's'), isCheckViolation);
  await assert.rejects(diagram('t', ''), isCheckViolation);
  await assert.rejects(diagram('x'.repeat(81), 's'), isCheckViolation);
  await assert.rejects(diagram('t', 's', 9999), /FOREIGN KEY/i);
  await diagram('x'.repeat(80), 's');
  // ON DELETE RESTRICT: the owner cannot be removed while the diagram exists.
  await assert.rejects(q('DELETE FROM Users WHERE id = ?', [id]), /FOREIGN KEY/i);
  await q('DELETE FROM Diagrams');
  await q('DELETE FROM Users');
  await sequelize.close();
});

test('the seeds insert the demo diagrams, an admin and demo users with hashed passwords, and can be undone', async () => {
  db.cli('db:seed:all');
  const { sequelize, Diagram, User } = open();
  const rows = await Diagram.findAll({ order: [['id', 'ASC']] });
  assert.deepEqual(
    rows.map((d) => d.title),
    ROWS.map((row) => row.title),
  );
  assert.equal(rows[0].priority, 'high');
  assert.ok(ROWS.length >= 30);
  assert.deepEqual([...new Set(rows.map((d) => d.notation))].sort(), ['BPMN', 'DFD', 'ERD', 'IDEF0', 'Petri', 'UML']);
  assert.equal(new Set(rows.map((d) => d.ownerId)).size, 5);
  assert.equal(await User.count({ where: { role: 'user' } }), 4);
  const demo = await User.findOne({ where: { email: 'alice@example.test' } });
  assert.equal(await bcrypt.compare('demo password 1', demo.passwordHash), true);
  const admin = await User.findOne({ where: { role: 'admin' } });
  assert.deepEqual({ email: admin.email, role: admin.role }, { email: 'root@example.com', role: 'admin' });
  assert.equal(await bcrypt.compare('seed password 1', admin.passwordHash), true);
  await sequelize.close();

  db.cli('db:seed:undo:all');
  const again = open();
  assert.equal(await again.Diagram.count(), 0);
  assert.equal(await again.User.count(), 0);
  await again.sequelize.close();
});

test('the model rejects values outside the allowed lists', async () => {
  const { sequelize, Diagram } = open();
  await assert.rejects(Diagram.create({ title: 't', notation: 'XYZ', sourceCode: 's', ownerId: 1 }), /Validation error/);
  await assert.rejects(Diagram.create({ title: 't', notation: 'UML', sourceCode: 's', owner: 'o', priority: 'urgent' }), /Validation error/);
  await sequelize.close();
});

test('the seeds are idempotent per row: a deleted demo diagram comes back, nothing is duplicated', async () => {
  db.cli('db:seed:all');
  let { sequelize, Diagram, User } = open();
  await Diagram.destroy({ where: { title: 'Billing schema' } });
  await sequelize.close();
  db.cli('db:seed:all');
  db.cli('db:seed:all');
  ({ sequelize, Diagram, User } = open());
  assert.deepEqual((await Diagram.findAll()).map((d) => d.title).sort(), ROWS.map((row) => row.title).sort());
  assert.equal(await User.count(), 5);
  await sequelize.close();
  db.cli('db:seed:undo:all');
});

test('the admin seed refuses a weak password and skips quietly without ADMIN_* values', async () => {
  const seeder = require('../seeders/20261016000001-admin-user');
  const fake = { rawSelect: async () => null, bulkInsert: async () => assert.fail('nothing must be inserted') };
  const saved = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
  try {
    process.env.ADMIN_EMAIL = 'root@example.com';
    process.env.ADMIN_PASSWORD = 'short';
    await assert.rejects(seeder.up(fake), /ADMIN_PASSWORD must be 10 characters or more/);
    process.env.ADMIN_PASSWORD = 'x'.repeat(73);
    await assert.rejects(seeder.up(fake), /at most 72 bytes/);
    process.env.ADMIN_PASSWORD = '';
    await seeder.up(fake);
  } finally {
    process.env.ADMIN_EMAIL = saved.email ?? '';
    process.env.ADMIN_PASSWORD = saved.password ?? '';
  }
});
