import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUTH_CONFIG } from '../../site/js/config/auth.js';
import { readAudit } from '../../site/js/auth/audit.js';
import { hotp, stepOf } from '../../site/js/auth/totp.js';
import { createAccountStore, currentUser } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { hashCode } from '../../tools/dev-code.js';

const memory = () => createStorage(createMemoryBackend());
const person = { name: 'Ксения', email: 'k@example.com', password: 'correct horse' };
const START = 1_700_000_000_000;
const clock = (at = START) => {
  const state = { at };
  const now = () => state.at;
  now.advance = (ms) => (state.at += ms);
  return now;
};
const setup = async (options = {}) => {
  const storage = options.storage ?? memory();
  const now = options.now ?? clock();
  const store = createAccountStore({ storage, now, userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537', ...options.store });
  if (options.register !== false) assert.equal((await store.register(person)).ok, true);
  return { storage, now, store };
};
const other = (storage, now, agent = 'Mozilla/5.0 (X11; Linux x86_64) Firefox/120') => createAccountStore({ storage, now, userAgent: agent });
const types = (storage) => readAudit(storage).map((event) => event.type);

test('registration refuses a password that the policy refuses and says why', async () => {
  const { store } = await setup({ register: false });
  assert.deepEqual(await store.register({ ...person, password: 'password' }), { ok: false, error: 'policy', issues: ['common'] });
  assert.deepEqual(await store.register({ ...person, password: 'k@example.com' }), { ok: false, error: 'policy', issues: ['personal'] });
  assert.equal(store.current(), null);
});

test('a session has a token, a device label, and a short one is chosen without "remember me"', async () => {
  const { storage, store } = await setup({ register: false });
  await store.register({ ...person, remember: false });
  const [session] = store.sessions();
  assert.equal(session.device, 'Chrome · Windows');
  assert.equal(session.remember, false);
  assert.equal(session.current, true);
  assert.match(storage.get('session').token, /^[0-9a-f]{64}$/);
  assert.deepEqual(types(storage), ['account-created', 'sign-in']);
});

test('the idle time and the absolute time end a session of the store', async () => {
  const { store, now } = await setup();
  now.advance(AUTH_CONFIG.idleMs - 1000);
  assert.notEqual(store.current(), null);
  now.advance(AUTH_CONFIG.idleMs + 1000);
  assert.equal(store.current(), null);
  await store.login({ email: person.email, password: person.password, remember: false });
  now.advance(10 * 60 * 1000);
  assert.notEqual(store.current(), null);
  for (let hour = 0; hour < 40; hour += 1) {
    now.advance(20 * 60 * 1000);
    store.current();
  }
  assert.equal(store.current(), null);
});

test('sign-in locks after five wrong passwords, the delay doubles, and a lock for an unknown address looks the same', async () => {
  const { storage, store, now } = await setup();
  store.logout();
  const wrong = { email: person.email, password: 'wrong one 1' };
  for (let index = 1; index < AUTH_CONFIG.lockAfter; index += 1) assert.deepEqual(await store.login(wrong), { ok: false, error: 'invalid' });
  assert.deepEqual(await store.login(wrong), { ok: false, error: 'locked', retryAfterMs: 30_000 });
  // The right password does not open a locked address.
  const locked = await store.login({ email: person.email, password: person.password });
  assert.equal(locked.error, 'locked');
  assert.equal(locked.retryAfterMs, 30_000);
  now.advance(10_000);
  assert.equal((await store.login({ email: person.email, password: person.password })).retryAfterMs, 20_000);
  now.advance(20_000);
  assert.deepEqual(await store.login(wrong), { ok: false, error: 'locked', retryAfterMs: 60_000 });
  now.advance(60_000);
  assert.equal((await store.login({ email: ` ${person.email.toUpperCase()} `, password: person.password })).ok, true);
  assert.equal(storage.get('lockouts')['a:k@example.com'], undefined);
  assert.ok(types(storage).includes('locked'));

  const ghost = { email: 'nobody@example.com', password: 'wrong one 1' };
  const answers = [];
  for (let index = 0; index < AUTH_CONFIG.lockAfter; index += 1) answers.push(await store.login(ghost));
  assert.deepEqual(answers.at(-1), { ok: false, error: 'locked', retryAfterMs: 30_000 });
  assert.deepEqual(
    answers.slice(0, -1).map((item) => item.error),
    ['invalid', 'invalid', 'invalid', 'invalid'],
  );
  assert.equal(
    readAudit(storage).some((event) => event.userId === undefined),
    false,
  );
});

test('sign-in with the second factor: the code is asked after the right password, a code is used once', async () => {
  const { storage, store, now } = await setup();
  const begun = store.beginTotp();
  assert.match(begun.uri, /^otpauth:\/\/totp\/DSLKit:k%40example\.com\?secret=[A-Z2-7]{32}&/);
  assert.deepEqual(await store.enableTotp({ code: '000000' }), { ok: false, error: 'invalid-code' });
  const enabled = await store.enableTotp({ code: await hotp(begun.secret, stepOf(now())) });
  assert.equal(enabled.ok, true);
  assert.equal(enabled.recoveryCodes.length, 8);
  assert.deepEqual(store.totpStatus(), { enabled: true, recoveryLeft: 8 });
  assert.equal(JSON.stringify(storage.get('accounts')).includes(enabled.recoveryCodes[0]), false);
  assert.deepEqual(await store.beginTotp(), { ok: false, error: 'enabled' });
  assert.deepEqual(await store.enableTotp({ code: '123456' }), { ok: false, error: 'no-pending' });
  store.logout();

  assert.deepEqual(await store.login({ email: person.email, password: 'wrong one 1' }), { ok: false, error: 'invalid' });
  assert.deepEqual(await store.login({ email: person.email, password: person.password }), { ok: false, error: 'code-required' });
  assert.equal(store.current(), null);
  assert.deepEqual(await store.login({ email: person.email, password: person.password, code: '000000' }), { ok: false, error: 'invalid-code' });
  // The code of the enabling step was used already: it is a replay.
  const replay = await hotp(begun.secret, stepOf(now()));
  assert.deepEqual(await store.login({ email: person.email, password: person.password, code: replay }), { ok: false, error: 'invalid-code' });
  // The next step is accepted, and the tolerance is one step.
  const next = await hotp(begun.secret, stepOf(now()) + 1);
  assert.equal((await store.login({ email: person.email, password: person.password, code: next })).ok, true);
  store.logout();
  assert.equal((await store.login({ email: person.email, password: person.password, code: next })).error, 'invalid-code');
  now.advance(60_000);
  const fresh = await hotp(begun.secret, stepOf(now()));
  assert.equal((await store.login({ email: person.email, password: person.password, code: fresh })).ok, true);
  assert.ok(types(storage).includes('totp-enabled'));
  assert.ok(types(storage).includes('second-factor-failed'));
});

test('a recovery code works once, and wrong codes lock the address', async () => {
  const now = clock(Date.now());
  const { storage, store } = await setup({ now });
  const begun = store.beginTotp();
  const { recoveryCodes } = await store.enableTotp({ code: await hotp(begun.secret, stepOf(now())) });
  store.logout();
  const credentials = { email: person.email, password: person.password };
  assert.equal((await store.login({ ...credentials, code: recoveryCodes[3].toLowerCase() })).ok, true);
  assert.deepEqual(store.totpStatus(), { enabled: true, recoveryLeft: 7 });
  store.logout();
  assert.equal((await store.login({ ...credentials, code: recoveryCodes[3] })).error, 'invalid-code');
  // Without a list of recovery codes in the record only the app code works.
  const accounts = storage.get('accounts');
  delete accounts[0].totp.recovery;
  storage.set('accounts', accounts);
  assert.equal((await store.login({ ...credentials, code: recoveryCodes[4] })).error, 'invalid-code');
  assert.ok(types(storage).includes('totp-recovery-used'));
  let last;
  for (let index = 0; index < AUTH_CONFIG.lockAfter; index += 1) last = await store.login({ ...credentials, code: '111111' });
  assert.equal(last.error, 'locked');
});

test('two-factor can be turned off with the password; it is refused without it or when it is off', async () => {
  const { storage, store, now } = await setup();
  assert.deepEqual(await store.disableTotp({ password: person.password }), { ok: false, error: 'not-enabled' });
  assert.deepEqual(store.totpStatus(), { enabled: false, recoveryLeft: 0 });
  const begun = store.beginTotp();
  assert.deepEqual(store.totpStatus(), { enabled: false, recoveryLeft: 0 });
  await store.enableTotp({ code: await hotp(begun.secret, stepOf(now())) });
  assert.deepEqual(await store.disableTotp({ password: 'wrong one 1' }), { ok: false, error: 'invalid' });
  assert.deepEqual(await store.disableTotp({ password: person.password }), { ok: true });
  assert.deepEqual(store.totpStatus(), { enabled: false, recoveryLeft: 0 });
  assert.equal(storage.get('accounts')[0].totp, undefined);
  assert.ok(types(storage).includes('totp-disabled'));
  assert.ok(types(storage).includes('password-change-failed'));
});

test('a password change needs the old password, follows the policy and ends the other sessions', async () => {
  const { storage, store, now } = await setup();
  const second = other(storage, now);
  await second.login({ email: person.email, password: person.password });
  // The second browser took the pointer: sign in again here to have two sessions of one account.
  await store.login({ email: person.email, password: person.password });
  assert.equal(store.sessions().length, 3);
  assert.deepEqual(await store.changePassword({ oldPassword: 'wrong one 1', newPassword: 'another horse 7' }), { ok: false, error: 'invalid' });
  assert.deepEqual(await store.changePassword({ oldPassword: person.password, newPassword: 'password' }), { ok: false, error: 'policy', issues: ['common'] });
  assert.deepEqual(await store.changePassword({ oldPassword: person.password, newPassword: person.password }), {
    ok: false,
    error: 'policy',
    issues: ['reuse'],
  });
  const done = await store.changePassword({ oldPassword: person.password, newPassword: 'another horse 7' });
  assert.deepEqual(done, { ok: true, ended: 2 });
  assert.equal(store.sessions().length, 1);
  assert.notEqual(store.current(), null);
  store.logout();
  assert.equal((await store.login({ email: person.email, password: person.password })).ok, false);
  assert.equal((await store.login({ email: person.email, password: 'another horse 7' })).ok, true);
  assert.ok(types(storage).includes('password-change'));
  store.logout();
  assert.deepEqual(await store.changePassword({ oldPassword: 'a', newPassword: 'b' }), { ok: false, error: 'signed-out' });
});

test('wrong old passwords lock the address, and the lock is reported by the actions that need the password', async () => {
  const { store } = await setup();
  let result;
  for (let index = 0; index < AUTH_CONFIG.lockAfter; index += 1)
    result = await store.changePassword({ oldPassword: 'wrong one 1', newPassword: 'another horse 7' });
  assert.equal(result.error, 'locked');
  assert.equal((await store.deleteAccount({ password: person.password })).error, 'locked');
});

test('an account is deleted after the password is typed, with its sessions and its events', async () => {
  const { storage, store } = await setup();
  assert.deepEqual(await store.deleteAccount({ password: 'wrong one 1' }), { ok: false, error: 'invalid' });
  assert.deepEqual(await store.deleteAccount({ password: person.password }), { ok: true });
  assert.deepEqual(storage.get('accounts'), []);
  assert.deepEqual(storage.get('sessions'), []);
  assert.equal(storage.get('session'), null);
  assert.deepEqual(readAudit(storage), []);
  assert.equal(store.current(), null);
  assert.deepEqual(await store.deleteAccount({ password: person.password }), { ok: false, error: 'signed-out' });
});

test('sessions can be revoked one by one or all but this one, and a revoked browser is signed out', async () => {
  const { storage, store, now } = await setup();
  const second = other(storage, now);
  now.advance(5000);
  await second.login({ email: person.email, password: person.password });
  const mine = second.sessions().find((item) => item.current);
  assert.equal(mine.device, 'Firefox · Linux');
  // Both records exist; the pointer is the one of the last sign-in.
  assert.equal(second.sessions().length, 2);
  assert.deepEqual(second.revoke('nope'), { ok: false, error: 'unknown' });
  const firstId = second.sessions().find((item) => !item.current).id;
  assert.deepEqual(second.revoke(firstId), { ok: true, itself: false });
  assert.equal(second.sessions().length, 1);
  assert.deepEqual(second.revokeOthers(), { ok: true, ended: 0 });
  await store.login({ email: person.email, password: person.password });
  assert.deepEqual(store.revokeOthers(), { ok: true, ended: 1 });
  const own = store.sessions()[0].id;
  assert.deepEqual(store.revoke(own), { ok: true, itself: true });
  assert.equal(store.current(), null);
  assert.deepEqual(store.sessions(), []);
  assert.deepEqual(store.revoke(own), { ok: false, error: 'signed-out' });
  assert.deepEqual(store.revokeOthers(), { ok: false, error: 'signed-out' });
  assert.ok(types(storage).includes('session-revoked'));
});

test('an old session { userId } is upgraded by the store and by currentUser', async () => {
  const { storage, store } = await setup();
  const id = storage.get('accounts')[0].id;
  store.logout();
  storage.set('session', { userId: id });
  const user = currentUser(storage, { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14) Safari/605' });
  assert.equal(user.email, person.email);
  assert.equal(typeof storage.get('session').sid, 'string');
  assert.equal(readAudit(storage).length >= 0, true);
  assert.equal(currentUser(storage).id, id);
  storage.set('session', { userId: 'nobody' });
  assert.equal(currentUser(storage), null);
  storage.remove('session');
  assert.equal(currentUser(storage), null);
});

test('admin: the list of accounts and the change of roles go through the permission table', async () => {
  const codes = { developerHash: hashCode('dev-code'), adminHash: hashCode('admin-code') };
  const { storage, store, now } = await setup({ store: codes });
  const member = other(storage, now);
  await member.register({ name: 'Иван', email: 'ivan@example.com', password: 'another horse 7' });
  assert.deepEqual(member.listAccounts(), { ok: false, error: 'forbidden' });
  assert.deepEqual(member.setRole({ id: 'x', role: 'admin' }), { ok: false, error: 'forbidden' });
  assert.deepEqual(member.audit(), member.audit({ all: true }));
  await store.login({ email: person.email, password: person.password });
  await store.becomeDeveloper('admin-code');
  const listed = store.listAccounts();
  assert.equal(listed.ok, true);
  assert.deepEqual(
    listed.accounts.map((item) => [item.email, item.role, item.totp]),
    [
      ['k@example.com', 'admin', false],
      ['ivan@example.com', 'user', false],
    ],
  );
  const ivan = listed.accounts[1].id;
  assert.deepEqual(store.setRole({ id: 'nobody', role: 'admin' }), { ok: false, error: 'unknown' });
  assert.deepEqual(store.setRole({ id: ivan, role: 'root' }), { ok: false, error: 'invalid' });
  assert.deepEqual(store.setRole({ id: ivan, role: 'user' }), { ok: true, changed: false });
  assert.deepEqual(store.setRole({ id: ivan, role: 'developer' }), { ok: true, changed: true });
  assert.equal(store.listAccounts().accounts[1].role, 'developer');
  // The last admin cannot be demoted, not by the table and not by the code.
  const mine = listed.accounts[0].id;
  assert.deepEqual(store.setRole({ id: mine, role: 'user' }), { ok: false, error: 'last-admin' });
  assert.equal(store.leaveDeveloper(), false);
  assert.deepEqual(store.setRole({ id: ivan, role: 'admin' }), { ok: true, changed: true });
  assert.deepEqual(store.setRole({ id: mine, role: 'user' }), { ok: true, changed: true });
  assert.equal(store.current().role, 'user');
  assert.deepEqual(
    store
      .audit()
      .map((event) => event.type)
      .filter((type) => type === 'role-change'),
    ['role-change', 'role-change'],
  );
  // The admin sees every account's events, a member only their own.
  await store.login({ email: person.email, password: person.password });
  assert.equal(
    store.audit({ all: true }).every((event) => event.userId === mine),
    true,
  );
  await member.login({ email: 'ivan@example.com', password: 'another horse 7' });
  assert.equal(member.current().role, 'admin');
  assert.equal(
    member.audit({ all: true }).some((event) => event.userId === mine),
    true,
  );
  assert.equal(member.audit({ count: 1 }).length, 1);
  assert.deepEqual(
    readAudit(storage)
      .filter((event) => event.type === 'role-change')
      .map((event) => event.detail)
      .slice(0, 2),
    ['user>admin', 'user>developer'],
  );
});

test('leaving the developer role while already a user writes nothing and an unknown role in the data is a user', async () => {
  const { storage, store } = await setup();
  const before = readAudit(storage).length;
  assert.equal(store.leaveDeveloper(), true);
  assert.equal(readAudit(storage).length, before);
  store.logout();
  assert.equal(store.leaveDeveloper(), false);
  const accounts = storage.get('accounts');
  accounts[0].role = 'superuser';
  storage.set('accounts', accounts);
  await store.login({ email: person.email, password: person.password });
  assert.equal(store.current().role, 'user');
});

test('without the Web Crypto API the new actions answer "unsupported" and a guest gets nothing', async () => {
  const { storage, store, now } = await setup();
  const blind = createAccountStore({ storage, now, crypto: { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) } });
  assert.deepEqual(await blind.changePassword({}), { ok: false, error: 'unsupported' });
  assert.deepEqual(await blind.deleteAccount({}), { ok: false, error: 'unsupported' });
  assert.deepEqual(await blind.disableTotp({}), { ok: false, error: 'unsupported' });
  assert.deepEqual(await blind.enableTotp({}), { ok: false, error: 'unsupported' });
  assert.deepEqual(blind.beginTotp(), { ok: false, error: 'unsupported' });
  store.logout();
  assert.deepEqual(store.beginTotp(), { ok: false, error: 'signed-out' });
  assert.deepEqual(await store.enableTotp({}), { ok: false, error: 'signed-out' });
  assert.deepEqual(await store.disableTotp({}), { ok: false, error: 'signed-out' });
  assert.deepEqual(store.totpStatus(), { enabled: false, recoveryLeft: 0 });
  assert.deepEqual(store.audit(), []);
  assert.deepEqual(store.listAccounts(), { ok: false, error: 'forbidden' });
});

test('storage failures are reported by the new actions', async () => {
  const backend = createMemoryBackend();
  let broken = false;
  const flaky = {
    ...backend,
    setItem: (key, value) => {
      if (broken) throw new Error('full');
      backend.setItem(key, value);
    },
  };
  const { store, now } = await setup({ storage: createStorage(flaky) });
  const begun = store.beginTotp();
  const code = await hotp(begun.secret, stepOf(now()));
  broken = true;
  assert.equal((await store.enableTotp({ code })).error, 'storage');
  assert.equal(store.beginTotp().error, 'storage');
  assert.equal((await store.changePassword({ oldPassword: person.password, newPassword: 'another horse 7' })).error, 'storage');
  assert.equal((await store.deleteAccount({ password: person.password })).error, 'storage');
  assert.equal((await store.becomeDeveloper(' ')).error, 'invalid');
  broken = false;
  await store.enableTotp({ code });
  broken = true;
  assert.equal((await store.disableTotp({ password: person.password })).error, 'storage');
  assert.equal(store.setRole({ id: 'x', role: 'admin' }).error, 'forbidden');
  const full = createAccountStore({ storage: createStorage(flaky), now, developerHash: hashCode('d') });
  assert.equal((await full.register({ name: 'Иван', email: 'ivan@example.com', password: 'another horse 7' })).error, 'storage');
  assert.equal((await full.login({ email: person.email, password: person.password, code: '' })).error, 'code-required');
});
