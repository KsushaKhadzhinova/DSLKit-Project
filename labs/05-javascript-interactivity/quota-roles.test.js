import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initDocs } from '../../site/js/components/docs.js';
import { initEditorProjects } from '../../site/js/components/editor-projects.js';
import { initQuota } from '../../site/js/components/quota.js';
import { showCode } from '../../site/js/components/code-lines.js';
import { createAccountStore, isUnlimited } from '../../site/js/storage/accounts.js';
import { createProjectStore, quotaLabel } from '../../site/js/storage/projects.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { hashCode } from '../../tools/dev-code.js';

const memory = () => createStorage(createMemoryBackend());
const at = 1_700_000_000_000;

test('a developer and an admin have no daily limit, a user and a guest have one', () => {
  assert.equal(isUnlimited({ role: 'developer' }), true);
  assert.equal(isUnlimited({ role: 'admin' }), true);
  assert.equal(isUnlimited({ role: 'user' }), false);
  assert.equal(isUnlimited(null), false);
  assert.equal(quotaLabel(7, 'ru', true), 'Бета: сегодня создано 7, без дневного лимита');
  assert.equal(quotaLabel(7, 'en', true), 'Beta: 7 created today, no daily limit');
});

test('the admin code gives the role admin, the developer code gives developer, another code gives nothing', async () => {
  const storage = memory();
  const store = createAccountStore({ storage, developerHash: hashCode('dev-code-1'), adminHash: hashCode('admin-code-1') });
  await store.register({ name: 'Boss', email: 'boss@example.com', password: 'correct horse' });
  assert.deepEqual(await store.becomeDeveloper('nothing'), { ok: false, error: 'invalid' });
  assert.equal((await store.becomeDeveloper('admin-code-1')).user.role, 'admin');
  assert.equal(isUnlimited(store.current()), true);
  assert.equal((await store.becomeDeveloper('dev-code-1')).user.role, 'developer');
  assert.equal(store.leaveDeveloper(), true);
  assert.equal(store.current().role, 'user');
});

const quotaPage = (storage) => {
  const window = new JSDOM(readFileSync('site/app/welcome.html', 'utf8'), { url: 'http://localhost/' }).window;
  initQuota({ root: window.document, storage, now: () => at });
  return window.document.querySelector('.app-nav__quota-text').textContent;
};

test('the quota block says "no daily limit" for an admin and counts for a user', async () => {
  const storage = memory();
  const store = createAccountStore({ storage, adminHash: hashCode('admin-code-2') });
  await store.register({ name: 'Boss', email: 'boss2@example.com', password: 'correct horse' });
  assert.match(quotaPage(storage), /создано 0 из 5/);
  await store.becomeDeveloper('admin-code-2');
  assert.match(quotaPage(storage), /без дневного лимита/);
});

const editor = (storage) => {
  const window = new JSDOM(readFileSync('site/app/editor.html', 'utf8'), { url: 'http://localhost/app/editor.html' }).window;
  const api = initEditorProjects({ root: window.document, storage, now: () => at, seed: false, setTimer: () => 0, clearTimer: () => {}, navigate: () => {} });
  return { window, api, note: () => window.document.querySelector('.editor-status__saved').textContent };
};

test('the editor does not save a sixth new project of the day and says why', () => {
  const storage = memory();
  const store = createProjectStore({ storage, now: () => at, unlimited: true });
  for (let index = 0; index < 5; index += 1) store.save({ title: `n${index}`, notation: 'idef0', source: 's' });
  const t = editor(storage);
  showCode(t.window.document, t.window.document.querySelector('.code__lines'), 'diagram idef0 "Sixth"');
  assert.equal(t.api.save(), null);
  assert.match(t.note(), /Лимит беты/);
  assert.equal(store.list().length, 5);
});

test('the documentation says that the admin role exists without the right to edit', async () => {
  const storage = memory();
  const store = createAccountStore({ storage, adminHash: hashCode('admin-code-3') });
  await store.register({ name: 'Boss', email: 'boss3@example.com', password: 'correct horse' });
  await store.becomeDeveloper('admin-code-3');
  const window = new JSDOM(readFileSync('site/app/docs.html', 'utf8'), { url: 'http://localhost/app/docs.html' }).window;
  initDocs({ root: window.document, storage, developerHash: hashCode('nope') });
  assert.equal(window.document.querySelector('[data-docs-edit]').hidden, true);
});
