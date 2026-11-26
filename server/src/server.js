'use strict';
// Process entry point: reads .env (via --env-file), opens the database and starts listening.
const { loadConfig } = require('./config');
const { createDatabase } = require('./db');
const { createApp } = require('./app');
const { bootstrapAdmin } = require('./bootstrap-admin');

async function main() {
  const config = loadConfig(process.env);
  const db = await createDatabase(config);
  const boot = await bootstrapAdmin({ db, config, email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  if (boot.created) console.log('First administrator created');
  const { app } = createApp({ config, db });
  const server = app.listen(config.port, config.host, () => console.log(`DSLKit server listening on ${config.host}:${server.address().port}`));
  const stop = () => server.close(() => db.sequelize.close().then(() => process.exit(0)));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error(`Startup failed: ${err.message}`);
  process.exit(1);
});
