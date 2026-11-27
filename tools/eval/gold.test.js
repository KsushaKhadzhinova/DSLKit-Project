import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CATEGORY_RULES } from './config.js';
import { notations } from './adapters.js';
import { goldGraph } from './graph.js';

// The shape and the size of the gold set are part of the contract of the task: the set must not shrink or break unnoticed.
const load = (name) => JSON.parse(readFileSync(new URL(`../../docs/eval/${name}`, import.meta.url), 'utf8'));

['ru', 'en'].forEach((lang) => {
  test(`the ${lang} descriptions cover every buildable notation with at least 30 cases and a valid gold`, () => {
    const file = load(`descriptions.${lang}.json`);
    assert.equal(file.lang, lang);
    assert.ok(file.cases.length >= 150);
    notations.forEach((notation) => assert.ok(file.cases.filter((item) => item.notation === notation).length >= 30, notation));
    assert.equal(new Set(file.cases.map((item) => item.id)).size, file.cases.length);
    file.cases.forEach((item) => {
      assert.ok(['easy', 'medium', 'hard'].includes(item.level), item.id);
      assert.ok(item.text.length > 10 && item.el.length > 0, item.id);
      const gold = goldGraph(item);
      gold.relations.forEach(([from, to]) => assert.ok(from < gold.elements.length && to < gold.elements.length, item.id));
      assert.equal(/[а-яё]/i.test(item.text), lang === 'ru', item.id);
    });
  });
});

test('the checks set has at least 100 seeded and 100 clean diagrams and every category', () => {
  const { cases } = load('check.json');
  const seeded = cases.filter((item) => item.kind === 'seeded');
  assert.ok(seeded.length >= 100);
  assert.ok(cases.filter((item) => item.kind === 'clean').length >= 100);
  assert.deepEqual([...new Set(seeded.map((item) => item.category))].sort(), Object.keys(CATEGORY_RULES).sort());
  assert.equal(new Set(cases.map((item) => item.code)).size, cases.length);
});

test('the import set has at least 40 codes in Mermaid, PlantUML and DOT', () => {
  const { cases } = load('import.json');
  assert.ok(cases.length >= 40);
  assert.deepEqual([...new Set(cases.map((item) => item.format))].sort(), ['dot', 'mermaid', 'plantuml']);
  cases.forEach((item) => {
    const gold = goldGraph(item);
    gold.relations.forEach(([from, to]) => assert.ok(from < gold.elements.length && to < gold.elements.length, item.id));
  });
});

test('the baseline is published next to its Russian and English reports', () => {
  const baseline = load('baseline.json');
  assert.equal(baseline.version, 1);
  assert.equal(baseline.timing, undefined);
  assert.match(readFileSync(new URL('../../docs/eval/BASELINE.md', import.meta.url), 'utf8'), /^# /);
  assert.match(readFileSync(new URL('../../docs/eval/BASELINE.en.md', import.meta.url), 'utf8'), /^# /);
});
