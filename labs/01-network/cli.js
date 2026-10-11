import { readFileSync } from 'node:fs';
import { report } from './analyze-har.js';

const [normal, slow] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
console.log(report(normal, slow));
