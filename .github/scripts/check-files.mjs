// Usage: node .github/scripts/check-files.mjs [base]   (with a base: files changed since it; without: all tracked files)
import { execFileSync } from 'node:child_process';
import { statSync, existsSync } from 'node:fs';
import { MAX_BYTES, conflictMarkerProblems, sizeProblem, pathProblems, secretProblems, scansForSecrets } from '../../tools/guard/rules.js';

const base = process.argv[2];
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const files = (base ? git('diff', '--name-only', '--diff-filter=AM', `${base}...HEAD`) : git('ls-files')).split('\n').filter(Boolean);
let failed = 0;
for (const file of files) {
  if (!existsSync(file)) continue;
  const problems = pathProblems(file);
  const size = statSync(file).size;
  const big = sizeProblem(file, size);
  if (big) problems.push(big);
  else if (size <= MAX_BYTES && scansForSecrets(file)) {
    const text = git('show', `HEAD:${file}`);
    problems.push(...secretProblems(text), ...conflictMarkerProblems(text));
  }
  for (const problem of problems) {
    failed += 1;
    console.error(`${file}: ${problem}`);
  }
}
if (failed > 0) {
  console.error(`\n${failed} file problem(s). Secrets belong in .env on the owner's machine; large or generated files stay out of the repository.`);
  process.exit(1);
}
console.log(`Checked ${files.length} files: nothing forbidden.`);
