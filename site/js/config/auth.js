// The rules of sessions, lockout and two-factor codes. Change a number here, nothing else depends on its value.
// A site without a server enforces these rules in the browser only: they show the concepts, they are not a protection against the owner of the profile.
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const AUTH_CONFIG = Object.freeze({
  // A session of "remember me" lives 7 days at most; without it the session is short.
  absoluteMs: 7 * 24 * HOUR,
  shortAbsoluteMs: 12 * HOUR,
  // A session without a single request for 30 minutes ends.
  idleMs: 30 * MINUTE,
  // The "last seen" mark is rewritten at most once per this time, so reading the user does not write the storage on every call.
  touchMs: MINUTE,
  // The sign-in is locked after this many wrong attempts in a row; the lock doubles with every next failure up to the maximum.
  lockAfter: 5,
  lockBaseMs: 30 * 1000,
  lockMaxMs: 15 * MINUTE,
  // The most addresses kept in the table of failed attempts and the most events kept in the audit log.
  lockEntries: 200,
  auditEntries: 300,
  // A one-time code of the authenticator is accepted one step (30 s) before and after the current one.
  totpSkew: 1,
  recoveryCodes: 8,
});
