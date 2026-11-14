import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTATIONS, TEMPLATES, TEMPLATES_RU, TEMPLATE_LANGS, parseDiagram, renderNotation, templateFor } from '../../site/js/notations/index.js';

const keys = Object.keys(NOTATIONS);
const errors = (model) => model.problems.filter((item) => item.severity === 'error');
const CYRILLIC = /[А-Яа-яЁё]/;

test('every notation has a template in both languages and the two tables have the same keys', () => {
  assert.deepEqual(Object.keys(TEMPLATES_RU).sort(), Object.keys(TEMPLATES).sort());
  assert.deepEqual(Object.keys(TEMPLATES).sort(), [...keys].sort());
});

for (const lang of TEMPLATE_LANGS) {
  test(`the ${lang} templates of all notations parse without errors and draw`, () => {
    for (const key of keys) {
      const model = parseDiagram(templateFor(key, lang));
      assert.equal(model.notation, key, `${lang} ${key}: the header names another notation`);
      assert.deepEqual(
        errors(model).map((item) => item.code),
        [],
        `${lang} ${key}`,
      );
      assert.match(renderNotation(model), /<svg/, `${lang} ${key}`);
    }
  });
}

test('a Russian template gives the same warnings as the English one and the same number of lines', () => {
  for (const key of keys) {
    const ru = parseDiagram(TEMPLATES_RU[key]);
    const en = parseDiagram(TEMPLATES[key]);
    assert.deepEqual(
      ru.problems.map((item) => item.code),
      en.problems.map((item) => item.code),
      key,
    );
    assert.equal(TEMPLATES_RU[key].split('\n').length, TEMPLATES[key].split('\n').length, `${key}: the structure differs`);
  }
});

test('the Russian variants have a Russian title, the English ones do not', () => {
  for (const key of keys) {
    assert.match(parseDiagram(TEMPLATES_RU[key]).title, CYRILLIC, `${key}: the title of the Russian template`);
    assert.doesNotMatch(TEMPLATES[key], CYRILLIC, `${key}: the English template has Russian words`);
  }
});

test('templateFor picks the language, treats an unknown one as the default language and ignores inherited keys', () => {
  assert.equal(templateFor('idef0', 'ru'), TEMPLATES_RU.idef0);
  assert.equal(templateFor('idef0', 'en'), TEMPLATES.idef0);
  assert.equal(templateFor('idef0'), TEMPLATES.idef0);
  // An unknown language is the language the site is written in first, like everywhere else.
  assert.equal(templateFor('idef0', 'de'), TEMPLATES_RU.idef0);
  assert.equal(templateFor('__proto__', 'ru'), undefined);
  assert.equal(templateFor('constructor', 'en'), undefined);
});
