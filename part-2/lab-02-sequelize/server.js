const { createApp } = require('./src/app');
const { createModels } = require('./src/models');

const port = Number(process.env.PORT) || 3000;
const models = createModels();

models.sequelize
  .authenticate()
  .then(() => {
    const server = createApp(models).listen(port, () => console.log(`Server running on http://localhost:${port}`));
    // Graceful stop: no new connections, requests in flight finish, the database connection closes, then the process ends.
    const SHUTDOWN_GRACE_MS = 5000;
    const stop = (signal) => {
      console.log(`${signal} received, closing the server`);
      server.close(() => models.sequelize.close().finally(() => process.exit(0)));
      server.closeIdleConnections();
      setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
    };
    process.on('SIGINT', () => stop('SIGINT'));
    process.on('SIGTERM', () => stop('SIGTERM'));
  })
  .catch((error) => {
    console.error('Cannot connect to the database:', error.message);
    process.exit(1);
  });
