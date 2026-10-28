import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAccountStore, currentUser } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const memory = () => createStorage(createMemoryBackend());
const person = { name: ' Ксения ', email: ' Ksenia@Example.com ', password: 'correct horse' };
const spy = () => {
  const backend = createMemoryBackend();
  const data = new Map();
  return {
    getItem: (key) => backend.getItem(key),
    setItem: (key, value) => {
      data.set(key, value);
      backend.setItem(key, value);
    },
    removeItem: (key) => backend.removeItem(key),
    dump: () => Object.fromEntries(data),
  };
};

test('registration stores a salted hash, never the password, and signs the user in', async () => {
  const backend = spy();
  const store = createAccountStore({ storage: createStorage(backend), now: () => 5 });
  const result = await store.register(person);
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.user).sort(), ['email', 'id', 'name']);
  assert.equal(result.user.name, 'Ксения');
  assert.equal(result.user.email, 'ksenia@example.com');
  assert.deepEqual(store.current(), result.user);
  assert.equal(JSON.stringify(backend.dump()).includes(person.password), false);
  const [account] = JSON.parse(backend.dump()['dslkit.accounts']);
  assert.match(account.hash, /^[0-9a-f]{64}$/);
  assert.match(account.salt, /^[0-9a-f]{32}$/);
  assert.equal(account.iterations, 100000);
  assert.equal(account.created, 5);
});

test('two accounts with the same password get different salts and hashes', async () => {
  const storage = memory();
  const store = createAccountStore({ storage });
  await store.register(person);
  await store.register({ ...person, email: 'other@example.com' });
  const [first, second] = storage.get('accounts');
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
});

test('an address that is already registered is refused, whatever its case', async () => {
  const store = createAccountStore({ storage: memory() });
  await store.register(person);
  assert.deepEqual(await store.register({ ...person, email: 'KSENIA@example.com' }), { ok: false, error: 'exists' });
});

test('sign-in works with the right password and fails the same way for a wrong password and an unknown address', async () => {
  const store = createAccountStore({ storage: memory() });
  await store.register(person);
  store.logout();
  assert.equal(store.current(), null);
  assert.deepEqual(await store.login({ email: 'ksenia@example.com', password: 'wrong password' }), { ok: false, error: 'invalid' });
  assert.deepEqual(await store.login({ email: 'nobody@example.com', password: 'correct horse' }), { ok: false, error: 'invalid' });
  assert.equal(store.current(), null);
  const result = await store.login({ email: ' KSENIA@example.com ', password: 'correct horse' });
  assert.equal(result.ok, true);
  assert.equal(store.current().name, 'Ксения');
});

test('without the Web Crypto API nothing is stored', async () => {
  const storage = memory();
  for (const crypto of [null, {}, { subtle: {} }, { subtle: { deriveBits: () => {} } }]) {
    const store = createAccountStore({ storage, crypto });
    assert.deepEqual(await store.register(person), { ok: false, error: 'unsupported' });
    assert.deepEqual(await store.login(person), { ok: false, error: 'unsupported' });
  }
  assert.equal(storage.get('accounts'), null);
});

test('a full or blocked storage is reported', async () => {
  const backend = createMemoryBackend();
  let blocked = false;
  const storage = createStorage({
    getItem: (key) => backend.getItem(key),
    removeItem: (key) => backend.removeItem(key),
    setItem: (key, value) => {
      if (blocked && key.endsWith('session')) throw new Error('full');
      backend.setItem(key, value);
    },
  });
  const store = createAccountStore({ storage });
  blocked = true;
  assert.deepEqual(await store.register(person), { ok: false, error: 'storage' });
  blocked = false;
  await store.register({ ...person, email: 'second@example.com' });
  store.logout();
  blocked = true;
  assert.deepEqual(await store.login({ ...person, email: 'second@example.com' }), { ok: false, error: 'storage' });
});

test('an address registered in another tab while the hash was computed is refused', async () => {
  const storage = memory();
  const subtle = {
    importKey: (...args) => globalThis.crypto.subtle.importKey(...args),
    deriveBits: async (...args) => {
      storage.set('accounts', [{ id: 'u1', name: 'Other', email: 'ksenia@example.com', salt: '00', hash: '00', iterations: 1 }]);
      return globalThis.crypto.subtle.deriveBits(...args);
    },
  };
  const crypto = { subtle, getRandomValues: (array) => globalThis.crypto.getRandomValues(array) };
  assert.deepEqual(await createAccountStore({ storage, crypto }).register(person), { ok: false, error: 'exists' });
});

test('damaged data gives a guest and ignores broken accounts', () => {
  const storage = memory();
  const good = { id: 'u1', name: 'A', email: 'a@b.co', salt: '0a0b', hash: 'ff00', iterations: 1 };
  storage.set('accounts', 'text');
  storage.set('session', { userId: 'u1' });
  assert.equal(currentUser(storage), null);
  storage.set('accounts', [null, 'x', { ...good, id: 5 }, { ...good, salt: 'zz' }, { ...good, hash: undefined }, { ...good, iterations: 0 }, good]);
  assert.deepEqual(currentUser(storage), { id: 'u1', name: 'A', email: 'a@b.co' });
  storage.set('session', { userId: 'unknown' });
  assert.equal(currentUser(storage), null);
  storage.set('session', 'u1');
  assert.equal(currentUser(storage), null);
  storage.set('session', { userId: 7 });
  assert.equal(currentUser(storage), null);
  storage.remove('session');
  assert.equal(currentUser(storage), null);
});
