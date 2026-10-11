import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from './build-report.js';
import { variantOf } from './variant.js';

const read = (p) => readFileSync(p, 'utf8');
const dir = process.argv[2];
for (const [src, out] of [
  ['report.tpl.md', 'report.md'],
  ['report.en.tpl.md', 'report.en.md'],
]) {
  writeFileSync(join(dir, out), build(read(join(dir, src)), read, variantOf(read)));
}
