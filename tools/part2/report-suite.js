import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, metaOf } from '../build-report.js';
import { lintReport } from './lint-report.js';
import { placeholderFigures } from './figure-files.js';
import { variantOf } from '../variant.js';

const read = (p) => readFileSync(p, 'utf8');

// questions is the number of control questions in the task; when set, only the answers n-1, n, n+1 of the variant must be present.
// database says that the variant keeps its data in the database, so the words of an in-memory store are an error.
// report.meta.json decides the rest: repository and branch must be named in the report, and "final": true turns on
// strict: 'final', where a placeholder figure instead of a real screenshot is an error.
export const reportSuite = (dir, { questions, database = false } = {}) => {
  for (const [lang, tpl, out] of [
    ['ru', 'report.tpl.md', 'report.md'],
    ['en', 'report.en.tpl.md', 'report.en.md'],
  ]) {
    test(`${dir}: ${lang} report is built from the template and follows the formatting rules`, () => {
      const text = read(`${dir}/${out}`);
      const meta = metaOf(dir, read);
      assert.equal(text, build(read(`${dir}/${tpl}`), read, variantOf(read), meta));
      const options = {
        strict: meta.final === true ? 'final' : true,
        questions,
        variant: questions && variantOf(read),
        database,
        repository: meta.repository,
        branch: meta.branch,
        ordinals: meta.ordinals !== false,
        placeholders: placeholderFigures(text, dir, readFileSync),
      };
      assert.deepEqual(lintReport(text, lang, options), []);
    });
  }
};
