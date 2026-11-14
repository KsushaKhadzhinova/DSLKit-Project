require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { Diagram } = require('../src/models');
const { connect, disconnect } = require('../src/db');

const { ROWS: demo } = require('./seed-diagrams');

// Idempotent per document: a demo diagram that exists is left alone (comments added by users stay),
// a deleted one comes back, nothing is duplicated. The title identifies a demo document.
const seed = async (model = Diagram, rows = demo) => {
  const result = await model.bulkWrite(
    rows.map((row) => ({ updateOne: { filter: { title: row.title }, update: { $setOnInsert: row }, upsert: true } })),
    { timestamps: true },
  );
  return { created: result.upsertedCount, kept: rows.length - result.upsertedCount };
};

// The model sanitizes filters, so the list of titles is marked as trusted (it comes from the seed file, not from a request).
// Removes only the demo documents, anything else in the collection stays.
const unseed = async (model = Diagram, rows = demo) => (await model.deleteMany({ title: mongoose.trusted({ $in: rows.map((row) => row.title) }) })).deletedCount;

const run = async () => {
  await connect();
  const undo = process.argv.includes('--undo');
  if (undo) console.log(`Removed ${await unseed()} demo diagrams`);
  else {
    const { created, kept } = await seed();
    console.log(`Seeded ${created} diagrams, ${kept} already there`);
  }
  await disconnect();
};

if (require.main === module) {
  run().catch((error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
  });
}

module.exports = { seed, unseed };
