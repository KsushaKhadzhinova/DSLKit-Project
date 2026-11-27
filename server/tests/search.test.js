'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fit, normalize } = require('../src/search');

const hasLoneSurrogate = (s) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);

test('fit leaves empty and short strings alone', () => {
  assert.equal(fit('', 300), '');
  assert.equal(fit('abc', 300), 'abc');
  assert.equal(fit('a'.repeat(300), 300), 'a'.repeat(300));
});

test('fit cuts plain text exactly at the limit', () => {
  assert.equal(fit('a'.repeat(301), 300).length, 300);
});

test('fit never leaves half of a surrogate pair, for odd and even limits', () => {
  const emoji = '\u{1F600}';
  for (const max of [299, 300, 301]) {
    const out = fit(normalize('a' + emoji.repeat(400)), max);
    assert.ok(out.length <= max, String(out.length));
    assert.equal(hasLoneSurrogate(out), false, `max ${max}`);
  }
  assert.equal(fit(emoji, 1), '');
  assert.equal(fit(emoji, 2), emoji);
});

test('fit copes with letters that grow when lower-cased', () => {
  const out = fit(normalize('\u0130'.repeat(200)), 300);
  assert.equal(out.length, 300);
  assert.equal(hasLoneSurrogate(out), false);
});

test('normalize folds case, accents stay and yo becomes ye', () => {
  assert.equal(normalize('\u0401\u0416 \u00c9'), '\u0435\u0436 \u00e9');
});
