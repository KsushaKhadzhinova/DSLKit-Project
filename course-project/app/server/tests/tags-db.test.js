const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createTempDatabase } = require('./helpers');
const { createModels } = require('../src/models');
const { ROWS, NAMES } = require('../seed-data/tags');

// The Tags and DiagramTags tables at the database level: columns, CHECK constraints, keys and the demo seed.
const db = createTempDatabase();
const open = () => createModels({ dialect: 'sqlite', storage: db.storage, logging: false });
const isCheckViolation = (error) => /CHECK constraint/i.test(error.original?.message ?? '');
const NOW = "datetime('now')";

before(() => db.cli('db:migrate'));
after(() => db.cleanup());

test('the migration creates Tags and DiagramTags with the agreed columns, both link keys cascade', async () => {
  const { sequelize } = open();
  const queryInterface = sequelize.getQueryInterface();
  assert.deepEqual(Object.keys(await queryInterface.describeTable('Tags')).sort(), ['createdAt', 'id', 'name', 'updatedAt']);
  assert.deepEqual(Object.keys(await queryInterface.describeTable('DiagramTags')).sort(), ['createdAt', 'diagramId', 'tagId', 'updatedAt']);
  const sql = async (name) => (await sequelize.query(`SELECT sql FROM sqlite_master WHERE name = '${name}'`, { type: 'SELECT' }))[0].sql;
  const tags = await sql('Tags');
  for (const name of ['tags_name_not_blank', 'tags_name_lowercase']) assert.match(tags, new RegExp(name));
  const links = await sql('DiagramTags');
  assert.match(links, /REFERENCES `Diagrams` \(`id`\) ON DELETE CASCADE/);
  assert.match(links, /REFERENCES `Tags` \(`id`\) ON DELETE CASCADE/);
  await sequelize.close();
});

test('CHECK constraints, the unique name and the keys reject bad rows even when the model is bypassed', async () => {
  const { sequelize } = open();
  const q = (sql, replacements) => sequelize.query(sql, { replacements });
  await q(`INSERT INTO Users (email, passwordHash, role, createdAt, updatedAt) VALUES ('t@example.test', 'h', 'user', ${NOW}, ${NOW})`);
  const [{ id: userId }] = await sequelize.query('SELECT id FROM Users', { type: 'SELECT' });
  await q(`INSERT INTO Diagrams (title, notation, sourceCode, priority, ownerId, createdAt, updatedAt) VALUES ('t', 'UML', 's', 'low', ?, ${NOW}, ${NOW})`, [userId]);
  const [{ id: diagramId }] = await sequelize.query('SELECT id FROM Diagrams', { type: 'SELECT' });
  const tag = (name) => q(`INSERT INTO Tags (name, createdAt, updatedAt) VALUES (?, ${NOW}, ${NOW})`, [name]);
  await assert.rejects(tag('   '), isCheckViolation);
  await assert.rejects(tag('Upper'), isCheckViolation);
  await tag('ok');
  await assert.rejects(tag('ok'), /UNIQUE/i);
  const [{ id: tagId }] = await sequelize.query("SELECT id FROM Tags WHERE name = 'ok'", { type: 'SELECT' });
  const link = (diagram, tagKey) => q(`INSERT INTO DiagramTags (diagramId, tagId, createdAt, updatedAt) VALUES (?, ?, ${NOW}, ${NOW})`, [diagram, tagKey]);
  await assert.rejects(link(9999, tagId), /FOREIGN KEY/i);
  await assert.rejects(link(diagramId, 9999), /FOREIGN KEY/i);
  await link(diagramId, tagId);
  await assert.rejects(link(diagramId, tagId), /UNIQUE|PRIMARY/i);
  // ON DELETE CASCADE: deleting the diagram removes the link and keeps the tag.
  await q('DELETE FROM Diagrams');
  assert.equal((await sequelize.query('SELECT COUNT(*) AS n FROM DiagramTags', { type: 'SELECT' }))[0].n, 0);
  assert.equal((await sequelize.query('SELECT COUNT(*) AS n FROM Tags', { type: 'SELECT' }))[0].n, 1);
  await q('DELETE FROM Tags');
  await q('DELETE FROM Users');
  await sequelize.close();
});

test('the model rejects an empty or too long name before the database', async () => {
  const { sequelize, Tag } = open();
  await assert.rejects(Tag.create({ name: '' }), /Validation error/);
  await assert.rejects(Tag.create({ name: 'x'.repeat(31) }), /Validation error/);
  await assert.rejects(Tag.create({}), /notNull/i);
  await sequelize.close();
});

test('the tag seed links the demo diagrams, runs twice without duplicates and can be undone', async () => {
  db.cli('db:seed:all');
  let { sequelize, Tag, DiagramTag, Diagram } = open();
  assert.equal(await Tag.count(), NAMES.length);
  assert.equal(await DiagramTag.count(), ROWS.reduce((sum, row) => sum + row.tags.length, 0));
  const first = await Diagram.findOne({ where: { title: ROWS[0].diagram }, include: Tag });
  assert.deepEqual(first.Tags.map((t) => t.name).sort(), [...ROWS[0].tags].sort());
  await DiagramTag.destroy({ where: { diagramId: first.id } });
  await sequelize.close();
  db.cli('db:seed:all');
  db.cli('db:seed:all');
  ({ sequelize, Tag, DiagramTag } = open());
  assert.equal(await Tag.count(), NAMES.length);
  assert.equal(await DiagramTag.count(), ROWS.reduce((sum, row) => sum + row.tags.length, 0));
  await sequelize.close();
  db.cli('db:seed:undo:all');
  ({ sequelize, Tag, DiagramTag } = open());
  assert.equal(await Tag.count(), 0);
  assert.equal(await DiagramTag.count(), 0);
  await sequelize.close();
});

test('the tag seed is skipped quietly when the demo diagrams do not exist', async () => {
  const seeder = require('../seeders/20261024000002-demo-tags');
  const fake = { rawSelect: async () => null, bulkInsert: async () => {} };
  await seeder.up(fake);
});
