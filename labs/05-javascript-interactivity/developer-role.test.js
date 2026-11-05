import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { DEVELOPER_CODE_SHA256 } from '../../site/js/config/roles.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { hashCode, writeRolesConfig } from '../../tools/dev-code.js';

const person = { name: 'Dev', email: 'dev@example.com', password: 'correct horse' };

test('the code of the developer role is stored only as a hash', () => {
  assert.match(DEVELOPER_CODE_SHA256, /^[0-9a-f]{64}$/);
  assert.equal(hashCode('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
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

test('the config writer saves the hash of the new code', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'roles-')), 'roles.js');
  writeRolesConfig(file, 'my-secret-code');
  assert.equal(readFileSync(file, 'utf8').match(/'([0-9a-f]{64})'/)[1], hashCode('my-secret-code'));
});
