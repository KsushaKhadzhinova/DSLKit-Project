import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from './build-report.js';

const dir = process.argv[2];
for (const [src, out] of [['report.tpl.md', 'report.md'], ['report.en.tpl.md', 'report.en.md']]) {
  writeFileSync(join(dir, out), build(readFileSync(join(dir, src), 'utf8'), (p) => readFileSync(p, 'utf8')));
}
