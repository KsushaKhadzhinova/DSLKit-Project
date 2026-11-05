import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initExpert } from '../../site/js/components/expert.js';
import { initToasts } from '../../site/js/components/toast.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { KB_NOTATION } from '../../site/js/expert/kb-notation.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';
import { hashCode } from '../../tools/dev-code.js';

const pages = { ru: readFileSync('site/app/expert.html', 'utf8'), en: readFileSync('site/en/app/expert.html', 'utf8') };
const NL = String.fromCharCode(10);
const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

const open = ({ lang = 'ru', search = '', storage = createStorage(createMemoryBackend()), developerHash, adminHash } = {}) => {
  const window = new JSDOM(pages[lang], { url: `http://localhost/app/expert.html${search}` }).window;
  const { document } = window;
  initToasts({ root: document, storage });
  const api = initExpert({ root: document, storage, developerHash, adminHash });
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const click = (target) => (typeof target === 'string' ? $(target) : target).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return { window, document, api, $, $$, click, storage, status: () => $('.docs__status').textContent };
};
const developer = async (storage) => {
  const accounts = createAccountStore({ storage, developerHash: hashCode('team-code'), adminHash: hashCode('boss-code') });
  await accounts.register({ name: 'Dev', email: 'dev@example.com', password: 'correct horse' });
  await accounts.becomeDeveloper('team-code');
  return accounts;
};

test('a page without the dialog gets no expert', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initExpert({ root: document, storage: createStorage(createMemoryBackend()) }), null);
});

test('the dialog asks, takes the answers, shows the ranking and the trace of the reasoning', () => {
  const t = open();
  assert.equal(t.api.kb(), 'notation');
  assert.equal(t.$('.expert__title').textContent, 'Какую нотацию выбрать');
  assert.match(t.$('.expert__ask').textContent, /Что вы описываете/);
  assert.match(t.$('[data-expert-results]').textContent, /Пока нет вывода/);
  assert.equal(t.$$('.expert__choices button').length, 9);
  t.click(t.$$('.expert__choices button')[0]);
  assert.match(t.$('[data-expert-answers]').textContent, /Что вы описываете\? — Процесс или алгоритм по шагам/);
  assert.match(t.$('.expert__ask').textContent, /алгоритм программы/);
  t.click(t.$$('.expert__choices button')[0]);
  assert.match(t.$('[data-expert-results]').textContent, /Блок-схемы по ГОСТ 19\.701-90 — уверенность \d+ %/);
  assert.match(t.$('.expert__why').textContent, /n-algorithm: Алгоритм программы принято рисовать/);
  let guard = 0;
  while (t.$('.expert__choices') && guard < 10) {
    t.click(t.$$('.expert__choices button')[1]);
    guard += 1;
  }
  assert.equal(t.$('.expert__choices'), null);
  assert.ok(t.$('[data-expert-results] li'));
  t.click('[data-expert-restart]');
  assert.equal(t.$$('[data-expert-answers] li').length, 0);
  assert.match(t.$('.expert__ask').textContent, /Что вы описываете/);
});

test('a description gives the first facts and the dialog goes on from them', () => {
  const t = open({ lang: 'en' });
  t.$('.expert__text').value = 'We store the table of customers: entity, attribute, database.';
  t.click('[data-expert-run]');
  assert.match(t.$('[data-expert-results]').textContent, /ERD/);
  assert.match(t.$('.expert__ask').textContent, /data move|designing a database/);
  assert.equal(t.$('.expert__title').textContent, 'Which notation to choose');
  assert.match(t.$('[data-expert-answers]').textContent, /^$/);
});

