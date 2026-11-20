import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { downloadText, initAccountTransfer } from '../../site/js/components/account-transfer.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const memory = () => createStorage(createMemoryBackend());
const person = { name: 'Ксения', email: 'k@example.com', password: 'correct horse' };
const page = (name) => readFileSync(`site/${name}`, 'utf8');

const owner = async () => {
  const storage = memory();
  const store = createAccountStore({ storage, now: () => 7 });
  await store.register(person);
  const { record } = store.exportAccount();
  return { storage, store, record };
};

test('the export holds no plain secret, no role and no second factor', async () => {
  const { store, record } = await owner();
  store.beginTotp();
  const again = store.exportAccount().record;
  assert.equal(record.format, 'dslkit-account');
  assert.deepEqual(Object.keys(record.account).sort(), ['created', 'email', 'hash', 'id', 'iterations', 'name', 'salt']);
  assert.equal(JSON.stringify(again).includes(person.password), false);
  assert.equal(JSON.stringify(again).includes('secret'), false);
  assert.equal(JSON.stringify(again).includes('roleKey'), false);
  assert.deepEqual(createAccountStore({ storage: memory() }).exportAccount(), { ok: false, error: 'signed-out' });
});

test('an exported account is imported into a clean browser and the old password works there', async () => {
  const { record } = await owner();
  const storage = memory();
  const store = createAccountStore({ storage, now: () => 9 });
  assert.deepEqual(store.importAccount(record), { ok: true, email: 'k@example.com' });
  assert.equal(store.current(), null);
  const signed = await store.login({ email: person.email, password: person.password });
  assert.equal(signed.ok, true);
  assert.equal(signed.user.role, 'user');
});

test('an import never overwrites an account: the same address or the same id is refused', async () => {
  const { store, record } = await owner();
  assert.deepEqual(store.importAccount(record), { ok: false, error: 'exists' });
  assert.deepEqual(store.importAccount({ ...record, account: { ...record.account, id: 'u0000000000000000' } }), { ok: false, error: 'exists' });
  assert.deepEqual(store.importAccount({ ...record, account: { ...record.account, email: 'new@example.com' } }), { ok: false, error: 'exists' });
  assert.equal(store.importAccount({ ...record, account: { ...record.account, id: 'u0000000000000000', email: 'new@example.com' } }).ok, true);
});

test('a damaged or foreign record is refused with the same answer', async () => {
  const { record } = await owner();
  const store = createAccountStore({ storage: memory() });
  const mutate = (patch) => ({ ...record, ...patch });
  const inner = (patch) => mutate({ account: { ...record.account, ...patch } });
  const bad = [
    null,
    'text',
    {},
    mutate({ format: 'other' }),
    mutate({ version: 2 }),
    mutate({ account: null }),
    inner({ salt: 'zz' }),
    inner({ id: 'x1' }),
    inner({ iterations: 5_000_000 }),
    inner({ name: 'x'.repeat(121) }),
    inner({ email: 'K@Example.com' }),
    inner({ email: 'no-at-sign' }),
    inner({ created: 'yesterday' }),
  ];
  bad.forEach((item) => assert.deepEqual(store.importAccount(item), { ok: false, error: 'invalid-file' }));
  assert.equal(store.importAccount(inner({ created: null })).ok, true);
});

test('an old account without a creation time is exported with a null time', async () => {
  const { storage, store } = await owner();
  storage.set(
    'accounts',
    storage.get('accounts').map(({ created, ...rest }) => rest),
  );
  assert.equal(store.exportAccount().record.account.created, null);
});

test('an import reports a storage that refuses the write', async () => {
  const { record } = await owner();
  const backend = createMemoryBackend();
  backend.setItem = () => {
    throw new Error('full');
  };
  const store = createAccountStore({ storage: createStorage(backend) });
  assert.deepEqual(store.importAccount(record), { ok: false, error: 'storage' });
});

const pick = (input, file) => {
  Object.defineProperty(input, 'files', { value: file ? [file] : [], configurable: true });
  input.dispatchEvent(new input.ownerDocument.defaultView.Event('change'));
  return new Promise((resolve) => setTimeout(resolve, 5));
};
const fileOf = (text) => ({ size: text.length, text: async () => text });

