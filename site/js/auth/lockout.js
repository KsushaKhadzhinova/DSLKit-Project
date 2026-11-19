// Lockout after wrong sign-ins. The table is keyed by the normalized address and is kept for known and unknown addresses alike,
// so a locked answer does not tell whether an account exists.
import { AUTH_CONFIG } from '../config/auth.js';

const KEY = 'lockouts';

// A prefix keeps an address such as "__proto__" from being a special name of an object.
const slot = (address) => `a:${address}`;

const valid = (entry) => entry !== null && typeof entry === 'object' && Number.isInteger(entry.failed) && Number.isFinite(entry.until);

const read = (storage) => {
  const saved = storage.get(KEY, {});
  return saved !== null && typeof saved === 'object' && !Array.isArray(saved)
    ? Object.fromEntries(Object.entries(saved).filter(([, entry]) => valid(entry)))
    : {};
};

// The delay of the failure number `failed`: nothing before `lockAfter`, then 30 s, 1 min, 2 min... up to the maximum.
export const lockDelay = (failed, config = AUTH_CONFIG) =>
  failed < config.lockAfter ? 0 : Math.min(config.lockBaseMs * 2 ** (failed - config.lockAfter), config.lockMaxMs);

// Milliseconds until the address may try again; 0 when it may try now.
export const lockedFor = (storage, address, now) => Math.max(0, (read(storage)[slot(address)]?.until ?? 0) - now);

// Counts a wrong attempt; returns how long the address is locked for now (0 while attempts remain).
export const recordFailure = (storage, address, now, config = AUTH_CONFIG) => {
  const table = read(storage);
  const failed = (table[slot(address)]?.failed ?? 0) + 1;
  const delay = lockDelay(failed, config);
  table[slot(address)] = { failed, until: now + delay };
  // The table cannot grow without limit: this address stays, of the others those with the latest end of a lock stay.
  const others = Object.entries(table)
    .filter(([key]) => key !== slot(address))
    .sort(([, first], [, second]) => second.until - first.until);
  const keep = [[slot(address), table[slot(address)]], ...others].slice(0, config.lockEntries);
  storage.set(KEY, Object.fromEntries(keep));
  return delay;
};

export const clearFailures = (storage, address) => {
  const { [slot(address)]: removed, ...rest } = read(storage);
  return removed === undefined ? true : storage.set(KEY, rest);
};
