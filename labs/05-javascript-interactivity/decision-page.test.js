import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initDecision, nearestSaaty } from '../../site/js/components/decision.js';
import { initToasts } from '../../site/js/components/toast.js';
import { createAccountStore } from '../../site/js/storage/accounts.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const pages = { ru: readFileSync('site/app/decision.html', 'utf8'), en: readFileSync('site/en/app/decision.html', 'utf8') };
const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

const open = ({ lang = 'ru', storage = createStorage(createMemoryBackend()), clipboard } = {}) => {
  const window = new JSDOM(pages[lang], { url: 'http://localhost/app/decision.html' }).window;
  const { document } = window;
  initToasts({ root: document, storage });
  const api = initDecision({ root: document, storage, clipboard });
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const click = (target) => (typeof target === 'string' ? $(target) : target).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const set = (node, value, type = 'input') => {
    node.value = value;
    node.dispatchEvent(new window.Event(type, { bubbles: true }));
  };
  return { window, document, api, $, $$, click, set, storage, status: () => $('.decision__status').textContent };
};

test('a page without the table gets no decision support', () => {
  const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
  assert.equal(initDecision({ root: document, storage: createStorage(createMemoryBackend()) }), null);
});

test('the nearest number of the Saaty scale is found on the log scale', () => {
  assert.equal(nearestSaaty(1), 1);
  assert.equal(nearestSaaty(2.1), 2);
  assert.equal(nearestSaaty(100), 9);
  assert.equal(nearestSaaty(0.1), 1 / 9);
  assert.equal(nearestSaaty(0), 1);
  assert.equal(nearestSaaty(Infinity), 1);
  assert.equal(nearestSaaty(Number.NaN), 1);
});

