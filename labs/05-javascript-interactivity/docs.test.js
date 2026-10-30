import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initDocs } from '../../site/js/components/docs.js';
import { DOCS as EN } from '../../site/js/docs/content.en.js';
import { DOCS as RU } from '../../site/js/docs/content.ru.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createDocsStore } from '../../site/js/storage/docs.js';
import { renderMarkdown } from '../../site/js/utils/markdown.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { hashCode } from '../../tools/dev-code.js';

const doc = () => new JSDOM('<!doctype html><body></body>').window.document;
const html = (source) => {
  const document = doc();
  const box = document.createElement('div');
  box.append(renderMarkdown(document, source));
  return box;
};
// Waits until the page shows the expected status, up to five seconds, so a slow machine does not make the test fail.
const wait = async (t, text) => {
  for (let tries = 0; tries < 500 && t.$('.docs__status').textContent !== text; tries += 1) await new Promise((resolve) => setTimeout(resolve, 10));
};

test('the reader builds headings, paragraphs, lists, code, bold, code spans and safe links', () => {
  const box = html(
    [
      '## Title',
      '### Sub',
      'one',
      'two',
      '',
      '- a',
      '- b',
      '1. x',
      '2. y',
      '```',
      '<b>raw</b>',
      '```',
      'text **bold** `code` [site](../app/editor.html) [web](https://example.com) [bad](javascript:alert(1)) [rel](x.html)',
      '',
      'tail',
    ].join('\n'),
  );
  assert.equal(box.querySelector('h3').textContent, 'Title');
  assert.equal(box.querySelector('h4').textContent, 'Sub');
  assert.equal(box.querySelector('p').textContent, 'one two');
  assert.equal(box.querySelectorAll('ul li').length, 2);
  assert.equal(box.querySelectorAll('ol li').length, 2);
  assert.equal(box.querySelector('pre code').textContent, '<b>raw</b>');
  assert.equal(box.querySelectorAll('b').length, 0);
  assert.equal(box.querySelector('strong').textContent, 'bold');
  const links = [...box.querySelectorAll('a')];
  assert.deepEqual(
    links.map((link) => link.getAttribute('href')),
    ['../app/editor.html', 'https://example.com', 'x.html'],
  );
  assert.equal(links[1].rel, 'noopener noreferrer');
  assert.ok(box.textContent.includes('bad'));
  assert.equal(box.querySelector('a[href^="javascript"]'), null);
  assert.equal(html(null).childNodes.length, 0);
  assert.equal(html('```\nunclosed').querySelector('pre').textContent, 'unclosed');
  assert.equal(html('a\n- b\nc').querySelectorAll('p').length, 2);
  assert.equal(html('**').querySelector('strong'), null);
});

test('only a developer can write the documentation, and a change can be taken back', () => {
  const storage = createStorage(createMemoryBackend());
  const defaults = { ru: { project: [{ id: 'a', title: 'A', body: 'Body' }] } };
  const store = createDocsStore({ storage, defaults });
  const dev = { role: 'developer' };
  assert.deepEqual(store.sections('ru', 'project'), [{ id: 'a', title: 'A' }]);
  assert.deepEqual(store.sections('en', 'project'), []);
  assert.equal(store.get('ru', 'project', 'zzz'), null);
  assert.equal(store.get('ru', 'project', 'a').edited, false);
  assert.deepEqual(store.set({ role: 'user' }, 'ru', 'project', 'a', 'x'), { ok: false, error: 'forbidden' });
  assert.deepEqual(store.set(null, 'ru', 'project', 'a', 'x'), { ok: false, error: 'forbidden' });
  assert.deepEqual(store.set(dev, 'ru', 'project', 'zzz', 'x'), { ok: false, error: 'unknown' });
  assert.deepEqual(store.set(dev, 'ru', 'project', 'a', '  '), { ok: false, error: 'invalid' });
  assert.deepEqual(store.set(dev, 'ru', 'project', 'a', 'y'.repeat(100001)), { ok: false, error: 'invalid' });
  assert.deepEqual(store.set(dev, 'ru', 'project', 'a', 'New'), { ok: true });
  assert.deepEqual(store.get('ru', 'project', 'a'), { id: 'a', title: 'A', body: 'New', edited: true });
  assert.deepEqual(store.reset({ role: 'user' }, 'ru', 'project', 'a'), { ok: false, error: 'forbidden' });
  assert.deepEqual(store.reset(dev, 'ru', 'project', 'a'), { ok: true, was: true });
  assert.equal(store.get('ru', 'project', 'a').body, 'Body');
  assert.deepEqual(store.reset(dev, 'ru', 'project', 'a'), { ok: true, was: false });
  storage.set('docs', ['broken']);
  assert.equal(store.get('ru', 'project', 'a').edited, false);
  const failing = createDocsStore({ storage: { get: () => ({}), set: () => false }, defaults });
  assert.deepEqual(failing.set(dev, 'ru', 'project', 'a', 'x'), { ok: false, error: 'storage' });
  assert.deepEqual(failing.reset(dev, 'ru', 'project', 'a'), { ok: false, error: 'storage' });
});

const open = ({ lang = 'ru', search = '', storage = createStorage(createMemoryBackend()), developerHash } = {}) => {
  const page = lang === 'ru' ? 'site/app/docs.html' : 'site/en/app/docs.html';
  const window = new JSDOM(readFileSync(page, 'utf8'), { url: `http://localhost/app/docs.html${search}` }).window;
  const api = initDocs({ root: window.document, storage, developerHash });
  const $ = (selector) => window.document.querySelector(selector);
  const press = (node) => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return { window, api, $, press, storage };
};

