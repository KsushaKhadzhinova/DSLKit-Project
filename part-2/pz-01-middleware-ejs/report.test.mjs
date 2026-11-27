import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { docxSuite } from '../../tools/part2/docx-suite.js';
import { figuresSuite } from '../../tools/part2/figures-suite.js';
import { reportSuite } from '../../tools/part2/report-suite.js';
import { CATALOG } from './src/errors.js';

const DIR = 'part-2/pz-01-middleware-ejs';

// The suite reads files relative to the repository root, so `npm test` works from this folder too.
process.chdir(fileURLToPath(new URL('../..', import.meta.url)));
// Variant 26 is even: the catalogue and the request log are tables of the database, so the words of an in-memory store are an error.
reportSuite(DIR, { questions: 30, database: true });
docxSuite(DIR);
figuresSuite(DIR);

// Every code in the table of error pages of the report has a page in src/errors.js (the meaning of the cases is checked by the tests of the application).
test(`${DIR}: the error codes of the report table exist in src/errors.js`, () => {
  const text = readFileSync(`${DIR}/report.md`, 'utf8');
  const table = text.slice(text.indexOf('Таблица 4 –'));
  const codes = [...table.matchAll(/^\| (\d{3}) \|/gm)].map((m) => Number(m[1]));
  assert.ok(codes.length >= 7);
  for (const code of codes) assert.ok(CATALOG[code], `no page for ${code}`);
});
