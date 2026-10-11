import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { build } from '../../tools/build-report.js';
import { lintReport } from '../../tools/lint-report.js';

const read = (p) => readFileSync(p, 'utf8');

for (const [lang, tpl, out] of [
  ['ru', 'report.tpl.md', 'report.md'],
  ['en', 'report.en.tpl.md', 'report.en.md'],
]) {
  test(`${lang} report is built from the template and follows the formatting rules`, () => {
    const text = read(`labs/01-network/${out}`);
    assert.equal(text, build(read(`labs/01-network/${tpl}`), read));
    assert.deepEqual(lintReport(text, lang), []);
  });
}
