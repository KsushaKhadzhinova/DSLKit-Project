import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTranslator } from '../../site/js/utils/i18n.js';

const pageIn = (lang) => ({ documentElement: { lang } });

test('a Russian page keeps the Russian texts', () => {
  const tr = createTranslator(pageIn('ru'));
  assert.equal(tr('Загрузка диаграммы…'), 'Загрузка диаграммы…');
});

test('an English page gets the translation of fixed and dynamic messages', () => {
  const tr = createTranslator(pageIn('en'));
  assert.equal(tr('Загрузка диаграммы…'), 'Loading the diagram…');
  assert.equal(tr('Сервер вернул ошибку (код 502).'), 'The server returned an error (code 502).');
  assert.equal(tr('Показана сохранённая копия от 2026-10-16 22:24.'), 'Showing the saved copy from 2026-10-16 22:24.');
  assert.equal(tr('Движок: Kroki · Graphviz'), 'Engine: Kroki · Graphviz');
  assert.equal(tr('Диаграмма: Собственный движок (в браузере)'), 'Diagram: Собственный движок (в браузере)');
});

test('an unknown text stays as it is', () => {
  assert.equal(createTranslator(pageIn('en'))('Something else'), 'Something else');
});

test('a document without a root element is treated as Russian', () => {
  assert.equal(createTranslator({})('Без названия'), 'Без названия');
});
