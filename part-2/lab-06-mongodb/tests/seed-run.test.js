const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('./helpers');
const { seed, unseed } = require('../scripts/seed');
const { ROWS } = require('../scripts/seed-diagrams');

let ctx;
before(async () => {
  ctx = await startTestServer();
});
after(() => ctx.stop());

test('the seed inserts every demo diagram with its owner, tags and nested comments, and a second run duplicates nothing', async () => {
  const { Diagram } = ctx.models;
  await Diagram.deleteMany({});
  assert.deepEqual(await seed(), { created: ROWS.length, kept: 0 });
  assert.deepEqual(await seed(), { created: 0, kept: ROWS.length });
  assert.equal(await Diagram.countDocuments(), ROWS.length);
  const shop = await Diagram.findOne({ title: 'UML: Sequence of a payment' });
  assert.ok(shop.owner && shop.tags.length > 0 && shop.createdAt);
  const all = await Diagram.find();
  const withComments = all.find((d) => d.comments.length > 0);
  assert.ok(withComments.comments[0]._id && withComments.comments[0].author);
  assert.ok(all.some((d) => d.comments.length === 2));
});

test('a second run keeps what users changed and restores a deleted demo document', async () => {
  const { Diagram } = ctx.models;
  await Diagram.deleteMany({});
  await seed();
  await Diagram.updateOne({ title: 'Order processing' }, { $push: { comments: { author: 'zoe', text: 'mine' } }, priority: 0 });
  await Diagram.deleteOne({ title: 'Billing schema' });
  assert.deepEqual(await seed(), { created: 1, kept: ROWS.length - 1 });
  const kept = await Diagram.findOne({ title: 'Order processing' });
  assert.equal(kept.priority, 0);
  assert.ok(kept.comments.some((c) => c.author === 'zoe'));
  assert.ok(await Diagram.exists({ title: 'Billing schema' }));
});

test('the undo removes only the demo documents', async () => {
  const { Diagram } = ctx.models;
  await Diagram.deleteMany({});
  await seed();
  await Diagram.create({ title: 'Mine', notation: 'UML', sourceCode: 's', owner: 'zoe' });
  assert.equal(await unseed(), ROWS.length);
  assert.deepEqual((await Diagram.find()).map((d) => d.title), ['Mine']);
});
