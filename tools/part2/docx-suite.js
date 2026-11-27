import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintDocx, markdownToDocx } from '../docx.js';
import { variantOf } from '../variant.js';

// The DOCX files next to the reports must be what the converter makes of the current report.md and report.en.md.
export const docxSuite = (dir) => {
  for (const [lang, md, out] of [
    ['ru', 'report.md', 'report.docx'],
    ['en', 'report.en.md', 'report.en.docx'],
  ]) {
    test(`${dir}: ${lang} DOCX is current and follows the layout rules`, () => {
      const fresh = markdownToDocx(readFileSync(`${dir}/${md}`, 'utf8'), {
        lang,
        variant: variantOf((p) => readFileSync(p, 'utf8')),
        read: (p) => readFileSync(`${dir}/${p}`),
      });
      assert.deepEqual(lintDocx(fresh), []);
      assert.ok(readFileSync(`${dir}/${out}`).equals(fresh), `${out} is out of date, run: node tools/docx-cli.js ${dir}`);
    });
  }
};
