import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportDocx } from '../docx-report.js';

// The Russian DOCX next to the report must be what the converter makes of the current report.md and report.toc.json
// (English DOCX files are not built: owner's decision). A stale contents cache means Word has to count the pages again.
export const docxSuite = (dir) => {
  test(`${dir}: the DOCX is current, its contents carry page numbers and it follows the layout rules`, () => {
    const { current, docx, errors } = reportDocx(dir, (p) => readFileSync(p, 'utf8'), readFileSync);
    assert.ok(current, `report.toc.json is stale, run: node tools/docx-cli.js ${dir}`);
    assert.deepEqual(errors, []);
    assert.ok(readFileSync(`${dir}/report.docx`).equals(docx), `report.docx is out of date, run: node tools/docx-cli.js ${dir}`);
  });
};
