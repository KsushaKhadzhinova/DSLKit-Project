const { createApp } = require('./src/app');
const { createModels } = require('./src/models');
const { startLogRetention } = require('./src/middleware/request-log');

const port = Number(process.env.PORT) || 3000;
const { JWT_SECRET, JWT_EXPIRES_IN, TRUST_PROXY, CORS_ORIGIN } = process.env;
const settings = {
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: JWT_EXPIRES_IN || '1h',
  corsOrigin: CORS_ORIGIN || 'http://localhost:5178',
  // TRUST_PROXY=1 when exactly one reverse proxy stands in front of the server.
  ...(TRUST_PROXY && { trustProxy: /^\d+$/.test(TRUST_PROXY) ? Number(TRUST_PROXY) : TRUST_PROXY }),
};

const models = createModels();
let app;
try {
  app = createApp(models, settings);
} catch (error) {
  // A weak secret or lifetime stops the start, see .env.example.
  console.error(`Invalid settings: ${error.message}`);
  process.exit(1);
}

models.sequelize
  .authenticate()
  .then(() => {
    const server = app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
    // The request log holds client addresses, so rows older than 30 days are deleted (at the start and every hour).
    startLogRetention(models);
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
