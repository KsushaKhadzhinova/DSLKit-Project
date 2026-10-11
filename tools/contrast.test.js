import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contrast, luminance } from './contrast.js';
import { TOKENS } from './tokens.js';

test('luminance of black and white', () => {
  assert.equal(luminance('#000000'), 0);
  assert.equal(luminance('#ffffff'), 1);
});

test('contrast ratio is symmetric and spans 1 to 21', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#ffffff', '#000000'), 21);
  assert.equal(contrast('#777777', '#777777'), 1);
});

test('text pairs of both themes satisfy WCAG AA (4.5)', () => {
  for (const [name, t] of Object.entries(TOKENS)) {
    for (const [fg, bg] of [
      ['text', 'background'],
      ['text', 'surface'],
      ['text-light', 'background'],
      ['text-light', 'surface'],
      ['muted', 'background'],
      ['link', 'background'],
      ['link', 'surface'],
      ['error', 'surface'],
    ]) {
      assert.ok(contrast(t[fg], t[bg]) >= 4.5, `${name}: ${fg} on ${bg} = ${contrast(t[fg], t[bg]).toFixed(2)}`);
    }
    assert.ok(contrast('#ffffff', t.primary) >= 4.5, `${name}: white on primary`);
  }
});

test('themes define the same token names', () => {
  assert.deepEqual(Object.keys(TOKENS.light), Object.keys(TOKENS.dark));
});
