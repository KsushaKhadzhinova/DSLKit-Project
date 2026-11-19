import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUTH_CONFIG } from '../../site/js/config/auth.js';
import { EVENT_TYPES, eventsFor, forgetUser, readAudit, recordEvent } from '../../site/js/auth/audit.js';
import { HEX, fromHex, randomHex, same, toHex } from '../../site/js/auth/bytes.js';
import { clearFailures, lockDelay, lockedFor, recordFailure } from '../../site/js/auth/lockout.js';
import { COMMON_PASSWORDS, passwordIssues, passwordStrength } from '../../site/js/auth/password-policy.js';
import { PERMISSIONS, ROLES, can, roleOf } from '../../site/js/auth/permissions.js';
import {
  createSession,
  deviceLabel,
  expired,
  lifetime,
  listSessions,
  readSessions,
  resolveSession,
  revokeSession,
  revokeSessions,
} from '../../site/js/auth/sessions.js';
import {
  base32Decode,
  base32Encode,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  hotp,
  normalizeRecoveryCode,
  otpauthUri,
  stepOf,
  totp,
  verifyTotp,
} from '../../site/js/auth/totp.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const memory = () => createStorage(createMemoryBackend());
const { crypto } = globalThis;

test('bytes: hex both ways, random hex and the comparison of secrets', () => {
  assert.equal(toHex(Uint8Array.of(0, 15, 255)), '000fff');
  assert.deepEqual([...fromHex('000fff')], [0, 15, 255]);
  assert.equal(HEX.test('0g'), false);
  assert.match(randomHex(crypto, 8), /^[0-9a-f]{16}$/);
  assert.equal(same('abc', 'abc'), true);
  assert.equal(same('abc', 'abd'), false);
  assert.equal(same('abc', 'abcd'), false);
});

test('permissions: one table, a guest can do nothing, an unknown role is a user', () => {
  assert.deepEqual(ROLES, ['user', 'developer', 'admin']);
  assert.equal(can(null, 'diagram.create'), false);
  assert.equal(can({ role: 'user' }, 'diagram.create'), true);
  assert.equal(can({ role: 'user' }, 'diagram.unlimited'), false);
  assert.equal(can({ role: 'developer' }, 'diagram.unlimited'), true);
  assert.equal(can({ role: 'admin' }, 'diagram.unlimited'), true);
  assert.equal(can({ role: 'developer' }, 'docs.developer'), true);
  assert.equal(can({ role: 'admin' }, 'docs.developer'), false);
  assert.equal(can({ role: 'admin' }, 'admin.users'), true);
  assert.equal(can({ role: 'developer' }, 'admin.users'), false);
  assert.equal(can({ role: 'root' }, 'diagram.unlimited'), false);
  assert.equal(can({ role: 'root' }, 'diagram.create'), true);
  assert.equal(can({ role: 'admin' }, 'no.such.permission'), false);
  assert.equal(roleOf({ role: 'admin' }), 'admin');
  assert.equal(roleOf(undefined), 'user');
  assert.equal(Object.isFrozen(PERMISSIONS), true);
});

test('password policy: length, common passwords, repeats, the email and the name', () => {
  const person = { name: 'Ксения Хаджинова', email: 'Ksenia.Khadzhinova@example.com' };
  assert.deepEqual(passwordIssues('correct horse battery', person), []);
  assert.deepEqual(passwordIssues('short', person), ['short']);
  assert.deepEqual(passwordIssues(' '.repeat(10)), ['short', 'repeat']);
  assert.deepEqual(passwordIssues(undefined), ['short']);
  assert.deepEqual(passwordIssues('x'.repeat(129)), ['long', 'repeat']);
  assert.deepEqual(passwordIssues('Password'), ['common']);
  assert.deepEqual(passwordIssues('Password123!'), ['common']);
  assert.deepEqual(passwordIssues('12345678'), ['common']);
  assert.deepEqual(passwordIssues('abababab'), ['repeat']);
  assert.deepEqual(passwordIssues('ksenia.khadzhinova@example.com', person), ['personal']);
  assert.deepEqual(passwordIssues('my-Ksenia.Khadzhinova-9', person), ['personal']);
  assert.deepEqual(passwordIssues('ксения хаджинова', person), ['personal']);
  assert.deepEqual(passwordIssues('xx-ксенияхаджинова-xx', person), ['personal']);
  // A short local part is not a clue by itself, but the whole address typed as the password is refused.
  assert.deepEqual(passwordIssues('a purple kettle', { name: 'Ян', email: 'a@b.co' }), []);
  assert.deepEqual(passwordIssues('a@b.co', { name: 'Ян', email: 'a@b.co' }), ['short', 'personal']);
  assert.equal(COMMON_PASSWORDS.has('qwerty'), true);
});

