import { createApp, LIMITS } from './app.js';

const port = Number(process.env.PORT) || 3000;
// Requests per minute and client address; a wrong or missing value keeps the default from limits.json.
const max = Number(process.env.RATE_LIMIT_MAX) > 0 ? Number(process.env.RATE_LIMIT_MAX) : LIMITS.rateMax;
const server = createApp({ limit: { windowMs: LIMITS.rateWindowMs, max } }).listen(port, () => console.log(`DSLKit REST API listens on http://localhost:${port}/api`));

// Node's own defaults (60 s to finish the headers, 5 minutes to finish the whole request) let a client that
// trickles bytes in slowly occupy a socket for minutes; the per-IP rate limiter only counts requests that
// finished, so it does nothing against this. These bound how long one slow client can hold a socket open.
server.headersTimeout = 10_000;
server.requestTimeout = 30_000;

// Graceful stop: no new connections, requests in flight finish, then the process ends. A hung connection cannot block the exit for long.
const SHUTDOWN_GRACE_MS = 5000;
const stop = (signal) => {
  console.log(`${signal} received, closing the server`);
  server.close(() => process.exit(0));
  server.closeIdleConnections();
  setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
};
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
