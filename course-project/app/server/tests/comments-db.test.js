const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTempDatabase } = require('./helpers');
const { createModels } = require('../src/models');
const { ROWS } = require('../seed-data/comments');

// The Comments table at the database level: columns, CHECK constraints, foreign keys and the demo seed.
const db = createTempDatabase();
const open = () => createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
const isCheckViolation = (error) => /CHECK constraint/i.test(error.original?.message ?? '');
const NOW = "datetime('now')";

before(() => db.cli('db:migrate'));
after(() => db.cleanup());

test('the migration creates Comments with the agreed columns, both foreign keys cascade', async () => {
  const { sequelize } = open();
  const table = await sequelize.getQueryInterface().describeTable('Comments');
  assert.deepEqual(Object.keys(table).sort(), ['authorId', 'createdAt', 'diagramId', 'id', 'text', 'updatedAt']);
  const [{ sql }] = await sequelize.query("SELECT sql FROM sqlite_master WHERE name = 'Comments'", { type: 'SELECT' });
  assert.match(sql, /REFERENCES `Diagrams` \(`id`\) ON DELETE CASCADE/);
  assert.match(sql, /REFERENCES `Users` \(`id`\) ON DELETE CASCADE/);
  for (const name of ['comments_text_not_blank', 'comments_text_length']) assert.match(sql, new RegExp(name));
  await sequelize.close();
});

test('CHECK constraints and keys reject bad rows even when the model is bypassed', async () => {
  const { sequelize } = open();
  const q = (sql, replacements) => sequelize.query(sql, { replacements });
  await q(`INSERT INTO Users (email, passwordHash, role, createdAt, updatedAt) VALUES ('c@example.test', 'h', 'user', ${NOW}, ${NOW})`);
  const [{ id: userId }] = await sequelize.query("SELECT id FROM Users WHERE email = 'c@example.test'", { type: 'SELECT' });
  await q(`INSERT INTO Diagrams (title, notation, sourceCode, priority, ownerId, createdAt, updatedAt) VALUES ('t', 'UML', 's', 'low', ?, ${NOW}, ${NOW})`, [userId]);
  const [{ id: diagramId }] = await sequelize.query('SELECT id FROM Diagrams', { type: 'SELECT' });
  const comment = (text, diagram = diagramId, author = userId) =>
    q(`INSERT INTO Comments (diagramId, authorId, text, createdAt, updatedAt) VALUES (?, ?, ?, ${NOW}, ${NOW})`, [diagram, author, text]);
  await assert.rejects(comment('   '), isCheckViolation);
  await assert.rejects(comment(''), isCheckViolation);
  await assert.rejects(comment('x'.repeat(1001)), isCheckViolation);
  await assert.rejects(comment('ok', 9999), /FOREIGN KEY/i);
  await assert.rejects(comment('ok', diagramId, 9999), /FOREIGN KEY/i);
  await comment('x'.repeat(1000));
  // ON DELETE CASCADE: the diagram takes its comment along.
  await q('DELETE FROM Diagrams');
  assert.equal((await sequelize.query('SELECT COUNT(*) AS n FROM Comments', { type: 'SELECT' }))[0].n, 0);
  await q('DELETE FROM Users');
  await sequelize.close();
});

test('the model rejects an empty or too long text before the database', async () => {
  const { sequelize, Comment } = open();
  await assert.rejects(Comment.create({ diagramId: 1, authorId: 1, text: '' }), /Validation error/);
  await assert.rejects(Comment.create({ diagramId: 1, authorId: 1, text: 'x'.repeat(1001) }), /Validation error/);
  await assert.rejects(Comment.create({ diagramId: 1, authorId: 1 }), /notNull/i);
  await sequelize.close();
});

test('the comment seed adds the demo comments to the demo diagrams, runs twice without duplicates and can be undone', async () => {
  db.cli('db:seed:all');
  let { sequelize, Comment, Diagram } = open();
  assert.equal(await Comment.count(), ROWS.length);
  const first = await Diagram.findOne({ where: { title: 'Order processing' } });
  assert.equal(await Comment.count({ where: { diagramId: first.id } }), 3);
  await Comment.destroy({ where: { text: ROWS[0].text } });
  await sequelize.close();
  db.cli('db:seed:all');
  db.cli('db:seed:all');
  ({ sequelize, Comment } = open());
  assert.equal(await Comment.count(), ROWS.length);
  await sequelize.close();
  db.cli('db:seed:undo:all');
  ({ sequelize, Comment } = open());
  assert.equal(await Comment.count(), 0);
  await sequelize.close();
});

test('the comment seed is skipped quietly when the demo diagrams do not exist', async () => {
  const seeder = require('../seeders/20261024000001-demo-comments');
  const fake = { rawSelect: async () => null, bulkInsert: async () => assert.fail('nothing must be inserted') };
  await seeder.up(fake);
});
