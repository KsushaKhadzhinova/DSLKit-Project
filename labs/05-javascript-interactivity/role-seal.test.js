import assert from 'node:assert/strict';
import { createHash, createHmac, pbkdf2Sync, randomBytes, webcrypto } from 'node:crypto';
import { test } from 'node:test';
import { checkRoleCode } from '../../site/js/auth/role-code.js';
import { hmacSha256, sealedRole, sha256, trustedRole } from '../../site/js/auth/role-seal.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { hashCode } from '../../tools/dev-code.js';

const hex = (bytes) => Buffer.from(bytes).toString('hex');

test('the small SHA-256 and HMAC agree with node:crypto for many lengths', () => {
  for (const length of [0, 1, 55, 56, 63, 64, 65, 119, 120, 200]) {
    const data = randomBytes(length);
    assert.equal(hex(sha256(data)), createHash('sha256').update(data).digest('hex'));
    for (const keyLength of [3, 64, 100]) {
      const key = randomBytes(keyLength);
      assert.equal(hex(hmacSha256(key, data)), createHmac('sha256', key).update(data).digest('hex'));
    }
  }
});

test('a sealed role is trusted, an edited or unsealed role is not', () => {
  const account = { id: 'u1' };
  const sealed = { ...account, ...sealedRole(account, 'admin', () => 'k1') };
  assert.equal(trustedRole(sealed), 'admin');
  assert.equal(sealedRole(sealed, 'developer', () => 'other').roleKey, 'k1');
  assert.equal(trustedRole({ ...sealed, role: 'developer' }), 'user');
  assert.equal(trustedRole({ ...sealed, id: 'u2' }), 'user');
  assert.equal(trustedRole({ ...sealed, roleSig: 'x' }), 'user');
  assert.equal(trustedRole({ id: 'u1', role: 'admin' }), 'user');
  assert.equal(trustedRole({ id: 'u1', role: 'admin', roleKey: 'k', roleSig: 5 }), 'user');
  assert.equal(trustedRole({ id: 'u1', role: 'root', roleKey: 'k', roleSig: 'x' }), 'user');
  assert.equal(trustedRole(undefined), 'user');
  assert.equal(trustedRole({ id: 'u1', role: 'user' }), 'user');
});

test('RT-01: a role written into the stored account by hand gives no rights', async () => {
  const storage = createStorage(createMemoryBackend());
  const store = createAccountStore({ storage, adminHash: hashCode('admin-code') });
  await store.register({ name: 'Eve', email: 'eve@example.com', password: 'correct horse 9' });
  const [mine] = storage.get('accounts');
  storage.set('accounts', [{ ...mine, role: 'admin' }]);
  assert.equal(store.current().role, 'user');
  assert.deepEqual(store.listAccounts(), { ok: false, error: 'forbidden' });
  storage.set('accounts', [{ ...mine, role: 'admin', roleKey: 'aa', roleSig: 'bb' }]);
  assert.equal(store.current().role, 'user');
  storage.set('accounts', [mine]);
  assert.equal((await store.becomeDeveloper('admin-code')).user.role, 'admin');
  assert.equal(createAccountStore({ storage }).current().role, 'admin');
});

test('RT-02: role code records are salted PBKDF2; bad records and wrong codes are refused', async () => {
  const bad = ['', 'x', 'p2$1$aa$bb', 'p1$0$aa$bb', 'p1$100$zz$bb', 'p1$100$aa$zz', 'p1$100$aa'];
  for (const record of bad) assert.equal(await checkRoleCode(webcrypto, 'code', record), false);
  assert.equal(await checkRoleCode(webcrypto, 'x'), false);
  const record = hashCode('plain-code');
  assert.equal(await checkRoleCode(webcrypto, 'plain-code', record), true);
  assert.equal(await checkRoleCode(webcrypto, 'plain-code ', record), false);
  assert.notEqual(hashCode('plain-code'), hashCode('plain-code'));
  const legacy = createHash('sha256').update('wrapped-code').digest('hex');
  const salt = Buffer.alloc(16, 7);
  const wrapped = `p1s$1000$${salt.toString('hex')}$${pbkdf2Sync(legacy, salt, 1000, 32, 'sha256').toString('hex')}`;
  assert.equal(await checkRoleCode(webcrypto, 'wrapped-code', wrapped), true);
  assert.equal(await checkRoleCode(webcrypto, 'wrong', wrapped), false);
});
