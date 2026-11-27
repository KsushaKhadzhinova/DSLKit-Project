// Builds report.docx and report.en.docx next to report.md and report.en.md: node tools/docx-cli.js part-2/pz-01-middleware-ejs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { lintDocx, markdownToDocx } from './docx.js';
import { variantOf } from './variant.js';

const dir = process.argv[2];
const read = (p) => readFileSync(p);
for (const [lang, src, out] of [
  ['ru', 'report.md', 'report.docx'],
  ['en', 'report.en.md', 'report.en.docx'],
]) {
  const buf = markdownToDocx(readFileSync(join(dir, src), 'utf8'), {
    lang,
    variant: variantOf((p) => readFileSync(p, 'utf8')),
    read: (p) => read(join(dir, p)),
  });
  const errors = lintDocx(buf);
  if (errors.length) throw new Error(`${out}: ${errors.join('; ')}`);
  writeFileSync(join(dir, out), buf);
}