test('password strength: a refused password is 0, longer and more varied is stronger', () => {
  assert.equal(passwordStrength('password'), 0);
  assert.equal(passwordStrength(undefined), 0);
  assert.equal(passwordStrength('plainwords'), 1);
  assert.equal(passwordStrength('plain words ok'), 2);
  assert.equal(passwordStrength('plain words here'), 3);
  assert.equal(passwordStrength('Plain words here'), 4);
  assert.equal(passwordStrength('Plain words here 42'), 4);
  assert.equal(passwordStrength('Tr0ub4dor&3'), 2);
  assert.equal(passwordStrength('correct horse battery staple', { name: 'x', email: 'y@z.co' }), 3);
});

// RFC 6238 appendix B: the secret "12345678901234567890", SHA-1, the six last digits of the eight-digit values.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
test('totp: the vectors of RFC 6238 and the base32 text of the secret', async () => {
  const bytes = new TextEncoder().encode('12345678901234567890');
  assert.equal(base32Encode(bytes), RFC_SECRET);
  assert.deepEqual([...base32Decode('gezd gnbv-GY3TQOJQ GEZDGNBVGY3TQOJQ===')], [...bytes]);
  assert.equal(base32Encode(new Uint8Array(0)), '');
  assert.equal(base32Decode(''), null);
  assert.equal(base32Decode('abc1'), null);
  assert.deepEqual([...base32Decode('A')], []);
  const cases = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
  ];
  for (const [seconds, code] of cases) assert.equal(await totp(RFC_SECRET, seconds * 1000), code, `T=${seconds}`);
  assert.equal(await hotp(RFC_SECRET, 0), '755224');
  assert.equal(stepOf(59000), 1);
});

test('totp: a secret, an address for the authenticator and recovery codes', async () => {
  assert.match(generateSecret(), /^[A-Z2-7]{32}$/);
  const uri = otpauthUri({ issuer: 'DSLKit', account: 'a b@example.com', secret: RFC_SECRET });
  assert.equal(uri, `otpauth://totp/DSLKit:a%20b%40example.com?secret=${RFC_SECRET}&issuer=DSLKit&algorithm=SHA1&digits=6&period=30`);
  const codes = generateRecoveryCodes(8);
  assert.equal(codes.length, 8);
  assert.equal(new Set(codes).size, 8);
  codes.forEach((code) => assert.match(code, /^[A-Z2-7]{5}-[A-Z2-7]{5}$/));
  assert.equal(normalizeRecoveryCode(' abcde-fghij '), 'ABCDEFGHIJ');
  const digest = await hashRecoveryCode('u1', 'abcde-fghij');
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(digest, await hashRecoveryCode('u1', 'ABCDE FGHIJ'));
  assert.notEqual(digest, await hashRecoveryCode('u2', 'abcde-fghij'));
});

