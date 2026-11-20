import { AUTH_CONFIG } from '../config/auth.js';
import { ADMIN_CODE_VERIFIER, DEVELOPER_CODE_VERIFIER } from '../config/roles.js';
import { checkRoleCode } from '../auth/role-code.js';
import { sealedRole, trustedRole } from '../auth/role-seal.js';
import { recordEvent, eventsFor, forgetUser } from '../auth/audit.js';
import { HEX, fromHex, randomHex, same, toHex } from '../auth/bytes.js';
import { clearFailures, lockedFor, recordFailure } from '../auth/lockout.js';
import { passwordIssues } from '../auth/password-policy.js';
import { ROLES, can } from '../auth/permissions.js';
import { createSession, deviceLabel, listSessions, resolveSession, revokeSession, revokeSessions } from '../auth/sessions.js';
import { generateRecoveryCodes, generateSecret, hashRecoveryCode, otpauthUri, verifyTotp } from '../auth/totp.js';

export { ROLES };

const ACCOUNTS = 'accounts';
const SESSION = 'session';
const ITERATIONS = 100000;
const SALT_BYTES = 16;
const ID_BYTES = 8;
const KEY_BYTES = 32;
const ISSUER = 'DSLKit';
export const EXPORT_FORMAT = 'dslkit-account';
const MAX_NAME = 120;
// A fixed salt for the check of an unknown address, so a missing account costs as much time as a wrong password.
const DUMMY_SALT = '00'.repeat(SALT_BYTES);

const publicUser = (account) => ({ id: account.id, name: account.name, email: account.email, role: trustedRole(account) });

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const valid = (item) =>
  item !== null &&
  typeof item === 'object' &&
  typeof item.id === 'string' &&
  typeof item.name === 'string' &&
  typeof item.email === 'string' &&
  HEX.test(item.salt) &&
  HEX.test(item.hash) &&
  Number.isInteger(item.iterations) &&
  item.iterations > 0;

const readAccounts = (storage) => {
  const saved = storage.get(ACCOUNTS, []);
  return Array.isArray(saved) ? saved.filter(valid) : [];
};

const hasTotp = (account) => account.totp?.enabled === true && typeof account.totp.secret === 'string';

const recoveryOf = (account) => (Array.isArray(account.totp.recovery) ? account.totp.recovery : []);

const defaultAgent = () => String(globalThis.navigator.userAgent);

// The signed-in user, or null for a guest, an unknown id, a revoked or ended session or a damaged one. Any page may ask without the crypto API:
// a session of the old form { userId } is upgraded when random numbers exist, and the "last seen" mark moves at most once a minute.
export const currentUser = (storage, { now = () => Date.now(), crypto = globalThis.crypto, userAgent = defaultAgent(), config = AUTH_CONFIG } = {}) => {
  const pointer = storage.get(SESSION, null);
  const account = typeof pointer?.userId === 'string' ? readAccounts(storage).find((item) => item.id === pointer.userId) : undefined;
  if (!account) return null;
  return resolveSession(storage, account.id, { now: now(), crypto, device: deviceLabel(userAgent), config }) ? publicUser(account) : null;
};

