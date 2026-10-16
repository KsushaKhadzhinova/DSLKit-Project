const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTempDatabase } = require('./helpers');
const bcrypt = require('bcrypt');
const { createModels } = require('../src/models');

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

test('the seeds insert three diagrams and an admin with a hashed password, and can be undone', async () => {
  db.cli('db:seed:all');
  const { sequelize, Diagram, User } = open();
  const rows = await Diagram.findAll({ order: [['id', 'ASC']] });
  assert.deepEqual(
    rows.map((d) => d.title),
    ['Order processing', 'Billing schema', 'Login flow'],
  );
  assert.equal(rows[0].priority, 'high');
  const admin = await User.findOne();
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