test('the page lists the sections of a kind, shows one, and a kind comes from the address', () => {
  const t = open();
  assert.equal(t.api.kind(), 'project');
  assert.equal(t.$('.docs__list').children.length, RU.project.length);
  assert.equal(t.$('.docs__article h2').textContent, RU.project[0].title);
  assert.equal(t.$('[data-docs-edit]').hidden, true);
  t.press(t.$('[data-docs-kind="code"]'));
  assert.equal(t.api.kind(), 'code');
  assert.equal(t.$('[data-docs-kind="code"]').getAttribute('aria-pressed'), 'true');
  assert.equal(open({ search: '?kind=code' }).api.kind(), 'code');
  assert.equal(open({ search: '?kind=nope' }).api.kind(), 'project');
  const en = open({ lang: 'en' });
  assert.equal(en.$('.docs__article h2').textContent, EN.project[0].title);
  assert.equal(initDocs({ root: new JSDOM('<!doctype html><p>x</p>').window.document, storage: createStorage(createMemoryBackend()) }), null);
});

test('a section is picked from the list, and an unknown section says so', () => {
  const t = open();
  const second = t.$('.docs__list li:nth-child(2) button');
  if (second) {
    t.press(second);
    assert.equal(t.api.current(), second.dataset.docsId);
    assert.equal(second.getAttribute('aria-current'), 'true');
  }
  t.press(t.$('.docs__list'));
  assert.equal(t.api.showSection('missing'), null);
  assert.ok(t.$('.docs__article p'));
});

test('the role form refuses a wrong code and a guest; only a developer edits, saves and resets a section', async () => {
  const storage = createStorage(createMemoryBackend());
  const accounts = createAccountStore({ storage, developerHash: hashCode('team-code') });
  await accounts.register({ name: 'Dev', email: 'dev@example.com', password: 'correct horse' });
  const t = open({ storage });
  const submit = () => t.$('[data-docs-role]').dispatchEvent(new t.window.Event('submit', { bubbles: true, cancelable: true }));
  t.$('.docs__role-input').value = 'wrong';
  submit();
  await wait(t, 'Код неверный.');
  assert.equal(t.$('.docs__status').textContent, 'Код неверный.');
  assert.equal(t.$('[data-docs-edit]').hidden, true);
  t.press(t.$('[data-docs-edit]'));
  assert.equal(t.$('.docs__editor').hidden, true);
  const raw = storage.get('accounts');
  const asDeveloper = () => {
    storage.set(
      'accounts',
      raw.map((account) => ({ ...account, role: 'developer' })),
    );
    t.window.dispatchEvent(new t.window.Event('storage'));
  };
  asDeveloper();
  assert.equal(t.$('[data-docs-edit]').hidden, false);
  t.press(t.$('[data-docs-edit]'));
  assert.equal(t.$('.docs__editor').hidden, false);
  t.$('.docs__text').value = 'Changed text';
  t.press(t.$('[data-docs-save]'));
  assert.equal(t.$('.docs__status').textContent, 'Раздел сохранён.');
  assert.ok(t.$('.docs__edited'));
  t.press(t.$('[data-docs-edit]'));
  t.$('.docs__text').value = '  ';
  t.press(t.$('[data-docs-save]'));
  assert.equal(t.$('.docs__status').textContent, 'Текст пустой или слишком длинный.');
  t.press(t.$('[data-docs-cancel]'));
  assert.equal(t.$('.docs__editor').hidden, true);
  t.press(t.$('[data-docs-reset]'));
  assert.equal(t.$('.docs__status').textContent, 'Возвращён исходный текст.');
  t.press(t.$('[data-docs-role-off]'));
  assert.equal(t.$('[data-docs-edit]').hidden, true);
  assert.equal(t.$('.docs__status').textContent, 'Вы вышли из роли.');
  asDeveloper();
  storage.remove('session');
  t.press(t.$('[data-docs-save]'));
  assert.equal(t.$('.docs__status').textContent, 'Менять документацию может только разработчик.');
  submit();
  await wait(t, 'Сначала войдите в аккаунт.');
  assert.equal(t.$('.docs__status').textContent, 'Сначала войдите в аккаунт.');
});

test('the role is turned on with the right code, and a failed save is reported', async () => {
  const storage = createStorage(createMemoryBackend());
  const accounts = createAccountStore({ storage });
  await accounts.register({ name: 'Dev', email: 'd@example.com', password: 'correct horse' });
  storage.set(
    'accounts',
    storage.get('accounts').map((account) => ({ ...account, role: 'developer' })),
  );
  const t = open({ storage });
  t.press(t.$('[data-docs-edit]'));
  t.$('.docs__text').value = 'x';
  const set = storage.set;
  storage.set = () => false;
  t.press(t.$('[data-docs-save]'));
  storage.set = set;
  assert.equal(t.$('.docs__status').textContent, 'Не удалось сохранить.');
});

test('the right code turns the role on and the edit button appears', async () => {
  const storage = createStorage(createMemoryBackend());
  await createAccountStore({ storage }).register({ name: 'Dev', email: 'r@example.com', password: 'correct horse' });
  const t = open({ storage, developerHash: hashCode('team-code') });
  t.$('.docs__role-input').value = 'team-code';
  t.$('[data-docs-role]').dispatchEvent(new t.window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(t, 'Роль «разработчик» включена.');
  assert.equal(t.$('.docs__status').textContent, 'Роль «разработчик» включена.');
  assert.equal(t.$('[data-docs-edit]').hidden, false);
  assert.equal(t.$('[data-docs-role-off]').hidden, false);
  assert.equal(t.$('.docs__role-input').hidden, true);
});
