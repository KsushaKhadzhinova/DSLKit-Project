import assert from 'node:assert/strict';
import { test } from 'node:test';
import { similarity, stem, tokens } from './text.js';

test('stem joins the forms of one Russian or English word', () => {
  assert.equal(stem('заказа'), stem('заказы'));
  assert.equal(stem('Orders'), stem('order'));
  assert.equal(stem('ёлка'), 'елк');
});

test('stem keeps a short word whole', () => {
  assert.equal(stem('is'), 'is');
  assert.equal(stem('на'), 'на');
});

test('tokens drops punctuation and stop words', () => {
  assert.deepEqual(tokens('The order, of a client!'), [stem('order'), stem('client')]);
  assert.deepEqual(tokens(''), []);
});

test('similarity is 1 for the same words in any form and 0 for none', () => {
  assert.equal(similarity('Check order', 'check orders'), 1);
  assert.equal(similarity('Check order', 'Ship goods'), 0);
  assert.equal(similarity('Проверить заказ', 'Проверить заказы'), 1);
});

test('similarity of two labels made only of stop words compares them as written', () => {
  assert.equal(similarity('The', 'the'), 1);
  assert.equal(similarity('The', 'of'), 0);
});
