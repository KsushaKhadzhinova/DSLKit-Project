const { createApp } = require('./src/app');
const { createModels } = require('./src/models');
const { startLogRetention } = require('./src/middleware/request-log');

const port = Number(process.env.PORT) || 3000;
const { JWT_SECRET, JWT_EXPIRES_IN, TRUST_PROXY } = process.env;
const settings = {
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: JWT_EXPIRES_IN || '1h',
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

// The server starts and keeps listening even when the database is unreachable at boot (no network, no container
// running yet): /health always answers, and every DB-backed route answers a clear 503 instead of hanging or
// crashing the process. The database is only checked here to log whether it is reachable, never to block startup.
const server = app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
models.sequelize
  .authenticate()
  .then(() => console.log('Database connection OK'))
  .catch((error) => console.error('Cannot connect to the database yet, routes that need it will answer 503 until it is reachable:', error.message));
// The request log holds client addresses, so rows older than 30 days are deleted (at the start and every hour);
// a failed purge (the database is down) is only logged, see request-log.js.
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
