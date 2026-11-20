// Usage: node .github/scripts/check-commits.mjs <base> <head>
import { execFileSync } from 'node:child_process';
import { problemsOf } from '../../tools/guard/rules.js';

const [base, head] = process.argv.slice(2);
const log = execFileSync('git', ['log', '--format=%H%x1f%B%x1e', `${base}..${head}`], { encoding: 'utf8' });
let failed = 0;
for (const entry of log.split('\x1e')) {
  const [hash, ...rest] = entry.trim().split('\x1f');
  if (!hash) continue;
  for (const problem of problemsOf(rest.join('\x1f'))) {
    failed += 1;
    console.error(`${hash.slice(0, 10)}: ${problem}`);
  }
}
if (failed > 0) {
  console.error(`\n${failed} commit message problem(s). Commits are made as the owner, in English, with no tool or AI attribution.`);
  process.exit(1);
}
console.log('Commit messages are clean.');
