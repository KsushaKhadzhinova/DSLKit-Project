import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from './build-report.js';
import { lintReport } from './lint-report.js';
import { variantOf } from './variant.js';

const read = (p) => readFileSync(p, 'utf8');

export const reportSuite = (dir) => {
  for (const [lang, tpl, out] of [
    ['ru', 'report.tpl.md', 'report.md'],
    ['en', 'report.en.tpl.md', 'report.en.md'],
  ]) {
    test(`${dir}: ${lang} report is built from the template and follows the formatting rules`, () => {
      const text = read(`${dir}/${out}`);
      assert.equal(text, build(read(`${dir}/${tpl}`), read, variantOf(read)));
      assert.deepEqual(lintReport(text, lang), []);
    });
  }
};