test('the settings button saves the file of a signed-in user and says so in the language of the page', async () => {
  const { storage } = await owner();
  const { window } = new JSDOM(page('en/app/settings.html'), { url: 'http://localhost/' });
  const save = mock.fn();
  initAccountTransfer({ root: window.document, storage, save, now: () => 7 });
  window.document.querySelector('[data-account-export]').click();
  assert.equal(save.mock.callCount(), 1);
  const [name, text] = save.mock.calls[0].arguments;
  assert.match(name, /^dslkit-account-u[0-9a-f]{16}\.json$/);
  assert.equal(JSON.parse(text).format, 'dslkit-account');
  const line = window.document.querySelector('[data-transfer-status="export"]');
  assert.match(line.textContent, /holds no password/);
  assert.equal(line.dataset.kind, 'success');
});

test('the settings button of a guest asks to sign in and saves nothing', () => {
  const { window } = new JSDOM(page('app/settings.html'), { url: 'http://localhost/' });
  const save = mock.fn();
  initAccountTransfer({ root: window.document, storage: memory(), save });
  window.document.querySelector('[data-account-export]').click();
  assert.equal(save.mock.callCount(), 0);
  assert.equal(window.document.querySelector('[data-transfer-status="export"]').textContent, 'Войдите в аккаунт.');
});

test('the sign-in page imports a file and explains every refusal', async () => {
  const { record } = await owner();
  const { window } = new JSDOM(page('app/login.html'), { url: 'http://localhost/' });
  initAccountTransfer({ root: window.document, storage: memory() });
  const input = window.document.querySelector('[data-account-import]');
  const line = window.document.querySelector('[data-transfer-status="import"]');
  await pick(input, null);
  assert.equal(line.textContent, '');
  await pick(input, fileOf('{not json'));
  assert.match(line.textContent, /не удалось прочитать/);
  await pick(input, { size: 999999, text: async () => '{}' });
  assert.match(line.textContent, /не удалось прочитать/);
  await pick(input, fileOf('{}'));
  assert.match(line.textContent, /повреждён/);
  await pick(input, fileOf(JSON.stringify(record)));
  assert.match(line.textContent, /k@example.com добавлен/);
  assert.equal(line.dataset.kind, 'success');
  await pick(input, fileOf(JSON.stringify(record)));
  assert.match(line.textContent, /ничего не заменяет/);
  assert.equal(line.dataset.kind, 'error');
});

test('the sign-in pages say honestly that accounts live only in this browser', () => {
  assert.match(page('app/login.html'), /Забыли пароль\?[\s\S]*только в этом браузере[\s\S]*нельзя/);
  assert.match(page('en/app/login.html'), /Forgot your password\?[\s\S]*only in this browser[\s\S]*cannot/);
});

test('a page without the markup starts nothing', () => {
  const { window } = new JSDOM('<p>none</p>');
  assert.equal(initAccountTransfer({ root: window.document, storage: memory() }), null);
});

test('the default save downloads a text through a temporary link', () => {
  const { window } = new JSDOM('<body></body>', { url: 'http://localhost/' });
  const clicked = [];
  window.URL.createObjectURL = () => 'blob:x';
  window.URL.revokeObjectURL = mock.fn();
  window.HTMLAnchorElement.prototype.click = function click() {
    clicked.push(this.download);
  };
  downloadText(window.document, 'a.json', '{}');
  assert.deepEqual(clicked, ['a.json']);
  assert.equal(window.document.querySelector('a'), null);
  assert.equal(window.URL.revokeObjectURL.mock.callCount(), 1);
});

test('the default save is used when no save is given', async () => {
  const { storage } = await owner();
  const { window } = new JSDOM(page('en/app/settings.html'), { url: 'http://localhost/' });
  window.URL.createObjectURL = () => 'blob:x';
  window.URL.revokeObjectURL = () => {};
  const clicked = [];
  window.HTMLAnchorElement.prototype.click = function click() {
    clicked.push(this.download);
  };
  initAccountTransfer({ root: window.document, storage, now: () => 7 });
  window.document.querySelector('[data-account-export]').click();
  assert.equal(clicked.length, 1);
});

test('a page with only the import field or only the button still works', () => {
  const only = new JSDOM('<input type="file" data-account-import><p data-transfer-status="import"></p>');
  assert.notEqual(initAccountTransfer({ root: only.window.document, storage: memory() }), null);
  const button = new JSDOM('<button data-account-export></button><p data-transfer-status="export"></p>');
  assert.notEqual(initAccountTransfer({ root: button.window.document, storage: memory() }), null);
});
