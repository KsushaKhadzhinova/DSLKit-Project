import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTATIONS, TEMPLATES, parseDiagram, renderNotation } from '../../site/js/notations/index.js';

const NEWLINE = String.fromCharCode(10);
const errors = (model) => model.problems.filter((item) => item.severity === 'error').length;
const idsOf = (model) => {
  const found = new Set();
  ['nodes', 'vertices', 'classes', 'entities', 'participants', 'boxes', 'lifelines'].forEach((key) =>
    (model[key] ?? []).forEach((item) => typeof item?.id === 'string' && /^[A-Za-z]\w*$/.test(item.id) && found.add(item.id)),
  );
  return [...found].sort((a, b) => b.length - a.length);
};
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('every notation accepts Russian names of its elements: the same checks, a drawing with the Russian words', () => {
  const checked = [];
  for (const key of Object.keys(NOTATIONS)) {
    const source = TEMPLATES[key];
    const base = parseDiagram(source);
    const ids = idsOf(base);
    let renamed = source;
    ids.forEach((id, index) => {
      renamed = renamed.replace(new RegExp(`(?<![\\w."])${escape(id)}(?![\\w"-])`, 'g'), `Узел${index + 1}`);
    });
    const model = parseDiagram(renamed);
    assert.equal(errors(model), errors(base), `${key}: Russian names added errors: ${model.problems.map((item) => item.code).join(', ')}`);
    assert.match(renderNotation(model), /<svg/, key);
    if (ids.length > 0) checked.push(key);
  }
  assert.ok(checked.length >= 25, `only ${checked.length} notations had names to change`);
});

test('an entity relationship diagram and a class diagram can be written entirely in Russian', () => {
  const erd = parseDiagram(
    [
      'diagram erd "Магазин"',
      'entity Клиент {',
      '  идентификатор: int pk',
      '  имя: string',
      '}',
      'entity Заказ {',
      '  номер: int pk',
      '  клиент_id: int fk -> Клиент',
      '}',
      'relationship Клиент 1:N Заказ "оформляет"',
    ].join(NEWLINE),
  );
  assert.equal(erd.problems.filter((item) => item.severity !== 'info').length, 0);
  const drawn = renderNotation(erd);
  for (const word of ['Магазин', 'Клиент', 'Заказ', 'идентификатор', 'оформляет']) assert.ok(drawn.includes(word), word);
  const classes = parseDiagram(
    ['diagram uml class "Банк"', 'class Счёт {', '  + баланс: Деньги', '  + снять(сумма: Деньги): void', '}', 'class Клиент', 'Клиент --> Счёт : владеет'].join(
      NEWLINE,
    ),
  );
  assert.equal(classes.problems.filter((item) => item.severity === 'error').length, 0);
  assert.ok(renderNotation(classes).includes('снять'));
});

test('attributes with Russian values, such as the owner of a port, are accepted', () => {
  const model = parseDiagram(
    ['diagram uml composite "Машина"', 'classifier машина "Машина"', 'part двигатель "Двигатель" in=машина', 'port вход "вход" of=двигатель'].join(NEWLINE),
  );
  assert.equal(model.problems.filter((item) => item.severity === 'error').length, 0);
});
