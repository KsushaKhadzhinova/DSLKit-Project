import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportDocx } from '../docx-report.js';

// The Russian DOCX next to the report must be what the converter makes of the current report.md and report.toc.json
// (English DOCX files are not built: owner's decision). A stale contents cache means Word has to count the pages again.
// The least fill of a page in percent; the owner asks for full pages.
export const FILL_MIN = 85;

export const docxSuite = (dir) => {
  test(`${dir}: the DOCX is current, its contents carry page numbers and it follows the layout rules`, () => {
    const { current, docx, errors } = reportDocx(dir, (p) => readFileSync(p, 'utf8'), readFileSync);
    assert.ok(current, `report.toc.json is stale, run: node tools/docx-cli.js ${dir}`);
    assert.deepEqual(errors, []);
    assert.ok(readFileSync(`${dir}/report.docx`).equals(docx), `report.docx is out of date, run: node tools/docx-cli.js ${dir}`);
    // Every page is filled to at least FILL_MIN percent (measured by Word when the document was built), except the pages that may stay short.
    const { fill = [], exempt = [] } = JSON.parse(readFileSync(`${dir}/report.toc.json`, 'utf8'));
    assert.ok(fill.length > 0, 'report.toc.json has no page fill, run: node tools/docx-cli.js ' + dir + ' --repaginate');
    const low = fill.map((f, k) => [k + 1, f]).filter(([page, f]) => f < FILL_MIN && !exempt.includes(page));
    assert.deepEqual(low, [], `pages filled less than ${FILL_MIN} percent (page, percent)`);
  });
};
