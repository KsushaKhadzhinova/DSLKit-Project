import { createApp, LIMITS } from './app.js';
import { createJournal } from './journal.js';

// What the environment decides: the port, the request limit per minute and client address, the journal file. A wrong
// or missing value keeps the default (the limit default comes from limits.json). Kept apart from the start itself so
// every branch can be tested without opening a port.
export const readConfig = (env) => ({
  port: Number(env.PORT) || 3000,
  max: Number(env.RATE_LIMIT_MAX) > 0 ? Number(env.RATE_LIMIT_MAX) : LIMITS.rateMax,
  // The request journal table (SQLite file). No journal, no server: working without it is forbidden.
  journalFile: env.JOURNAL_FILE || 'journal.sqlite',
});

const SHUTDOWN_GRACE_MS = 5000;

// Starts the API and wires the graceful stop. Lives here, not in server.js, so tests start and stop it inside their
// own process: a child process killed from outside never writes its coverage data, which made the numbers depend on
// how the process happened to end.
export const startServer = (env) => {
  const { port, max, journalFile } = readConfig(env);
  const server = createApp({ limit: { windowMs: LIMITS.rateWindowMs, max }, journal: createJournal(journalFile) }).listen(port, () => console.log(`DSLKit REST API listens on http://localhost:${port}/api`));

  // Node's own defaults (60 s to finish the headers, 5 minutes to finish the whole request) let a client that
  // trickles bytes in slowly occupy a socket for minutes; the per-IP rate limiter only counts requests that
  // finished, so it does nothing against this. These bound how long one slow client can hold a socket open.
  server.headersTimeout = 10_000;
  server.requestTimeout = 30_000;

  // Graceful stop: no new connections, requests in flight finish, then the process ends. A hung connection cannot block the exit for long.
  const stop = (signal) => {
    console.log(`${signal} received, closing the server`);
    server.close(() => process.exit(0));
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
  return { server, stop };
};
