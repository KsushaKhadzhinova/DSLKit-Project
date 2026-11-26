'use strict';
// npm run migrate: applies pending migrations to the database named in .env.
const { loadConfig } = require('./config');
const { createDatabase } = require('./db');
const { runMigrations } = require('./migrate');

(async () => {
  const config = loadConfig(process.env);
  const db = await createDatabase({ ...config, dbSync: false });
  const applied = await runMigrations(db.sequelize);
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Nothing to apply');
  await db.sequelize.close();
})().catch((err) => {
  console.error(`Migration failed: ${err.message}`);
  process.exit(1);
});
