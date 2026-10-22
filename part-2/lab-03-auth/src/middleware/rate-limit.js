const { tooManyRequests } = require('../errors');

const MAX_KEYS = 10000;
const EVICT = MAX_KEYS / 10;

// A full table drops its oldest tenth in one go (a Map keeps insertion order), so the cost per request stays small
// and an attacker with many addresses or emails cannot grow the memory without bound.
const makeRoom = (map) => {
  if (map.size < MAX_KEYS) return;
  let left = EVICT;
  for (const key of map.keys()) {
    if (left-- <= 0) break;
    map.delete(key);
  }
};

// Fixed window counter per client address. The state is in memory, so it is per process (see AUDIT.md).
const createRateLimiter = ({ windowMs, max, now = Date.now }) => {
  const clients = new Map();
  return (req, _res, next) => {
    const time = now();
    const key = req.ip ?? 'unknown';
    let entry = clients.get(key);
    if (!entry || entry.resetAt <= time) {
      clients.delete(key);
      makeRoom(clients);
      entry = { count: 0, resetAt: time + windowMs };
      clients.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) return next(tooManyRequests('Too many requests, try again later', Math.ceil((entry.resetAt - time) / 1000)));
    return next();
  };
};

// Counts failed logins per key (the controller passes address and email, known or not, so the answer never shows which emails exist).
// After maxAttempts failures the key is locked for lockMs, even for the right password.
const createLoginGuard = ({ maxAttempts, lockMs, now = Date.now }) => {
  const failures = new Map();
  const key = (email) => String(email).slice(0, 320);
  const expiry = (entry) => entry.lockedUntil ?? entry.lastFailure + lockMs;
  return {
    // Seconds to wait, 0 if the login may be tried.
    retryAfter(email) {
      const entry = failures.get(key(email));
      if (!entry || !entry.lockedUntil || entry.lockedUntil <= now()) return 0;
      return Math.ceil((entry.lockedUntil - now()) / 1000);
    },
    fail(email) {
      const time = now();
      const entry = failures.get(key(email));
      const fresh = !entry || expiry(entry) <= time;
      if (!entry) makeRoom(failures);
      const count = fresh ? 1 : entry.count + 1;
      failures.set(key(email), { count, lastFailure: time, lockedUntil: count >= maxAttempts ? time + lockMs : undefined });
    },
    succeed(email) {
      failures.delete(key(email));
    },
  };
};

module.exports = { createRateLimiter, createLoginGuard };
