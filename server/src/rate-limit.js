'use strict';
const { tooMany } = require('./errors');

// Fixed-window counter per client address, kept in memory (one process; use a shared store when scaling out).
function createRateLimiter(now) {
  const hits = new Map();
  let nextSweep = 0;
  return function limit({ name, max, windowMinutes }) {
    return (req, _res, next) => {
      const key = `${name}:${req.ip}`;
      const t = now();
      // Sweep expired windows at most once a minute instead of scanning the map on every request.
      if (t >= nextSweep) {
        for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
        nextSweep = t + 60_000;
      }
      if (hits.get(key)?.resetAt <= t) hits.delete(key);
      let entry = hits.get(key);
      if (!entry) {
        entry = { count: 0, resetAt: t + windowMinutes * 60_000 };
        hits.set(key, entry);
      }
      entry.count += 1;
      if (entry.count > max) return next(tooMany('rate_limited', 'Too many requests', Math.ceil((entry.resetAt - t) / 1000)));
      return next();
    };
  };
}

module.exports = { createRateLimiter };