// Accounts of the site live in the browser: there is no server. The password is never stored, only its PBKDF2-SHA-256 hash with a salt of its own.
// This is a model of an account system for study, not a safe one: whoever opens the browser profile can read and change everything (docs/agent-reports/feature-auth.en.md).
// Every method answers with { ok, ... } and never throws for a wrong input.
export const createAccountStore = ({
  storage,
  crypto = globalThis.crypto,
  now = () => Date.now(),
  userAgent = defaultAgent(),
  config = AUTH_CONFIG,
  developerHash = DEVELOPER_CODE_VERIFIER,
  adminHash = ADMIN_CODE_VERIFIER,
}) => {
  const supported = () => typeof crypto?.subtle?.deriveBits === 'function' && typeof crypto.getRandomValues === 'function';

  const read = () => readAccounts(storage);
  const newKey = () => randomHex(crypto, KEY_BYTES);
  const current = () => currentUser(storage, { now, crypto, userAgent, config });
  const log = (userId, type, detail) => recordEvent(storage, { userId, type, at: now(), detail }, config.auditEntries);

  const derive = async (password, salt, iterations) => {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    return toHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations }, key, 256));
  };

  const change = (id, patch) =>
    storage.set(
      ACCOUNTS,
      read().map((account) => (account.id === id ? { ...account, ...patch(account) } : account)),
    );
  const account = (id) => read().find((item) => item.id === id);
  const startSession = (id, remember) => createSession(storage, { userId: id, remember, device: deviceLabel(userAgent), now: now(), crypto, config });

  // A wrong secret of an address counts against the address, known or not, and gives the same answer in both cases.
  const failure = (address, item, type) => {
    const delay = recordFailure(storage, address, now(), config);
    if (item) {
      log(item.id, type);
      if (delay > 0) log(item.id, 'locked', Math.round(delay / 1000));
    }
    return delay > 0 ? { ok: false, error: 'locked', retryAfterMs: delay } : { ok: false, error: 'invalid' };
  };
  const locked = (address) => {
    const wait = lockedFor(storage, address, now());
    return wait > 0 ? { ok: false, error: 'locked', retryAfterMs: wait } : null;
  };

  // The password of the signed-in user, for the actions that need it again. Wrong passwords count toward the lockout of the address.
  const confirmPassword = async (user, password) => {
    const item = account(user.id);
    const wait = locked(item.email);
    if (wait) return wait;
    if (same(await derive(String(password), item.salt, item.iterations), item.hash)) return { ok: true, account: item };
    return failure(item.email, item, 'password-change-failed');
  };

  const register = async ({ name, email, password, remember = true }) => {
    if (!supported()) return { ok: false, error: 'unsupported' };
    const accounts = read();
    const address = normalizeEmail(email);
    const issues = passwordIssues(password, { name, email: address });
    if (issues.length > 0) return { ok: false, error: 'policy', issues };
    if (accounts.some((item) => item.email === address)) return { ok: false, error: 'exists' };
    const salt = randomHex(crypto, SALT_BYTES);
    const created = {
      id: `u${randomHex(crypto, ID_BYTES)}`,
      name: String(name).trim(),
      email: address,
      salt,
      hash: await derive(password, salt, ITERATIONS),
      iterations: ITERATIONS,
      created: now(),
      roleKey: newKey(),
    };
    // Another tab may have registered the same address while the hash was computed.
    const latest = read();
    if (latest.some((item) => item.email === address)) return { ok: false, error: 'exists' };
    if (!storage.set(ACCOUNTS, [...latest, created]) || startSession(created.id, remember) === null) return { ok: false, error: 'storage' };
    log(created.id, 'account-created');
    log(created.id, 'sign-in');
    return { ok: true, user: publicUser(created) };
  };

  // A wrong address and a wrong password give the same answer, and so does a locked address. With the second factor on, the right password
  // asks for a code ("code-required"); a wrong code counts as a failed attempt.
  const login = async ({ email, password, code = '', remember = true }) => {
    if (!supported()) return { ok: false, error: 'unsupported' };
    const address = normalizeEmail(email);
    const wait = locked(address);
    if (wait) return wait;
    const item = read().find((entry) => entry.email === address);
    const hash = await derive(String(password), item?.salt ?? DUMMY_SALT, item?.iterations ?? ITERATIONS);
    if (!item || !same(hash, item.hash)) return failure(address, item, 'sign-in-failed');
    if (hasTotp(item)) {
      if (String(code).trim() === '') return { ok: false, error: 'code-required' };
      const second = await checkSecondFactor(item, String(code));
      if (!second) {
        const result = failure(address, item, 'second-factor-failed');
        return result.error === 'invalid' ? { ok: false, error: 'invalid-code' } : result;
      }
    }
    clearFailures(storage, address);
    if (startSession(item.id, remember) === null) return { ok: false, error: 'storage' };
    log(item.id, 'sign-in');
    return { ok: true, user: publicUser(item) };
  };

  // A code of the authenticator (once per step) or a recovery code (once); the used one is written down at once.
  const checkSecondFactor = async (item, code) => {
    const step = await verifyTotp(item.totp.secret, code, { ms: now(), skew: config.totpSkew, lastStep: item.totp.lastStep, crypto });
    if (step !== null) return change(item.id, (entry) => ({ totp: { ...entry.totp, lastStep: step } }));
    const digest = await hashRecoveryCode(item.id, code, crypto);
    const left = recoveryOf(item).filter((entry) => !same(entry, digest));
    if (left.length === recoveryOf(item).length) return false;
    log(item.id, 'totp-recovery-used', left.length);
    return change(item.id, (entry) => ({ totp: { ...entry.totp, recovery: left } }));
  };

  const logout = () => {
    const user = current();
    if (user) log(user.id, 'sign-out');
    const sid = storage.get(SESSION, null)?.sid;
    if (typeof sid === 'string') revokeSession(storage, sid);
    return storage.remove(SESSION);
  };

  const lastAdmin = (id) => trustedRole(account(id)) === 'admin' && read().filter((item) => trustedRole(item) === 'admin').length === 1;

  // The role "developer" or "admin" is given by a code whose hash is in the config; it is written to the account of the signed-in user.
  const becomeDeveloper = async (code) => {
    const user = current();
    if (!user) return { ok: false, error: 'signed-out' };
    if (!supported()) return { ok: false, error: 'unsupported' };
    const role = (await checkRoleCode(crypto, code, developerHash)) ? 'developer' : (await checkRoleCode(crypto, code, adminHash)) ? 'admin' : null;
    if (role === null) return { ok: false, error: 'invalid' };
    if (role !== user.role && lastAdmin(user.id)) return { ok: false, error: 'last-admin' };
    if (!change(user.id, (item) => sealedRole(item, role, newKey))) return { ok: false, error: 'storage' };
    if (role !== user.role) log(user.id, 'role-change', `${user.role}>${role}`);
    return { ok: true, user: current() };
  };

  const leaveDeveloper = () => {
    const user = current();
    if (!user || lastAdmin(user.id)) return false;
    const done = change(user.id, (item) => sealedRole(item, 'user', newKey));
    if (done && user.role !== 'user') log(user.id, 'role-change', `${user.role}>user`);
    return done;
  };

  // The password is changed only with the old one; every other session of the account ends.
  const changePassword = async ({ oldPassword, newPassword }) => {
    const user = current();
    if (!user) return { ok: false, error: 'signed-out' };
    if (!supported()) return { ok: false, error: 'unsupported' };
    const checked = await confirmPassword(user, oldPassword);
    if (!checked.ok) return checked;
    const issues = passwordIssues(newPassword, user);
    if (newPassword === oldPassword) issues.push('reuse');
    if (issues.length > 0) return { ok: false, error: 'policy', issues };
    const salt = randomHex(crypto, SALT_BYTES);
    const hash = await derive(newPassword, salt, ITERATIONS);
    if (!change(user.id, () => ({ salt, hash, iterations: ITERATIONS, passwordChanged: now() }))) return { ok: false, error: 'storage' };
    clearFailures(storage, user.email);
    const ended = revokeSessions(storage, user.id, storage.get(SESSION, null)?.sid);
    log(user.id, 'password-change', ended);
    return { ok: true, ended };
  };

  // The account is removed after the password is typed again; its sessions and its audit events go with it.
  const deleteAccount = async ({ password }) => {
    const user = current();
    if (!user) return { ok: false, error: 'signed-out' };
    if (!supported()) return { ok: false, error: 'unsupported' };
    const checked = await confirmPassword(user, password);
    if (!checked.ok) return checked;
    const accounts = read().filter((item) => item.id !== user.id);
    if (!storage.set(ACCOUNTS, accounts)) return { ok: false, error: 'storage' };
    revokeSessions(storage, user.id);
    clearFailures(storage, user.email);
    forgetUser(storage, user.id);
    return { ok: true };
  };

  const sessions = () => {
    const user = current();
    return user ? listSessions(storage, user.id, storage.get(SESSION, null)?.sid, now(), config) : [];
  };

  const revoke = (sid) => {
    const user = current();
    if (!user) return { ok: false, error: 'signed-out' };
    const own = sessions().some((item) => item.id === sid);
    if (!own) return { ok: false, error: 'unknown' };
    const itself = storage.get(SESSION, null)?.sid === sid;
    revokeSession(storage, sid);
    log(user.id, 'session-revoked', itself ? 'this' : 'other');
    return { ok: true, itself };
  };

  const revokeOthers = () => {
    const user = current();
    if (!user) return { ok: false, error: 'signed-out' };
    const ended = revokeSessions(storage, user.id, storage.get(SESSION, null)?.sid);
    if (ended > 0) log(user.id, 'session-revoked', `others:${ended}`);
    return { ok: true, ended };
  };

  const totpStatus = () => {
    const user = current();
    const item = user ? account(user.id) : undefined;
    return item && hasTotp(item) ? { enabled: true, recoveryLeft: recoveryOf(item).length } : { enabled: false, recoveryLeft: 0 };
  };

  // Step one: a new secret is made and kept as "pending"; it works only after a right code is typed (enableTotp).
  const beginTotp = () => {
    const user = current();
    if (!user) return { ok: false, error: 'signed-out' };
    if (!supported()) return { ok: false, error: 'unsupported' };
    if (hasTotp(account(user.id))) return { ok: false, error: 'enabled' };
    const secret = generateSecret(crypto);
    if (!change(user.id, () => ({ totp: { enabled: false, secret } }))) return { ok: false, error: 'storage' };
    return { ok: true, secret, uri: otpauthUri({ issuer: ISSUER, account: user.email, secret }) };
  };

  // Step two: a right code turns the second factor on and shows the recovery codes once; only their hashes are kept.
  const enableTotp = async ({ code }) => {
    const user = current();
    if (!user) return { ok: false, error: 'signed-out' };
    if (!supported()) return { ok: false, error: 'unsupported' };
    const pending = account(user.id).totp;
    if (!pending || pending.enabled) return { ok: false, error: 'no-pending' };
    const step = await verifyTotp(pending.secret, code, { ms: now(), skew: config.totpSkew, crypto });
    if (step === null) return { ok: false, error: 'invalid-code' };
    const recoveryCodes = generateRecoveryCodes(config.recoveryCodes, crypto);
    const recovery = await Promise.all(recoveryCodes.map((item) => hashRecoveryCode(user.id, item, crypto)));
    if (!change(user.id, () => ({ totp: { enabled: true, secret: pending.secret, lastStep: step, recovery } }))) return { ok: false, error: 'storage' };
    log(user.id, 'totp-enabled');
    return { ok: true, recoveryCodes };
  };

  const disableTotp = async ({ password }) => {
    const user = current();
    if (!user) return { ok: false, error: 'signed-out' };
    if (!supported()) return { ok: false, error: 'unsupported' };
    const checked = await confirmPassword(user, password);
    if (!checked.ok) return checked;
    if (!hasTotp(checked.account)) return { ok: false, error: 'not-enabled' };
    if (!change(user.id, () => ({ totp: undefined }))) return { ok: false, error: 'storage' };
    log(user.id, 'totp-disabled');
    return { ok: true };
  };

  // The administrator sees and manages the local accounts; the rights come from the permission table, not from a role name.
  const listAccounts = () => {
    if (!can(current(), 'admin.users')) return { ok: false, error: 'forbidden' };
    return {
      ok: true,
      accounts: read().map((item) => ({ ...publicUser(item), created: item.created ?? null, totp: hasTotp(item) })),
    };
  };

  const setRole = ({ id, role }) => {
    const actor = current();
    if (!can(actor, 'admin.users')) return { ok: false, error: 'forbidden' };
    const target = account(id);
    if (!target) return { ok: false, error: 'unknown' };
    if (!ROLES.includes(role)) return { ok: false, error: 'invalid' };
    const before = trustedRole(target);
    if (before === role) return { ok: true, changed: false };
    if (lastAdmin(id)) return { ok: false, error: 'last-admin' };
    if (!change(id, (item) => sealedRole(item, role, newKey))) return { ok: false, error: 'storage' };
    log(id, 'role-change', `${before}>${role}`);
    return { ok: true, changed: true };
  };

  // Events of the signed-in user, newest first; the administrator may ask for everybody's.
  const audit = ({ all = false, count = 50 } = {}) => {
    const user = current();
    if (!user) return [];
    return eventsFor(storage, all && can(user, 'admin.users') ? null : user.id, count);
  };

  // The account of the signed-in user as a file record: the name, the address and the salted hash, nothing that is a plain secret.
  // The second factor (its secret), the role and the sessions stay behind, so the file cannot lift anybody's rights.
  const exportAccount = () => {
    const user = current();
    if (!user) return { ok: false, error: 'signed-out' };
    const { id, name, email, salt, hash, iterations, created } = account(user.id);
    return {
      ok: true,
      record: { format: EXPORT_FORMAT, version: 1, exported: now(), account: { id, name, email, salt, hash, iterations, created: created ?? null } },
    };
  };

  // A record of exportAccount is added as a new account with the role "user" and no session. An address or an id that is already here is never
  // overwritten, not even by the same account: the answer is "exists". A damaged or foreign record is "invalid-file".
  const importAccount = (record) => {
    const item = record?.account;
    const fine =
      record?.format === EXPORT_FORMAT &&
      record.version === 1 &&
      valid(item) &&
      /^u[0-9a-f]{16}$/.test(item.id) &&
      item.iterations <= 1000000 &&
      item.name.length <= MAX_NAME &&
      item.email === normalizeEmail(item.email) &&
      item.email.includes('@') &&
      (item.created === null || Number.isFinite(item.created));
    if (!fine) return { ok: false, error: 'invalid-file' };
    const accounts = read();
    if (accounts.some((entry) => entry.email === item.email || entry.id === item.id)) return { ok: false, error: 'exists' };
    const created = {
      id: item.id,
      name: item.name,
      email: item.email,
      salt: item.salt,
      hash: item.hash,
      iterations: item.iterations,
      created: item.created ?? now(),
      roleKey: newKey(),
    };
    if (!storage.set(ACCOUNTS, [...accounts, created])) return { ok: false, error: 'storage' };
    log(created.id, 'account-created', 'import');
    return { ok: true, email: created.email };
  };

  return {
    exportAccount,
    importAccount,
    register,
    login,
    logout,
    current,
    becomeDeveloper,
    leaveDeveloper,
    changePassword,
    deleteAccount,
    sessions,
    revoke,
    revokeOthers,
    totpStatus,
    beginTotp,
    enableTotp,
    disableTotp,
    listAccounts,
    setRole,
    audit,
  };
};
