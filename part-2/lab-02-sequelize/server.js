const { createApp } = require('./src/app');
const { createModels } = require('./src/models');
const { startLogRetention } = require('./src/middleware/request-log');

const port = Number(process.env.PORT) || 3000;
const models = createModels();

// The server always comes up, database or not: without a reachable database (stopped, wrong network, no internet)
// /health still answers plainly and every other route answers 503 instead of the process refusing to start.
// A real outage is noisy only in the log, never a reason to exit.
const server = createApp(models).listen(port, () => console.log(`Server running on http://localhost:${port}`));
models.sequelize.authenticate().catch((error) => console.error('Database is not reachable yet, routes that need it will answer 503 until it is:', error.message));
// The request log holds client addresses, so rows older than 30 days are deleted (at the start and every hour).
// A database that is down at that moment is only logged (see request-log.js), the server keeps running.
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
// A bug that throws outside a request (a stray rejected promise, a timer callback) must not take the whole
// server down either: it is logged and the server keeps answering requests, as every DB-dependent route already
// turns its own errors into a 400/503/500 response instead of letting them escape.
process.on('unhandledRejection', (error) => console.error('Unhandled rejection:', error));
process.on('uncaughtException', (error) => console.error('Uncaught exception:', error));
