const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTempDatabase } = require('./helpers');
const { createModels } = require('../src/models');

const db = createTempDatabase();
const open = () => createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
const columns = async (sequelize) => Object.keys(await sequelize.getQueryInterface().describeTable('Diagrams'));

before(() => db.cli('db:migrate'));
after(() => db.cleanup());

test('migrations create the table with the priority column added by the second migration', async () => {
  const { sequelize } = open();
  assert.deepEqual((await columns(sequelize)).sort(), ['createdAt', 'id', 'notation', 'owner', 'priority', 'sourceCode', 'title', 'updatedAt']);
  await sequelize.close();
});

test('undoing the last migration removes the priority column, migrating again restores it', async () => {
  db.cli('db:migrate:undo');
  let { sequelize } = open();
  assert.equal((await columns(sequelize)).includes('priority'), false);
  await sequelize.close();

  db.cli('db:migrate');
  ({ sequelize } = open());
  assert.equal((await columns(sequelize)).includes('priority'), true);
  await sequelize.close();
});

test('the seed inserts three diagrams and can be undone', async () => {
  db.cli('db:seed:all');
  const { sequelize, Diagram } = open();
  const rows = await Diagram.findAll({ order: [['id', 'ASC']] });
  assert.deepEqual(
    rows.map((d) => d.title),
    ['Order processing', 'Billing schema', 'Login flow'],
  );
  assert.equal(rows[0].priority, 'high');
  await sequelize.close();

  db.cli('db:seed:undo:all');
  const again = open();
  assert.equal(await again.Diagram.count(), 0);
  await again.sequelize.close();
});

test('the model rejects values outside the allowed lists', async () => {
  const { sequelize, Diagram } = open();
  await assert.rejects(Diagram.create({ title: 't', notation: 'XYZ', sourceCode: 's', owner: 'o' }), /Validation error/);
  await assert.rejects(Diagram.create({ title: 't', notation: 'UML', sourceCode: 's', owner: 'o', priority: 'urgent' }), /Validation error/);
  await sequelize.close();
});
