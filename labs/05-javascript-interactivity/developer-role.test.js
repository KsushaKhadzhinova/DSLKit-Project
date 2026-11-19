import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { webcrypto } from 'node:crypto';
import { test } from 'node:test';
import { checkRoleCode } from '../../site/js/auth/role-code.js';
import { ADMIN_CODE_VERIFIER, DEVELOPER_CODE_VERIFIER } from '../../site/js/config/roles.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { hashCode, writeRolesConfig } from '../../tools/dev-code.js';

const person = { name: 'Dev', email: 'dev@example.com', password: 'correct horse' };

test('the code of the developer role is stored only as a hash', () => {
  assert.match(DEVELOPER_CODE_VERIFIER, /^p1s[$]100000[$][0-9a-f]{32}[$][0-9a-f]{64}$/);
  assert.match(ADMIN_CODE_VERIFIER, /^p1s[$]100000[$][0-9a-f]{32}[$][0-9a-f]{64}$/);
  assert.match(hashCode('abc'), /^p1[$]100000[$][0-9a-f]{32}[$][0-9a-f]{64}$/);
});

test('a user becomes a developer with the right code only, and can leave the role', async () => {
  const storage = createStorage(createMemoryBackend());
  const store = createAccountStore({ storage });
  assert.deepEqual(await store.becomeDeveloper('x'), { ok: false, error: 'signed-out' });
  assert.equal(store.leaveDeveloper(), false);
  await store.register(person);
  assert.equal(store.current().role, 'user');
  assert.deepEqual(await store.becomeDeveloper('wrong code'), { ok: false, error: 'invalid' });
  assert.equal(store.current().role, 'user');
  assert.equal(createAccountStore({ storage, crypto: {} }).current().role, 'user');
  assert.deepEqual(await createAccountStore({ storage, crypto: {} }).becomeDeveloper('x'), { ok: false, error: 'unsupported' });
});

test('with the right code the role is written, survives a new session and can be left', async () => {
  const storage = createStorage(createMemoryBackend());
  const options = { storage, developerHash: hashCode('my-secret-code') };
  const store = createAccountStore(options);
  await store.register(person);
  const result = await store.becomeDeveloper('my-secret-code');
  assert.equal(result.ok, true);
  assert.equal(result.user.role, 'developer');
  assert.equal(createAccountStore(options).current().role, 'developer');
  assert.equal(store.leaveDeveloper(), true);
  assert.equal(store.current().role, 'user');
  const broken = createAccountStore({ ...options, storage: { ...storage, get: storage.get, set: () => false } });
  assert.deepEqual(await broken.becomeDeveloper('my-secret-code'), { ok: false, error: 'storage' });
});

test('the config writer saves the salted record of the new code', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'roles-')), 'roles.js');
  writeRolesConfig(file, 'my-secret-code', 'my-admin-code');
  const [developer, admin] = [...readFileSync(file, 'utf8').matchAll(/'(p1[$][^']+)'/g)].map((item) => item[1]);
  assert.equal(await checkRoleCode(webcrypto, 'my-secret-code', developer), true);
  assert.equal(await checkRoleCode(webcrypto, 'my-admin-code', admin), true);
  assert.equal(await checkRoleCode(webcrypto, 'other', developer), false);
  writeRolesConfig(file, 'my-secret-code');
  assert.equal(readFileSync(file, 'utf8').match(/p1[$]/g).length, 2);
});
