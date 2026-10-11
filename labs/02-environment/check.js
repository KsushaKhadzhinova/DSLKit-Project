import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { checkEnv, formatResults } from './check-env.js';

const results = checkEnv({
  run: (c, a) => execSync([c, ...a].join(' '), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }),
  exists: existsSync,
  read: (p) => readFileSync(p, 'utf8'),
});
console.log(formatResults(results, process.argv[2]));
process.exitCode = results.filter((r) => !r.pass).length;