test('totp verification: one step of tolerance each way, a code is used once, bad input is refused', async () => {
  const ms = 1_700_000_010_000;
  const step = stepOf(ms);
  const at = (offset) => hotp(RFC_SECRET, step + offset);
  assert.equal(await verifyTotp(RFC_SECRET, await at(0), { ms }), step);
  assert.equal(await verifyTotp(RFC_SECRET, await at(-1), { ms }), step - 1);
  assert.equal(await verifyTotp(RFC_SECRET, await at(1), { ms }), step + 1);
  assert.equal(await verifyTotp(RFC_SECRET, await at(2), { ms }), null);
  assert.equal(await verifyTotp(RFC_SECRET, await at(-2), { ms }), null);
  assert.equal(await verifyTotp(RFC_SECRET, await at(-2), { ms, skew: 2 }), step - 2);
  // The same code is not accepted again: the last used step is passed in.
  assert.equal(await verifyTotp(RFC_SECRET, await at(0), { ms, lastStep: step }), null);
  assert.equal(await verifyTotp(RFC_SECRET, await at(0), { ms, lastStep: step - 1 }), step);
  assert.equal(await verifyTotp(RFC_SECRET, ` ${(await at(0)).slice(0, 3)} ${(await at(0)).slice(3)} `, { ms }), step);
  assert.equal(await verifyTotp(RFC_SECRET, '12345', { ms }), null);
  assert.equal(await verifyTotp(RFC_SECRET, 'abcdef', { ms }), null);
  assert.equal(await verifyTotp('not base32!', '123456', { ms }), null);
});

test('lockout: no delay before the limit, then it doubles up to the maximum, and a success clears it', () => {
  const storage = memory();
  const { lockAfter, lockBaseMs, lockMaxMs } = AUTH_CONFIG;
  assert.equal(lockDelay(lockAfter - 1), 0);
  assert.equal(lockDelay(lockAfter), lockBaseMs);
  assert.equal(lockDelay(lockAfter + 1), lockBaseMs * 2);
  assert.equal(lockDelay(lockAfter + 20), lockMaxMs);
  assert.equal(lockedFor(storage, 'a@b.co', 1000), 0);
  for (let index = 1; index < lockAfter; index += 1) assert.equal(recordFailure(storage, 'a@b.co', 1000), 0);
  assert.equal(recordFailure(storage, 'a@b.co', 1000), lockBaseMs);
  assert.equal(lockedFor(storage, 'a@b.co', 1000), lockBaseMs);
  assert.equal(lockedFor(storage, 'a@b.co', 1000 + lockBaseMs - 1), 1);
  assert.equal(lockedFor(storage, 'a@b.co', 1000 + lockBaseMs), 0);
  assert.equal(recordFailure(storage, 'a@b.co', 1000 + lockBaseMs), lockBaseMs * 2);
  assert.equal(clearFailures(storage, 'a@b.co'), true);
  assert.equal(clearFailures(storage, 'a@b.co'), true);
  assert.equal(lockedFor(storage, 'a@b.co', 0), 0);
  assert.equal(recordFailure(storage, 'a@b.co', 0), 0);
});

test('lockout: a name such as __proto__ is an address like any other and the table stays small', () => {
  const storage = memory();
  const config = { ...AUTH_CONFIG, lockEntries: 3 };
  recordFailure(storage, '__proto__', 5, config);
  assert.equal(Object.getPrototypeOf(storage.get('lockouts')), Object.prototype);
  assert.deepEqual(Object.keys(storage.get('lockouts')), ['a:__proto__']);
  for (let index = 0; index < 10; index += 1) recordFailure(storage, `user${index}@x.co`, 10 + index, config);
  const table = storage.get('lockouts');
  assert.equal(Object.keys(table).length, 3);
  assert.ok('a:user9@x.co' in table);
  // Damaged data is ignored.
  storage.set('lockouts', { 'a:bad': { failed: 'x' }, 'a:ok': { failed: 1, until: 9 }, list: null });
  assert.equal(lockedFor(storage, 'bad', 0), 0);
  assert.equal(lockedFor(storage, 'ok', 0), 9);
  storage.set('lockouts', [1, 2]);
  assert.equal(lockedFor(storage, 'ok', 0), 0);
});

