import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { checkEnv, formatResults } from './check-env.js';

const results = checkEnv({ run: (c, a) => execFileSync(c, a, { encoding: 'utf8', shell: true }), exists: existsSync, read: (p) => readFileSync(p, 'utf8') });
console.log(formatResults(results, process.argv[2]));
process.exitCode = results.filter((r) => !r.pass).length;
