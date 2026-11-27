import { test } from 'node:test';
import assert from 'node:assert/strict';
import { staleFigures } from './figures.js';

// Fails when the code, the templates or the tests changed after the screenshots of a work folder were made.
export const figuresSuite = (dir) => {
  test(`${dir}: the figures were made from the current code`, () => {
    assert.equal(staleFigures(dir), '');
  });
};