test('audit: events are kept newest first, trimmed, filtered and forgotten with the account', () => {
  const storage = memory();
  assert.deepEqual(readAudit(storage), []);
  recordEvent(storage, { userId: 'u1', type: 'sign-in', at: 1 });
  recordEvent(storage, { userId: 'u2', type: 'sign-in', at: 2 });
  recordEvent(storage, { userId: 'u1', type: 'locked', at: 3, detail: 30 });
  assert.deepEqual(
    eventsFor(storage, 'u1').map((event) => [event.type, event.detail]),
    [
      ['locked', 30],
      ['sign-in', undefined],
    ],
  );
  assert.equal(eventsFor(storage).length, 3);
  assert.equal(eventsFor(storage, null, 2).length, 2);
  recordEvent(storage, { userId: 'u1', type: 'sign-out', at: 4 }, 3);
  assert.deepEqual(
    readAudit(storage).map((event) => event.at),
    [2, 3, 4],
  );
  forgetUser(storage, 'u1');
  assert.deepEqual(
    readAudit(storage).map((event) => event.userId),
    ['u2'],
  );
  storage.set('audit', [null, { userId: 'u1', type: 'unknown', at: 1 }, { userId: 1, type: 'sign-in', at: 1 }, { userId: 'u1', type: 'sign-in', at: 'x' }]);
  assert.deepEqual(readAudit(storage), []);
  storage.set('audit', 'text');
  assert.deepEqual(readAudit(storage), []);
  assert.ok(EVENT_TYPES.includes('role-change'));
});

test('device labels come from the user agent and fall back to plain words', () => {
  assert.equal(deviceLabel('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537'), 'Chrome · Windows');
  assert.equal(deviceLabel('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Edg/120'), 'Edge · Windows');
  assert.equal(deviceLabel('Mozilla/5.0 (Windows) Chrome/120 OPR/100'), 'Opera · Windows');
  assert.equal(deviceLabel('Mozilla/5.0 (X11; Linux x86_64; rv:120) Firefox/120'), 'Firefox · Linux');
  assert.equal(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17) Safari/604'), 'Safari · iOS');
  assert.equal(deviceLabel('Mozilla/5.0 (Linux; Android 14) Chrome/120'), 'Chrome · Android');
  assert.equal(deviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605'), 'Safari · macOS');
  assert.equal(deviceLabel(), 'Browser · OS');
});

const DAY = 24 * 60 * 60 * 1000;
const base = { userId: 'u1', device: 'Chrome · Windows', crypto };

test('a session has a random token, a pointer in the browser and a record in the list', () => {
  const storage = memory();
  const first = createSession(storage, { ...base, remember: true, now: 1000 });
  const second = createSession(storage, { ...base, remember: false, now: 2000 });
  assert.match(first.token, /^[0-9a-f]{64}$/);
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.id, second.id);
  assert.deepEqual(storage.get('session'), { userId: 'u1', sid: second.id, token: second.token });
  assert.equal(readSessions(storage).length, 2);
  assert.equal(lifetime(first), 7 * DAY);
  assert.equal(lifetime(second), AUTH_CONFIG.shortAbsoluteMs);
});

test('a session ends at its absolute time and after the idle time, and ended ones are dropped', () => {
  const storage = memory();
  const session = createSession(storage, { ...base, remember: true, now: 0 });
  assert.equal(resolveSession(storage, 'u1', { now: 1000, crypto, device: 'x' }).id, session.id);
  assert.equal(expired(session, AUTH_CONFIG.idleMs + 1), true);
  assert.equal(expired({ ...session, lastSeen: 7 * DAY }, 7 * DAY + 1), true);
  // Used every 20 minutes the session stays alive, until its 7 days are over.
  let at = 0;
  while (at < 7 * DAY) {
    at += 20 * 60 * 1000;
    if (at > 7 * DAY) break;
    assert.notEqual(resolveSession(storage, 'u1', { now: at, crypto, device: 'x' }), null, `at ${at}`);
  }
  assert.equal(resolveSession(storage, 'u1', { now: 7 * DAY + 60 * 60 * 1000, crypto, device: 'x' }), null);
  assert.equal(storage.get('session'), null);
  assert.deepEqual(readSessions(storage), []);
});

