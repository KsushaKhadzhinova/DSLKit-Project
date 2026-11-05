import { ApiError } from './errors.js';

// Headers for a JSON-only API, set by hand without extra packages. The API sends no HTML, so the policy forbids everything.
export const securityHeaders = (req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  });
  next();
};

// An IPv4 client reaching a dual-stack server is seen by Node as "::ffff:<ipv4>" on some connections and as the
// plain "<ipv4>" on others; without this the same client gets two separate buckets and can double its quota.
const bucketKey = (ip) => (typeof ip === 'string' && ip.startsWith('::ffff:') ? ip.slice(7) : ip ?? 'unknown');

// Fixed-window rate limit per client address, kept in memory. The answer is the usual JSON error with Retry-After.
//
// Cleanup is amortized, not a periodic full scan: every call walks at most SWEEP_BATCH map entries (resuming
// where the previous call left off) and drops the ones that expired, so the per-request cost stays bounded
// however large the map has grown, instead of occasionally scanning the whole thing (a CPU-cost amplifier an
// attacker rotating addresses could lean on). maxClients is a hard ceiling on distinct addresses tracked at
// once: once it is reached, the oldest tracked address is evicted to make room, so the map itself cannot grow
// without bound even if the sweep never catches up (for example many different IPv6 addresses, each used once).
const SWEEP_BATCH = 500;

export const rateLimit = ({ windowMs, max, now = Date.now, maxClients = 50000 }) => {
  const hits = new Map();
  let cursor = null;

  const sweep = (time) => {
    const iterator = cursor ?? hits.entries();
    for (let i = 0; i < SWEEP_BATCH; i += 1) {
      const next = iterator.next();
      if (next.done) {
        cursor = null;
        return;
      }
      const [key, entry] = next.value;
      if (entry.reset <= time) hits.delete(key);
    }
    cursor = iterator;
  };

  return (req, res, next) => {
    const time = now();
    sweep(time);
    const key = bucketKey(req.ip);
    let entry = hits.get(key);
    if (!entry || entry.reset <= time) {
      if (!entry && hits.size >= maxClients) {
        const oldest = hits.keys().next().value;
        if (oldest !== undefined) hits.delete(oldest);
      }
      entry = { count: 0, reset: time + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count <= max) return next();
    const retryAfter = Math.max(1, Math.ceil((entry.reset - time) / 1000));
    res.set('Retry-After', String(retryAfter));
    return next(new ApiError(429, 'too_many_requests', `Too many requests, try again in ${retryAfter} s`));
  };
};

// Request data in a log line could carry line breaks and forge extra lines, so it is written as a JSON string (escaped and quoted).
export const logSafe = (text) => JSON.stringify(String(text)).slice(0, 300);
