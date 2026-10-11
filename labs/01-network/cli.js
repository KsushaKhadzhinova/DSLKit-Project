import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { report } from './analyze-har.js';
import { figures } from './figures.js';

const [normalFile, slowFile, lang, dir] = process.argv.slice(2);
const normal = JSON.parse(readFileSync(normalFile, 'utf8'));
const slow = JSON.parse(readFileSync(slowFile, 'utf8'));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'analysis.md'), report(normal, slow, lang));
for (const [name, svg] of Object.entries(figures(normal, slow, lang))) writeFileSync(join(dir, name), svg);
