import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../build-report.js';
import { lintReport } from './lint-report.js';
import { variantOf } from '../variant.js';

const read = (p) => readFileSync(p, 'utf8');

// questions is the number of control questions in the task; when set, only the answers n-1, n, n+1 of the variant must be present.
export const reportSuite = (dir, { questions } = {}) => {
  for (const [lang, tpl, out] of [
    ['ru', 'report.tpl.md', 'report.md'],
    ['en', 'report.en.tpl.md', 'report.en.md'],
  ]) {
    test(`${dir}: ${lang} report is built from the template and follows the formatting rules`, () => {
      const text = read(`${dir}/${out}`);
      assert.equal(text, build(read(`${dir}/${tpl}`), read, variantOf(read)));
      assert.deepEqual(lintReport(text, lang, { strict: true, questions, variant: questions && variantOf(read) }), []);
    });
  }
};
