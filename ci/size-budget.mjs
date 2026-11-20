// Bundle size budget: fails when the built site (dist) is more than 15% larger than the numbers stored in size-budget.json.
// Usage: node ci/size-budget.mjs [dist] [--update]   (--update writes the current numbers as the new budget)
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const args = process.argv.slice(2);
const update = args.includes('--update');
const dist = resolve(args.find((a) => !a.startsWith('--')) || 'dist');
const budgetFile = resolve('size-budget.json');
const ALLOWED_GROWTH = 0.15;
const TEXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.svg', '.xml', '.txt', '.webmanifest']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

if (!existsSync(dist)) {
  console.error(`No ${dist}: run npm run build first.`);
  process.exit(2);
}

const files = walk(dist);
const now = { files: files.length, bytes: 0, gzipBytes: 0, jsBytes: 0, cssBytes: 0 };
for (const file of files) {
  const data = readFileSync(file);
  const ext = extname(file).toLowerCase();
  now.bytes += data.length;
  if (TEXT.has(ext)) now.gzipBytes += gzipSync(data).length;
  else now.gzipBytes += data.length;
  if (ext === '.js' || ext === '.mjs') now.jsBytes += data.length;
  if (ext === '.css') now.cssBytes += data.length;
}

if (update) {
  writeFileSync(budgetFile, `${JSON.stringify({ allowedGrowth: ALLOWED_GROWTH, ...now }, null, 2)}\n`);
  console.log('Budget written:', now);
  process.exit(0);
}

const budget = JSON.parse(readFileSync(budgetFile, 'utf8'));
const limit = budget.allowedGrowth ?? ALLOWED_GROWTH;
let failed = false;
for (const key of ['bytes', 'gzipBytes', 'jsBytes', 'cssBytes']) {
  const max = Math.round(budget[key] * (1 + limit));
  const change = (((now[key] - budget[key]) / budget[key]) * 100).toFixed(1);
  const ok = now[key] <= max;
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${key}: ${now[key]} (budget ${budget[key]}, ${change >= 0 ? '+' : ''}${change}%, limit ${max})`);
}
if (failed) {
  console.error(
    `The site grew by more than ${limit * 100}% over size-budget.json. Reduce it, or run node ci/size-budget.mjs --update and explain the growth in the pull request.`,
  );
  process.exit(1);
}