test('the idle time ends a session and the last-seen mark is moved at most once a minute', () => {
  const storage = memory();
  const session = createSession(storage, { ...base, remember: true, now: 0 });
  resolveSession(storage, 'u1', { now: 30_000, crypto, device: 'x' });
  assert.equal(readSessions(storage)[0].lastSeen, 0);
  resolveSession(storage, 'u1', { now: 60_000, crypto, device: 'x' });
  assert.equal(readSessions(storage)[0].lastSeen, 60_000);
  assert.equal(resolveSession(storage, 'u1', { now: 60_000 + AUTH_CONFIG.idleMs + 1, crypto, device: 'x' }), null);
  assert.equal(
    readSessions(storage).some((item) => item.id === session.id),
    false,
  );
});

test('a revoked, forged or foreign session is not accepted', () => {
  const storage = memory();
  const session = createSession(storage, { ...base, remember: true, now: 0 });
  storage.set('session', { userId: 'u1', sid: session.id, token: 'f'.repeat(64) });
  assert.equal(resolveSession(storage, 'u1', { now: 1, crypto, device: 'x' }), null);
  storage.set('session', { userId: 'u1', sid: session.id });
  assert.equal(resolveSession(storage, 'u1', { now: 1, crypto, device: 'x' }), null);
  storage.set('session', { userId: 'u1', sid: session.id, token: session.token });
  assert.equal(resolveSession(storage, 'u2', { now: 1, crypto, device: 'x' }), null);
  assert.equal(resolveSession(storage, 'u1', { now: 1, crypto, device: 'x' }).id, session.id);
  assert.equal(revokeSession(storage, session.id), true);
  assert.equal(revokeSession(storage, session.id), false);
  assert.equal(storage.get('session'), null);
  assert.equal(storage.get('session'), null);
});

test('an old session of the form { userId } is upgraded when it is read, or kept as it is without random numbers', () => {
  const storage = memory();
  storage.set('session', { userId: 'u1' });
  const upgraded = resolveSession(storage, 'u1', { now: 5, crypto, device: 'Chrome · Windows' });
  assert.equal(upgraded.remember, true);
  assert.equal(upgraded.created, 5);
  assert.equal(storage.get('session').sid, upgraded.id);
  assert.equal(readSessions(storage).length, 1);

  const plain = memory();
  plain.set('session', { userId: 'u1' });
  assert.deepEqual(resolveSession(plain, 'u1', { now: 5, crypto: {}, device: 'x' }), { legacy: true, userId: 'u1' });
  assert.deepEqual(plain.get('session'), { userId: 'u1' });

  const full = { ...memory(), set: () => false };
  full.get = () => ({ userId: 'u1' });
  assert.deepEqual(resolveSession(full, 'u1', { now: 5, crypto, device: 'x' }), { legacy: true, userId: 'u1' });
});

test('sessions are listed without tokens, newest use first, and can be revoked all but one', () => {
  const storage = memory();
  const first = createSession(storage, { ...base, remember: true, now: 100 });
  const second = createSession(storage, { ...base, device: 'Firefox · Linux', remember: false, now: 200 });
  createSession(storage, { ...base, userId: 'u2', remember: true, now: 300 });
  storage.set('session', { userId: 'u1', sid: first.id, token: first.token });
  const list = listSessions(storage, 'u1', first.id, 400);
  assert.deepEqual(
    list.map((item) => [item.id, item.current]),
    [
      [second.id, false],
      [first.id, true],
    ],
  );
  assert.equal(JSON.stringify(list).includes(first.token), false);
  assert.equal(listSessions(storage, 'u1', first.id, 100 + 8 * DAY).length, 0);
  assert.equal(revokeSessions(storage, 'u1', first.id), 1);
  assert.equal(storage.get('session').sid, first.id);
  assert.equal(readSessions(storage).length, 2);
  assert.equal(revokeSessions(storage, 'u1'), 1);
  assert.equal(storage.get('session'), null);
  assert.equal(revokeSessions(storage, 'u1'), 0);
  storage.set('sessions', [{ id: 1 }, null, 'x']);
  assert.deepEqual(readSessions(storage), []);
  storage.set('sessions', 'x');
  assert.deepEqual(readSessions(storage), []);
});