test('the review base checks a code and shows the reasons', () => {
  const t = open({ search: '?kb=review' });
  assert.equal(t.api.kb(), 'review');
  assert.equal(t.$('.expert__title').textContent, 'Рецензия диаграммы');
  assert.equal(t.$('[data-expert-restart]').hidden, true);
  t.click('[data-expert-run]');
  assert.equal(t.status(), 'Вставьте код диаграммы.');
  t.$('.expert__text').value = 'diagram bpmn "x"' + NL + 'task a "A"' + NL + 'task b "B"' + NL + 'flow a -> b';
  t.click('[data-expert-run]');
  assert.match(t.$('[data-expert-results]').textContent, /важно: /);
  assert.match(t.$('.expert__why').textContent, /Парсер нашёл ошибки|Это процесс/);
  t.$('.expert__text').value =
    'diagram erd "A"' + NL + 'entity A {' + NL + 'id: int pk' + NL + '}' + NL + 'entity B {' + NL + 'id: int pk' + NL + '}' + NL + 'relationship A 1:N B "has"';
  t.click('[data-expert-run]');
  assert.match(t.$('[data-expert-results]').textContent, /Замечаний нет/);
  t.$('.expert__text').value = 'diagram dag "A"' + NL + 'task a "A"' + NL + 'task b "B"' + NL + 'depend a -> b' + NL + 'depend b -> a';
  t.click('[data-expert-run]');
  assert.match(t.$('[data-expert-results]').textContent, /\(стр\. /);
  t.click('[data-expert-kb="notation"]');
  assert.equal(t.api.kb(), 'notation');
  assert.equal(t.$('[data-expert-restart]').hidden, false);
});

test('the list of rules is open to everyone and editing is closed to non-developers', () => {
  const t = open();
  const rules = t.$$('[data-expert-rules] li');
  assert.equal(rules.length, KB_NOTATION.rules.length);
  assert.match(rules[0].textContent, /n-process-bpmn: если task:process то notation:bpmn \(0\.55\)/);
  assert.equal(t.$('[data-expert-edit]').hidden, true);
  assert.equal(t.$('[data-expert-reset-all]').hidden, true);
  t.click(t.$('[data-expert-edit]'));
  assert.equal(t.status(), 'Менять правила может только разработчик.');
  assert.equal(t.$('.expert__editor').hidden, true);
  t.click('[data-expert-kb="review"]');
  assert.match(t.$('[data-expert-rules] li').textContent, /r-empty/);
  assert.match(t.$$('[data-expert-rules] li')[7].textContent, /> 0/);
  t.click('[data-expert-rules]');
  t.click(t.$('[data-expert-rules] li'));
});

test('a developer edits a rule, the change is used at once and can be taken back', async () => {
  const storage = createStorage(createMemoryBackend());
  await developer(storage);
  const t = open({ storage, developerHash: hashCode('team-code') });
  assert.equal(t.$('[data-expert-edit]').hidden, false);
  assert.equal(t.$('[data-expert-reset-all]').hidden, false);
  t.click(t.$('[data-expert-edit]'));
  assert.equal(t.$('.expert__editor').hidden, false);
  const rule = JSON.parse(t.$('.expert__rule-text').value);
  assert.equal(rule.id, 'n-process-bpmn');
  t.$('.expert__rule-text').value = '{not json';
  t.click('[data-expert-save]');
  assert.equal(t.status(), 'Это не JSON.');
  t.$('.expert__rule-text').value = JSON.stringify({ id: 'n-process-bpmn' });
  t.click('[data-expert-save]');
  assert.match(t.status(), /Правило неверное: .*if/);
  rule.then.cf = 0.9;
  t.$('.expert__rule-text').value = JSON.stringify(rule);
  t.click('[data-expert-save]');
  assert.equal(t.status(), 'Правило сохранено.');
  assert.equal(t.$('.expert__editor').hidden, true);
  assert.match(t.$('[data-expert-rules] li').textContent, /\(0\.9\).*изменено разработчиком/);
  t.click(t.$('[data-expert-edit]'));
  t.click('[data-expert-reset]');
  assert.equal(t.status(), 'Возвращено исходное правило.');
  assert.doesNotMatch(t.$('[data-expert-rules] li').textContent, /изменено/);
  t.click(t.$('[data-expert-edit]'));
  t.click('[data-expert-cancel]');
  assert.equal(t.$('.expert__editor').hidden, true);
  t.click(t.$('[data-expert-edit]'));
  t.$('.expert__rule-text').value = JSON.stringify(rule);
  t.click('[data-expert-save]');
  t.click('[data-expert-reset-all]');
  assert.equal(t.status(), 'Все правила возвращены к исходным.');
  assert.doesNotMatch(t.$('[data-expert-rules]').textContent, /изменено/);
});

test('a refused write or a stale editor gets a clear answer', async () => {
  const storage = createStorage(createMemoryBackend());
  const accounts = await developer(storage);
  const t = open({ storage, developerHash: hashCode('team-code') });
  t.click(t.$('[data-expert-edit]'));
  accounts.leaveDeveloper();
  t.click('[data-expert-save]');
  assert.equal(t.status(), 'Менять правила может только разработчик.');
  t.window.dispatchEvent(new t.window.Event('storage'));
  assert.equal(t.$('.expert__editor').hidden, true);
  assert.equal(t.$('[data-expert-edit]').hidden, true);
  const backend = createMemoryBackend();
  const write = backend.setItem;
  backend.setItem = (key, value) => {
    if (key.endsWith('expert-rules')) throw new Error('full');
    write(key, value);
  };
  const broken = createStorage(backend);
  await developer(broken);
  const closed = open({ storage: broken, developerHash: hashCode('team-code') });
  closed.click(closed.$('[data-expert-edit]'));
  closed.click('[data-expert-save]');
  assert.equal(closed.status(), 'Не удалось сохранить.');
});

test('the role form turns the developer role on and off, and says why it fails', async () => {
  const storage = createStorage(createMemoryBackend());
  const t = open({ storage, developerHash: hashCode('team-code'), adminHash: hashCode('boss-code') });
  const submit = async (code) => {
    t.$('.docs__role-input').value = code;
    t.$('[data-expert-role]').dispatchEvent(new t.window.Event('submit', { cancelable: true, bubbles: true }));
    await tick(30);
  };
  await submit('team-code');
  assert.equal(t.status(), 'Сначала войдите в аккаунт.');
  await createAccountStore({ storage }).register({ name: 'Dev', email: 'r@example.com', password: 'correct horse' });
  await submit('wrong');
  assert.equal(t.status(), 'Код неверный.');
  await submit('team-code');
  assert.equal(t.status(), 'Роль «разработчик» включена.');
  assert.equal(t.$('[data-expert-role-off]').hidden, false);
  assert.equal(t.$('.docs__role-input').hidden, true);
  assert.equal(t.$('[data-expert-edit]').hidden, false);
  t.click('[data-expert-role-off]');
  assert.equal(t.status(), 'Вы вышли из роли.');
  assert.equal(t.$('[data-expert-edit]').hidden, true);
  await submit('boss-code');
  assert.match(t.status(), /администратор/);
  assert.equal(t.$('[data-expert-edit]').hidden, true);
});

test('the English page speaks English', () => {
  const t = open({ lang: 'en', search: '?kb=review' });
  t.click('[data-expert-run]');
  assert.equal(t.status(), 'Paste the code of a diagram.');
  assert.equal(t.$('.expert__title').textContent, 'Diagram review');
  assert.match(t.$('[data-expert-rules] li').textContent, /r-empty: if empty then advice:r-empty/);
});
