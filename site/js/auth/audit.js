// The audit log of security events: who (the account), what and when. It keeps no password, no code and no address of an unknown visitor.
// Events of an unknown address are not written at all: a log that listed them would tell which addresses have an account.
import { AUTH_CONFIG } from '../config/auth.js';

const KEY = 'audit';

export const EVENT_TYPES = [
  'account-created',
  'sign-in',
  'sign-in-failed',
  'second-factor-failed',
  'locked',
  'sign-out',
  'password-change',
  'password-change-failed',
  'totp-enabled',
  'totp-disabled',
  'totp-recovery-used',
  'role-change',
  'session-revoked',
];

const valid = (item) =>
  item !== null && typeof item === 'object' && typeof item.userId === 'string' && EVENT_TYPES.includes(item.type) && Number.isFinite(item.at);

export const readAudit = (storage) => {
  const saved = storage.get(KEY, []);
  return Array.isArray(saved) ? saved.filter(valid) : [];
};

// The newest events are kept; the oldest ones go when the log is full.
export const recordEvent = (storage, { userId, type, at, detail = null }, limit = AUTH_CONFIG.auditEntries) => {
  const event = detail === null ? { userId, type, at } : { userId, type, at, detail };
  return storage.set(KEY, [...readAudit(storage), event].slice(-limit));
};

// Newest first. `userId` null gives the events of everybody (for an admin).
export const eventsFor = (storage, userId = null, count = 50) =>
  readAudit(storage)
    .filter((event) => userId === null || event.userId === userId)
    .reverse()
    .slice(0, count);

export const forgetUser = (storage, userId) =>
  storage.set(
    KEY,
    readAudit(storage).filter((event) => event.userId !== userId),
  );
