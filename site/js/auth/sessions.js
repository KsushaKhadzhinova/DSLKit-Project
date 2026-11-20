// Sessions of signed-in accounts. The browser keeps the pointer to its own session under "session" ({ userId, sid, token }),
// and the list of all sessions under "sessions": each has a random token, the moment of creation and of the last use.
// A session ends at its absolute time or after an idle time; deleting its record from the list signs that browser out at its next read.
// An old session of the form { userId } (before the tokens existed) is turned into a full one the first time it is read.
import { AUTH_CONFIG } from '../config/auth.js';
import { randomHex, same } from './bytes.js';

const POINTER = 'session';
const LIST = 'sessions';
const ID_BYTES = 8;
const TOKEN_BYTES = 32;

const valid = (item) =>
  item !== null &&
  typeof item === 'object' &&
  typeof item.id === 'string' &&
  typeof item.token === 'string' &&
  typeof item.userId === 'string' &&
  typeof item.device === 'string' &&
  typeof item.remember === 'boolean' &&
  Number.isFinite(item.created) &&
  Number.isFinite(item.lastSeen);

export const readSessions = (storage) => {
  const saved = storage.get(LIST, []);
  return Array.isArray(saved) ? saved.filter(valid) : [];
};

const BROWSERS = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];
const SYSTEMS = [
  [/Windows/, 'Windows'],
  [/Android/, 'Android'],
  [/iPhone|iPad/, 'iOS'],
  [/Mac OS X/, 'macOS'],
  [/Linux/, 'Linux'],
];

// A short label of a device from the user agent string: "Chrome · Windows". The string is only a hint that the browser reports about itself.
export const deviceLabel = (userAgent = '') => {
  const find = (table, fallback) => table.find(([pattern]) => pattern.test(userAgent))?.[1] ?? fallback;
  return `${find(BROWSERS, 'Browser')} · ${find(SYSTEMS, 'OS')}`;
};

export const lifetime = (item, config = AUTH_CONFIG) => (item.remember ? config.absoluteMs : config.shortAbsoluteMs);

export const expired = (item, now, config = AUTH_CONFIG) => now - item.created > lifetime(item, config) || now - item.lastSeen > config.idleMs;

// Starts a session of an account in this browser: a record in the list and the pointer. Ended sessions of everybody are dropped on the way.
export const createSession = (storage, { userId, remember, device, now, crypto, config = AUTH_CONFIG }) => {
  const record = { id: randomHex(crypto, ID_BYTES), token: randomHex(crypto, TOKEN_BYTES), userId, device, remember, created: now, lastSeen: now };
  const alive = readSessions(storage).filter((item) => !expired(item, now, config));
  if (!storage.set(LIST, [...alive, record]) || !storage.set(POINTER, { userId, sid: record.id, token: record.token })) return null;
  return record;
};

// The session of this browser for an account that exists, or null. `legacy` marks an old pointer that cannot be upgraded without random numbers.
export const resolveSession = (storage, userId, { now, crypto, device, config = AUTH_CONFIG }) => {
  const pointer = storage.get(POINTER, null);
  if (typeof pointer?.sid !== 'string') {
    if (typeof crypto?.getRandomValues !== 'function') return { legacy: true, userId };
    return createSession(storage, { userId, remember: true, device, now, crypto, config }) ?? { legacy: true, userId };
  }
  const list = readSessions(storage);
  const record = list.find((item) => item.id === pointer.sid);
  if (!record || record.userId !== userId || !same(record.token, String(pointer.token))) return null;
  if (expired(record, now, config)) {
    revokeSession(storage, record.id);
    return null;
  }
  if (now - record.lastSeen >= config.touchMs) {
    record.lastSeen = now;
    storage.set(LIST, list);
  }
  return record;
};

// Removes a session; the browser that held it is signed out. Returns whether there was one.
export const revokeSession = (storage, sid) => {
  const list = readSessions(storage);
  const rest = list.filter((item) => item.id !== sid);
  if (storage.get(POINTER, null)?.sid === sid) storage.remove(POINTER);
  if (rest.length === list.length) return false;
  storage.set(LIST, rest);
  return true;
};

// Removes the sessions of an account except `keep` (null removes all of them); returns how many were removed.
export const revokeSessions = (storage, userId, keep = null) => {
  const list = readSessions(storage);
  const rest = list.filter((item) => item.userId !== userId || item.id === keep);
  const pointer = storage.get(POINTER, null);
  if (pointer?.userId === userId && pointer.sid !== keep) storage.remove(POINTER);
  storage.set(LIST, rest);
  return list.length - rest.length;
};

// The sessions of an account for the screen: newest use first, without tokens, the one of this browser marked.
export const listSessions = (storage, userId, currentId, now, config = AUTH_CONFIG) =>
  readSessions(storage)
    .filter((item) => item.userId === userId && !expired(item, now, config))
    .sort((first, second) => second.lastSeen - first.lastSeen)
    .map(({ id, device, remember, created, lastSeen }) => ({ id, device, remember, created, lastSeen, current: id === currentId }));
