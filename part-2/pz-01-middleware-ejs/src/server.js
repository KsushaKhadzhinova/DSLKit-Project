import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openRequestLog } from './data/requestLog.js';

const port = Number(process.env.PORT) || 3000;
const log = openRequestLog(process.env.DB_FILE || fileURLToPath(new URL('../data/requests.db', import.meta.url)));
const server = createApp({ log }).listen(port, () => console.log(`DSLKit practical 1 listens on http://localhost:${port}`));

// Graceful stop: no new connections, requests in flight finish, the log database closes, then the process ends.
const SHUTDOWN_GRACE_MS = 5000;
const stop = (signal) => {
  console.log(`${signal} received, closing the server`);
  server.close(() => {
    log.close();
    process.exit(0);
  });
  server.closeIdleConnections();
  setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
};
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
