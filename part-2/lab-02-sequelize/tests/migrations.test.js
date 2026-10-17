const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTempDatabase } = require('./helpers');
const { createModels } = require('../src/models');

const db = createTempDatabase();
const open = () => createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
const columns = async (sequelize) => Object.keys(await sequelize.getQueryInterface().describeTable('Diagrams'));

// Sequelize wraps the SQLite error, the original message still names the CHECK.
const isCheckViolation = (error) => /CHECK constraint/i.test(error.original?.message ?? '');

before(() => db.cli('db:migrate'));
after(() => db.cleanup());

test('migrations create the table with the priority column added by the second migration', async () => {
  const { sequelize } = open();
  assert.deepEqual((await columns(sequelize)).sort(), ['createdAt', 'id', 'notation', 'owner', 'priority', 'sourceCode', 'title', 'updatedAt']);
  await sequelize.close();
});

const tableSql = async (sequelize, table) => (await sequelize.query(`SELECT sql FROM sqlite_master WHERE name = '${table}'`, { type: 'SELECT' }))[0]?.sql;

test('undoing migrations one by one drops the log table, then the priority column, and keeps every CHECK', async () => {
  db.cli('db:migrate:undo');
  let { sequelize } = open();
  assert.equal(await tableSql(sequelize, 'RequestLogs'), undefined);
  assert.equal((await columns(sequelize)).includes('priority'), true);
  await sequelize.close();

  db.cli('db:migrate:undo');
  ({ sequelize } = open());
  assert.equal((await columns(sequelize)).includes('priority'), false);
  const sql = await tableSql(sequelize, 'Diagrams');
  for (const name of ['diagrams_notation_check', 'diagrams_title_not_blank', 'diagrams_owner_length', 'diagrams_sourceCode_not_blank']) {
    assert.match(sql, new RegExp(name), name);
  }
  assert.doesNotMatch(sql, /diagrams_priority_check/);
  await sequelize.close();

  db.cli('db:migrate');
  ({ sequelize } = open());
  assert.equal((await columns(sequelize)).includes('priority'), true);
  assert.notEqual(await tableSql(sequelize, 'RequestLogs'), undefined);
  await sequelize.close();
});

test('undoing all migrations leaves an empty database and migrating again works (db:reset)', async () => {
  db.cli('db:migrate:undo:all');
  let { sequelize } = open();
  assert.deepEqual(await sequelize.getQueryInterface().showAllTables(), ['SequelizeMeta']);
  await sequelize.close();
  db.cli('db:migrate');
  ({ sequelize } = open());
  assert.deepEqual((await sequelize.getQueryInterface().showAllTables()).sort(), ['Diagrams', 'RequestLogs', 'SequelizeMeta']);
  await sequelize.close();
});

test('CHECK constraints reject blank and over-long texts even when the model is bypassed', async () => {
  const { sequelize } = open();
  const insert = (title, owner, source) =>
    sequelize.query("INSERT INTO Diagrams (title, notation, sourceCode, priority, owner, createdAt, updatedAt) VALUES (?, 'UML', ?, 'low', ?, datetime('now'), datetime('now'))", {
      replacements: [title, source, owner],
    });
  await assert.rejects(insert('   ', 'o', 's'), isCheckViolation);
  await assert.rejects(insert('t', '', 's'), isCheckViolation);
  await assert.rejects(insert('t', 'o', '  '), isCheckViolation);
  await assert.rejects(insert('x'.repeat(81), 'o', 's'), isCheckViolation);
  await assert.rejects(insert('t', 'o'.repeat(61), 's'), isCheckViolation);
  await insert('x'.repeat(80), 'o'.repeat(60), 's');
  await sequelize.getQueryInterface().bulkDelete('Diagrams', {});
  await sequelize.close();
});

test('the seed restores a deleted demo row without duplicating the others', async () => {
  db.cli('db:seed:all');
  let { sequelize, Diagram } = open();
  await Diagram.destroy({ where: { title: 'Billing schema' } });
  await sequelize.close();
  db.cli('db:seed:all');
  ({ sequelize, Diagram } = open());
  assert.deepEqual((await Diagram.findAll({ order: [['id', 'ASC']] })).map((d) => d.title).sort(), ['Billing schema', 'Login flow', 'Order processing']);
  await Diagram.destroy({ where: {} });
  await sequelize.close();
});

test('the seed inserts three marked diagrams, is idempotent, and undo keeps rows users created', async () => {
  db.cli('db:seed:all');
  db.cli('db:seed:all');
  const { sequelize, Diagram } = open();
  const rows = await Diagram.findAll({ order: [['id', 'ASC']] });
  assert.deepEqual(
    rows.map((d) => d.title),
    ['Order processing', 'Billing schema', 'Login flow'],
  );
  assert.ok(rows.every((d) => d.owner === 'demo'));
  assert.equal(rows[0].priority, 'high');
  await Diagram.create({ title: 'Mine', notation: 'UML', sourceCode: 's', owner: 'carol' });
  await sequelize.close();

  db.cli('db:seed:undo:all');
  const again = open();
  assert.deepEqual(
    (await again.Diagram.findAll()).map((d) => d.title),
    ['Mine'],
  );
  await again.Diagram.destroy({ where: {} });
  await again.sequelize.close();
});

test('the model rejects values outside the allowed lists', async () => {
  const { sequelize, Diagram } = open();
  await assert.rejects(Diagram.create({ title: 't', notation: 'XYZ', sourceCode: 's', owner: 'o' }), /Validation error/);
  await assert.rejects(Diagram.create({ title: 't', notation: 'UML', sourceCode: 's', owner: 'o', priority: 'urgent' }), /Validation error/);
  await sequelize.close();
});


test('CHECK constraints reject a notation or priority outside the lists even when the model is bypassed', async () => {
  const { sequelize } = open();
  // bulkInsert on SQLite is INSERT OR IGNORE and would hide a violation, so the test uses a plain INSERT.
  const insert = (notation, priority) =>
    sequelize.query(
      "INSERT INTO Diagrams (title, notation, sourceCode, priority, owner, createdAt, updatedAt) VALUES ('t', ?, 's', ?, 'o', datetime('now'), datetime('now'))",
      {
        replacements: [notation, priority],
      },
    );
  await assert.rejects(insert('XYZ', 'low'), isCheckViolation);
  await assert.rejects(insert('UML', 'urgent'), isCheckViolation);
  await insert('UML', 'low');
  await sequelize.getQueryInterface().bulkDelete('Diagrams', { title: 't' });
  await sequelize.close();
});