test('the template task is solved at once: ranking, bars, explanation and sensitivity', () => {
  const t = open();
  assert.equal(t.$$('[data-decision-template] option').length, 4);
  assert.equal(t.$$('[data-decision-table] tbody tr').length, 5);
  assert.equal(t.$$('.decision__ranking li').length, 5);
  assert.ok(t.$('.decision__chart rect.decision__bar--best'));
  assert.match(t.$('.decision__chart').getAttribute('aria-label'), /Оценки альтернатив/);
  assert.match(t.$('.decision__explain').textContent, /Лучшая альтернатива/);
  assert.ok(t.$('.decision__table--sensitivity'));
  assert.equal(t.$('[data-decision-pairs]').hidden, true);
  assert.match(t.$('[data-decision-open]').getAttribute('href'), /^editor\.html#s=/);
  assert.match(t.$('[data-decision-saved]').textContent, /Сохранённых задач пока нет/);
});

test('editing a number changes the result, the direction and the names are read back', () => {
  const t = open();
  const before = t.$('.decision__ranking li').textContent;
  t.set(t.$('[data-decision-weight="0"]'), '100');
  assert.notEqual(t.$('.decision__ranking li').textContent, before);
  t.set(t.$('[data-decision-score="0-0"]'), '1');
  t.set(t.$('[data-decision-direction="1"]'), 'min', 'change');
  t.set(t.$('[data-decision-criterion="0"]'), 'Новое имя');
  t.set(t.$('[data-decision-alternative="0"]'), 'Первый');
  assert.equal(t.api.problem().criteria[0].name, 'Новое имя');
  assert.equal(t.api.problem().alternatives[0].name, 'Первый');
  assert.equal(t.api.problem().criteria[1].direction, 'min');
  t.set(t.$('[data-decision-score="0-0"]'), '');
  assert.match(t.$('.decision__warning').textContent, /нельзя решить/);
  assert.equal(t.api.last(), null);
});

test('criteria and alternatives are added and removed, the template changes the task', () => {
  const t = open();
  t.click('[data-decision-add-criterion]');
  assert.equal(t.$$('[data-decision-table] thead th').length, 6);
  t.click('[data-decision-add-alternative]');
  assert.equal(t.$$('[data-decision-table] tbody tr').length, 6);
  t.click('[data-decision-remove-alternative="5"]');
  t.click('[data-decision-remove-criterion="4"]');
  assert.equal(t.$$('[data-decision-table] tbody tr').length, 5);
  assert.equal(t.$$('[data-decision-table] thead th').length, 5);
  t.click(t.$('[data-decision-table]'));
  t.set(t.$('[data-decision-template]'), 'engine', 'change');
  assert.equal(t.$$('[data-decision-table] tbody tr').length, 3);
  assert.match(t.$('.decision__explain').textContent, /Собственный/);
});

test('AHP shows the comparisons, the consistency ratio and warns when the judgements contradict each other', () => {
  const t = open();
  t.set(t.$('[data-decision-method]'), 'ahp', 'change');
  assert.equal(t.$('[data-decision-pairs]').hidden, false);
  assert.equal(t.$$('[data-decision-pair]').length, 6);
  assert.match(t.$('.decision__cr').textContent, /CR = /);
  const select = (i, j, value) => t.set(t.$(`[data-decision-pair="${i}-${j}"]`), String(value), 'change');
  select(0, 1, 9);
  select(1, 2, 9);
  select(0, 2, 1 / 9);
  assert.match(t.$('.decision__warning').textContent, /CR больше 0,1/);
  select(0, 1, 1);
  select(1, 2, 1);
  select(0, 2, 1);
  select(0, 3, 1);
  select(1, 3, 1);
  select(2, 3, 1);
  assert.match(t.$('.decision__ok').textContent, /согласованы/);
  t.click(t.$('[data-decision-pair-list]'));
  t.set(t.$('[data-decision-method]'), 'topsis', 'change');
  assert.equal(t.$('[data-decision-pairs]').hidden, true);
  assert.equal(t.api.method(), 'topsis');
  t.set(t.$('[data-decision-weight="0"]'), '0');
  t.set(t.$('[data-decision-method]'), 'ahp', 'change');
  assert.equal(t.$$('[data-decision-pair]').length, 6);
  t.set(t.$('[data-decision-weight="1"]'), '5');
  assert.equal(t.$$('[data-decision-pair]').length, 6);
});

test('the result is copied as Markdown and as a diagram, and a failure is reported', async () => {
  const copied = [];
  const t = open({ clipboard: { writeText: async (text) => copied.push(text) } });
  t.click('[data-decision-copy-md]');
  await tick();
  assert.match(copied[0], /^# Выбор нотации/);
  assert.equal(t.status(), 'Скопировано.');
  t.click('[data-decision-copy-dsl]');
  await tick();
  assert.match(copied[1], /^diagram decision/);
  t.set(t.$('[data-decision-score="0-0"]'), '');
  t.click('[data-decision-copy-md]');
  t.click('[data-decision-copy-dsl]');
  assert.match(t.status(), /нельзя решить/);
  const failing = open({
    clipboard: {
      writeText: async () => {
        throw new Error('denied');
      },
    },
  });
  failing.click('[data-decision-copy-md]');
  await tick();
  assert.equal(failing.status(), 'Не удалось скопировать.');
  const real = open();
  real.window.navigator.clipboard = { writeText: async (text) => copied.push(text) };
  Object.defineProperty(real.window.navigator, 'clipboard', { value: { writeText: async (text) => copied.push(text) }, configurable: true });
  real.click('[data-decision-copy-md]');
  await tick();
  assert.equal(copied.length, 3);
});

test('tasks are saved per user, opened again and deleted', async () => {
  const storage = createStorage(createMemoryBackend());
  await createAccountStore({ storage }).register({ name: 'Ann', email: 'ann@example.com', password: 'correct horse' });
  const t = open({ storage });
  t.click('[data-decision-save]');
  assert.equal(t.status(), 'Не удалось сохранить: введите название.');
  t.set(t.$('[data-decision-method]'), 'ahp', 'change');
  t.set(t.$('[data-decision-name]'), 'Моя задача');
  t.click('[data-decision-save]');
  assert.equal(t.status(), 'Задача «Моя задача» сохранена.');
  assert.equal(t.$$('.decision__saved-item').length, 1);
  t.set(t.$('[data-decision-template]'), 'export', 'change');
  t.set(t.$('[data-decision-method]'), 'wsm', 'change');
  t.click('[data-decision-load]');
  assert.equal(t.status(), 'Задача «Моя задача» открыта.');
  assert.equal(t.api.method(), 'ahp');
  assert.equal(t.$('[data-decision-pairs]').hidden, false);
  assert.equal(t.$$('[data-decision-table] tbody tr').length, 5);
  t.click(t.$('.decision__saved'));
  t.click('[data-decision-delete]');
  assert.equal(t.status(), 'Задача удалена.');
  assert.match(t.$('[data-decision-saved]').textContent, /Сохранённых задач пока нет/);
  const reload = open({ storage });
  assert.equal(reload.$$('.decision__saved-item').length, 0);
});

test('a storage that refuses to write is reported', () => {
  const backend = createMemoryBackend();
  const write = backend.setItem;
  backend.setItem = (key, value) => {
    if (key.includes('decision-tasks')) throw new Error('full');
    write(key, value);
  };
  const t = open({ storage: createStorage(backend) });
  t.set(t.$('[data-decision-name]'), 'X');
  t.click('[data-decision-save]');
  assert.equal(t.status(), 'Не удалось сохранить: нет места в браузере.');
});

test('the English page speaks English', () => {
  const t = open({ lang: 'en' });
  assert.match(t.$('.decision__explain').textContent, /The best alternative/);
  assert.equal(t.$$('[data-decision-method] option')[0].textContent, 'Weighted sum');
  t.set(t.$('[data-decision-method]'), 'ahp', 'change');
  assert.match(t.$('.decision__pair-list').textContent, /How much more important/);
});
