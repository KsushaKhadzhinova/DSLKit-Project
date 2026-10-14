import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTATIONS, validateWaitlist } from '../../site/js/utils/validation.js';

// Test design: equivalence classes and boundary values for every field of the sign-up form.
const valid = { name: 'Ксения', email: 'k@example.com', notation: 'idef0', team: '3', comment: '', consent: true };
const invalidFields = (patch) => validateWaitlist({ ...valid, ...patch });

test('the reference data is valid', () => {
  assert.deepEqual(invalidFields({}), []);
});

test('name: boundaries 1, 2, 60 and 61 characters', () => {
  const name = (length) => 'К'.repeat(length);
  assert.deepEqual(invalidFields({ name: name(1) }), ['name']);
  assert.deepEqual(invalidFields({ name: name(2) }), []);
  assert.deepEqual(invalidFields({ name: name(60) }), []);
  assert.deepEqual(invalidFields({ name: name(61) }), ['name']);
});

test('name: equivalence classes of characters', () => {
  for (const good of ['Анна-Мария', "O'Brien", 'Иван Петров', 'Zoë', 'Ксения ']) assert.deepEqual(invalidFields({ name: good }), [], good);
  for (const bad of ['', '   ', '1Иван', '-Иван', "'Иван", 'Иван<script>', 'Иван_1', '12345']) assert.deepEqual(invalidFields({ name: bad }), ['name'], bad);
});

test('email: classes of format and boundaries of length', () => {
  for (const good of ['a@b.co', 'first.last@mail.example.com', ' trimmed@example.com ', 'a+tag@example.org'])
    assert.deepEqual(invalidFields({ email: good }), [], good);
  for (const bad of ['', 'plain', '@example.com', 'a@', 'a@b', 'a@b.c', 'a b@example.com', 'a@@example.com', 'a@.com', 'a@b..com'])
    assert.deepEqual(invalidFields({ email: bad }), ['email'], bad);
  const withLength = (length) => `${'a'.repeat(length - '@example.com'.length)}@example.com`;
  assert.deepEqual(invalidFields({ email: withLength(120) }), []);
  assert.deepEqual(invalidFields({ email: withLength(121) }), ['email']);
});

test('team size: boundaries -1, 0, 1, 500 and 501 and invalid classes', () => {
  for (const good of ['0', '1', '499', '500', 0, 500, ' 7 ']) assert.deepEqual(invalidFields({ team: good }), [], String(good));
  for (const bad of ['-1', '501', '1.5', '1e2', 'abc', '', ' ', '١٢', -1, 501, 1.5, null, undefined, NaN])
    assert.deepEqual(invalidFields({ team: bad }), ['team'], String(bad));
});

test('comment: boundaries 0, 499, 500 and 501 characters', () => {
  assert.deepEqual(invalidFields({ comment: '' }), []);
  assert.deepEqual(invalidFields({ comment: 'x'.repeat(499) }), []);
  assert.deepEqual(invalidFields({ comment: 'x'.repeat(500) }), []);
  assert.deepEqual(invalidFields({ comment: 'x'.repeat(501) }), ['comment']);
  assert.deepEqual(invalidFields({ comment: undefined }), []);
});

test('notation: every listed value is valid and anything else is not', () => {
  assert.equal(NOTATIONS.length, 6);
  for (const notation of NOTATIONS) assert.deepEqual(invalidFields({ notation }), [], notation);
  for (const bad of ['', 'UML', 'idef1', ' idef0', null, undefined, 0]) assert.deepEqual(invalidFields({ notation: bad }), ['notation'], String(bad));
});

test('consent: only the boolean true passes', () => {
  assert.deepEqual(invalidFields({ consent: true }), []);
  for (const bad of [false, 'true', 1, 'on', null, undefined]) assert.deepEqual(invalidFields({ consent: bad }), ['consent'], String(bad));
});

test('several wrong fields are all reported in the order of the form', () => {
  assert.deepEqual(invalidFields({ name: '1', email: 'x', notation: '', team: '-5', comment: 'x'.repeat(501), consent: false }), [
    'name',
    'email',
    'notation',
    'team',
    'comment',
    'consent',
  ]);
});

test('pairwise: every pair of field classes appears in at least one valid or invalid combination without surprises', () => {
  const classes = {
    name: ['Ксения', 'К'],
    email: ['k@example.com', 'bad'],
    notation: ['idef0', ''],
    team: ['0', '501'],
    consent: [true, false],
  };
  const names = Object.keys(classes);
  let combinations = 0;
  const walk = (index, picked) => {
    if (index === names.length) {
      const expected = names.filter((field, position) => picked[position] !== classes[field][0]);
      assert.deepEqual(invalidFields(Object.fromEntries(names.map((field, position) => [field, picked[position]]))), expected);
      combinations += 1;
      return;
    }
    for (const value of classes[names[index]]) walk(index + 1, [...picked, value]);
  };
  walk(0, []);
  assert.equal(combinations, 32);
});
