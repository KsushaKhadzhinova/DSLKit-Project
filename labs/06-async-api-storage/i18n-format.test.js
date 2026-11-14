import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initDashboard } from '../../site/js/components/dashboard.js';
import { explainResult, percent, solve } from '../../site/js/decision/methods.js';
import { toDsl, toMarkdown } from '../../site/js/decision/report.js';
import { TASKS, taskProblem } from '../../site/js/decision/tasks.js';
import { createProjectStore, createTemplateStore, quotaLabel, titleOf } from '../../site/js/storage/projects.js';
import { htmlFile } from '../../site/js/utils/exporters.js';
import { formatClock, formatDateTime, formatNumber, formatTime, languageIndex, normalizeLanguage, pageLanguage, pick } from '../../site/js/utils/lang.js';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

// Dates, numbers and the fallback title go through the language of the page, and a language that is not known gives the source one.

const AT = Date.UTC(2026, 9, 16, 12, 0);
const memory = () => createStorage(createMemoryBackend());
const page = (lang) =>
  new JSDOM(readFileSync(lang === 'en' ? 'site/en/app/dashboard.html' : 'site/app/dashboard.html', 'utf8'), { url: 'http://localhost/' }).window;

test('the helpers of the language module give the same answer as Intl for the language of the page', () => {
  assert.equal(normalizeLanguage('en'), 'en');
  assert.equal(normalizeLanguage('de'), 'ru');
  assert.equal(normalizeLanguage(undefined), 'ru');
  assert.equal(pageLanguage({ documentElement: { lang: 'en' } }), 'en');
  assert.equal(languageIndex('ru'), 0);
  assert.equal(languageIndex('en'), 1);
  assert.equal(languageIndex('de'), 0);
  const texts = { ru: 'Привет, {name}', en: 'Hello, {name}' };
  assert.equal(pick(texts, 'en', { name: 'Ann' }), 'Hello, Ann');
  assert.equal(pick(texts, 'de', { name: 'Ann' }), 'Привет, Ann');
  assert.equal(pick({ ru: 'a', en: 'b' }, 'en'), 'b');
  assert.equal(formatDateTime(AT, 'en'), new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(AT));
  assert.equal(formatDateTime(AT, 'ru'), new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' }).format(AT));
  assert.match(formatDateTime(AT, 'ru'), /окт\./);
  assert.match(formatDateTime(AT, 'en'), /Oct/);
  assert.doesNotMatch(formatDateTime(AT, 'en'), /2026-10-16/);
  assert.match(formatClock(AT, 'en'), /^\d{1,2}:\d\d/);
  assert.match(formatTime(AT, 'ru'), /^\d\d:\d\d:\d\d$/);
  assert.equal(formatNumber(1234.5, 'ru', { useGrouping: false }), '1234,5');
  assert.equal(formatNumber(1234.5, 'en', { useGrouping: false }), '1234.5');
});

test('the dashboard writes the change time and the time of the deletion with Intl in the language of the page', () => {
  for (const lang of ['ru', 'en']) {
    const { document } = page(lang);
    const storage = memory();
    const store = createProjectStore({ storage, now: () => AT });
    store.save({ title: 'Kept', notation: 'idef0', source: 'diagram idef0 "Kept"' });
    store.save({ title: '', notation: 'idef0', source: 'diagram idef0' });
    const gone = store.save({ title: 'Gone', notation: 'idef0', source: 'diagram idef0 "Gone"' });
    store.trash(gone.id);
    const api = initDashboard({ root: document, storage, seed: false, now: () => AT });
    const stamps = (section) => {
      api.show(section);
      return [...document.querySelectorAll('.project-list__item')]
        .filter((item) => !item.hidden)
        .map((item) => item.querySelector('.project-card__updated').textContent);
    };
    const expected = formatDateTime(AT, lang);
    assert.ok(
      stamps('mine').every((text) => text.includes(expected)),
      `${lang}: ${stamps('mine')}`,
    );
    assert.ok(stamps('trash').every((text) => text.includes(expected) && !/\d{4}-\d\d-\d\d \d\d:\d\d/.test(text)));
    const names = (section) => {
      api.show(section);
      return [...document.querySelectorAll('.project-list__item')]
        .filter((item) => !item.hidden)
        .map((item) => item.querySelector('.project-card__link').textContent);
    };
    assert.ok(names('mine').includes(lang === 'en' ? 'Untitled' : 'Без названия'));
  }
});

test('a project and a template without a title keep an empty title and are named at display time', () => {
  const storage = memory();
  const project = createProjectStore({ storage }).save({ title: '  ', notation: 'idef0', source: 'diagram idef0' });
  const template = createTemplateStore({ storage }).save({ title: '', notation: 'idef0', source: 'diagram idef0' });
  assert.equal(project.title, '');
  assert.equal(template.title, '');
  assert.equal(titleOf(project, 'ru'), 'Без названия');
  assert.equal(titleOf(template, 'en'), 'Untitled');
  assert.equal(titleOf({ title: 'Без названия' }, 'en'), 'Untitled');
  assert.equal(titleOf({ title: 'Order' }, 'en'), 'Order');
});

test('the quota text is a dictionary lookup in both languages', () => {
  assert.equal(quotaLabel(2, 'ru'), 'Бета: сегодня создано 2 из 5');
  assert.equal(quotaLabel(2, 'en'), 'Beta: 2 of 5 created today');
  assert.equal(quotaLabel(6, 'en'), 'Beta: 6 created today, the limit of 5 a day is exceeded');
  assert.equal(quotaLabel(6, 'ru'), 'Бета: сегодня создано 6, лимит 5 в день превышен');
  assert.equal(quotaLabel(9, 'de', true), 'Бета: сегодня создано 9, без дневного лимита');
});

test('the report of the decision page and the exported page use the decimal mark and the words of the language', () => {
  const problem = taskProblem(Object.keys(TASKS)[0], 'en');
  const result = solve(problem, 'wsm');
  const ru = toMarkdown(problem, result, 'ru');
  const en = toMarkdown(problem, result, 'en');
  assert.match(ru, /Метод: /);
  assert.match(en, /Method: /);
  assert.match(ru, /\d,\d %|\d %/);
  assert.doesNotMatch(en, /\d,\d %/);
  assert.equal(percent(0.625, 'ru'), '62,5 %');
  assert.equal(percent(0.625, 'en'), '62.5 %');
  assert.match(explainResult(problem, result, 'ru'), /^Лучшая альтернатива/);
  assert.match(explainResult(problem, result, 'en'), /^The best alternative/);
  assert.match(toDsl(problem, result, 'ru'), /outcome a1/);
  assert.match(htmlFile({ title: 'T', svgText: '<svg/>', source: 's', lang: 'en' }), /<html lang="en">[\s\S]*Diagram code/);
  assert.match(htmlFile({ title: 'T', svgText: '<svg/>', source: 's', lang: 'de' }), /<html lang="ru">[\s\S]*Код диаграммы/);
});
