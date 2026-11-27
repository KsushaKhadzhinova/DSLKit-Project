// Builds report.docx (Russian only, by the owner's decision) next to report.md and keeps report.toc.json:
//   node tools/docx-cli.js part-2/pz-01-middleware-ejs [--repaginate]
// Page numbers of the contents are counted by Word (tools/docx-pages.ps1); without --repaginate Word runs only when the
// stored numbers are stale.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashOf, reportDocx } from './docx-report.js';

const [dir, flag] = process.argv.slice(2);
const text = (p) => readFileSync(p, 'utf8');
let result = reportDocx(dir, text, readFileSync);
if (!result.current || flag === '--repaginate') {
  const work = mkdtempSync(join(tmpdir(), 'docx-pages-'));
  writeFileSync(join(work, 'base.docx'), result.base);
  execFileSync(
    'powershell',
    ['-NoProfile', '-File', fileURLToPath(new URL('./docx-pages.ps1', import.meta.url)), join(work, 'base.docx'), join(work, 'pages.json')],
    { stdio: 'inherit' },
  );
  const pages = JSON.parse(text(join(work, 'pages.json')));
  writeFileSync(join(dir, 'report.toc.json'), `${JSON.stringify({ base: hashOf(result.base), pages }, null, 2)}\n`);
  result = reportDocx(dir, text, readFileSync);
}
if (result.errors.length) throw new Error(`report.docx: ${result.errors.join('; ')}`);
writeFileSync(join(dir, 'report.docx'), result.docx);
